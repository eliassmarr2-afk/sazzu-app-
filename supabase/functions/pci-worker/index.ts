import { createClient } from "https://esm.sh/@supabase/supabase-js@2.111.0";

type JsonRecord = Record<string, unknown>;
type SupabaseAdmin = ReturnType<typeof createClient>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PCI_WORKER_SECRET = Deno.env.get("PCI_WORKER_SECRET") ?? "";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function json(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
    },
  });
}

function adminClient(): SupabaseAdmin {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("pci_worker_backend_not_configured");
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function normalizePathname(url: URL): string {
  const marker = "/pci-worker";
  const index = url.pathname.indexOf(marker);
  if (index < 0) return url.pathname;
  return url.pathname.slice(index + marker.length) || "/";
}

async function safeSecretEquals(received: string, expected: string): Promise<boolean> {
  if (!received || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function parseBody(request: Request): Promise<JsonRecord> {
  const text = await request.text();
  if (!text.trim()) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
  return value as JsonRecord;
}

async function rpc(admin: SupabaseAdmin, name: string, args: JsonRecord): Promise<JsonRecord> {
  const { data, error } = await admin.schema("pci_api").rpc(name, args);
  if (error) throw new Error(`${name}:${clean(error.message)}`);
  return (data ?? {}) as JsonRecord;
}

type StorageObject = {
  exists: boolean;
  size: number | null;
  mimeType: string | null;
  objectId: string | null;
};

async function inspectObject(admin: SupabaseAdmin, bucket: string, path: string): Promise<StorageObject> {
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const filename = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, search: filename });
  if (error) throw new Error(`storage_inspection_failed:${clean(error.message)}`);
  const object = (data ?? []).find((entry) => entry.name === filename);
  if (!object) return { exists: false, size: null, mimeType: null, objectId: null };

  const metadata = (object.metadata ?? {}) as JsonRecord;
  const rawSize = metadata.size;
  const size = typeof rawSize === "number"
    ? rawSize
    : Number.isFinite(Number(rawSize)) ? Number(rawSize) : null;
  const mimeType = clean(metadata.mimetype || metadata.contentType || metadata.content_type).toLowerCase() || null;

  return {
    exists: true,
    size,
    mimeType,
    objectId: clean(object.id) || null,
  };
}

function objectMatches(object: StorageObject, expectedSize: number, expectedMime: string): boolean {
  if (!object.exists || object.size == null || object.size !== expectedSize) return false;
  if (!expectedMime || object.mimeType !== expectedMime) return false;
  return true;
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("source_object_missing")) return "source_object_missing";
  if (message.includes("source_metadata_mismatch")) return "source_metadata_mismatch";
  if (message.includes("destination_object_conflict")) return "destination_object_conflict";
  if (message.includes("destination_verification_failed")) return "destination_verification_failed";
  if (message.includes("storage_copy_failed")) return "storage_copy_failed";
  if (message.includes("storage_inspection_failed")) return "storage_inspection_failed";
  return "asset_promotion_failed";
}

async function failJob(
  admin: SupabaseAdmin,
  workerId: string,
  requestId: string,
  job: JsonRecord,
  error: unknown,
): Promise<JsonRecord> {
  const outboxId = clean(job.outbox_id).toLowerCase();
  const assetId = clean(job.creative_asset_id).toLowerCase();
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : String(error);

  if (!isUuid(outboxId) || !isUuid(assetId)) {
    return { ok: false, code: "worker_job_context_invalid" };
  }

  try {
    return await rpc(admin, "worker_fail_asset_promotion", {
      p_worker_id: workerId,
      p_request_id: requestId,
      p_outbox_id: outboxId,
      p_creative_asset_id: assetId,
      p_error_code: code,
      p_error_message: message.slice(0, 900),
    });
  } catch {
    // Do not expose internal Storage paths or DB errors. A stale processing lease
    // can be reclaimed after 15 minutes if this failure write itself could not commit.
    return { ok: false, code: "worker_failure_persistence_failed", creative_asset_id: assetId };
  }
}

