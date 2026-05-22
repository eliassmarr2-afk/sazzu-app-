/* =========================================================
   INICIO · AEVA · Prompt minimal Protocol Data
   Archivo: /js/aeva.js
   ========================================================= */

   (function initAevaPromptMinimal_() {
    "use strict";
  
    const CONFIG = {
      workspace: "Sazzú Store",
      app: "Protocol Data",
      source: "protocol_data_webapp",
      panel: "aeva",
      mode: "analizar",
      typeSpeedMs: 14,
      thinkingDelayMs: 420
    };
  
    const state = {
      mode: CONFIG.mode,
      isThinking: false,
      isRecording: false,
      recognition: null,
      sessionId: getOrCreateSessionId_(),
      conversationId: getOrCreateConversationId_()
    };
  
    const els = {
      panel: document.querySelector("[data-aeva-panel]"),
      form: document.querySelector("[data-aeva-form]"),
      box: document.querySelector(".aevaBox"),
      input: document.querySelector("[data-aeva-input]"),
      thread: document.querySelector("[data-aeva-thread]"),
      action: document.querySelector("[data-aeva-main-action]"),
      modes: Array.from(document.querySelectorAll("[data-aeva-mode]")),
      attach: document.querySelector('[data-aeva-action="attach"]')
    };
  
    if (!els.form || !els.box || !els.input || !els.thread || !els.action) return;
  
    boot_();
  
    function boot_() {
      els.box.setAttribute("data-has-text", "false");
      bindInput_();
      bindModes_();
      bindMainAction_();
      bindAttach_();
    }
  
    function bindInput_() {
      els.input.addEventListener("input", function () {
        autosizeTextarea_();
        updateHasText_();
      });
  
      els.input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submitMessage_();
        }
      });
  
      els.form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitMessage_();
      });
    }
  
    function bindMainAction_() {
      els.action.addEventListener("click", function () {
        const value = String(els.input.value || "").trim();
  
        if (value) {
          submitMessage_();
          return;
        }
  
        startVoiceInput_();
      });
    }
  
    function bindModes_() {
      els.modes.forEach(function (button) {
        const mode = button.getAttribute("data-aeva-mode");
  
        button.classList.toggle("is-active", mode === state.mode);
  
        button.addEventListener("click", function () {
          if (!mode) return;
  
          state.mode = mode;
  
          els.modes.forEach(function (btn) {
            btn.classList.toggle("is-active", btn === button);
          });
        });
      });
    }
  
    function bindAttach_() {
      if (!els.attach) return;
  
      els.attach.addEventListener("click", function () {
        showThread_();
        appendAevaMessage_(
          "La carga de archivos todavía no está conectada. Más adelante podremos permitir capturas, CSV o documentos para que AEVA los analice."
        );
      });
    }
  
    function submitMessage_() {
      if (state.isThinking) return;
  
      const text = String(els.input.value || "").trim();
      if (!text) return;
  
      const payload = buildPayload_(text);
  
      showThread_();
      appendUserMessage_(text);
  
      els.input.value = "";
      autosizeTextarea_();
      updateHasText_();
  
      runDemoReply_(payload);
    }
  
    function runDemoReply_(payload) {
      state.isThinking = true;
  
      const thinking = appendThinking_();
  
      window.setTimeout(function () {
        thinking.remove();
  
        const reply = getDemoReply_(payload);
  
        appendAevaMessage_(reply, {
          typed: true,
          onComplete: function () {
            state.isThinking = false;
          }
        });
      }, CONFIG.thinkingDelayMs);
    }
  
    function getDemoReply_(payload) {
      const text = String(payload.user_message || "").toLowerCase();
  
      if (text.includes("utm") || text.includes("audiencia")) {
        return "Puedo ayudarte con Publicidad UTM: campos, valores, familias, reglas, patrones y audiencias automáticas.";
      }
  
      if (text.includes("lote") || text.includes("stock") || text.includes("sku")) {
        return "Puedo ayudarte a ordenar cargas de lotes, lectura de SKU, costos y trazabilidad de stock.";
      }
  
      if (text.includes("finanza") || text.includes("costo") || text.includes("margen")) {
        return "Puedo ayudarte a interpretar costos, márgenes, ingresos, egresos y relaciones financieras del sistema.";
      }
  
      if (payload.mode === "datos") {
        return "En modo Datos, priorizo estructura: hojas, columnas, estados, registros y relaciones entre módulos.";
      }
  
      if (payload.mode === "guia") {
        return "En modo Crear guía, puedo convertir una tarea en pasos claros para ejecutarla dentro de Protocol Data.";
      }
  
      return "Puedo ayudarte a entender cualquier módulo de Protocol Data y convertir una duda operativa en próximos pasos claros.";
    }
  
    function appendUserMessage_(text) {
      const node = document.createElement("div");
      node.className = "aevaMiniMsg aevaMiniMsg--user";
      node.textContent = text;
  
      els.thread.appendChild(node);
      scrollThread_();
    }
  
    function appendAevaMessage_(text, options) {
      const opts = options || {};
  
      const node = document.createElement("div");
      node.className = "aevaMiniMsg aevaMiniMsg--aeva";
  
      els.thread.appendChild(node);
      scrollThread_();
  
      if (opts.typed) {
        typeText_(node, text, opts.onComplete);
      } else {
        node.textContent = text;
        scrollThread_();
      }
  
      return node;
    }
  
    function appendThinking_() {
      const node = document.createElement("div");
      node.className = "aevaMiniMsg aevaMiniMsg--aeva aevaMiniMsg--thinking";
      node.innerHTML = "<i></i><i></i><i></i>";
  
      els.thread.appendChild(node);
      scrollThread_();
  
      return node;
    }
  
    function showThread_() {
        els.thread.hidden = false;
      
        if (els.panel) {
          els.panel.classList.add("has-chat");
        }
      
        window.requestAnimationFrame(function () {
          document.dispatchEvent(
            new CustomEvent("aeva:message-rendered", {
              detail: {
                source: "aeva",
                reason: "chat-started",
                timestamp: Date.now()
              }
            })
          );
        });
      }
  
    function typeText_(node, text, done) {
      let index = 0;
      node.textContent = "";
  
      const cursor = document.createElement("span");
      cursor.className = "aevaTypeCursor";
      node.appendChild(cursor);
  
      const timer = window.setInterval(function () {
        index += 1;
        node.textContent = text.slice(0, index);
        node.appendChild(cursor);
        scrollThread_();
  
        if (index >= text.length) {
          window.clearInterval(timer);
          if (typeof done === "function") done();
        }
      }, CONFIG.typeSpeedMs);
    }
  
    function autosizeTextarea_() {
      els.input.style.height = "auto";
      els.input.style.height = `${Math.min(els.input.scrollHeight, 150)}px`;
    }
  
    function updateHasText_() {
      const hasText = String(els.input.value || "").trim().length > 0;
      els.box.setAttribute("data-has-text", hasText ? "true" : "false");
    }
  
    function scrollThread_() {
        els.thread.scrollTop = els.thread.scrollHeight;
      
        document.dispatchEvent(
          new CustomEvent("aeva:message-rendered", {
            detail: {
              source: "aeva",
              timestamp: Date.now()
            }
          })
        );
      }
  
    function startVoiceInput_() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
      if (!SpeechRecognition) {
        showThread_();
        appendAevaMessage_(
          "El dictado por voz no está disponible en este navegador. Probalo en Chrome o escribí tu consulta directamente."
        );
        return;
      }
  
      if (state.isRecording) return;
  
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = true;
      recognition.continuous = false;
  
      state.recognition = recognition;
      state.isRecording = true;
      els.box.classList.add("is-recording");
  
      recognition.onresult = function (event) {
        let transcript = "";
  
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
  
        els.input.value = transcript;
        autosizeTextarea_();
        updateHasText_();
      };
  
      recognition.onerror = function () {
        state.isRecording = false;
        els.box.classList.remove("is-recording");
  
        showThread_();
        appendAevaMessage_("No pude tomar la voz correctamente. Podés escribir la consulta manualmente.");
      };
  
      recognition.onend = function () {
        state.isRecording = false;
        els.box.classList.remove("is-recording");
        updateHasText_();
      };
  
      recognition.start();
    }
  
    function buildPayload_(message) {
      return {
        session_id: state.sessionId,
        conversation_id: state.conversationId,
        source: CONFIG.source,
        app: CONFIG.app,
        workspace: CONFIG.workspace,
        panel: CONFIG.panel,
        current_route: window.location.pathname,
        user_message: message,
        mode: state.mode,
        metadata: {
          timestamp: new Date().toISOString(),
          language: window.navigator.language || "es",
          user_agent: window.navigator.userAgent
        }
      };
    }
  
    function getOrCreateSessionId_() {
      const key = "aeva_session_id";
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
  
      const value = `aeva_session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      window.sessionStorage.setItem(key, value);
      return value;
    }
  
    function getOrCreateConversationId_() {
      const key = "aeva_conversation_id";
      const existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
  
      const value = `aeva_conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      window.sessionStorage.setItem(key, value);
      return value;
    }
  })();
  
  /* =========================================================
     FIN · AEVA · Prompt minimal Protocol Data
     ========================================================= */
     /* =========================================================
   INICIO · AEVA · Medición dinámica de espacio del prompt
   Evita que los mensajes queden detrás de la caja de escritura.
   ========================================================= */

