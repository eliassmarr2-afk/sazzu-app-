-- Protocol Creative Insights (PCI)
-- Runtime-test only configuration.
-- DO NOT apply to production.
-- Creates a Vault token for scheduled worker calls and invokes pci-worker every minute.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.secrets
    WHERE name = 'pci_worker_scheduler_secret'
  ) THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'pci_worker_scheduler_secret',
      'Protocol Creative Insights runtime-test scheduler token for pci-worker',
      NULL
    );
  END IF;
END;
$$;

SELECT cron.unschedule('pci-worker-promote-assets')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'pci-worker-promote-assets'
);

SELECT cron.schedule(
  'pci-worker-promote-assets',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://dgpmdqmdwqyiwhkbiakd.supabase.co/functions/v1/pci-worker/v1/run',
      body := '{"max_jobs":5}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-pci-worker-secret', (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'pci_worker_scheduler_secret'
          ORDER BY created_at DESC
          LIMIT 1
        )
      ),
      timeout_milliseconds := 30000
    );
  $cron$
);