async function processClaimedJob(
  admin: SupabaseAdmin,
  workerId: string,
  requestId: string,
  job: JsonRecord,
): Promise<JsonRecord> {
  const outboxId = clean(job.outbox_id).toLowerCase();
  const assetId = clean(job.creative_asset_id).toLowerCase();
  const sourceBucket = clean(job.source_bucket);
  const sourcePath = clean(job.source_path);
  const destinationBucket = clean(job.destination_bucket);
  const destinationPath = clean(job.destination_path);
  const expectedSize = Number(job.expected_size_bytes);
  const expectedMime = clean(job.expected_mime_type).toLowerCase();

  if (!isUuid(outboxId) || !isUuid(assetId)
      || sourceBucket !== "pci-submissions" || destinationBucket !== "pci-assets"
      || !sourcePath || !destinationPath
      || !Number.isSafeInteger(expectedSize) || expectedSize <= 0
      || !["video/mp4", "video/quicktime", "image/jpeg", "image/png", "image/webp"].includes(expectedMime)) {
    throw new Error("worker_job_context_invalid");
  }

  const source = await inspectObject(admin, sourceBucket, sourcePath);
  if (!source.exists) throw new Error("source_object_missing");
  if (!objectMatches(source, expectedSize, expectedMime)) throw new Error("source_metadata_mismatch");

  let destination = await inspectObject(admin, destinationBucket, destinationPath);
  let reusedExistingDestination = false;

  if (destination.exists) {
    if (!objectMatches(destination, expectedSize, expectedMime)) {
      throw new Error("destination_object_conflict");
    }
    reusedExistingDestination = true;
  } else {
    const { error: copyError } = await admin.storage
      .from(sourceBucket)
      .copy(sourcePath, destinationPath, { destinationBucket });

    if (copyError) {
      // A network response can fail after Storage already committed the copy.
      // Re-inspect before classifying it as a failed operation.
      destination = await inspectObject(admin, destinationBucket, destinationPath);
      if (!objectMatches(destination, expectedSize, expectedMime)) {
        throw new Error(`storage_copy_failed:${clean(copyError.message)}`);
      }
      reusedExistingDestination = true;
    } else {
      destination = await inspectObject(admin, destinationBucket, destinationPath);
    }
  }

  if (!objectMatches(destination, expectedSize, expectedMime)) {
    throw new Error("destination_verification_failed");
  }

  return await rpc(admin, "worker_complete_asset_promotion", {
    p_worker_id: workerId,
    p_request_id: requestId,
    p_outbox_id: outboxId,
    p_creative_asset_id: assetId,
    p_source_size_bytes: source.size,
    p_destination_size_bytes: destination.size,
    p_source_mime_type: source.mimeType,
    p_destination_mime_type: destination.mimeType,
    p_verification_metadata: {
      worker_version: "1L-v1",
      storage_copy_mode: "server_side_cross_bucket",
      reused_existing_destination: reusedExistingDestination,
      source_object_id: source.objectId,
      destination_object_id: destination.objectId,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, code: "method_not_allowed" }, 405);
  }

  const path = normalizePathname(new URL(request.url));
  if (path !== "/v1/run") return json({ ok: false, code: "route_not_found" }, 404);

  if (!PCI_WORKER_SECRET) return json({ ok: false, code: "worker_not_configured" }, 503);
  const authorized = await safeSecretEquals(clean(request.headers.get("x-pci-worker-secret")), PCI_WORKER_SECRET);
  if (!authorized) return json({ ok: false, code: "unauthorized" }, 401);

  let payload: JsonRecord;
  try {
    payload = await parseBody(request);
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }

  const unexpected = Object.keys(payload).filter((key) => key !== "max_jobs");
  if (unexpected.length) return json({ ok: false, code: "unexpected_fields", fields: unexpected }, 400);

  const requestedMax = payload.max_jobs == null ? 1 : Number(payload.max_jobs);
  if (!Number.isInteger(requestedMax) || requestedMax < 1 || requestedMax > 5) {
    return json({ ok: false, code: "invalid_max_jobs" }, 400);
  }

  let admin: SupabaseAdmin;
  try {
    admin = adminClient();
  } catch {
    return json({ ok: false, code: "worker_not_configured" }, 503);
  }

  const workerId = `pci-worker:${crypto.randomUUID()}`;
  const results: JsonRecord[] = [];

  for (let index = 0; index < requestedMax; index += 1) {
    const reqId = crypto.randomUUID();
    let claim: JsonRecord;
    try {
      claim = await rpc(admin, "worker_claim_promote_asset", {
        p_worker_id: workerId,
        p_request_id: reqId,
      });
    } catch {
      results.push({ ok: false, code: "worker_claim_failed" });
      break;
    }

    const job = claim.job && typeof claim.job === "object" && !Array.isArray(claim.job)
      ? claim.job as JsonRecord
      : null;

    if (!job) break;

    try {
      const completed = await processClaimedJob(admin, workerId, reqId, job);
      results.push({
        ok: true,
        creative_asset_id: completed.creative_asset_id,
        asset_status: completed.asset_status,
        purchase_id: completed.purchase_id,
        purchase_settled_now: completed.purchase_settled_now,
      });
    } catch (error) {
      const failed = await failJob(admin, workerId, reqId, job, error);
      results.push({
        ok: false,
        creative_asset_id: clean(job.creative_asset_id) || null,
        code: clean(failed.code) || errorCode(error),
        retry_scheduled: failed.retry_scheduled ?? null,
      });
    }
  }

  return json({
    ok: results.every((item) => item.ok === true),
    processed: results.length,
    results,
  });
});