(function initAevaPromptSafeArea_() {
    "use strict";
  
    const stage = document.querySelector("[data-aeva-panel]");
    const promptDock = document.querySelector(".aevaPromptDock");
    const promptBox = document.querySelector(".aevaBox");
  
    if (!stage || !promptDock || !promptBox) return;
  
    const EXTRA_GAP = 34;
  
    function updateSafeArea_() {
      const dockRect = promptDock.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  
      const distanceFromBottom = Math.max(0, viewportHeight - dockRect.bottom);
      const safeSpace = Math.ceil(distanceFromBottom + dockRect.height + EXTRA_GAP);
  
      stage.style.setProperty("--aeva-conversation-bottom-safe", `${safeSpace}px`);
    }
  
    updateSafeArea_();
  
    window.addEventListener("resize", updateSafeArea_, { passive: true });
  
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(updateSafeArea_);
      observer.observe(promptDock);
      observer.observe(promptBox);
    }
  
    const input = document.querySelector("[data-aeva-input]");
    if (input) {
      input.addEventListener("input", function () {
        window.requestAnimationFrame(updateSafeArea_);
      });
    }
  
    document.addEventListener("aeva:message-rendered", function () {
      window.requestAnimationFrame(updateSafeArea_);
    });
  })();
  
  /* =========================================================
     FIN · AEVA · Medición dinámica de espacio del prompt
     ========================================================= */
     /* =========================================================
   INICIO · AEVA · Botón volver al último mensaje
   ========================================================= */

