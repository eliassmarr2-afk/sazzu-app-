-- Protocol Creative Insights (PCI)
-- Phase 1L reliability: a crashed worker must not leave promote_asset jobs stuck forever.
-- Hosted Edge executions are bounded; a processing lock older than 15 minutes is stale.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci_api.worker_claim_promote_asset(
  p_worker_id text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_worker_id text := btrim(coalesce(p_worker_id,''));
  v_job pci.outbox%rowtype;
  v_asset pci.creative_assets%rowtype;
  v_rights pci.rights_grants%rowtype;
  v_version pci.submission_versions%rowtype;
  v_submission pci.submissions%rowtype;
  v_was_stale boolean := false;
begin
  if p_request_id is null or v_worker_id = '' or length(v_worker_id) > 120
     or v_worker_id !~ '^[A-Za-z0-9._:-]+$' then
    raise exception using errcode='22023',message='pci_worker_context_invalid';
  end if;

  select * into v_job
  from pci.outbox o
  where o.job_type='promote_asset'
    and (
      (o.status in ('pending','failed') and o.attempts < 5 and o.available_at <= now())
      or
      (o.status='processing' and o.attempts <= 5 and o.locked_at < now()-interval '15 minutes')
    )
  order by
    case when o.status='processing' then 0 else 1 end,
    o.available_at,o.created_at,o.outbox_id
  for update skip locked
  limit 1;

  if v_job.outbox_id is null then
    return jsonb_build_object('ok',true,'job',null);
  end if;

  v_was_stale := v_job.status='processing';

  select * into v_asset
  from pci.creative_assets ca
  where ca.creative_asset_id=v_job.entity_id
  for update;

  if v_asset.creative_asset_id is null then
    update pci.outbox
    set status='failed', attempts=5, locked_at=null, locked_by=null,
        last_error_code='asset_not_found', last_error_message='Creative Asset missing for promote_asset job'
    where outbox_id=v_job.outbox_id;
    return jsonb_build_object('ok',true,'job',null,'discarded_outbox_id',v_job.outbox_id);
  end if;

  if v_asset.status='available' then
    update pci.outbox
    set status='completed', completed_at=coalesce(completed_at,now()), locked_at=null, locked_by=null,
        last_error_code=null,last_error_message=null
    where outbox_id=v_job.outbox_id;
    return jsonb_build_object('ok',true,'job',null,'already_available_asset_id',v_asset.creative_asset_id);
  end if;

  if v_asset.status not in ('provisioning','failed') then
    raise exception using errcode='23514',message='pci_asset_not_promotable';
  end if;

  select * into v_rights from pci.rights_grants rg where rg.rights_grant_id=v_asset.rights_grant_id;
  if v_rights.rights_grant_id is null or v_rights.status <> 'active' then
    raise exception using errcode='23514',message='pci_asset_promotion_rights_not_active';
  end if;

  select * into v_version from pci.submission_versions sv
  where sv.submission_version_id=v_asset.source_submission_version_id;
  select * into v_submission from pci.submissions s
  where s.submission_id=v_asset.source_submission_id;

  if v_version.submission_version_id is null
     or v_version.status <> 'ready'
     or v_version.storage_bucket <> 'pci-submissions'
     or v_version.storage_path is null
     or lower(v_version.sha256) is distinct from lower(v_asset.sha256)
  then
    raise exception using errcode='23514',message='pci_asset_promotion_source_invalid';
  end if;

  if v_submission.submission_id is null
     or v_submission.current_version_id is distinct from v_version.submission_version_id
  then
    raise exception using errcode='23514',message='pci_asset_promotion_submission_invalid';
  end if;

  if v_asset.storage_bucket <> 'pci-assets' or v_asset.storage_path is null then
    raise exception using errcode='23514',message='pci_asset_promotion_destination_invalid';
  end if;

  if v_asset.status='failed' then
    update pci.creative_assets set status='provisioning' where creative_asset_id=v_asset.creative_asset_id;
  end if;

  update pci.outbox
  set status='processing',
      attempts=case when v_was_stale then attempts else attempts+1 end,
      locked_at=now(),locked_by=v_worker_id,
      last_error_code=case when v_was_stale then 'stale_worker_reclaimed' else null end,
      last_error_message=null
  where outbox_id=v_job.outbox_id;

  return jsonb_build_object(
    'ok',true,
    'job',jsonb_build_object(
      'outbox_id',v_job.outbox_id,
      'job_type','promote_asset',
      'attempt',case when v_was_stale then v_job.attempts else v_job.attempts+1 end,
      'stale_reclaim',v_was_stale,
      'creative_asset_id',v_asset.creative_asset_id,
      'purchase_id',v_asset.purchase_id,
      'rights_grant_id',v_asset.rights_grant_id,
      'source_submission_id',v_asset.source_submission_id,
      'source_submission_version_id',v_asset.source_submission_version_id,
      'source_bucket',v_version.storage_bucket,
      'source_path',v_version.storage_path,
      'destination_bucket',v_asset.storage_bucket,
      'destination_path',v_asset.storage_path,
      'expected_sha256',lower(v_asset.sha256),
      'expected_size_bytes',v_version.file_size_bytes,
      'expected_mime_type',v_version.mime_type
    )
  );
end;
$$;

revoke all on function pci_api.worker_claim_promote_asset(text,uuid) from public,anon,authenticated;
grant execute on function pci_api.worker_claim_promote_asset(text,uuid) to service_role;

comment on function pci_api.worker_claim_promote_asset(text,uuid) is
  'Claims new attempts below the retry limit and safely reclaims stale processing leases, including an interrupted fifth attempt.';