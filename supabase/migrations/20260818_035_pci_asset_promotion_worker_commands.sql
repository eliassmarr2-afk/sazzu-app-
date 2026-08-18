-- Protocol Creative Insights (PCI)
-- Phase 1L: transactional worker-side commands for outbox-driven Creative Asset promotion.
-- Storage itself is copied by pci-worker; these functions own job locking and business state.
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
begin
  if p_request_id is null or v_worker_id = '' or length(v_worker_id) > 120
     or v_worker_id !~ '^[A-Za-z0-9._:-]+$' then
    raise exception using errcode='22023',message='pci_worker_context_invalid';
  end if;

  select * into v_job
  from pci.outbox o
  where o.job_type='promote_asset'
    and o.status in ('pending','failed')
    and o.available_at <= now()
    and o.attempts < 5
  order by o.available_at,o.created_at,o.outbox_id
  for update skip locked
  limit 1;

  if v_job.outbox_id is null then
    return jsonb_build_object('ok',true,'job',null);
  end if;

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
    set status='completed', completed_at=coalesce(completed_at,now()), locked_at=null, locked_by=null
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
  set status='processing', attempts=attempts+1, locked_at=now(), locked_by=v_worker_id,
      last_error_code=null,last_error_message=null
  where outbox_id=v_job.outbox_id;

  return jsonb_build_object(
    'ok',true,
    'job',jsonb_build_object(
      'outbox_id',v_job.outbox_id,
      'job_type','promote_asset',
      'attempt',v_job.attempts+1,
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

create or replace function pci_api.worker_complete_asset_promotion(
  p_worker_id text,
  p_request_id uuid,
  p_outbox_id uuid,
  p_creative_asset_id uuid,
  p_source_size_bytes bigint,
  p_destination_size_bytes bigint,
  p_source_mime_type text,
  p_destination_mime_type text,
  p_verification_metadata jsonb default '{}'::jsonb
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
  v_purchase pci.purchases%rowtype;
  v_submission record;
  v_all_available boolean;
  v_settled_now boolean := false;
begin
  if p_request_id is null or p_outbox_id is null or p_creative_asset_id is null
     or v_worker_id='' then
    raise exception using errcode='22023',message='pci_worker_completion_context_invalid';
  end if;

  select * into v_job from pci.outbox o
  where o.outbox_id=p_outbox_id and o.job_type='promote_asset'
  for update;
  if v_job.outbox_id is null then raise exception using errcode='P0002',message='pci_outbox_job_not_found'; end if;

  select * into v_asset from pci.creative_assets ca
  where ca.creative_asset_id=p_creative_asset_id
  for update;
  if v_asset.creative_asset_id is null then raise exception using errcode='P0002',message='pci_creative_asset_not_found'; end if;

  if v_job.entity_id is distinct from v_asset.creative_asset_id then
    raise exception using errcode='23514',message='pci_outbox_asset_mismatch';
  end if;

  if v_asset.status='available' and v_job.status='completed' then
    return jsonb_build_object('ok',true,'creative_asset_id',v_asset.creative_asset_id,'status','available','idempotent_replay',true);
  end if;

  if v_job.status <> 'processing' or v_job.locked_by is distinct from v_worker_id then
    raise exception using errcode='23514',message='pci_outbox_job_not_owned';
  end if;
  if v_asset.status <> 'provisioning' then
    raise exception using errcode='23514',message='pci_asset_not_provisioning';
  end if;

  select * into v_rights from pci.rights_grants rg where rg.rights_grant_id=v_asset.rights_grant_id;
  if v_rights.rights_grant_id is null or v_rights.status <> 'active' then
    raise exception using errcode='23514',message='pci_asset_promotion_rights_not_active';
  end if;

  select * into v_version from pci.submission_versions sv
  where sv.submission_version_id=v_asset.source_submission_version_id;
  if v_version.submission_version_id is null or v_version.status <> 'ready'
     or lower(v_version.sha256) is distinct from lower(v_asset.sha256) then
    raise exception using errcode='23514',message='pci_asset_promotion_source_invalid';
  end if;

  if p_source_size_bytes is null or p_destination_size_bytes is null
     or p_source_size_bytes <= 0
     or p_source_size_bytes is distinct from p_destination_size_bytes
     or p_source_size_bytes is distinct from v_version.file_size_bytes
  then
    raise exception using errcode='23514',message='pci_asset_promotion_size_mismatch';
  end if;

  if v_version.mime_type is not null and (
       lower(coalesce(p_source_mime_type,'')) is distinct from lower(v_version.mime_type)
       or lower(coalesce(p_destination_mime_type,'')) is distinct from lower(v_version.mime_type)
     )
  then
    raise exception using errcode='23514',message='pci_asset_promotion_mime_mismatch';
  end if;

  update pci.creative_assets
  set status='available', provisioned_at=now(),
      metadata=metadata || coalesce(p_verification_metadata,'{}'::jsonb) || jsonb_build_object(
        'promotion_verified_at',now(),
        'verification_mode','supabase_server_copy_plus_object_metadata',
        'expected_sha256',lower(v_asset.sha256),
        'source_size_bytes',p_source_size_bytes,
        'destination_size_bytes',p_destination_size_bytes,
        'source_mime_type',p_source_mime_type,
        'destination_mime_type',p_destination_mime_type
      )
  where creative_asset_id=v_asset.creative_asset_id;

  update pci.outbox
  set status='completed', completed_at=now(), locked_at=null, locked_by=null,
      last_error_code=null,last_error_message=null
  where outbox_id=v_job.outbox_id;

  perform pci.append_event(
    v_asset.workspace_id,'worker',null,v_asset.creator_id,
    'creative_asset',v_asset.creative_asset_id,
    'asset.available','provisioning','available',
    p_request_id,null,
    jsonb_build_object(
      'purchase_id',v_asset.purchase_id,
      'source_submission_version_id',v_asset.source_submission_version_id,
      'storage_bucket',v_asset.storage_bucket,
      'storage_path',v_asset.storage_path,
      'sha256',lower(v_asset.sha256)
    )
  );

  select * into v_purchase from pci.purchases p where p.purchase_id=v_asset.purchase_id for update;

  select not exists(
    select 1 from pci.creative_assets ca
    where ca.purchase_id=v_asset.purchase_id and ca.status <> 'available'
  ) into v_all_available;

  if v_all_available and v_purchase.status='agreed' then
    for v_submission in
      select s.submission_id,s.status,s.creator_id
      from pci.submissions s
      where exists (
        select 1
        from pci.creative_assets ca
        where ca.purchase_id=v_asset.purchase_id
          and ca.source_submission_id=s.submission_id
      )
      order by s.submission_id
      for update
    loop
      if v_submission.status <> 'preselected' then
        raise exception using errcode='23514',message='pci_purchase_settlement_submission_not_preselected';
      end if;

      update pci.submissions
      set status='acquired',acquired_at=now()
      where submission_id=v_submission.submission_id;

      perform pci.append_event(
        v_asset.workspace_id,'worker',null,v_submission.creator_id,
        'submission',v_submission.submission_id,
        'submission.acquired','preselected','acquired',
        p_request_id,null,
        jsonb_build_object('purchase_id',v_asset.purchase_id)
      );
    end loop;

    update pci.purchases
    set status='settled',settled_at=now()
    where purchase_id=v_purchase.purchase_id;
    v_settled_now := true;

    perform pci.append_event(
      v_asset.workspace_id,'worker',null,v_asset.creator_id,
      'purchase',v_purchase.purchase_id,
      'purchase.settled','agreed','settled',
      p_request_id,null,
      jsonb_build_object('reason','all_assets_available')
    );

    insert into pci.outbox(workspace_id,job_type,entity_type,entity_id,payload)
    values(
      v_asset.workspace_id,'notify_creator_purchase_settled','purchase',v_purchase.purchase_id,
      jsonb_build_object('creator_id',v_asset.creator_id,'purchase_id',v_purchase.purchase_id)
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'outbox_id',v_job.outbox_id,
    'creative_asset_id',v_asset.creative_asset_id,
    'asset_status','available',
    'purchase_id',v_asset.purchase_id,
    'purchase_settled_now',v_settled_now
  );
end;
$$;

create or replace function pci_api.worker_fail_asset_promotion(
  p_worker_id text,
  p_request_id uuid,
  p_outbox_id uuid,
  p_creative_asset_id uuid,
  p_error_code text,
  p_error_message text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_worker_id text := btrim(coalesce(p_worker_id,''));
  v_error_code text := left(lower(btrim(coalesce(p_error_code,'asset_promotion_failed'))),120);
  v_error_message text := left(btrim(coalesce(p_error_message,'Asset promotion failed')),1000);
  v_job pci.outbox%rowtype;
  v_asset pci.creative_assets%rowtype;
  v_exhausted boolean;
  v_delay_minutes integer;
begin
  if p_request_id is null or p_outbox_id is null or p_creative_asset_id is null or v_worker_id='' then
    raise exception using errcode='22023',message='pci_worker_failure_context_invalid';
  end if;

  select * into v_job from pci.outbox o
  where o.outbox_id=p_outbox_id and o.job_type='promote_asset'
  for update;
  select * into v_asset from pci.creative_assets ca
  where ca.creative_asset_id=p_creative_asset_id
  for update;

  if v_job.outbox_id is null then raise exception using errcode='P0002',message='pci_outbox_job_not_found'; end if;
  if v_asset.creative_asset_id is null then raise exception using errcode='P0002',message='pci_creative_asset_not_found'; end if;
  if v_job.entity_id is distinct from v_asset.creative_asset_id then raise exception using errcode='23514',message='pci_outbox_asset_mismatch'; end if;
  if v_job.status <> 'processing' or v_job.locked_by is distinct from v_worker_id then
    raise exception using errcode='23514',message='pci_outbox_job_not_owned';
  end if;

  v_exhausted := v_job.attempts >= 5;
  v_delay_minutes := least(60, greatest(1, (power(2,greatest(v_job.attempts-1,0)))::integer));

  update pci.outbox
  set status='failed',available_at=case when v_exhausted then now()+interval '100 years' else now()+make_interval(mins=>v_delay_minutes) end,
      locked_at=null,locked_by=null,last_error_code=v_error_code,last_error_message=v_error_message
  where outbox_id=v_job.outbox_id;

  if v_exhausted and v_asset.status='provisioning' then
    update pci.creative_assets
    set status='failed',metadata=metadata || jsonb_build_object(
      'promotion_failed_at',now(),'last_error_code',v_error_code,'attempts',v_job.attempts
    )
    where creative_asset_id=v_asset.creative_asset_id;

    perform pci.append_event(
      v_asset.workspace_id,'worker',null,v_asset.creator_id,
      'creative_asset',v_asset.creative_asset_id,
      'asset.provisioning_failed','provisioning','failed',
      p_request_id,null,
      jsonb_build_object('error_code',v_error_code,'attempts',v_job.attempts)
    );
  end if;

  return jsonb_build_object(
    'ok',true,'outbox_id',v_job.outbox_id,'creative_asset_id',v_asset.creative_asset_id,
    'retry_scheduled',not v_exhausted,'attempts',v_job.attempts,
    'asset_status',case when v_exhausted then 'failed' else v_asset.status end
  );
end;
$$;

revoke all on function pci_api.worker_claim_promote_asset(text,uuid) from public,anon,authenticated;
revoke all on function pci_api.worker_complete_asset_promotion(text,uuid,uuid,uuid,bigint,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function pci_api.worker_fail_asset_promotion(text,uuid,uuid,uuid,text,text) from public,anon,authenticated;

grant execute on function pci_api.worker_claim_promote_asset(text,uuid) to service_role;
grant execute on function pci_api.worker_complete_asset_promotion(text,uuid,uuid,uuid,bigint,bigint,text,text,jsonb) to service_role;
grant execute on function pci_api.worker_fail_asset_promotion(text,uuid,uuid,uuid,text,text) to service_role;

comment on function pci_api.worker_claim_promote_asset(text,uuid) is
  'Claims one due promote_asset outbox job with SKIP LOCKED and returns exact immutable source/destination context.';