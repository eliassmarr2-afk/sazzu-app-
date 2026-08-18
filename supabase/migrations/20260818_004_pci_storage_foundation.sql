-- ============================================================================
-- Protocol Creative Insights (PCI)
-- Fase 1 · Private Storage foundation
--
-- Creators do NOT receive general INSERT/SELECT policies on these buckets.
-- Uploads are authorized by trusted backend code using signed upload tokens for
-- one exact object path. Reads will use short-lived signed URLs.
-- ============================================================================

begin;

-- 250 MiB: intentionally generous for short advertising videos while keeping
-- an operational ceiling for the MVP.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pci-submissions',
  'pci-submissions',
  false,
  262144000,
  array[
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pci-assets',
  'pci-assets',
  false,
  262144000,
  array[
    'video/mp4',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pci-rights-documents',
  'pci-rights-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pci-payout-proofs',
  'pci-payout-proofs',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pci-message-attachments',
  'pci-message-attachments',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No creator-facing storage.objects policies are created. The service role is
-- the only normal role allowed to manage PCI bucket objects.

drop policy if exists "pci_service_role_manage_submissions" on storage.objects;
create policy "pci_service_role_manage_submissions"
on storage.objects
for all
to public
using (
  auth.role() = 'service_role'
  and bucket_id = 'pci-submissions'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'pci-submissions'
);

drop policy if exists "pci_service_role_manage_assets" on storage.objects;
create policy "pci_service_role_manage_assets"
on storage.objects
for all
to public
using (
  auth.role() = 'service_role'
  and bucket_id = 'pci-assets'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'pci-assets'
);

drop policy if exists "pci_service_role_manage_rights_documents" on storage.objects;
create policy "pci_service_role_manage_rights_documents"
on storage.objects
for all
to public
using (
  auth.role() = 'service_role'
  and bucket_id = 'pci-rights-documents'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'pci-rights-documents'
);

drop policy if exists "pci_service_role_manage_payout_proofs" on storage.objects;
create policy "pci_service_role_manage_payout_proofs"
on storage.objects
for all
to public
using (
  auth.role() = 'service_role'
  and bucket_id = 'pci-payout-proofs'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'pci-payout-proofs'
);

drop policy if exists "pci_service_role_manage_message_attachments" on storage.objects;
create policy "pci_service_role_manage_message_attachments"
on storage.objects
for all
to public
using (
  auth.role() = 'service_role'
  and bucket_id = 'pci-message-attachments'
)
with check (
  auth.role() = 'service_role'
  and bucket_id = 'pci-message-attachments'
);

commit;
