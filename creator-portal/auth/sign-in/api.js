import { getSupabaseClient, isDemoMode } from '../../api-client.js';

export async function requestCreatorMagicLink(email, redirectTo) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('pci_sign_in_email_invalid');
  }

  if (isDemoMode()) return { ok: true, demo: true };

  const client = await getSupabaseClient();
  let result;
  try {
    result = await client.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });
  } catch (error) {
    const wrapped = new Error('pci_sign_in_network_error');
    wrapped.cause = error;
    throw wrapped;
  }

  // Auth intentionally may not distinguish unknown accounts from other non-passwordless cases.
  // The UI returns a generic delivery message and never exposes result.error verbatim.
  return {
    ok: true,
    delivery_attempted: true,
    auth_error_status: Number(result?.error?.status) || null,
    auth_error_code: String(result?.error?.code || ''),
  };
}
