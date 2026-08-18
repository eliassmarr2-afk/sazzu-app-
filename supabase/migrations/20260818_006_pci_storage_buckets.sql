-- Protocol Creative Insights (PCI)
-- Private Storage buckets. No direct anon/authenticated object policies are created.
-- Signed upload/download access will be issued by authenticated PCI Edge Functions.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'pci-submissions',
    'pci-submissions',
    false,
    262144000,
    array['video/mp4','video/quicktime']::text[]
  ),
  (
    'pci-rights-documents',
    'pci-rights-documents',
    false,
    20971520,
    array['application/pdf','image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'pci-assets',
    'pci-assets',
    false,
    262144000,
    array['video/mp4','video/quicktime','image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'pci-payout-proofs',
    'pci-payout-proofs',
    false,
    20971520,
    array['application/pdf','image/jpeg','image/png','image/webp']::text[]
  ),
  (
    'pci-message-attachments',
    'pci-message-attachments',
    false,
    20971520,
    array['application/pdf','image/jpeg','image/png','image/webp']::text[]
  )
on conflict (id) do nothing;

-- Do not add broad INSERT/SELECT policies on storage.objects for these buckets.
-- service_role is used server-side to create narrowly scoped signed upload/download URLs.

comment on table pci.submission_versions is
  'Storage paths are server-reserved and immutable after version status becomes ready; files are never upserted in place.';
