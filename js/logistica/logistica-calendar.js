/* ==========================================================
   Protocol Data · Logística · Calendario operativo
   Alcance aislado: únicamente TAB Calendario.

   Persistencia temporal:
   localStorage hasta conectar Supabase.
   ========================================================== */

(function () {
  'use strict';

  const STORAGE_KEY =
    'protocolData.logistica.deliveryCalendar.v1';

  const DEFAULT_CONFIG = {
    timezone: 'America/Argentina/Buenos_Aires',
    activeWeekdays: [1, 2, 3, 4, 5]
  };

  const DAY_NAMES = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miércoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sábado'
  };

  const DAY_NAMES_CAPITALIZED = {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado'
  };

  const PREVIEW_DATES = [
    {
      label: 'Consulta el jueves',
      date: new Date(2026, 6, 16, 12, 0, 0)
    },
    {
      label: 'Consulta el viernes',
      date: new Date(2026, 6, 17, 12, 0, 0)
    },
    {
      label: 'Consulta el sábado',
      date: new Date(2026, 6, 18, 12, 0, 0)
    },
    {
      label: 'Consulta el domingo',
      date: new Date(2026, 6, 19, 12, 0, 0)
    }
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function getDayInputs() {
    return Array.from(
      document.querySelectorAll('[data-calendar-day]')
    );
  }

  function uniqueValidWeekdays(days) {
    if (!Array.isArray(days)) {
      return [];
    }

    return Array.from(
      new Set(
        days
          .map(Number)
          .filter(function (day) {
            return (
              Number.isInteger(day) &&
              day >= 0 &&
              day <= 6
            );
          })
      )
    );
  }

  function normalizeStoredConfig(config) {
    if (!config || typeof config !== 'object') {
      return {
        timezone: DEFAULT_CONFIG.timezone,
        activeWeekdays:
          DEFAULT_CONFIG.activeWeekdays.slice()
      };
    }

    const activeWeekdays = uniqueValidWeekdays(
      config.activeWeekdays
    );

    return {
      timezone:
        typeof config.timezone === 'string' &&
        config.timezone.trim()
          ? config.timezone
          : DEFAULT_CONFIG.timezone,

      activeWeekdays:
        activeWeekdays.length > 0
          ? activeWeekdays
          : DEFAULT_CONFIG.activeWeekdays.slice()
    };
  }

  function readStoredConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return normalizeStoredConfig(DEFAULT_CONFIG);
      }

      return normalizeStoredConfig(JSON.parse(raw));
    } catch (error) {
      console.warn(
        '[Logística Calendario] No se pudo leer localStorage.',
        error
      );

      return normalizeStoredConfig(DEFAULT_CONFIG);
    }
  }

  function writeStoredConfig(config) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timezone: config.timezone,
        activeWeekdays: config.activeWeekdays
      })
    );
  }

  function readFormConfig() {
    const timezoneSelect = byId(
      'logCalendarTimezone'
    );

    return {
      timezone:
        timezoneSelect?.value ||
        DEFAULT_CONFIG.timezone,

      activeWeekdays: uniqueValidWeekdays(
        getDayInputs()
          .filter(function (input) {
            return input.checked;
          })
          .map(function (input) {
            return input.dataset.calendarDay;
          })
      )
    };
  }

  function updateDayDescription(input) {
    const dayCard = input.closest(
      '.logCalendarDay'
    );

    const description = dayCard?.querySelector(
      '.logCalendarDay__text small'
    );

    if (!description) {
      return;
    }

    description.textContent = input.checked
      ? 'Entregas habilitadas'
      : 'Sin entregas';
  }

  function applyConfigToForm(config) {
    const normalized = normalizeStoredConfig(config);
    const timezoneSelect = byId(
      'logCalendarTimezone'
    );

    if (timezoneSelect) {
      timezoneSelect.value = normalized.timezone;
    }

    getDayInputs().forEach(function (input) {
      const day = Number(
        input.dataset.calendarDay
      );

      input.checked =
        normalized.activeWeekdays.includes(day);

      updateDayDescription(input);
    });

    renderState(normalized);
  }

  function addOperationalDays(
    baseDate,
    amount,
    activeWeekdays
  ) {
    const result = new Date(baseDate);
    const operationalDays = uniqueValidWeekdays(
      activeWeekdays
    );

    result.setHours(12, 0, 0, 0);

    let remaining = Math.max(
      0,
      Number(amount) || 0
    );

    let guard = 0;

    while (remaining > 0 && guard < 370) {
      result.setDate(result.getDate() + 1);
      guard += 1;

      if (
        operationalDays.includes(
          result.getDay()
        )
      ) {
        remaining -= 1;
      }
    }

    return result;
  }

  function calendarDifferenceInDays(
    startDate,
    endDate
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);

    return Math.round(
      (end.getTime() - start.getTime()) /
      86400000
    );
  }

  function createPromiseLabel(
    consultationDate,
    deliveryDate
  ) {
    const difference =
      calendarDifferenceInDays(
        consultationDate,
        deliveryDate
      );

    if (difference === 1) {
      return 'Llega mañana';
    }

    return (
      'Llega el ' +
      DAY_NAMES[deliveryDate.getDay()]
    );
  }

  function formatDeliveryDate(date) {
    return new Intl.DateTimeFormat(
      'es-AR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      }
    ).format(date);
  }

  function createScheduleSummary(
    activeWeekdays
  ) {
    const active = uniqueValidWeekdays(
      activeWeekdays
    );

    const orderedDays = [
      1, 2, 3, 4, 5, 6, 0
    ];

    if (active.length === 0) {
      return 'No hay días habilitados';
    }

    if (active.length === 7) {
      return 'Entregas todos los días';
    }

    const mondayToFriday =
      active.length === 5 &&
      [1, 2, 3, 4, 5].every(
        function (day) {
          return active.includes(day);
        }
      );

    if (mondayToFriday) {
      return 'Entregas de lunes a viernes';
    }

    return (
      'Entregas: ' +
      orderedDays
        .filter(function (day) {
          return active.includes(day);
        })
        .map(function (day) {
          return DAY_NAMES[day];
        })
        .join(', ')
    );
  }

  function renderCounter(activeWeekdays) {
    const counter = byId(
      'logCalendarCounter'
    );

    if (!counter) {
      return;
    }

    const amount =
      uniqueValidWeekdays(
        activeWeekdays
      ).length;

    counter.textContent =
      amount === 1
        ? '1 día activo'
        : amount + ' días activos';
  }

  function renderSummary(config) {
    const summary = byId(
      'logCalendarSummaryText'
    );

    const timezone = byId(
      'logCalendarSummaryTimezone'
    );

    if (summary) {
      summary.textContent =
        createScheduleSummary(
          config.activeWeekdays
        );
    }

    if (timezone) {
      timezone.textContent =
        config.timezone;
    }
  }

  function renderPreview(config) {
    const container = byId(
      'logCalendarPreview'
    );

    if (!container) {
      return;
    }

    if (
      !config.activeWeekdays ||
      config.activeWeekdays.length === 0
    ) {
      container.innerHTML = `
        <article class="logCalendarPreviewItem">
          <span>Configuración inválida</span>
          <strong>No hay días habilitados</strong>
          <small>
            Activá al menos un día para calcular entregas.
          </small>
        </article>
      `;

      return;
    }

    container.innerHTML =
      PREVIEW_DATES.map(function (example) {
        const deliveryDate =
          addOperationalDays(
            example.date,
            1,
            config.activeWeekdays
          );

        const promise =
          createPromiseLabel(
            example.date,
            deliveryDate
          );

        return `
          <article class="logCalendarPreviewItem">
            <span>${example.label}</span>
            <strong>${promise}</strong>
            <small>
              ${formatDeliveryDate(deliveryDate)}
            </small>
          </article>
        `;
      }).join('');
  }

  function renderState(config) {
    renderCounter(config.activeWeekdays);
    renderSummary(config);
    renderPreview(config);
  }

  function setStatus(saved) {
    const status = byId(
      'logCalendarStatus'
    );

    if (!status) {
      return;
    }

    status.textContent = saved
      ? 'Guardado localmente'
      : 'Cambios sin guardar';

    status.classList.toggle(
      'is-saved',
      Boolean(saved)
    );
  }

  function setMessage(message, type) {
    const element = byId(
      'logCalendarMessage'
    );

    if (!element) {
      return;
    }

    element.textContent = message || '';

    element.classList.remove(
      'is-success',
      'is-error'
    );

    if (type) {
      element.classList.add(type);
    }
  }

  function handleFormChange(event) {
    if (
      event.target.matches(
        '[data-calendar-day]'
      )
    ) {
      updateDayDescription(event.target);
    }

    const config = readFormConfig();

    renderState(config);
    setStatus(false);
    setMessage('Hay cambios sin guardar.');
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const config = readFormConfig();

    if (
      config.activeWeekdays.length === 0
    ) {
      setStatus(false);

      setMessage(
        'Debe existir al menos un día habilitado para entregas.',
        'is-error'
      );

      return;
    }

    try {
      writeStoredConfig(config);

      setStatus(true);

      setMessage(
        'Calendario guardado localmente. La conexión con Supabase será la próxima etapa.',
        'is-success'
      );

      window.dispatchEvent(
        new CustomEvent(
          'protocol:logistica:calendar-updated',
          {
            detail: {
              timezone: config.timezone,
              activeWeekdays:
                config.activeWeekdays.slice()
            }
          }
        )
      );
    } catch (error) {
      console.error(
        '[Logística Calendario] No se pudo guardar.',
        error
      );

      setStatus(false);

      setMessage(
        'No se pudo guardar la configuración local.',
        'is-error'
      );
    }
  }

  function handleReset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn(
        '[Logística Calendario] No se pudo limpiar localStorage.',
        error
      );
    }

    applyConfigToForm(DEFAULT_CONFIG);
    setStatus(false);

    setMessage(
      'Se restauró la configuración de lunes a viernes.'
    );
  }

  function initializeCalendar() {
    const form = byId(
      'logCalendarForm'
    );

    if (!form) {
      return;
    }

    if (
      form.dataset.calendarReady === 'true'
    ) {
      return;
    }

    form.dataset.calendarReady = 'true';

    applyConfigToForm(
      readStoredConfig()
    );

    setStatus(true);

    form.addEventListener(
      'change',
      handleFormChange
    );

    form.addEventListener(
      'submit',
      handleFormSubmit
    );

    byId('logCalendarReset')
      ?.addEventListener(
        'click',
        handleReset
      );
  }

  window.ProtocolLogisticaCalendar = {
    getConfig: readStoredConfig,

    calculateDeliveryDate:
      function (
        baseDate,
        amount,
        config
      ) {
        const selectedConfig =
          config ||
          readStoredConfig();

        return addOperationalDays(
          baseDate,
          amount,
          selectedConfig.activeWeekdays
        );
      },

    createPromiseLabel:
      createPromiseLabel,

    storageKey:
      STORAGE_KEY
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      initializeCalendar
    );
  } else {
    initializeCalendar();
  }

  document.addEventListener(
    'sazzu:page:load',
    initializeCalendar
  );
})();