(function initAevaScrollToBottom_() {
    "use strict";
  
    const stage = document.querySelector("[data-aeva-panel]");
    const rail = document.querySelector("[data-aeva-thread]");
  
    if (!stage || !rail) return;
  
    const button = document.createElement("button");
    button.type = "button";
    button.className = "aevaScrollToBottom";
    button.setAttribute("aria-label", "Volver al último mensaje");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 5v14M12 19l-5.25-5.25M12 19l5.25-5.25"
          fill="none"
          stroke="currentColor"
          stroke-width="2.1"
          stroke-linecap="round"
          stroke-linejoin="round"
        ></path>
      </svg>
    `;
  
    stage.appendChild(button);
  
    function getDistanceToBottom_() {
      return rail.scrollHeight - rail.scrollTop - rail.clientHeight;
    }
  
    function updateButtonVisibility_() {
      const hasChat = stage.classList.contains("has-chat");
      const distance = getDistanceToBottom_();
  
      button.classList.toggle("is-visible", hasChat && distance > 90);
    }
  
    function scrollToBottom_() {
      rail.scrollTo({
        top: rail.scrollHeight,
        behavior: "smooth"
      });
  
      window.setTimeout(updateButtonVisibility_, 220);
    }
  
    rail.addEventListener("scroll", updateButtonVisibility_, { passive: true });
  
    button.addEventListener("click", scrollToBottom_);
  
    document.addEventListener("aeva:message-rendered", function () {
      window.requestAnimationFrame(function () {
        /*
          Si AEVA acaba de responder o el usuario acaba de enviar,
          mantenemos la conversación abajo automáticamente.
        */
        if (getDistanceToBottom_() < 180) {
          rail.scrollTop = rail.scrollHeight;
        }
  
        updateButtonVisibility_();
      });
    });
  
    window.addEventListener("resize", updateButtonVisibility_, { passive: true });
  
    updateButtonVisibility_();
  })();
  
  /* =========================================================
     FIN · AEVA · Botón volver al último mensaje
     ========================================================= */
     /* =========================================================
   INICIO · AEVA · Hero inicial + preguntas rápidas
   ========================================================= */

(function initAevaEntryUi_() {
    "use strict";
  
    const panel = document.querySelector("[data-aeva-panel]");
    const input = document.querySelector("[data-aeva-input]");
    const sendButton = document.querySelector("[data-aeva-send]");
    const quickButtons = Array.from(document.querySelectorAll("[data-aeva-quick-message]"));
  
    if (!panel || !input || !sendButton) return;
  
    function markChatStarted_() {
      if (!panel.classList.contains("has-chat")) {
        panel.classList.add("has-chat");
      }
    }
  
    function pushInputValue_(value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  
    function sendQuickPrompt_(message) {
      if (!message) return;
  
      pushInputValue_(message);
      markChatStarted_();
      input.focus();
  
      window.requestAnimationFrame(function () {
        sendButton.click();
      });
    }
  
    quickButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const message = button.getAttribute("data-aeva-quick-message") || "";
        sendQuickPrompt_(message.trim());
      });
    });
  
    sendButton.addEventListener("click", function () {
      const text = (input.value || "").trim();
      if (text) {
        markChatStarted_();
      }
    });
  
    input.addEventListener("keydown", function (event) {
      const text = (input.value || "").trim();
      if (event.key === "Enter" && !event.shiftKey && text) {
        markChatStarted_();
      }
    });
  })();
  
  /* =========================================================
     FIN · AEVA · Hero inicial + preguntas rápidas
     ========================================================= */