(function () {
  "use strict";

  const EXPECTED_PROJECT_REF = "dgpmdqmdwqyiwhkbiakd";
  const EXPECTED_ORIGIN =
    `https://${EXPECTED_PROJECT_REF}.supabase.co`;
  const EXPECTED_ADMIN_API =
    `${EXPECTED_ORIGIN}/functions/v1/pci-admin-api`;
  const EXPECTED_WORKSPACE = "pci-runtime-test";

  let clientPromise = null;

  function clean(value) {
    return String(value ?? "").trim().replace(/\/+$/g, "");
  }

  function config() {
    return window.PCI_OPERATOR_RUNTIME_CONFIG || null;
  }

  function assertDisposableRuntime() {
    const cfg = config();

    const localHost = [
      "localhost",
      "127.0.0.1",
      "::1"
    ].includes(window.location.hostname);

    if (
      !cfg ||
      cfg.localOnly !== true ||
      !localHost ||
      cfg.projectRef !== EXPECTED_PROJECT_REF ||
      clean(cfg.supabaseUrl) !== EXPECTED_ORIGIN ||
      clean(cfg.adminApiUrl) !== EXPECTED_ADMIN_API ||
      cfg.workspaceId !== EXPECTED_WORKSPACE ||
      !String(cfg.publishableKey || "").trim() ||
      !String(cfg.storageKey || "").trim()
    ) {
      const error = new Error(
        "pci_runtime_project_guard_failed"
      );

      error.code = "blocked_non_disposable_runtime";
      throw error;
    }

    return cfg;
  }

  async function getClient() {
    const cfg = assertDisposableRuntime();

    if (!clientPromise) {
      clientPromise = import(
        "https://esm.sh/@supabase/supabase-js@2.102.0"
      ).then(({ createClient }) => {
        return createClient(
          cfg.supabaseUrl,
          cfg.publishableKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
              storageKey: cfg.storageKey
            }
          }
        );
      });
    }

    return clientPromise;
  }

  async function getSession() {
    const client = await getClient();

    const { data, error } =
      await client.auth.getSession();

    if (error) throw error;

    return data?.session || null;
  }

  async function getVerifiedUser() {
    const client = await getClient();

    const { data, error } =
      await client.auth.getUser();

    if (error) return null;

    return data?.user || null;
  }

  async function signInWithPassword(email, password) {
    assertDisposableRuntime();

    const client = await getClient();

    const { data, error } =
      await client.auth.signInWithPassword({
        email: String(email || "").trim().toLowerCase(),
        password: String(password || "")
      });

    if (error) throw error;

    return {
      ok: true,
      signedIn: Boolean(data?.session?.access_token),
      user: data?.user
        ? {
            id: data.user.id,
            email: data.user.email
          }
        : null
    };
  }

  async function sendMagicLink(email) {
    assertDisposableRuntime();

    const client = await getClient();

    const redirect = new URL(window.location.href);
    redirect.search = "";
    redirect.hash = "";

    const { error } =
      await client.auth.signInWithOtp({
        email: String(email || "").trim().toLowerCase(),
        options: {
          shouldCreateUser: false,
          emailRedirectTo: redirect.toString()
        }
      });

    if (error) throw error;

    return { ok: true };
  }

  async function signOut() {
    const client = await getClient();

    const { error } =
      await client.auth.signOut();

    if (error) throw error;

    return { ok: true };
  }

  async function request(path, options = {}) {
    const cfg = assertDisposableRuntime();
    const session = await getSession();

    if (!session?.access_token) {
      const error = new Error(
        "pci_auth_session_required"
      );
      error.code = "pci_auth_session_required";
      throw error;
    }

    const response = await fetch(
      `${cfg.adminApiUrl}${path}`,
      {
        ...options,
        headers: {
          apikey: cfg.publishableKey,
          Authorization:
            `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      }
    );

    let body = null;

    try {
      body = await response.json();
    } catch (_) {}

    if (!response.ok) {
      const error = new Error(
        body?.code || `pci_http_${response.status}`
      );

      error.status = response.status;
      error.code =
        body?.code || `pci_http_${response.status}`;
      error.payload = body;

      throw error;
    }

    return body || {};
  }

  async function getDashboard() {
    const cfg = assertDisposableRuntime();

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/dashboard`,
      { method: "GET" }
    );
  }

  async function getReviewQueue() {
    const cfg = assertDisposableRuntime();

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/review-queue`,
      { method: "GET" }
    );
  }

  async function getSubmissionDetail(submissionId) {
    const cfg = assertDisposableRuntime();
    const id = String(submissionId || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error("invalid_submission_id");
      error.code = "invalid_submission_id";
      throw error;
    }

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
  }

  async function getSubmissionReviewContext(submissionId) {
    const cfg = assertDisposableRuntime();
    const id = String(submissionId || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error("invalid_submission_id");
      error.code = "invalid_submission_id";
      throw error;
    }

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${encodeURIComponent(id)}/review-context`,
      { method: "GET" }
    );
  }

  // PCI 2.1N · PRIVATE SUBMISSION PLAYBACK RUNTIME
  async function getSubmissionVersionPlayback(
    submissionVersionId
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(
      submissionVersionId || ""
    ).trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_version_id"
      );

      error.code =
        "invalid_submission_version_id";

      throw error;
    }

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submission-versions/${
        encodeURIComponent(id)
      }/playback`,
      {
        method: "POST"
      }
    );
  }

  // PCI 2.1O · REVIEW NEGOTIATION RUNTIME
  async function getAdminNegotiations() {
    const cfg = assertDisposableRuntime();

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/negotiations`,
      { method: "GET" }
    );
  }

  async function openSubmissionNegotiation(
    submissionId
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(
      submissionId || ""
    ).trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_id"
      );
      error.code = "invalid_submission_id";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${
        encodeURIComponent(id)
      }/negotiation/open`,
      {}
    );
  }

  function createIdempotencyKey() {
    if (
      !window.crypto ||
      typeof window.crypto.randomUUID !== "function"
    ) {
      const error = new Error(
        "pci_idempotency_generator_unavailable"
      );
      error.code =
        "pci_idempotency_generator_unavailable";
      throw error;
    }

    return window.crypto.randomUUID();
  }

  async function postIdempotent(path, payload = {}) {
    const idempotencyKey =
      createIdempotencyKey();

    return request(path, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        idempotency_key: idempotencyKey
      })
    });
  }

  async function setSubmissionVersionRightsClearance(
    submissionVersionId,
    clearanceStatus,
    reason = null
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(
      submissionVersionId || ""
    ).trim();

    const status = String(
      clearanceStatus || ""
    ).trim().toLowerCase();

    const cleanReason = String(
      reason || ""
    ).trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_version_id"
      );
      error.code =
        "invalid_submission_version_id";
      throw error;
    }

    if (!["complete", "flagged"].includes(status)) {
      const error = new Error(
        "pci_rights_clearance_status_invalid"
      );
      error.code =
        "pci_rights_clearance_status_invalid";
      throw error;
    }

    if (status === "flagged" && !cleanReason) {
      const error = new Error(
        "pci_rights_clearance_reason_required"
      );
      error.code =
        "pci_rights_clearance_reason_required";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/versions/${
        encodeURIComponent(id)
      }/rights-clearance`,
      {
        clearance_status: status,
        reason: cleanReason || null
      }
    );
  }

  async function startSubmissionReview(
    submissionId
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(submissionId || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_id"
      );

      error.code = "invalid_submission_id";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${
        encodeURIComponent(id)
      }/review/start`
    );
  }

  async function preselectSubmission(
    submissionId,
    creatorFeedback = null,
    internalSummary = null
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(
      submissionId || ""
    ).trim();

    const feedback = String(
      creatorFeedback || ""
    ).trim();

    const summary = String(
      internalSummary || ""
    ).trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_id"
      );

      error.code = "invalid_submission_id";
      throw error;
    }

    if (
      feedback.length > 5000 ||
      summary.length > 5000
    ) {
      const error = new Error(
        "invalid_review_text"
      );

      error.code = "invalid_review_text";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${
        encodeURIComponent(id)
      }/review/preselect`,
      {
        creator_feedback:
          feedback || null,
        internal_summary:
          summary || null
      }
    );
  }

  async function requestSubmissionChanges(
    submissionId,
    creatorFeedback,
    internalSummary = null
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(
      submissionId || ""
    ).trim();

    const feedback = String(
      creatorFeedback || ""
    ).trim();

    const summary = String(
      internalSummary || ""
    ).trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_id"
      );
      error.code = "invalid_submission_id";
      throw error;
    }

    if (!feedback || feedback.length > 5000) {
      const error = new Error(
        "invalid_review_text"
      );
      error.code = "invalid_review_text";
      throw error;
    }

    if (summary.length > 5000) {
      const error = new Error(
        "invalid_review_text"
      );
      error.code = "invalid_review_text";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${
        encodeURIComponent(id)
      }/review/request-changes`,
      {
        creator_feedback: feedback,
        internal_summary: summary || null
      }
    );
  }

  async function addSubmissionInternalNote(
    submissionId,
    body
  ) {
    const cfg = assertDisposableRuntime();

    const id = String(submissionId || "").trim();
    const note = String(body || "").trim();

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const error = new Error(
        "invalid_submission_id"
      );
      error.code = "invalid_submission_id";
      throw error;
    }

    if (!note || note.length > 5000) {
      const error = new Error(
        "invalid_internal_note"
      );
      error.code = "invalid_internal_note";
      throw error;
    }

    return postIdempotent(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions/${
        encodeURIComponent(id)
      }/internal-notes`,
      { body: note }
    );
  }

  async function getSubmissions(options = {}) {
    const cfg = assertDisposableRuntime();

    const status = String(options.status || "")
      .trim()
      .toLowerCase();

    const limit = Number.isInteger(options.limit)
      ? options.limit
      : 25;

    const offset = Number.isInteger(options.offset)
      ? options.offset
      : 0;

    const params = new URLSearchParams();

    if (status) params.set("status", status);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    return request(
      `/v1/workspaces/${
        encodeURIComponent(cfg.workspaceId)
      }/submissions?${params.toString()}`,
      { method: "GET" }
    );
  }

  async function getConnectionState() {
    const cfg = assertDisposableRuntime();
    const session = await getSession();

    if (!session?.access_token) {
      return {
        ok: true,
        runtime: true,
        signedIn: false,
        projectRef: cfg.projectRef,
        workspaceId: cfg.workspaceId
      };
    }

    const user = await getVerifiedUser();

    return {
      ok: true,
      runtime: true,
      signedIn: Boolean(user?.id),
      projectRef: cfg.projectRef,
      workspaceId: cfg.workspaceId,
      user: user
        ? {
            id: user.id,
            email: user.email
          }
        : null
    };
  }


  // PCI 2.1H.1B.2B · CREATOR INVITATION RUNTIME
  async function invitationRequest(
    path,
    options = {}
  ) {
    const cfg =
      assertDisposableRuntime();

    const session =
      await getSession();

    if (
      !session?.access_token
    ) {
      const error = new Error(
        "pci_auth_session_required"
      );

      error.code =
        "pci_auth_session_required";

      throw error;
    }

    const invitationApiUrl =
      `${clean(
        cfg.supabaseUrl
      )}/functions/v1/pci-invitation-api`;

    const response =
      await fetch(
        `${invitationApiUrl}${path}`,
        {
          ...options,
          headers: {
            apikey:
              cfg.publishableKey,
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type":
              "application/json",
            ...(options.headers || {})
          }
        }
      );

    let body = null;

    try {
      body =
        await response.json();
    } catch (_) {}

    if (!response.ok) {
      const error = new Error(
        body?.code ||
        `pci_http_${response.status}`
      );

      error.status =
        response.status;

      error.code =
        body?.code ||
        `pci_http_${response.status}`;

      error.payload =
        body;

      throw error;
    }

    return body || {};
  }

  async function createCreatorInvitation(
    payload = {}
  ) {
    const cfg =
      assertDisposableRuntime();

    const email =
      String(
        payload.email || ""
      )
        .trim()
        .toLowerCase();

    const displayName =
      String(
        payload.display_name || ""
      ).trim();

    const legalName =
      String(
        payload.legal_name || ""
      ).trim();

    const expiresInHours =
      Number(
        payload.expires_in_hours ?? 72
      );

    if (
      !email ||
      email.length > 320 ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
        email
      )
    ) {
      const error = new Error(
        "pci_creator_invitation_email_invalid"
      );

      error.code =
        "pci_creator_invitation_email_invalid";

      throw error;
    }

    if (
      !displayName ||
      displayName.length > 160
    ) {
      const error = new Error(
        "pci_creator_display_name_invalid"
      );

      error.code =
        "pci_creator_display_name_invalid";

      throw error;
    }

    if (
      legalName.length > 240
    ) {
      const error = new Error(
        "pci_creator_legal_name_invalid"
      );

      error.code =
        "pci_creator_legal_name_invalid";

      throw error;
    }

    if (
      ![24, 72, 168].includes(
        expiresInHours
      )
    ) {
      const error = new Error(
        "pci_creator_invitation_expiry_invalid"
      );

      error.code =
        "pci_creator_invitation_expiry_invalid";

      throw error;
    }

    return invitationRequest(
      `/v1/admin/workspaces/${
        encodeURIComponent(
          cfg.workspaceId
        )
      }/invitations`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key":
            createIdempotencyKey()
        },
        body: JSON.stringify({
          email,
          display_name:
            displayName,
          legal_name:
            legalName || null,
          expires_in_hours:
            expiresInHours
        })
      }
    );
  }


  // PCI 2.1H.1B.2C · INVITATION REVOCATION RUNTIME
  async function revokeCreatorInvitation(
    invitationId,
    reason
  ) {
    const cfg =
      assertDisposableRuntime();

    const id =
      String(
        invitationId || ""
      ).trim();

    const cleanReason =
      String(
        reason || ""
      ).trim();

    if (
      !/^[0-9a-f-]{36}$/i.test(id)
    ) {
      const error = new Error(
        "invalid_invitation_id"
      );

      error.code =
        "invalid_invitation_id";

      throw error;
    }

    if (
      !cleanReason ||
      cleanReason.length > 500
    ) {
      const error = new Error(
        "pci_creator_invitation_revocation_context_invalid"
      );

      error.code =
        "pci_creator_invitation_revocation_context_invalid";

      throw error;
    }

    return invitationRequest(
      `/v1/admin/workspaces/${
        encodeURIComponent(
          cfg.workspaceId
        )
      }/invitations/${
        encodeURIComponent(id)
      }/revoke`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key":
            createIdempotencyKey()
        },
        body: JSON.stringify({
          reason: cleanReason
        })
      }
    );
  }

  window.PCIRuntime = Object.freeze({
    getClient,
    getSession,
    getVerifiedUser,
    getConnectionState,
    signInWithPassword,
    sendMagicLink,
    signOut,
    request,
    getDashboard,
    getReviewQueue,
    getSubmissionDetail,
    getSubmissionReviewContext,
    getSubmissionVersionPlayback,
    getAdminNegotiations,
    openSubmissionNegotiation,
    getSubmissions,
    addSubmissionInternalNote,
    startSubmissionReview,
    setSubmissionVersionRightsClearance,
    requestSubmissionChanges,
    preselectSubmission,
    createCreatorInvitation,
    revokeCreatorInvitation
  });
})();
