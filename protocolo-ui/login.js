/* =========================================================
   Protocol Data · Login
   - Conserva animación visual existente.
   - Agrega autenticación real Supabase email/password.
   ========================================================= */
(function () {
  "use strict";

  const text = [
    { word: "Recolecta", class: "word-data" },
    { word: " datos", class: "word-data" },
    { word: " y", class: "" },
    { word: " actúa", class: "word-action" },
    { word: " para", class: "" },
    { word: " la", class: "" },
    { word: " eficiencia", class: "word-efficiency" }
  ];

  const container = document.getElementById("typed-text");

  let wordIndex = 0;
  let charIndex = 0;

  function type() {
    if (!container) return;

    if (wordIndex < text.length) {
      const currentWord = text[wordIndex].word;
      const currentClass = text[wordIndex].class;

      if (charIndex < currentWord.length) {
        const span = document.createElement("span");
        span.className = currentClass;
        span.textContent = currentWord.charAt(charIndex);
        container.appendChild(span);

        charIndex++;
        setTimeout(type, 40);
      } else {
        wordIndex++;
        charIndex = 0;
        setTimeout(type, 120);
      }
    }
  }

  type();

  const PANEL_URL = new URL("../index.html", location.href).href;
  const AUTH_SCRIPT_URL = new URL("../js/protocol-auth.js", location.href).href;

  function loadProtocolAuth_() {
    if (window.ProtocolAuth) return Promise.resolve(window.ProtocolAuth);

    return new Promise(function (resolve, reject) {
      const existing = Array.from(document.scripts).find(function (script) {
        return script.src === AUTH_SCRIPT_URL;
      });

      if (existing) {
        existing.addEventListener("load", function () {
          if (window.ProtocolAuth) resolve(window.ProtocolAuth);
          else reject(new Error("ProtocolAuth no quedó disponible."));
        }, { once: true });
        existing.addEventListener("error", function () {
          reject(new Error("No se pudo cargar ProtocolAuth."));
        }, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = AUTH_SCRIPT_URL;
      script.async = true;
      script.onload = function () {
        if (window.ProtocolAuth) resolve(window.ProtocolAuth);
        else reject(new Error("ProtocolAuth no quedó disponible."));
      };
      script.onerror = function () {
        reject(new Error("No se pudo cargar ProtocolAuth."));
      };
      document.head.appendChild(script);
    });
  }

  function ensureStatusElement_(loginButton) {
    let status = document.getElementById("protocolLoginStatus");
    if (status) return status;

    status = document.createElement("div");
    status.id = "protocolLoginStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.style.minHeight = "18px";
    status.style.marginTop = "10px";
    status.style.fontSize = "13px";
    status.style.lineHeight = "1.35";
    status.style.textAlign = "center";

    if (loginButton && loginButton.parentNode) {
      loginButton.insertAdjacentElement("afterend", status);
    }

    return status;
  }

  function setStatus_(status, message, kind) {
    if (!status) return;
    status.textContent = message || "";
    status.style.color = kind === "error" ? "#b42318" : "#667085";
  }

  function authErrorMessage_(error) {
    const message = String(error && error.message || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "Correo o contraseña incorrectos.";
    }

    if (message.includes("email not confirmed")) {
      return "El correo todavía no está confirmado en Supabase Auth.";
    }

    if (message.includes("failed to fetch") || message.includes("network")) {
      return "No se pudo conectar con el servicio de autenticación.";
    }

    return "No se pudo iniciar sesión. Revisá tus credenciales e intentá nuevamente.";
  }

  async function initAuthLogin_() {
    const emailInput = document.querySelector('.login-box input[type="text"], .login-box input[type="email"]');
    const passwordInput = document.querySelector('.login-box input[type="password"]');
    const loginButton = document.querySelector(".login-btn");

    if (!emailInput || !passwordInput || !loginButton) {
      console.warn("[login] No se encontraron los controles de autenticación.");
      return;
    }

    const status = ensureStatusElement_(loginButton);

    let auth;
    try {
      auth = await loadProtocolAuth_();
      await auth.ready();

      const session = await auth.getSession();
      if (session && session.access_token) {
        const user = await auth.getVerifiedUser();
        if (user && user.id) {
          window.location.replace(PANEL_URL);
          return;
        }
      }
    } catch (error) {
      console.error("[login] No se pudo inicializar Supabase Auth:", error);
      setStatus_(status, "No se pudo inicializar el acceso a Protocol Data.", "error");
      return;
    }

    async function submitLogin_() {
      const email = String(emailInput.value || "").trim();
      const password = String(passwordInput.value || "");

      if (!email || !password) {
        setStatus_(status, "Ingresá correo electrónico y contraseña.", "error");
        return;
      }

      const previousText = loginButton.textContent;
      loginButton.disabled = true;
      loginButton.textContent = "Ingresando…";
      setStatus_(status, "Validando sesión…", "info");

      try {
        const result = await auth.signInWithPassword(email, password);

        if (result.error) throw result.error;
        if (!result.data || !result.data.session || !result.data.user) {
          throw new Error("Supabase no devolvió una sesión válida.");
        }

        setStatus_(status, "Acceso correcto. Abriendo Protocol Data…", "info");
        window.location.replace(PANEL_URL);
      } catch (error) {
        console.warn("[login] Falló el inicio de sesión:", error);
        setStatus_(status, authErrorMessage_(error), "error");
        loginButton.disabled = false;
        loginButton.textContent = previousText;
      }
    }

    loginButton.addEventListener("click", submitLogin_);

    [emailInput, passwordInput].forEach(function (input) {
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          submitLogin_();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuthLogin_, { once: true });
  } else {
    initAuthLogin_();
  }
})();
