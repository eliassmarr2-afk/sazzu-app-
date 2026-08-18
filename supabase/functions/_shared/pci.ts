import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export type JsonObject = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const LOCAL_ORIGINS = [
  'http://localhost:5502',
  'http://127.0.0.1:5502',
  'http://localhost:5503',
  'http://127.0.0.1:5503',
];

const ENV_ORIGINS = (Deno.env.get('PCI_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([...ENV_ORIGINS, ...LOCAL_ORIGINS]));

export function clean(value: unknown): string {
  return String(value ?? '').trim();
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requestId(request: Request): string {
  const supplied = clean(request.headers.get('x-request-id'));
  return isUuid(supplied) ? supplied.toLowerCase() : crypto.randomUUID();
}

export function idempotencyKey(request: Request): string | null {
  const value = clean(request.headers.get('idempotency-key'));
  return isUuid(value) ? value.toLowerCase() : null;
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = clean(request.headers.get('origin'));
  // Non-browser/server calls may not send Origin. Authentication still applies.
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = clean(request.headers.get('origin'));
  const selected = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0] ?? 'null';

  return {
    'Access-Control-Allow-Origin': selected,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, idempotency-key, x-request-id, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function jsonResponse(
  request: Request,
  body: JsonObject | unknown[],
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('pci_backend_not_configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function requireUser(
  request: Request,
  admin: SupabaseClient,
): Promise<{ id: string; email: string | null } | null> {
  const match = clean(request.headers.get('authorization')).match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const { data, error } = await admin.auth.getUser(clean(match[1]));
  if (error || !data?.user?.id) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function readJsonObject(request: Request): Promise<JsonObject> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new Error('invalid_json');
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_payload');
  }

  return value as JsonObject;
}

export function assertAllowedFields(payload: JsonObject, allowed: string[]): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(payload).filter((key) => !allowedSet.has(key));
  if (unexpected.length) {
    throw new Error(`unexpected_fields:${unexpected.join(',')}`);
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = canonicalize(source[key]);
    }
    return result;
  }
  return value;
}

export async function requestHash(route: string, payload: unknown): Promise<string> {
  const body = JSON.stringify({ route, payload: canonicalize(payload) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function relativePath(request: Request, functionSlug: string): string {
  const pathname = new URL(request.url).pathname;
  const prefix = `/functions/v1/${functionSlug}`;
  if (pathname.startsWith(prefix)) {
    return pathname.slice(prefix.length) || '/';
  }
  const fallback = `/${functionSlug}`;
  if (pathname.startsWith(fallback)) {
    return pathname.slice(fallback.length) || '/';
  }
  return pathname;
}

export function storageTusEndpoint(): string {
  if (!SUPABASE_URL) return '';
  return SUPABASE_URL.replace('.supabase.co', '.storage.supabase.co') + '/storage/v1/upload/resumable';
}

export async function pciRpc<T = unknown>(
  admin: SupabaseClient,
  functionName: string,
  args: JsonObject,
): Promise<T> {
  const { data, error } = await admin
    .schema('pci_api')
    .rpc(functionName, args);

  if (error) {
    const err = new Error(clean(error.message) || 'pci_rpc_failed');
    (err as Error & { code?: string; details?: string }).code = clean(error.code);
    (err as Error & { code?: string; details?: string }).details = clean(error.details);
    throw err;
  }

  return data as T;
}

const CONFLICT_CODES = new Set([
  'idempotency_key_reused_with_different_payload',
  'idempotent_command_not_replayable',
  'consignment_not_draft',
  'consignment_not_open',
  'consignment_deadline_passed',
  'consignment_not_accepting_submissions',
  'participation_not_active',
  'participation_cannot_be_activated',
  'submission_limit_reached',
  'submission_version_limit_reached',
  'submission_version_not_allowed_in_current_state',
]);

const FORBIDDEN_CODES = new Set([
  'operator_workspace_forbidden',
  'operator_write_forbidden',
  'creator_restricted',
  'creator_suspended',
  'creator_not_active',
  'creator_workspace_relationship_not_found',
  'creator_workspace_restricted',
  'creator_workspace_suspended',
  'creator_workspace_closed',
  'creator_workspace_not_active',
  'consignment_invitation_required',
]);

const NOT_FOUND_CODES = new Set([
  'creator_identity_not_found',
  'consignment_not_found',
  'consignment_draft_revision_not_found',
  'participation_not_found',
  'submission_not_found',
]);

const VALIDATION_CODES = new Set([
  'consignment_title_required',
  'invalid_consignment_visibility',
  'invalid_deliverable_type',
  'invalid_compensation_mode',
  'invalid_currency',
  'consignment_revision_not_published',
  'unsupported_submission_mime_type',
]);

export function normalizeError(error: unknown): { status: number; code: string; message: string } {
  const raw = error instanceof Error ? clean(error.message) : clean(error);
  const code = raw.split('\n')[0] || 'internal_error';

  if (code.startsWith('unexpected_fields:')) {
    return { status: 400, code: 'unexpected_fields', message: code.slice('unexpected_fields:'.length) };
  }
  if (code === 'invalid_json' || code === 'invalid_payload' || VALIDATION_CODES.has(code)) {
    return { status: 400, code, message: code };
  }
  if (FORBIDDEN_CODES.has(code)) return { status: 403, code, message: code };
  if (NOT_FOUND_CODES.has(code)) return { status: 404, code, message: code };
  if (CONFLICT_CODES.has(code)) return { status: 409, code, message: code };
  if (code === 'creator_account_closed') return { status: 403, code, message: code };

  return { status: 500, code: 'internal_error', message: 'Internal PCI error.' };
}
