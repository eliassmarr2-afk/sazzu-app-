/* =========================================================
   Protocol Data · Supabase Auth bridge
   Backend 1E-B3

   Alcance:
   - Sesión real Supabase Auth en browser.
   - Persistencia + refresh automático.
   - Login email/password.
   - Guard de sesión para Protocol Data.
   - Helper seguro para invocar protocol-meta-read con JWT de usuario.
   - NO contiene service_role ni secretos privados.
   ========================================================= */
(function () {
  "use strict";

  const SUPABASE_PROJECT_URL = "https://cuuzsbhpjmjbbnghtiny.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dXpzYmhwam1qYmJuZ2h0aW55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTIzNzIsImV4cCI6MjA5MzU4ODM3Mn0.PyPn6Dy85vXhzQWwASI8btWJJHoe65XTjn8nygTbiMw";
  const SUPABASE_ESM_URL = "https://esm.sh/@supabase/supabase-js@2";

  let clientPromise = null;

  function getClient_() {
    if (!clientPromise) {
      clientPromise = import(SUPABASE_ESM_URL).then(function (module) {
        if (!module || typeof module.createClient !== "function") {
          throw new Error("No se pudo inicializar Supabase Auth.");
        }

        return module.createClient(SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: "protocol-data-auth-v1"
          }
        });
      });
    }

    return clientPromise;
  }

  async function getSession_() {
    const client = await getClient_();
    const result = await client.auth.getSession();
    if (result.error) throw result.error;
    return result.data && result.data.session ? result.data.session : null;
  }

  async function getVerifiedUser_() {
    const client = await getClient_();
    const result = await client.auth.getUser();
    if (result.error) return null;
    return result.data && result.data.user ? result.data.user : null;
  }

  async function signInWithPassword_(email, password) {
    const client = await getClient_();
    return client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    });
  }

  async function signOut_() {
    const client = await getClient_();
    return client.auth.signOut();
  }

  async function requireSession_(options) {
    const opts = options || {};
    const redirectTo = String(opts.redirectTo || "").trim();

    try {
      const session = await getSession_();
      if (!session || !session.access_token) {
        if (redirectTo) window.location.replace(redirectTo);
        return null;
      }

      const user = await getVerifiedUser_();
      if (!user || !user.id) {
        try {
          await signOut_();
        } catch (_) {}
        if (redirectTo) window.location.replace(redirectTo);
        return null;
      }

      return {
        session,
        user
      };
    } catch (error) {
      console.warn("[ProtocolAuth] No se pudo validar la sesión:", error);
      if (redirectTo) window.location.replace(redirectTo);
      return null;
    }
  }

  async function invokeMetaRead_(payload) {
    const session = await getSession_();
    if (!session || !session.access_token) {
      const error = new Error("Se requiere una sesión autenticada de Protocol Data.");
      error.code = "authentication_required";
      throw error;
    }

    const response = await fetch(
      SUPABASE_PROJECT_URL + "/functions/v1/protocol-meta-read",
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + session.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
      }
    );

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = text;
    }

    if (!response.ok) {
      const message = data && data.message
        ? data.message
        : "Error consultando datos Meta.";
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  window.ProtocolAuth = {
    projectUrl: SUPABASE_PROJECT_URL,
    ready: getClient_,
    getClient: getClient_,
    getSession: getSession_,
    getVerifiedUser: getVerifiedUser_,
    signInWithPassword: signInWithPassword_,
    signOut: signOut_,
    requireSession: requireSession_,
    invokeMetaRead: invokeMetaRead_
  };
})();
