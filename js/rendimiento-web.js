(function () {
  const state = {
    options: [],
    parameterOptions: [],
    activeUrlParameters: {},
    chart: null,
    versionsPayload: null,
    activeLanding: null,
    versionsLoaded: false,
    activationVersionNumber: null,
    activationConfirmationResolver: null,
    createVersionSubmitting: false,
    deletePreview: null,
    deletePreviewParams: null,
    deleteRequiredConfirmation: '',
    deleteMode: 'filtered',
    deletePreviewRequestId: 0,
    deleteSubmitting: false
  };

  const DYNAMIC_PARAMETER_EXCLUSIONS = new Set([
    'utm_source',
    'utm_campaign'
  ]);

  const richSelectRegistry = new Map();
  let richSelectGlobalListenersReady = false;

  const $ = (id) => document.getElementById(id);

  function todayISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function number(value) {
    return Number(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(number(value));
  }

  function formatPct(value) {
    return value === null || value === undefined
      ? '—'
      : `${number(value).toFixed(2).replace('.', ',')}%`;
  }

  function formatSeconds(value) {
    return value === null || value === undefined
      ? '—'
      : `${number(value).toFixed(2).replace('.', ',')} s`;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setStatus(message, type) {
    const el = $('rwStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `rwStatus${type ? ` is-${type}` : ''}`;
  }

  function setVersionsStatus(message, type) {
    const el = $('rwVersionsStatus');
    if (!el) return;
    el.textContent = message;
    el.className = `rwStatus${type ? ` is-${type}` : ''}`;
  }

  function setLoading(loading) {
    const button = $('rwRefreshButton');
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? 'Actualizando…' : 'Actualizar panel';
  }

  function setVersionsLoading(loading) {
    const button = $('rwVersionsRefreshButton');
    if (!button) return;
    button.disabled = loading;
    button.textContent = loading ? 'Actualizando…' : 'Actualizar versiones';
  }

  function selectedLandingKey() {
    const select = $('rwLandingSelect');
    return select ? select.value || null : null;
  }

  function dynamicParameterItems() {
    return state.parameterOptions.filter((item) => {
      const key = String(
        item && item.parameter_key
          ? item.parameter_key
          : ''
      ).trim();

      return key && !DYNAMIC_PARAMETER_EXCLUSIONS.has(key);
    });
  }

  function parameterItemByKey(parameterKey) {
    return dynamicParameterItems().find(
      (item) => item.parameter_key === parameterKey
    ) || null;
  }

  function parameterDisplayName(parameterKey) {
    const item = parameterItemByKey(parameterKey);

    return item && item.display_name
      ? item.display_name
      : parameterKey;
  }

  function renderParameterValueOptions() {
    const fieldSelect = $('rwParameterFieldSelect');
    const valueSelect = $('rwParameterValueSelect');
    const addButton = $('rwAddParameterFilter');

    if (!fieldSelect || !valueSelect || !addButton) return;

    const parameterKey = fieldSelect.value;
    const item = parameterItemByKey(parameterKey);

    addButton.disabled = true;

    if (!item) {
      valueSelect.disabled = true;
      valueSelect.innerHTML =
        '<option value="">Primero seleccioná un campo</option>';
      return;
    }

    const values = Array.isArray(item.values)
      ? item.values
      : [];

    if (!values.length) {
      valueSelect.disabled = true;
      valueSelect.innerHTML =
        '<option value="">Sin valores disponibles en este contexto</option>';
      return;
    }

    const previousValue = valueSelect.value;

    valueSelect.innerHTML =
      '<option value="">Seleccionar valor</option>' +
      values.map((valueItem) => {
        const rawValue = String(
          valueItem && valueItem.value !== undefined
            ? valueItem.value
            : ''
        );

        const views = number(
          valueItem && valueItem.views !== undefined
            ? valueItem.views
            : 0
        );

        const visitLabel = views === 1
          ? '1 visita'
          : `${formatNumber(views)} visitas`;

        return (
          `<option value="${escapeHtml(rawValue)}">` +
          `${escapeHtml(rawValue)} · ${escapeHtml(visitLabel)}` +
          '</option>'
        );
      }).join('');

    valueSelect.disabled = false;

    const availableValues = values.map((valueItem) =>
      String(
        valueItem && valueItem.value !== undefined
          ? valueItem.value
          : ''
      )
    );

    if (availableValues.includes(previousValue)) {
      valueSelect.value = previousValue;
    }

    addButton.disabled = !valueSelect.value;
  }

  function renderParameterFieldOptions() {
    const select = $('rwParameterFieldSelect');
    if (!select) return;

    const previousValue = select.value;
    const items = dynamicParameterItems();

    select.innerHTML =
      '<option value="">Seleccionar campo</option>' +
      items.map((item) => {
        const key = String(item.parameter_key || '');
        const label = item.display_name || key;
        const views = number(item.observed_views);

        return (
          `<option value="${escapeHtml(key)}">` +
          `${escapeHtml(label)} · ${formatNumber(views)} visitas` +
          '</option>'
        );
      }).join('');

    if (items.some((item) =>
      item.parameter_key === previousValue
    )) {
      select.value = previousValue;
    }

    renderParameterValueOptions();
  }

  function updateDynamicFilterCount() {
    const count = Object.keys(
      state.activeUrlParameters
    ).length;

    const badge = $('rwDynamicFilterCount');
    if (!badge) return;

    badge.textContent = count === 1
      ? '1 filtro activo'
      : `${count} filtros activos`;

    badge.classList.toggle('is-active', count > 0);
  }

  function renderActiveParameterFilters() {
    const container = $('rwActiveParameterFilters');
    if (!container) return;

    const entries = Object.entries(
      state.activeUrlParameters
    );

    if (!entries.length) {
      container.innerHTML =
        '<span class="rwParameterFiltersEmpty" ' +
        'id="rwParameterFiltersEmpty">' +
        'No hay parámetros adicionales aplicados.' +
        '</span>';

      updateDynamicFilterCount();
      return;
    }

    container.innerHTML = entries.map(([key, value]) => {
      const label = parameterDisplayName(key);

      return (
        `<span class="rwParameterChip" ` +
        `data-parameter-key="${escapeHtml(key)}">` +
        `<span>${escapeHtml(label)}: ` +
        `<strong>${escapeHtml(value)}</strong></span>` +
        `<button type="button" ` +
        `data-remove-parameter="${escapeHtml(key)}" ` +
        `aria-label="Quitar filtro ${escapeHtml(label)}">×</button>` +
        '</span>'
      );
    }).join('');

    updateDynamicFilterCount();
  }

  function addSelectedParameterFilter() {
    const fieldSelect = $('rwParameterFieldSelect');
    const valueSelect = $('rwParameterValueSelect');

    if (!fieldSelect || !valueSelect) return;

    const parameterKey = fieldSelect.value.trim();
    const parameterValue = valueSelect.value.trim();

    if (!parameterKey || !parameterValue) return;

    const alreadyExists = Object.prototype.hasOwnProperty.call(
      state.activeUrlParameters,
      parameterKey
    );

    const currentCount = Object.keys(
      state.activeUrlParameters
    ).length;

    if (!alreadyExists && currentCount >= 10) {
      setStatus(
        'Podés aplicar hasta 10 parámetros dinámicos al mismo tiempo.',
        'error'
      );
      return;
    }

    state.activeUrlParameters = Object.assign(
      {},
      state.activeUrlParameters,
      {
        [parameterKey]: parameterValue
      }
    );

    renderActiveParameterFilters();

    fieldSelect.value = '';
    renderParameterValueOptions();

    setStatus(
      'Filtro preparado. Presioná “Actualizar panel” para aplicarlo.'
    );
  }

  function removeParameterFilter(parameterKey) {
    if (!Object.prototype.hasOwnProperty.call(
      state.activeUrlParameters,
      parameterKey
    )) {
      return;
    }

    const next = Object.assign(
      {},
      state.activeUrlParameters
    );

    delete next[parameterKey];
    state.activeUrlParameters = next;

    renderActiveParameterFilters();

    setStatus(
      'Filtro eliminado. Presioná “Actualizar panel” para actualizar los datos.'
    );
  }

  function formatUrlParameters(parameters) {
    if (
      !parameters ||
      typeof parameters !== 'object' ||
      Array.isArray(parameters)
    ) {
      return 'Ninguno';
    }

    const entries = Object.entries(parameters);

    if (!entries.length) return 'Ninguno';

    return entries.map(([key, value]) =>
      `${parameterDisplayName(key)}: ${String(value)}`
    ).join(' · ');
  }

  function richSelectVisitLabel(value) {
    const views = number(value);

    return views === 1
      ? '1 visita'
      : `${formatNumber(views)} visitas`;
  }

  function richSelectNormalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function richSelectFamilyMeta(value) {
    const key = richSelectNormalizeText(value)
      .replace(/\s+/g, '_');

    const families = {
      comercial: {
        label: 'Comercial',
        tone: 'orange',
        icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.8 6.7v5.5c0 .8.3 1.5.9 2.1l4.1 4.1a2.5 2.5 0 0 0 3.5 0l5.1-5.1a2.5 2.5 0 0 0 0-3.5l-4.1-4.1a3 3 0 0 0-2.1-.9H6.7a1.9 1.9 0 0 0-1.9 1.9Z" stroke="currentColor" stroke-width="1.7"/><circle cx="9" cy="9" r="1.25" fill="currentColor"/></svg>'
      },
      comunicacion: {
        label: 'Comunicación',
        tone: 'blue',
        icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M5.2 5.8h13.6v9.1H10l-4.8 3.3V5.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 9.2h7.6M8.2 12h5.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
      },
      contexto: {
        label: 'Contexto',
        tone: 'teal',
        icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7"/><path d="m14.9 9.1-1.8 4-4 1.8 1.8-4 4-1.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>'
      },
      creativo: {
        label: 'Creativo',
        tone: 'violet',
        icon: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 3 1.15 4.05L17 8.2l-3.85 1.15L12 13.4l-1.15-4.05L7 8.2l3.85-1.15L12 3Z" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/><path d="m18.1 13.7.65 2.25 2.25.65-2.25.65-.65 2.25-.65-2.25-2.25-.65 2.25-.65.65-2.25Z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/></svg>'
      },
      segmentacion: {
        label: 'Segmentación',
        tone: 'cyan',
        icon: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.7" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3.6" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/><path d="M12 2.8v2M21.2 12h-2M12 21.2v-2M2.8 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
      },
      tecnico: {
        label: 'Técnico',
        tone: 'slate',
        icon: '<svg viewBox="0 0 24 24" fill="none"><path d="m8.8 7-4.2 5 4.2 5M15.2 7l4.2 5-4.2 5M13.7 4.8l-3.4 14.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    };

    return families[key] || families.tecnico;
  }

  function renderRichSelectSelectedValue(descriptor) {
    const selectedSubtitle =
      descriptor.selectedSubtitle ||
      descriptor.subtitle ||
      '';

    return (
      (descriptor.icon
        ? `<span class="rwRichSelect__selectedIcon rwRichSelect__familyTone--${escapeHtml(descriptor.tone)}">${descriptor.icon}</span>`
        : '') +
      `<span class="rwRichSelect__selectedCopy">` +
        `<span class="rwRichSelect__title">${escapeHtml(descriptor.title)}</span>` +
        (selectedSubtitle
          ? `<span class="rwRichSelect__subtitle">${escapeHtml(selectedSubtitle)}</span>`
          : '') +
      `</span>`
    );
  }

  function renderRichSelectMenu(selectId, options, selectedIndex) {
    const isLandingSelector =
      selectId === 'rwLandingSelect';

    const isFieldSelector =
      selectId === 'rwParameterFieldSelect';

    const isValueSelector =
      selectId === 'rwParameterValueSelect';

    const isSearchableSelector =
      isLandingSelector ||
      isFieldSelector ||
      isValueSelector;

    const optionMarkup = options.map((option, index) => {
      const descriptor = richSelectDescriptor(
        selectId,
        option.value,
        option
      );

      if (isSearchableSelector && descriptor.placeholder) {
        return '';
      }

      const selected = index === selectedIndex;
      const optionId = `rwRichSelect_${selectId}_${index}`;
      const searchText = richSelectNormalizeText([
        descriptor.title,
        descriptor.subtitle,
        descriptor.description
      ].filter(Boolean).join(' '));

      return (
        `<button type="button" ` +
        `class="rwRichSelect__option${selected ? ' is-selected' : ''}${descriptor.placeholder ? ' is-placeholder' : ''}" ` +
        `id="${escapeHtml(optionId)}" role="option" ` +
        `aria-selected="${selected ? 'true' : 'false'}" ` +
        `data-option-index="${index}" ` +
        `data-search="${escapeHtml(searchText)}"` +
        `${option.disabled ? ' disabled' : ''}>` +
          (descriptor.icon
            ? `<span class="rwRichSelect__optionIcon rwRichSelect__familyTone--${escapeHtml(descriptor.tone)}">${descriptor.icon}</span>`
            : '') +
          `<span class="rwRichSelect__optionContent">` +
            `<span class="rwRichSelect__optionTitle">${escapeHtml(descriptor.title)}</span>` +
            (descriptor.subtitle
              ? `<span class="rwRichSelect__optionSubtitle">${escapeHtml(descriptor.subtitle)}</span>`
              : '') +
            (descriptor.description
              ? `<span class="rwRichSelect__optionDescription">${escapeHtml(descriptor.description)}</span>`
              : '') +
          `</span>` +
          (isSearchableSelector
            ? `<span class="rwRichSelect__optionStatus" aria-hidden="true"></span>`
            : '') +
        `</button>`
      );
    }).join('');

    if (!isSearchableSelector) return optionMarkup;

    const menuTitle = isLandingSelector
      ? 'Seleccionar landing'
      : (
          isFieldSelector
            ? 'Seleccionar campo'
            : 'Seleccionar valor'
        );

    const searchPlaceholder = isLandingSelector
      ? 'Buscar por título, handle o clave técnica'
      : (
          isFieldSelector
            ? 'Buscar por nombre, clave, familia o descripción'
            : 'Buscar por valor, familia o descripción'
        );

    const emptyTitle = isLandingSelector
      ? 'No encontramos landings'
      : (
          isFieldSelector
            ? 'No encontramos campos'
            : 'No encontramos valores'
        );

    const emptyCopy = isLandingSelector
      ? 'Probá buscando por nombre del producto, handle o identificador técnico.'
      : (
          isFieldSelector
            ? 'Probá buscando por nombre visible, nombre técnico o familia.'
            : 'Probá buscando por valor, familia o descripción funcional.'
        );

    return (
      `<div class="rwRichSelect__menuHead">` +
        `<strong>${escapeHtml(menuTitle)}</strong>` +
        `<button type="button" class="rwRichSelect__menuClose" data-rich-select-close aria-label="Cerrar selector">×</button>` +
      `</div>` +
      `<label class="rwRichSelect__search">` +
        `<span class="rwRichSelect__searchIcon" aria-hidden="true">` +
          `<svg viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.2" stroke="currentColor" stroke-width="1.8"></circle><path d="m15.4 15.4 4.1 4.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>` +
        `</span>` +
        `<input type="search" autocomplete="off" data-rich-select-search placeholder="${escapeHtml(searchPlaceholder)}">` +
      `</label>` +
      `<div class="rwRichSelect__options">${optionMarkup}</div>` +
      `<div class="rwRichSelect__empty" data-rich-select-empty hidden>` +
        `<strong>${escapeHtml(emptyTitle)}</strong>` +
        `<span>${escapeHtml(emptyCopy)}</span>` +
      `</div>`
    );
  }

  function filterRichSelectOptions(entry, query) {
    const normalizedQuery = richSelectNormalizeText(query);
    const buttons = Array.from(
      entry.menu.querySelectorAll('.rwRichSelect__option')
    );
    let visibleCount = 0;

    buttons.forEach((button) => {
      const searchable = richSelectNormalizeText(
        button.getAttribute('data-search') || ''
      );
      const visible =
        !normalizedQuery || searchable.includes(normalizedQuery);

      button.hidden = !visible;
      if (visible && !button.disabled) visibleCount += 1;
    });

    const empty = entry.menu.querySelector(
      '[data-rich-select-empty]'
    );
    if (empty) empty.hidden = visibleCount > 0;

    entry.highlightedIndex = -1;
    entry.trigger.removeAttribute('aria-activedescendant');
  }

  function richSelectDescriptor(selectId, value, option) {
    const fallbackText = option
      ? String(option.textContent || '')
          .trim()
          .replace(/\s+/g, ' ')
      : String(value || '');

    if (
      !value &&
      selectId === 'rwLandingSelect'
    ) {
      return {
        title: 'Todas las landings',
        subtitle: 'Vista consolidada',
        description:
          'Incluye todas las páginas de producto disponibles dentro del rango seleccionado.',
        placeholder: false,
        icon:
          '<svg viewBox="0 0 24 24" fill="none">' +
            '<path d="M5.2 4.8h13.6v14.4H5.2V4.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
            '<path d="M8.2 8.2h7.6M8.2 11.6h7.6M8.2 15h4.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
          '</svg>',
        tone: 'blue'
      };
    }

    if (!value) {
      return {
        title: fallbackText || 'Seleccionar',
        subtitle: '',
        placeholder: true
      };
    }

    if (selectId === 'rwLandingSelect') {
      const item = state.options.find(
        (candidate) =>
          candidate.landing_key === value
      ) || {};

      const title =
        item.product_title ||
        item.product_handle ||
        fallbackText ||
        value;

      const productHandle =
        item.product_handle || '';

      const technicalKey =
        item.landing_key || value;

      return {
        title,
        subtitle:
          productHandle ||
          'Landing de producto',

        description:
          technicalKey,

        selectedSubtitle:
          technicalKey,

        placeholder: false,

        icon:
          '<svg viewBox="0 0 24 24" fill="none">' +
            '<path d="M5.2 4.8h13.6v14.4H5.2V4.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
            '<path d="M8.2 8.2h7.6M8.2 11.6h7.6M8.2 15h4.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
          '</svg>',

        tone: 'blue'
      };
    }

    if (selectId === 'rwParameterFieldSelect') {
      const item = parameterItemByKey(value) || {};
      const family = richSelectFamilyMeta(
        item.field_family || 'tecnico'
      );
      const title =
        item.display_name || fallbackText || value;
      const technicalName =
        item.parameter_key || value;
      const subtitle = [
        technicalName,
        family.label,
        richSelectVisitLabel(item.observed_views)
      ].filter(Boolean).join(' · ');

      return {
        title,
        subtitle,
        description:
          item.field_description ||
          'Campo registrado en la Biblioteca UTM.',
        placeholder: false,
        icon: family.icon,
        tone: family.tone
      };
    }

    if (selectId === 'rwParameterValueSelect') {
      const fieldSelect = $('rwParameterFieldSelect');

      const parameterKey = fieldSelect
        ? fieldSelect.value
        : '';

      const parameterItem =
        parameterItemByKey(parameterKey) || {};

      const values = Array.isArray(
        parameterItem.values
      )
        ? parameterItem.values
        : [];

      const valueItem = values.find(
        (candidate) =>
          String(candidate.value) === String(value)
      ) || {};

      const family = richSelectFamilyMeta(
        parameterItem.field_family || 'tecnico'
      );

      let description =
        valueItem.description || '';

      if (!description) {
        description = valueItem.observed
          ? 'Valor observado automáticamente en una URL.'
          : 'Valor aprobado en la Biblioteca UTM.';
      }

      return {
        title: String(value || ''),
        subtitle: [
          family.label,
          richSelectVisitLabel(valueItem.views)
        ].filter(Boolean).join(' · '),
        description,
        placeholder: false,
        icon: family.icon,
        tone: family.tone
      };
    }

    return {
      title: fallbackText || value,
      subtitle: value,
      placeholder: false
    };
  }

  function closeRichSelect(selectId, restoreFocus) {
    const entry = richSelectRegistry.get(selectId);
    if (!entry) return;

    entry.wrapper.classList.remove('is-open');
    entry.trigger.setAttribute('aria-expanded', 'false');
    entry.trigger.removeAttribute('aria-activedescendant');
    entry.highlightedIndex = -1;
    entry.searchQuery = '';

    const searchInput = entry.menu.querySelector(
      '[data-rich-select-search]'
    );

    if (searchInput) {
      searchInput.value = '';
      filterRichSelectOptions(entry, '');
    }

    if (restoreFocus) {
      entry.trigger.focus();
    }
  }

  function closeAllRichSelects(exceptSelectId) {
    richSelectRegistry.forEach((entry, selectId) => {
      if (selectId !== exceptSelectId) {
        closeRichSelect(selectId, false);
      }
    });
  }

  function richSelectOptionButtons(entry) {
    return Array.from(
      entry.menu.querySelectorAll(
        '.rwRichSelect__option:not(:disabled):not([hidden])'
      )
    );
  }

  function setRichSelectHighlight(entry, optionIndex, focusOption) {
    const buttons = richSelectOptionButtons(entry);

    buttons.forEach((button) => {
      const currentIndex = number(
        button.getAttribute('data-option-index')
      );

      button.classList.toggle(
        'is-highlighted',
        currentIndex === optionIndex
      );
    });

    const target = buttons.find(
      (button) =>
        number(button.getAttribute('data-option-index')) ===
        optionIndex
    );

    entry.highlightedIndex = target
      ? optionIndex
      : -1;

    if (target) {
      entry.trigger.setAttribute(
        'aria-activedescendant',
        target.id
      );

      if (focusOption) {
        target.focus();
        target.scrollIntoView({
          block: 'nearest'
        });
      }
    } else {
      entry.trigger.removeAttribute(
        'aria-activedescendant'
      );
    }
  }

  function syncRichSelect(selectId) {
    const entry = richSelectRegistry.get(selectId);
    if (!entry) return;

    const select = entry.select;
    const options = Array.from(select.options);
    const selectedOption =
      options[select.selectedIndex] ||
      options[0] ||
      null;

    const selectedDescriptor = richSelectDescriptor(
      selectId,
      selectedOption ? selectedOption.value : '',
      selectedOption
    );

    entry.value.innerHTML =
      renderRichSelectSelectedValue(
        selectedDescriptor
      );

    entry.value.classList.toggle(
      'is-placeholder',
      Boolean(selectedDescriptor.placeholder)
    );

    entry.trigger.disabled = Boolean(select.disabled);

    entry.wrapper.classList.toggle(
      'is-disabled',
      Boolean(select.disabled)
    );

    if (select.disabled) {
      closeRichSelect(selectId, false);
    }

    entry.menu.innerHTML = renderRichSelectMenu(
      selectId,
      options,
      select.selectedIndex
    );

    const searchInput = entry.menu.querySelector(
      '[data-rich-select-search]'
    );

    if (searchInput) {
      searchInput.value = entry.searchQuery || '';
      filterRichSelectOptions(
        entry,
        entry.searchQuery || ''
      );
    }

    if (entry.wrapper.classList.contains('is-open')) {
      setRichSelectHighlight(
        entry,
        select.selectedIndex,
        false
      );
    }
  }

  function selectRichSelectOption(selectId, optionIndex) {
    const entry = richSelectRegistry.get(selectId);
    if (!entry) return;

    const option = entry.select.options[optionIndex];

    if (!option || option.disabled) return;

    entry.select.selectedIndex = optionIndex;

    entry.select.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );

    syncRichSelect(selectId);
    closeRichSelect(selectId, true);
  }

  function openRichSelect(selectId, direction) {
    const entry = richSelectRegistry.get(selectId);

    if (!entry || entry.select.disabled) return;

    closeAllRichSelects(selectId);

    entry.wrapper.classList.add('is-open');
    entry.trigger.setAttribute('aria-expanded', 'true');

    const searchInput = entry.menu.querySelector(
      '[data-rich-select-search]'
    );

    if (searchInput && !direction) {
      requestAnimationFrame(() => {
        searchInput.focus();
        searchInput.select();
      });
      return;
    }

    const buttons = richSelectOptionButtons(entry);

    if (!buttons.length) return;

    let optionIndex = entry.select.selectedIndex;

    if (direction === 'first') {
      optionIndex = number(
        buttons[0].getAttribute('data-option-index')
      );
    }

    if (direction === 'last') {
      optionIndex = number(
        buttons[buttons.length - 1].getAttribute(
          'data-option-index'
        )
      );
    }

    requestAnimationFrame(() => {
      setRichSelectHighlight(
        entry,
        optionIndex,
        true
      );
    });
  }

  function toggleRichSelect(selectId) {
    const entry = richSelectRegistry.get(selectId);
    if (!entry || entry.select.disabled) return;

    if (entry.wrapper.classList.contains('is-open')) {
      closeRichSelect(selectId, false);
    } else {
      openRichSelect(selectId);
    }
  }

  function handleRichSelectMenuKeydown(
    event,
    selectId
  ) {
    const entry = richSelectRegistry.get(selectId);
    if (!entry) return;

    const buttons = richSelectOptionButtons(entry);
    if (!buttons.length) return;

    const focusedIndex = buttons.indexOf(
      document.activeElement
    );

    if (event.key === 'Escape') {
      event.preventDefault();
      closeRichSelect(selectId, true);
      return;
    }

    if (event.key === 'Tab') {
      closeRichSelect(selectId, false);
      return;
    }

    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      const focused = document.activeElement;

      if (
        focused &&
        focused.hasAttribute('data-option-index')
      ) {
        event.preventDefault();

        selectRichSelectOption(
          selectId,
          number(
            focused.getAttribute('data-option-index')
          )
        );
      }

      return;
    }

    let nextIndex = focusedIndex;

    if (event.key === 'ArrowDown') {
      nextIndex = Math.min(
        buttons.length - 1,
        focusedIndex < 0 ? 0 : focusedIndex + 1
      );
    } else if (event.key === 'ArrowUp') {
      nextIndex = Math.max(
        0,
        focusedIndex < 0
          ? buttons.length - 1
          : focusedIndex - 1
      );
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1;
    } else {
      return;
    }

    event.preventDefault();

    const nextButton = buttons[nextIndex];

    setRichSelectHighlight(
      entry,
      number(
        nextButton.getAttribute('data-option-index')
      ),
      true
    );
  }

  function ensureRichSelect(selectId) {
    const select = $(selectId);
    if (!select) return;

    const existing = richSelectRegistry.get(selectId);

    if (existing && existing.select === select) {
      syncRichSelect(selectId);
      return;
    }

    if (existing) {
      existing.observer.disconnect();
      richSelectRegistry.delete(selectId);
    }

    const field = select.closest('.rwField');
    const labelElement = field
      ? field.querySelector('span')
      : null;

    const fieldLabel = labelElement
      ? String(labelElement.textContent || '').trim()
      : 'Seleccionar opción';

    const wrapper = document.createElement('div');
    wrapper.className = 'rwRichSelect';
    wrapper.setAttribute(
      'data-rich-select-for',
      selectId
    );

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.classList.add('rwRichSelect__native');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'rwRichSelect__trigger';
    trigger.id = `${selectId}RichTrigger`;
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute(
      'aria-controls',
      `${selectId}RichMenu`
    );
    trigger.setAttribute('aria-label', fieldLabel);

    trigger.innerHTML =
      `<span class="rwRichSelect__value"></span>` +
      `<span class="rwRichSelect__chevron"` +
      ` aria-hidden="true"></span>`;

    const menu = document.createElement('div');
    menu.className = 'rwRichSelect__menu';
    menu.id = `${selectId}RichMenu`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute(
      'aria-labelledby',
      trigger.id
    );

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    const entry = {
      select,
      wrapper,
      trigger,
      value: trigger.querySelector(
        '.rwRichSelect__value'
      ),
      menu,
      observer: null,
      highlightedIndex: -1,
      searchQuery: ''
    };

    richSelectRegistry.set(selectId, entry);

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleRichSelect(selectId);
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRichSelect(selectId, false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openRichSelect(selectId, 'first');
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        openRichSelect(selectId, 'last');
        return;
      }

      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        toggleRichSelect(selectId);
      }
    });

    menu.addEventListener('click', (event) => {
      event.stopPropagation();

      const closeButton = event.target.closest(
        '[data-rich-select-close]'
      );

      if (closeButton) {
        event.preventDefault();
        closeRichSelect(selectId, true);
        return;
      }

      const button = event.target.closest(
        '[data-option-index]'
      );

      if (!button) return;

      event.preventDefault();

      selectRichSelectOption(
        selectId,
        number(
          button.getAttribute('data-option-index')
        )
      );
    });

    menu.addEventListener('input', (event) => {
      const input = event.target.closest(
        '[data-rich-select-search]'
      );

      if (!input) return;

      entry.searchQuery = input.value || '';
      filterRichSelectOptions(
        entry,
        entry.searchQuery
      );
    });

    menu.addEventListener(
      'keydown',
      (event) =>
        handleRichSelectMenuKeydown(
          event,
          selectId
        )
    );

    select.addEventListener('change', () => {
      syncRichSelect(selectId);
    });

    entry.observer = new MutationObserver(() => {
      syncRichSelect(selectId);
    });

    entry.observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'disabled',
        'label',
        'value'
      ]
    });

    syncRichSelect(selectId);
  }

  function setupRichSelects() {
    [
      'rwLandingSelect',
      'rwParameterFieldSelect',
      'rwParameterValueSelect'
    ].forEach(ensureRichSelect);

    if (richSelectGlobalListenersReady) return;

    richSelectGlobalListenersReady = true;

    document.addEventListener('click', (event) => {
      let insideRichSelect = false;

      richSelectRegistry.forEach((entry) => {
        if (entry.wrapper.contains(event.target)) {
          insideRichSelect = true;
        }
      });

      if (!insideRichSelect) {
        closeAllRichSelects();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllRichSelects();
      }
    });
  }

  function updateVersionOptions() {
    const landingKey = selectedLandingKey();
    const versions = Array.from(new Set(
      state.options
        .filter((item) => !landingKey || item.landing_key === landingKey)
        .map((item) => item.landing_version)
        .filter(Boolean)
    )).sort();

    const select = $('rwVersionSelect');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Todas</option>' + versions
      .map((version) => `<option value="${escapeHtml(version)}">${escapeHtml(version)}</option>`)
      .join('');

    if (versions.includes(current)) select.value = current;
    if (landingKey && versions.length === 1) select.value = versions[0];
  }

  async function getClient() {
    if (!window.ProtocolAuth) {
      throw new Error('ProtocolAuth no está disponible.');
    }

    const session = await window.ProtocolAuth.getSession();
    if (!session) {
      window.location.href = window.ProtocolAuth.loginUrl(
        window.location.pathname + window.location.search
      );
      return null;
    }

    return window.ProtocolAuth.getClient();
  }

  async function loadOptions(client) {
    const response = await client.rpc('rpc_analytics_landing_options', {
      input_start_date: $('rwStartDate').value || null,
      input_end_date: $('rwEndDate').value || null
    });

    if (response.error) throw response.error;

    const payload = response.data || {};
    state.options = Array.isArray(payload.items) ? payload.items : [];

    const select = $('rwLandingSelect');
    const current = select.value;
    const grouped = new Map();

    state.options.forEach((item) => {
      if (!grouped.has(item.landing_key)) grouped.set(item.landing_key, item);
    });

    select.innerHTML = '<option value="">Todas las landings</option>' +
      Array.from(grouped.values()).map((item) => {
        const label = item.product_title || item.product_handle || item.landing_key;
        return `<option value="${escapeHtml(item.landing_key)}">${escapeHtml(label)}</option>`;
      }).join('');

    if (Array.from(grouped.keys()).includes(current)) select.value = current;
    if (!current && grouped.size === 1) {
      select.value = Array.from(grouped.keys())[0];
    }

    updateVersionOptions();
  }

  async function loadParameterOptions(client) {
    const response = await client.rpc(
      'rpc_analytics_url_parameter_options',
      {
        input_landing_key: selectedLandingKey(),
        input_landing_version:
          $('rwVersionSelect').value || null,
        input_start_date:
          $('rwStartDate').value || null,
        input_end_date:
          $('rwEndDate').value || null,
        input_device_type:
          $('rwDeviceSelect').value || null
      }
    );

    if (response.error) throw response.error;

    const payload = response.data || {};

    if (payload.ok === false) {
      throw new Error(
        payload.error ||
        'No se pudieron cargar los parámetros registrados.'
      );
    }

    state.parameterOptions = Array.isArray(payload.items)
      ? payload.items
      : [];

    renderParameterFieldOptions();
    renderActiveParameterFilters();
  }

  async function loadFunnel(client) {
    const params = {
      input_landing_key: selectedLandingKey(),
      input_landing_version: $('rwVersionSelect').value || null,
      input_start_date: $('rwStartDate').value || null,
      input_end_date: $('rwEndDate').value || null,
      input_utm_source: $('rwSourceInput').value.trim() || null,
      input_utm_campaign: $('rwCampaignInput').value.trim() || null,
      input_device_type: $('rwDeviceSelect').value || null,
      input_url_parameters: Object.assign(
        {},
        state.activeUrlParameters
      )
    };

    const response = await client.rpc(
      'rpc_analytics_landing_funnel_dynamic',
      params
    );

    if (response.error) throw response.error;
    renderSummary(response.data || {});
  }

  function setStageWidth(id, count, views) {
    const el = $(id);
    if (!el) return;
    const pct = views > 0 ? (count / views) * 100 : 0;
    el.style.setProperty('--stage-width', `${Math.max(28, Math.min(100, pct))}%`);
  }

  function renderSummary(payload) {
    const metrics = payload.metrics || {};
    const timing = payload.timing || {};
    const landing = payload.landing || {};
    const filters = payload.filters || {};

    const views = number(metrics.views);
    const sessions = number(metrics.sessions);
    const l1 = number(metrics.reached_l1);
    const l2 = number(metrics.reached_l2);
    const l3 = number(metrics.reached_l3);

    $('rwKpiViews').textContent = formatNumber(views);
    $('rwKpiSessions').textContent = formatNumber(sessions);
    $('rwKpiL1').textContent = formatNumber(l1);
    $('rwKpiL2').textContent = formatNumber(l2);
    $('rwKpiL3').textContent = formatNumber(l3);
    $('rwKpiConversion').textContent = formatPct(metrics.view_to_l3_pct);
    $('rwKpiL1Pct').textContent = `${formatPct(metrics.view_to_l1_pct)} · 10% + 10 s`;
    $('rwKpiL2Pct').textContent = `${formatPct(metrics.l1_to_l2_pct)} desde L1`;
    $('rwKpiL3Pct').textContent = `${formatPct(metrics.l2_to_l3_pct)} desde L2`;

    $('rwStageViewCount').textContent = formatNumber(views);
    $('rwStageL1Count').textContent = formatNumber(l1);
    $('rwStageL2Count').textContent = formatNumber(l2);
    $('rwStageL3Count').textContent = formatNumber(l3);
    $('rwStageL1Conversion').textContent = `${formatPct(metrics.view_to_l1_pct)} desde View`;
    $('rwStageL2Conversion').textContent = `${formatPct(metrics.l1_to_l2_pct)} desde L1`;
    $('rwStageL3Conversion').textContent = `${formatPct(metrics.l2_to_l3_pct)} desde L2`;
    $('rwStageL1Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l1)}`;
    $('rwStageL2Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l2)}`;
    $('rwStageL3Time').textContent = `Mediana: ${formatSeconds(timing.median_seconds_to_l3)}`;
    $('rwStageL1Drop').textContent = `Caída: ${formatNumber(Math.max(0, views - l1))}`;
    $('rwStageL2Drop').textContent = `Caída: ${formatNumber(Math.max(0, l1 - l2))}`;
    $('rwStageL3Drop').textContent = `Caída: ${formatNumber(Math.max(0, l2 - l3))}`;

    setStageWidth('rwStageL1', l1, views);
    setStageWidth('rwStageL2', l2, views);
    setStageWidth('rwStageL3', l3, views);

    $('rwTimeL1').textContent = formatSeconds(timing.median_seconds_to_l1);
    $('rwTimeL2').textContent = formatSeconds(timing.median_seconds_to_l2);
    $('rwTimeL3').textContent = formatSeconds(timing.median_seconds_to_l3);
    $('rwTimeP75').textContent = formatSeconds(timing.p75_seconds_to_l3);
    $('rwTimeP90').textContent = formatSeconds(timing.p90_seconds_to_l3);

    const title = landing.product_title ||
      (selectedLandingKey() ? selectedLandingKey() : 'Todas las landings');

    $('rwSelectedLandingBadge').textContent = title;
    $('rwContextTitle').textContent = title;
    $('rwContextVersion').textContent = filters.landing_version || 'Todas';
    $('rwContextSource').textContent = filters.utm_source || 'Todas';
    $('rwContextCampaign').textContent = filters.utm_campaign || 'Todas';
    $('rwContextDevice').textContent = filters.device_type || 'Todos';
    $('rwContextParameters').textContent = formatUrlParameters(
      filters.url_parameters || state.activeUrlParameters
    );
    $('rwContextRange').textContent = `${filters.start_date || '—'} → ${filters.end_date || '—'}`;

    renderInsight({ views, l1, l2, l3, timing });
    renderChart(Array.isArray(payload.daily) ? payload.daily : []);

    const now = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    $('rwLastUpdateBadge').textContent = `Actualizado ${now}`;
    setStatus(
      `Datos cargados: ${formatNumber(views)} visitas dentro del rango seleccionado.`,
      'success'
    );
  }

  function renderInsight(data) {
    const drops = [
      { label: 'View → L1', value: Math.max(0, data.views - data.l1) },
      { label: 'L1 → L2', value: Math.max(0, data.l1 - data.l2) },
      { label: 'L2 → L3', value: Math.max(0, data.l2 - data.l3) }
    ].sort((a, b) => b.value - a.value);

    const times = [
      { label: 'L1', value: data.timing.median_seconds_to_l1 },
      { label: 'L2', value: data.timing.median_seconds_to_l2 },
      { label: 'L3', value: data.timing.median_seconds_to_l3 }
    ]
      .filter((item) => item.value !== null && item.value !== undefined)
      .sort((a, b) => number(b.value) - number(a.value));

    const biggestDrop = drops[0];
    const slowest = times[0];

    if (!data.views) {
      $('rwInsightTitle').textContent = 'Sin visitas para este filtro';
      $('rwInsightBody').textContent =
        'Ampliá el rango o quitá filtros para recuperar datos del embudo.';
    } else {
      $('rwInsightTitle').textContent = biggestDrop.value > 0
        ? `La mayor caída está en ${biggestDrop.label}`
        : 'La visita completó todo el embudo';

      $('rwInsightBody').textContent = biggestDrop.value > 0
        ? `${formatNumber(biggestDrop.value)} visitas no avanzaron al siguiente nivel. El nivel de llegada más lenta es ${slowest ? slowest.label : '—'}.`
        : 'No se detectaron abandonos en el conjunto actual. Hace falta más volumen para evaluar patrones estables.';
    }

    $('rwInsightDropBadge').textContent =
      `Mayor caída: ${biggestDrop.label} (${formatNumber(biggestDrop.value)})`;

    $('rwInsightSpeedBadge').textContent =
      `Nivel más lento: ${slowest ? `${slowest.label} · ${formatSeconds(slowest.value)}` : '—'}`;
  }

  function renderChart(rows) {
    const canvas = $('rwDailyChart');
    if (!canvas || !window.Chart) return;
    if (state.chart) state.chart.destroy();

    state.chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: rows.map((row) => row.date),
        datasets: [
          { label: 'Visitas', data: rows.map((row) => row.views), borderColor: '#c9ced7', backgroundColor: 'rgba(201,206,215,.12)', tension: .32 },
          { label: 'L1', data: rows.map((row) => row.reached_l1), borderColor: '#2479ff', backgroundColor: 'rgba(36,121,255,.12)', tension: .32 },
          { label: 'L2', data: rows.map((row) => row.reached_l2), borderColor: '#32b9d7', backgroundColor: 'rgba(50,185,215,.12)', tension: .32 },
          { label: 'L3', data: rows.map((row) => row.reached_l3), borderColor: '#35d38a', backgroundColor: 'rgba(53,211,138,.12)', tension: .32 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#aeb6c2', usePointStyle: true, boxWidth: 8 }
          }
        },
        scales: {
          x: { ticks: { color: '#818a97' }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { beginAtZero: true, ticks: { color: '#818a97', precision: 0 }, grid: { color: 'rgba(255,255,255,.05)' } }
        }
      }
    });
  }


  function deleteDataSelectedLandingItem() {
    const landingKey = selectedLandingKey();

    if (!landingKey) return null;

    return state.options.find(
      (item) => item.landing_key === landingKey
    ) || null;
  }

  function deleteDataSelectedLandingLabel() {
    const landingKey = selectedLandingKey();
    const item = deleteDataSelectedLandingItem();

    if (!landingKey) return 'Todas las landings';

    return (
      item?.product_title ||
      item?.product_handle ||
      landingKey
    );
  }

  function deleteDataHasFilteredCriteria() {
    const source =
      $('rwSourceInput')?.value.trim() || '';

    const campaign =
      $('rwCampaignInput')?.value.trim() || '';

    return Boolean(
      source ||
      campaign ||
      Object.keys(
        state.activeUrlParameters || {}
      ).length
    );
  }

  function deleteDataCurrentMode() {
    const selected = document.querySelector(
      'input[name="rwDeleteMode"]:checked'
    );

    return selected?.value || 'filtered';
  }

  function updateDeleteDataButtonState() {
    const button = $('rwOpenDeleteDataButton');

    if (!button) return;

    const landingKey = selectedLandingKey();

    button.disabled = !landingKey;

    button.title = landingKey
      ? 'Borrar navegación de la landing seleccionada'
      : 'Seleccioná una landing específica';
  }

  function deleteDataPreviewParams(mode) {
    const common = {
      input_landing_key:
        selectedLandingKey(),

      input_start_date:
        $('rwStartDate').value || null,

      input_end_date:
        $('rwEndDate').value || null,

      input_landing_version:
        $('rwVersionSelect').value || null,

      input_device:
        $('rwDeviceSelect').value || null
    };

    if (mode === 'entire_landing') {
      return common;
    }

    return {
      ...common,

      input_utm_source:
        $('rwSourceInput').value.trim() || null,

      input_utm_campaign:
        $('rwCampaignInput').value.trim() || null,

      input_url_parameters: {
        ...state.activeUrlParameters
      }
    };
  }

  function deleteDataRequiredConfirmation(mode) {
    const landingKey = selectedLandingKey();

    if (mode === 'entire_landing') {
      return `BORRAR ${landingKey}`;
    }

    return 'BORRAR DATOS DE PRUEBA';
  }

  function deleteDataSyncModeAvailability(busy) {
    const filtered = $('rwDeleteFilteredMode');
    const entire = $('rwDeleteEntireLandingMode');

    if (!filtered || !entire) return;

    const filteredAvailable =
      deleteDataHasFilteredCriteria();

    filtered.disabled = Boolean(
      busy || !filteredAvailable
    );

    entire.disabled = Boolean(busy);

    const filteredLabel = filtered.closest(
      '.rwDeleteDataMode'
    );

    if (filteredLabel) {
      filteredLabel.classList.toggle(
        'is-disabled',
        !filteredAvailable
      );
    }

    if (
      !filteredAvailable &&
      filtered.checked
    ) {
      filtered.checked = false;
      entire.checked = true;
      state.deleteMode = 'entire_landing';
    }
  }

  function deleteDataSetError(message) {
    const error = $('rwDeleteDataError');

    if (!error) return;

    const cleanMessage =
      String(message || '').trim();

    error.textContent = cleanMessage;
    error.hidden = !cleanMessage;
  }

  function deleteDataResetPreview(message) {
    state.deletePreview = null;
    state.deletePreviewParams = null;
    state.deleteRequiredConfirmation = '';

    $('rwDeletePreviewStatus').textContent =
      message ||
      'La vista previa todavía no fue consultada.';

    $('rwDeletePreviewViews').textContent = '—';
    $('rwDeletePreviewSessions').textContent = '—';
    $('rwDeletePreviewEvents').textContent = '—';
    $('rwDeletePreviewL1').textContent = '—';
    $('rwDeletePreviewL2').textContent = '—';
    $('rwDeletePreviewL3').textContent = '—';

    const confirmButton =
      $('rwDeleteConfirmButton');

    const cancelButton =
      $('rwDeleteCancelButton');

    const closeButton =
      $('rwDeleteDataCloseButton');

    confirmButton.disabled = true;
    confirmButton.textContent = 'Confirmar';

    cancelButton.disabled = false;
    closeButton.disabled = false;

    $('rwDeleteDataDialog').setAttribute(
      'data-mode',
      'idle'
    );

    deleteDataSetError('');
  }

  function deleteDataRenderSelectionSummary(mode) {
    const landingKey =
      selectedLandingKey();

    const landingLabel =
      deleteDataSelectedLandingLabel();

    const version =
      $('rwVersionSelect').value || 'Todas';

    const device =
      $('rwDeviceSelect').value || 'Todos';

    const startDate =
      $('rwStartDate').value || '—';

    const endDate =
      $('rwEndDate').value || '—';

    const scope =
      mode === 'entire_landing'
        ? 'Toda la navegación de la landing'
        : 'Solo datos que coinciden con los filtros';

    const parameterCount = Object.keys(
      state.activeUrlParameters || {}
    ).length;

    $('rwDeleteDataSelectionSummary').innerHTML = `
      <strong>
        ${escapeHtml(landingLabel)}
      </strong>

      <br>

      ${escapeHtml(scope)}

      <br>

      <span>
        ${escapeHtml(landingKey)} ·
        ${escapeHtml(startDate)}
        →
        ${escapeHtml(endDate)}
      </span>

      <br>

      <span>
        Versión:
        ${escapeHtml(version)}
        · Dispositivo:
        ${escapeHtml(device)}
        · Parámetros activos:
        ${formatNumber(parameterCount)}
      </span>
    `;
  }

  function deleteDataRenderPreview(preview) {
    const views =
      number(preview?.matched_page_views);

    const sessions =
      number(preview?.matched_sessions);

    const events =
      number(preview?.matched_events);

    $('rwDeletePreviewViews').textContent =
      formatNumber(views);

    $('rwDeletePreviewSessions').textContent =
      formatNumber(sessions);

    $('rwDeletePreviewEvents').textContent =
      formatNumber(events);

    $('rwDeletePreviewL1').textContent =
      formatNumber(preview?.l1_page_views);

    $('rwDeletePreviewL2').textContent =
      formatNumber(preview?.l2_page_views);

    $('rwDeletePreviewL3').textContent =
      formatNumber(preview?.l3_page_views);

    if (!views || !events) {
      $('rwDeletePreviewStatus').textContent =
        'No hay datos coincidentes para este alcance.';

      return false;
    }

    $('rwDeletePreviewStatus').textContent =
      'Vista previa lista. Revisá el impacto antes de confirmar.';

    return true;
  }

  function updateDeleteDataConfirmationState() {
    const button =
      $('rwDeleteConfirmButton');

    if (!button) return;

    const hasPreview = Boolean(
      state.deletePreview &&
      number(
        state.deletePreview.matched_page_views
      ) > 0 &&
      number(
        state.deletePreview.matched_events
      ) > 0
    );

    button.disabled = Boolean(
      state.deleteSubmitting ||
      !hasPreview
    );
  }

  async function loadDeleteDataPreview() {
    const landingKey =
      selectedLandingKey();

    if (!landingKey) {
      deleteDataSetError(
        'Debe seleccionarse una landing específica.'
      );

      return;
    }

    const mode =
      deleteDataCurrentMode();

    state.deleteMode = mode;

    const requestId =
      ++state.deletePreviewRequestId;

    deleteDataResetPreview(
      'Consultando el impacto en Analytics…'
    );

    deleteDataRenderSelectionSummary(mode);
    deleteDataSyncModeAvailability(true);

    $('rwDeleteDataDialog').setAttribute(
      'data-mode',
      'loading'
    );

    try {
      const client = await getClient();

      if (!client) {
        throw new Error(
          'No se pudo obtener el cliente autenticado.'
        );
      }

      const params =
        deleteDataPreviewParams(mode);

      const rpcName =
        mode === 'entire_landing'
          ? 'rpc_analytics_landing_navigation_preview'
          : 'rpc_analytics_test_data_preview';

      const response = await client.rpc(
        rpcName,
        params
      );

      if (
        requestId !==
        state.deletePreviewRequestId
      ) {
        return;
      }

      if (response.error) {
        throw response.error;
      }

      const preview =
        response.data?.[0] || null;

      state.deletePreview = preview;
      state.deletePreviewParams = params;

      const hasData =
        deleteDataRenderPreview(preview);

      if (!hasData) {
        $('rwDeleteDataDialog').setAttribute(
          'data-mode',
          'idle'
        );

        return;
      }

      state.deleteRequiredConfirmation =
        deleteDataRequiredConfirmation(mode);

      $('rwDeleteDataDialog').setAttribute(
        'data-mode',
        'confirm'
      );

      updateDeleteDataConfirmationState();
    } catch (error) {
      if (
        requestId !==
        state.deletePreviewRequestId
      ) {
        return;
      }

      console.error(
        '[rendimiento-web:delete-preview]',
        error
      );

      $('rwDeleteDataDialog').setAttribute(
        'data-mode',
        'error'
      );

      $('rwDeletePreviewStatus').textContent =
        'No se pudo obtener la vista previa.';

      deleteDataSetError(
        error?.message ||
        'No se pudo revisar el impacto del borrado.'
      );
    } finally {
      if (
        requestId ===
        state.deletePreviewRequestId
      ) {
        deleteDataSyncModeAvailability(false);
      }
    }
  }

  function openDeleteDataDialog() {
    resetDeleteDataSuccessPresentation();

    if (!selectedLandingKey()) {
      updateDeleteDataButtonState();
      return;
    }

    const filteredAvailable =
      deleteDataHasFilteredCriteria();

    const filtered =
      $('rwDeleteFilteredMode');

    const entire =
      $('rwDeleteEntireLandingMode');

    if (
      state.deleteMode === 'filtered' &&
      filteredAvailable
    ) {
      filtered.checked = true;
      entire.checked = false;
    } else {
      filtered.checked = false;
      entire.checked = true;
      state.deleteMode = 'entire_landing';
    }

    deleteDataSyncModeAvailability(false);
    deleteDataResetPreview();

    deleteDataRenderSelectionSummary(
      deleteDataCurrentMode()
    );

    const overlay =
      $('rwDeleteDataOverlay');

    overlay.classList.add('is-open');
    overlay.setAttribute(
      'aria-hidden',
      'false'
    );

    loadDeleteDataPreview();
  }

  function closeDeleteDataDialog() {
    if (state.deleteSubmitting) return;

    state.deletePreviewRequestId += 1;

    const overlay =
      $('rwDeleteDataOverlay');

    overlay.classList.remove('is-open');
    overlay.setAttribute(
      'aria-hidden',
      'true'
    );

    deleteDataResetPreview();
    resetDeleteDataSuccessPresentation();
    deleteDataSyncModeAvailability(false);
  }

  function resetDeleteDataSuccessPresentation() {
    const dialog =
      $('rwDeleteDataDialog');

    const title =
      $('rwDeleteDataTitle');

    const intro =
      document.querySelector(
        '.rwDeleteDataDialog__intro'
      );

    const modes =
      document.querySelector(
        '.rwDeleteDataModes'
      );

    const selectionSummary =
      $('rwDeleteDataSelectionSummary');

    const preview =
      $('rwDeletePreview');

    const cancelButton =
      $('rwDeleteCancelButton');

    const confirmButton =
      $('rwDeleteConfirmButton');

    const closeButton =
      $('rwDeleteDataCloseButton');

    if (dialog) {
      dialog.setAttribute(
        'data-mode',
        'idle'
      );
    }

    if (title) {
      title.textContent =
        'Borrar datos de navegación';
    }

    if (intro) {
      intro.textContent =
        'Esta acción solamente afectará la landing específica seleccionada en el panel.';
    }

    if (modes) {
      modes.hidden = false;
    }

    if (selectionSummary) {
      selectionSummary.hidden = false;
    }

    if (preview) {
      preview.hidden = false;
    }

    if (cancelButton) {
      cancelButton.hidden = false;
      cancelButton.disabled = false;
    }

    if (confirmButton) {
      confirmButton.hidden = false;
      confirmButton.textContent = 'Confirmar';
    }

    if (closeButton) {
      closeButton.disabled = false;
    }
  }

  function showDeleteDataSuccess(
    result,
    landingLabel
  ) {
    const dialog =
      $('rwDeleteDataDialog');

    const title =
      $('rwDeleteDataTitle');

    const intro =
      document.querySelector(
        '.rwDeleteDataDialog__intro'
      );

    const modes =
      document.querySelector(
        '.rwDeleteDataModes'
      );

    const selectionSummary =
      $('rwDeleteDataSelectionSummary');

    const preview =
      $('rwDeletePreview');

    const cancelButton =
      $('rwDeleteCancelButton');

    const confirmButton =
      $('rwDeleteConfirmButton');

    const closeButton =
      $('rwDeleteDataCloseButton');

    dialog.setAttribute(
      'data-mode',
      'success'
    );

    title.textContent =
      'Datos eliminados';

    intro.textContent =
      'La navegación seleccionada se eliminó correctamente.';

    modes.hidden = true;

    selectionSummary.hidden = false;
    selectionSummary.innerHTML = `
      <strong>
        ${escapeHtml(landingLabel)}
      </strong>

      <br>

      La operación fue completada y registrada
      en la auditoría administrativa.
    `;

    preview.hidden = false;

    $('rwDeletePreviewStatus').textContent =
      'Borrado completado correctamente.';

    $('rwDeletePreviewViews').textContent =
      formatNumber(
        result?.deleted_page_views
      );

    $('rwDeletePreviewSessions').textContent =
      formatNumber(
        result?.deleted_sessions
      );

    $('rwDeletePreviewEvents').textContent =
      formatNumber(
        result?.deleted_events
      );

    $('rwDeletePreviewL1').textContent =
      formatNumber(
        result?.l1_page_views
      );

    $('rwDeletePreviewL2').textContent =
      formatNumber(
        result?.l2_page_views
      );

    $('rwDeletePreviewL3').textContent =
      formatNumber(
        result?.l3_page_views
      );

    cancelButton.hidden = true;
    cancelButton.disabled = false;

    closeButton.disabled = false;

    confirmButton.hidden = false;
    confirmButton.disabled = false;
    confirmButton.textContent = 'Listo';

    deleteDataSetError('');
  }

  async function confirmDeleteData() {
    if (
      $('rwDeleteDataDialog')
        .getAttribute('data-mode') === 'success'
    ) {
      closeDeleteDataDialog();
      return;
    }

    if (
      state.deleteSubmitting ||
      !state.deletePreview ||
      !state.deletePreviewParams
    ) {
      return;
    }

    const mode =
      state.deleteMode;

    const confirmation =
      deleteDataRequiredConfirmation(mode);

    const rpcName =
      mode === 'entire_landing'
        ? 'rpc_analytics_landing_navigation_delete'
        : 'rpc_analytics_test_data_delete';

    const params = {
      ...state.deletePreviewParams,

      input_expected_page_views:
        number(
          state.deletePreview.matched_page_views
        ),

      input_expected_events:
        number(
          state.deletePreview.matched_events
        ),

      input_confirmation:
        confirmation
    };

    state.deleteSubmitting = true;

    const confirmButton =
      $('rwDeleteConfirmButton');

    const cancelButton =
      $('rwDeleteCancelButton');

    const closeButton =
      $('rwDeleteDataCloseButton');

    confirmButton.disabled = true;
    confirmButton.textContent = 'Procesando…';

    cancelButton.disabled = true;
    closeButton.disabled = true;

    deleteDataSyncModeAvailability(true);
    deleteDataSetError('');

    try {
      const client = await getClient();

      if (!client) {
        throw new Error(
          'No se pudo obtener el cliente autenticado.'
        );
      }

      const response = await client.rpc(
        rpcName,
        params
      );

      if (response.error) {
        throw response.error;
      }

      const result =
        response.data?.[0] || null;

      if (!result) {
        throw new Error(
          'Supabase no devolvió el resultado del borrado.'
        );
      }

      const deletedViews =
        number(result.deleted_page_views);

      const deletedEvents =
        number(result.deleted_events);

      const landingLabel =
        deleteDataSelectedLandingLabel();

      state.deleteSubmitting = false;

      await refreshAll();

      setStatus(
        `Borrado completado: ${formatNumber(deletedViews)} visitas y ${formatNumber(deletedEvents)} eventos eliminados.`,
        'success'
      );

      showDeleteDataSuccess(
        result,
        landingLabel
      );
    } catch (error) {
      console.error(
        '[rendimiento-web:delete]',
        error
      );

      $('rwDeleteDataDialog').setAttribute(
        'data-mode',
        'error'
      );

      deleteDataSetError(
        error?.message ||
        'No se pudieron borrar los datos seleccionados.'
      );

      state.deleteSubmitting = false;

      confirmButton.textContent = 'Confirmar';
      cancelButton.disabled = false;
      closeButton.disabled = false;

      deleteDataSyncModeAvailability(false);
      updateDeleteDataConfirmationState();
    }
  }

  async function refreshAll() {
    setLoading(true);
    setStatus('Consultando Analytics…');

    try {
      const client = await getClient();
      if (!client) return;
      await loadOptions(client);
      updateDeleteDataButtonState();
      await loadParameterOptions(client);
      await loadFunnel(client);
    } catch (error) {
      console.error('[rendimiento-web]', error);
      setStatus(
        error && error.message ? error.message : 'No se pudo cargar Analytics.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(client) {
    const response = await client.rpc('rpc_analytics_landing_versions', {
      input_landing_key: null,
      input_start_date: $('rwVersionsStartDate').value || null,
      input_end_date: $('rwVersionsEndDate').value || null,
      input_utm_source: $('rwVersionsSourceInput').value.trim() || null,
      input_utm_campaign: $('rwVersionsCampaignInput').value.trim() || null,
      input_device_type: $('rwVersionsDeviceSelect').value || null
    });

    if (response.error) throw response.error;
    state.versionsPayload = response.data || {};
    state.versionsLoaded = true;
    renderVersions(state.versionsPayload);
  }

  async function refreshVersions() {
    setVersionsLoading(true);
    setVersionsStatus('Consultando versiones e hipótesis…');

    try {
      const client = await getClient();
      if (!client) return;
      await loadVersions(client);
    } catch (error) {
      console.error('[rendimiento-web:versions]', error);
      setVersionsStatus(
        error && error.message ? error.message : 'No se pudo cargar el historial de versiones.',
        'error'
      );
    } finally {
      setVersionsLoading(false);
    }
  }

  function renderVersions(payload) {
    const summary = payload.summary || {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    $('rwVersionsLandingCount').textContent = formatNumber(summary.landing_count);
    $('rwVersionsVersionCount').textContent = formatNumber(summary.version_count);
    $('rwVersionsMeasuredCount').textContent = formatNumber(summary.measured_version_count);
    $('rwVersionsDraftCount').textContent = formatNumber(summary.draft_version_count);

    const container = $('rwVersionRows');

    if (!items.length) {
      container.innerHTML = '<div class="rwEmptyVersions">No hay landings registradas dentro del rango seleccionado.</div>';
      setVersionsStatus('Sin versiones para los filtros actuales.');
      return;
    }

    container.innerHTML = items.map((item) => {
      const title = item.product_title || item.product_handle || item.landing_key;
      return `
        <button class="rwVersionRow" type="button" data-landing-key="${escapeHtml(item.landing_key)}">
          <span class="rwVersionLanding">
            <strong>${escapeHtml(title)}</strong>
            <small>${escapeHtml(item.product_handle || item.landing_key)}</small>
          </span>
          <span class="rwVersionCell"><span class="rwVersionState rwVersionState--active">${escapeHtml(item.active_version_label || '—')}</span></span>
          <span class="rwVersionCell">${formatNumber(item.version_count)}</span>
          <span class="rwVersionCell">${formatNumber(item.total_views)}</span>
          <span class="rwVersionCell">${formatPct(item.total_view_to_l3_pct)}</span>
          <span class="rwVersionArrow">›</span>
        </button>`;
    }).join('');

    setVersionsStatus(
      `${formatNumber(items.length)} landings y ${formatNumber(summary.version_count)} versiones cargadas.`,
      'success'
    );
  }

  function statusText(status) {
    if (status === 'active') return 'Activa';
    if (status === 'draft') return 'Borrador';
    if (status === 'pending_activation') return 'Pendiente';
    if (status === 'activation_failed') return 'Error de activación';
    return 'Cerrada';
  }

  function miniWidth(count, views) {
    if (!views) return 100;
    return Math.max(44, Math.min(100, (number(count) / number(views)) * 100));
  }

  function versionCardHtml(version) {
    const funnel = version.funnel || {};
    const timing = version.timing || {};
    const experiment = version.experiment || {};
    const period = version.period || {};
    const status = version.status || 'closed';
    const views = number(funnel.views);
    const canActivate =
      status === 'draft' ||
      status === 'activation_failed';

    const isActivating =
      state.activationVersionNumber ===
      number(version.version_number);

    const toggleState =
      status === 'active'
        ? 'on'
        : status === 'pending_activation'
          ? 'pending'
          : canActivate
            ? 'off'
            : null;

    const toggleLabel =
      status === 'active'
        ? `${version.version_label} está activa`
        : status === 'pending_activation'
          ? `${version.version_label} espera su primera visita`
          : status === 'activation_failed'
            ? `Reintentar activación de ${version.version_label}`
            : `Activar ${version.version_label}`;

    const versionToggle = toggleState
      ? `
        <button
          class="rwVersionToggle rwVersionToggle--${toggleState}${isActivating ? ' is-loading' : ''}"
          type="button"
          ${canActivate ? `data-activate-version="${escapeHtml(version.version_number)}"` : ''}
          ${canActivate && !isActivating ? '' : 'disabled'}
          aria-pressed="${toggleState === 'off' ? 'false' : 'true'}"
          aria-label="${escapeHtml(toggleLabel)}"
          title="${escapeHtml(toggleLabel)}"
        >
          <span aria-hidden="true"></span>
        </button>`
      : '';

    return `
      <article class="rwVersionCard">
        <div class="rwVersionCardHead">
          <div>
            <span class="rwSectionLabel">VERSIÓN</span>
            <h3>${escapeHtml(version.version_label || '—')}</h3>
          </div>
          <div class="rwVersionStatusGroup">
            ${versionToggle}
            <span class="rwVersionState rwVersionState--${escapeHtml(status)}">${statusText(status)}</span>
          </div>
        </div>

        <div class="rwVersionCardMeta">
          <span>Período</span>
          <p>${formatDate(period.activated_at)} → ${period.deactivated_at ? formatDate(period.deactivated_at) : (status === 'draft' ? 'Sin activar' : 'Actualidad')}</p>
        </div>

        <div class="rwVersionCardMeta">
          <span>Hipótesis</span>
          <p>${escapeHtml(experiment.hypothesis || 'Sin hipótesis registrada.')}</p>
        </div>

        <div class="rwVersionCardMeta">
          <span>Módulo intervenido</span>
          <p>${escapeHtml(experiment.changed_module || '—')} · Métrica: ${escapeHtml(experiment.primary_metric || '—')}</p>
        </div>

        <div class="rwMiniFunnel">
          <div class="rwMiniStage" style="--mini-width:100%"><div><span>Landing View</span><strong>${formatNumber(funnel.views)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l1" style="--mini-width:${miniWidth(funnel.reached_l1, views)}%"><div><span>L1 · ${formatPct(funnel.view_to_l1_pct)}</span><strong>${formatNumber(funnel.reached_l1)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l2" style="--mini-width:${miniWidth(funnel.reached_l2, views)}%"><div><span>L2 · ${formatPct(funnel.l1_to_l2_pct)}</span><strong>${formatNumber(funnel.reached_l2)}</strong></div></div>
          <div class="rwMiniStage rwMiniStage--l3" style="--mini-width:${miniWidth(funnel.reached_l3, views)}%"><div><span>L3 · ${formatPct(funnel.view_to_l3_pct)}</span><strong>${formatNumber(funnel.reached_l3)}</strong></div></div>
        </div>

        <div class="rwMiniTiming">
          <div><span>Mediana L1</span><strong>${formatSeconds(timing.median_seconds_to_l1)}</strong></div>
          <div><span>Mediana L2</span><strong>${formatSeconds(timing.median_seconds_to_l2)}</strong></div>
          <div><span>Mediana L3</span><strong>${formatSeconds(timing.median_seconds_to_l3)}</strong></div>
        </div>

      </article>`;
  }

  async function getFunctionErrorMessage(error) {
    if (error && error.context) {
      try {
        const payload = await error.context.clone().json();

        if (payload && payload.error) {
          return String(payload.error);
        }
      } catch (_) {
        // La respuesta no contenía JSON legible.
      }
    }

    return error && error.message
      ? error.message
      : 'La función no devolvió un mensaje de error.';
  }

  function syncPageLock() {
    const drawerOpen =
      $('rwVersionDrawer') &&
      $('rwVersionDrawer').classList.contains('is-open');

    const activationModalOpen =
      $('rwActivationModalLayer') &&
      !$('rwActivationModalLayer').hidden;

    const createModalOpen =
      $('rwCreateVersionModalLayer') &&
      !$('rwCreateVersionModalLayer').hidden;

    document.documentElement.style.overflow =
      drawerOpen || activationModalOpen || createModalOpen
        ? 'hidden'
        : '';
  }

  function versionItems() {
    return state.versionsPayload &&
      Array.isArray(state.versionsPayload.items)
      ? state.versionsPayload.items
      : [];
  }

  function closeActivationConfirmation(result) {
    const layer = $('rwActivationModalLayer');

    if (layer) {
      layer.hidden = true;
      layer.setAttribute('aria-hidden', 'true');
    }

    syncPageLock();

    const resolver = state.activationConfirmationResolver;
    state.activationConfirmationResolver = null;

    if (resolver) {
      resolver(Boolean(result));
    }
  }

  function confirmVersionActivation(version, landingTitle) {
    const versions = state.activeLanding &&
      Array.isArray(state.activeLanding.versions)
      ? state.activeLanding.versions
      : [];

    const activeVersion = versions.find((item) =>
      item.status === 'active'
    );

    $('rwActivationModalTitle').textContent =
      `Activar versión ${version.version_label}`;

    $('rwActivationModalDescription').textContent =
      'Protocol Data actualizará el metacampo analítico del producto en Shopify.';

    $('rwActivationModalProduct').textContent =
      landingTitle;

    $('rwActivationModalTransition').textContent =
      `${activeVersion ? activeVersion.version_label : 'Versión actual'} → ${version.version_label}`;

    $('rwActivationModalNotice').textContent =
      'La versión anterior continuará activa hasta que ingrese la primera visita real con la nueva versión. En ese momento se cerrará automáticamente.';

    const layer = $('rwActivationModalLayer');

    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');

    syncPageLock();

    window.setTimeout(() => {
      $('rwActivationModalConfirm').focus();
    }, 20);

    return new Promise((resolve) => {
      state.activationConfirmationResolver = resolve;
    });
  }

  function setCreateVersionLoading(loading) {
    state.createVersionSubmitting = loading;

    const submit = $('rwCreateVersionSubmit');
    const cancel = $('rwCreateVersionCancel');
    const close = $('rwCreateVersionClose');

    if (submit) {
      const blocked = submit.dataset.blocked === '1';

      submit.disabled = loading || blocked;
      submit.textContent = loading
        ? 'Creando versión…'
        : 'Crear borrador';
    }

    if (cancel) cancel.disabled = loading;
    if (close) close.disabled = loading;
  }

  function closeCreateVersionModal(force = false) {
    if (state.createVersionSubmitting && !force) return;

    const layer = $('rwCreateVersionModalLayer');

    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');

    $('rwCreateVersionStatus').textContent = '';
    $('rwCreateVersionStatus').className = 'rwModalStatus';

    syncPageLock();
  }

  function selectedCreateLanding() {
    const landingKey = $('rwCreateLandingSelect').value;

    return versionItems().find((item) =>
      item.landing_key === landingKey
    ) || null;
  }

  function updateCreateVersionContext() {
    const item = selectedCreateLanding();

    const submit = $('rwCreateVersionSubmit');
    const warning = $('rwCreateVersionWarning');

    if (!item) {
      $('rwCreateProductTitle').textContent = '—';
      $('rwCreateBaseVersion').textContent = '—';
      $('rwCreateNextVersion').textContent = '—';

      submit.dataset.blocked = '1';
      submit.disabled = true;

      warning.hidden = false;
      warning.textContent =
        'No se encontró una landing válida.';
      return;
    }

    const versions = Array.isArray(item.versions)
      ? item.versions
      : [];

    const activeVersion = versions.find((version) =>
      version.status === 'active'
    );

    const openCandidate = versions.find((version) =>
      [
        'draft',
        'pending_activation',
        'activation_failed'
      ].includes(version.status)
    );

    const highestNumber = versions.reduce(
      (highest, version) =>
        Math.max(highest, number(version.version_number)),
      0
    );

    $('rwCreateProductTitle').textContent =
      item.product_title ||
      item.product_handle ||
      item.landing_key;

    $('rwCreateBaseVersion').textContent =
      activeVersion
        ? activeVersion.version_label
        : item.active_version_label || '—';

    $('rwCreateNextVersion').textContent =
      `v${highestNumber + 1}`;

    const blocked = Boolean(openCandidate);

    submit.dataset.blocked = blocked ? '1' : '0';
    submit.disabled = blocked || state.createVersionSubmitting;

    if (openCandidate) {
      warning.hidden = false;
      warning.textContent =
        `Esta landing ya tiene ${openCandidate.version_label} en estado “${statusText(openCandidate.status)}”. Debés resolver esa versión antes de crear otra.`;
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  }

  async function openCreateVersionModal() {
    try {
      const client = await getClient();
      if (!client) return;

      if (!state.versionsLoaded) {
        setVersionsStatus('Preparando el formulario de versión…');
        await loadVersions(client);
      }

      const items = versionItems();

      if (!items.length) {
        setVersionsStatus(
          'No hay landings registradas para crear una versión.',
          'error'
        );
        return;
      }

      const form = $('rwCreateVersionForm');
      form.reset();

      $('rwCreatePrimaryMetric').value =
        'view_to_l3_pct';

      $('rwCreateVersionStatus').textContent = '';
      $('rwCreateVersionStatus').className =
        'rwModalStatus';

      const select = $('rwCreateLandingSelect');

      select.innerHTML = items.map((item) => {
        const title =
          item.product_title ||
          item.product_handle ||
          item.landing_key;

        return `
          <option value="${escapeHtml(item.landing_key)}">
            ${escapeHtml(title)}
          </option>`;
      }).join('');

      const preferredLanding =
        state.activeLanding &&
        items.some((item) =>
          item.landing_key === state.activeLanding.landing_key
        )
          ? state.activeLanding.landing_key
          : items[0].landing_key;

      select.value = preferredLanding;

      setCreateVersionLoading(false);
      updateCreateVersionContext();

      const layer = $('rwCreateVersionModalLayer');

      layer.hidden = false;
      layer.setAttribute('aria-hidden', 'false');

      syncPageLock();

      window.setTimeout(() => {
        select.focus();
      }, 20);
    } catch (error) {
      console.error(
        '[rendimiento-web:create-version-open]',
        error
      );

      setVersionsStatus(
        error && error.message
          ? error.message
          : 'No se pudo abrir el formulario.',
        'error'
      );
    }
  }

  async function submitCreateVersion(event) {
    event.preventDefault();

    if (state.createVersionSubmitting) return;

    const item = selectedCreateLanding();

    if (!item) {
      $('rwCreateVersionStatus').textContent =
        'Seleccioná una landing válida.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';

      return;
    }

    const hypothesis =
      $('rwCreateHypothesis').value.trim();

    const changedModule =
      $('rwCreateChangedModule').value.trim();

    const changeSummary =
      $('rwCreateChangeSummary').value.trim();

    const primaryMetric =
      $('rwCreatePrimaryMetric').value;

    const expectedEffect =
      $('rwCreateExpectedEffect').value.trim();

    const deltaRaw =
      $('rwCreateExpectedDelta').value
        .trim()
        .replace(',', '.');

    const expectedDelta =
      deltaRaw === ''
        ? null
        : Number(deltaRaw);

    const changes =
      $('rwCreateChanges').value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({
          description
        }));

    if (!hypothesis) {
      $('rwCreateVersionStatus').textContent =
        'La hipótesis es obligatoria.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';

      $('rwCreateHypothesis').focus();
      return;
    }

    if (!changedModule) {
      $('rwCreateVersionStatus').textContent =
        'El módulo intervenido es obligatorio.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';

      $('rwCreateChangedModule').focus();
      return;
    }

    if (!changeSummary) {
      $('rwCreateVersionStatus').textContent =
        'El resumen de cambios es obligatorio.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';

      $('rwCreateChangeSummary').focus();
      return;
    }

    if (
      expectedDelta !== null &&
      !Number.isFinite(expectedDelta)
    ) {
      $('rwCreateVersionStatus').textContent =
        'El delta esperado debe ser un número válido.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';

      $('rwCreateExpectedDelta').focus();
      return;
    }

    setCreateVersionLoading(true);

    $('rwCreateVersionStatus').textContent =
      'Registrando hipótesis y creando el borrador…';

    $('rwCreateVersionStatus').className =
      'rwModalStatus';

    let createdVersion = null;
    let client = null;

    try {
      client = await getClient();
      if (!client) return;

      const response = await client.rpc(
        'rpc_analytics_landing_version_create_draft',
        {
          input_landing_key:
            item.landing_key,

          input_hypothesis:
            hypothesis,

          input_changed_module:
            changedModule,

          input_change_summary:
            changeSummary,

          input_primary_metric:
            primaryMetric,

          input_expected_effect:
            expectedEffect || null,

          input_expected_delta_pct:
            expectedDelta,

          input_changes:
            changes,

          input_metadata: {
            created_from:
              'rendimiento_web',

            created_via:
              'protocol_data_ui'
          }
        }
      );

      if (response.error) {
        throw response.error;
      }

      if (
        !response.data ||
        response.data.ok !== true ||
        !response.data.version
      ) {
        throw new Error(
          'Supabase no confirmó la creación del borrador.'
        );
      }

      createdVersion = response.data.version;
    } catch (error) {
      console.error(
        '[rendimiento-web:create-version]',
        error
      );

      $('rwCreateVersionStatus').textContent =
        error && error.message
          ? error.message
          : 'No se pudo crear la versión.';

      $('rwCreateVersionStatus').className =
        'rwModalStatus is-error';
    } finally {
      setCreateVersionLoading(false);
    }

    if (!createdVersion || !client) return;

    closeCreateVersionModal(true);

    await loadVersions(client);

    const updatedLanding = versionItems().find((candidate) =>
      candidate.landing_key === createdVersion.landing_key
    );

    if (updatedLanding) {
      openVersionDrawer(updatedLanding);
    }

    setVersionsStatus(
      `${createdVersion.version_label} fue creada como borrador. Shopify todavía no fue modificado.`,
      'success'
    );
  }

  async function activateVersion(versionNumber, button) {
    if (state.activationVersionNumber !== null) return;
    if (!state.activeLanding) return;

    const versions = Array.isArray(state.activeLanding.versions)
      ? state.activeLanding.versions
      : [];

    const version = versions.find((item) =>
      number(item.version_number) === number(versionNumber)
    );

    if (!version) {
      setVersionsStatus('No se encontró la versión seleccionada.', 'error');
      return;
    }

    const landingTitle =
      state.activeLanding.product_title ||
      state.activeLanding.product_handle ||
      state.activeLanding.landing_key;

    const confirmed =
      await confirmVersionActivation(
        version,
        landingTitle
      );

    if (!confirmed) return;

    state.activationVersionNumber = number(versionNumber);

    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
    }

    setVersionsStatus(
      `Sincronizando ${version.version_label} con Shopify…`
    );

    try {
      const client = await getClient();
      if (!client) return;

      const response = await client.functions.invoke(
        'analytics-version-shopify-sync',
        {
          body: {
            landing_key: state.activeLanding.landing_key,
            version_number: number(versionNumber),
            dry_run: false
          }
        }
      );

      if (response.error) {
        throw response.error;
      }

      if (!response.data || response.data.ok !== true) {
        throw new Error(
          response.data && response.data.error
            ? response.data.error
            : 'Shopify no confirmó la sincronización.'
        );
      }

      state.activationVersionNumber = null;

      await loadVersions(client);

      const items = Array.isArray(state.versionsPayload.items)
        ? state.versionsPayload.items
        : [];

      const updatedLanding = items.find((item) =>
        item.landing_key === response.data.landing_key
      );

      if (updatedLanding) {
        openVersionDrawer(updatedLanding);
      }

      setVersionsStatus(
        `${version.version_label} quedó sincronizada con Shopify y espera su primera visita.`,
        'success'
      );
    } catch (error) {
      const message = await getFunctionErrorMessage(error);

      console.error('[rendimiento-web:activate-version]', error);

      setVersionsStatus(message, 'error');

      window.alert(
        `No se pudo activar ${version.version_label}.\n\n${message}`
      );
    } finally {
      state.activationVersionNumber = null;

      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.classList.remove('is-loading');
        button.setAttribute('aria-busy', 'false');
      }
    }
  }

  function openVersionDrawer(item) {
    state.activeLanding = item;
    const versions = Array.isArray(item.versions) ? item.versions : [];
    const title = item.product_title || item.product_handle || item.landing_key;

    $('rwVersionDrawerTitle').textContent = title;
    $('rwVersionDrawerMeta').textContent =
      `${formatNumber(item.version_count)} versiones registradas · Activa: ${item.active_version_label || '—'}`;

    $('rwVersionTrack').innerHTML = versions.map(versionCardHtml).join('');

    const options = versions.map((version) =>
      `<option value="${version.version_number}">${escapeHtml(version.version_label)} · ${statusText(version.status)}</option>`
    ).join('');

    $('rwCompareA').innerHTML = options;
    $('rwCompareB').innerHTML = options;

    const measured = versions.filter((version) => number(version.funnel && version.funnel.views) > 0);
    const first = measured[0] || versions[0];
    const last = measured[measured.length - 1] || versions[versions.length - 1];

    if (first) $('rwCompareA').value = String(first.version_number);
    if (last) $('rwCompareB').value = String(last.version_number);

    renderComparison();

    $('rwVersionDrawerBackdrop').hidden = false;
    $('rwVersionDrawer').classList.add('is-open');
    $('rwVersionDrawer').setAttribute('aria-hidden', 'false');
    syncPageLock();
  }

  function closeVersionDrawer() {
    const drawer = $('rwVersionDrawer');
    if (!drawer) return;

    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    syncPageLock();

    window.setTimeout(() => {
      if ($('rwVersionDrawerBackdrop')) $('rwVersionDrawerBackdrop').hidden = true;
    }, 250);
  }

  function deltaClass(value) {
    if (value > 0) return 'rwDeltaPositive';
    if (value < 0) return 'rwDeltaNegative';
    return 'rwDeltaNeutral';
  }

  function formatDelta(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2).replace('.', ',')} pp`;
  }

  function renderComparison() {
    if (!state.activeLanding) return;

    const versions = Array.isArray(state.activeLanding.versions)
      ? state.activeLanding.versions
      : [];

    const a = versions.find((version) =>
      String(version.version_number) === $('rwCompareA').value
    );

    const b = versions.find((version) =>
      String(version.version_number) === $('rwCompareB').value
    );

    if (!a || !b) {
      $('rwCompareMetrics').innerHTML = '';
      return;
    }

    const af = a.funnel || {};
    const bf = b.funnel || {};

    const metrics = [
      ['View → L1', number(bf.view_to_l1_pct) - number(af.view_to_l1_pct)],
      ['L1 → L2', number(bf.l1_to_l2_pct) - number(af.l1_to_l2_pct)],
      ['L2 → L3', number(bf.l2_to_l3_pct) - number(af.l2_to_l3_pct)],
      ['View → L3', number(bf.view_to_l3_pct) - number(af.view_to_l3_pct)]
    ];

    $('rwCompareMetrics').innerHTML = metrics.map(([label, value]) => `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong class="${deltaClass(value)}">${formatDelta(value)}</strong>
      </article>`).join('');
  }

  function switchTab(name) {
    document.querySelectorAll('[data-rw-tab]').forEach((button) => {
      const active = button.getAttribute('data-rw-tab') === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('[data-rw-panel]').forEach((panel) => {
      const active = panel.getAttribute('data-rw-panel') === name;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    if (name === 'versions' && !state.versionsLoaded) {
      refreshVersions();
    }
  }

  function init() {
    const main = document.querySelector('.rwMain');
    if (!main || main.dataset.rwInitialized === '1') return;
    main.dataset.rwInitialized = '1';

    $('rwStartDate').value = todayISO(-29);
    $('rwEndDate').value = todayISO(0);
    $('rwVersionsStartDate').value = todayISO(-29);
    $('rwVersionsEndDate').value = todayISO(0);

    setupRichSelects();

    $('rwRefreshButton').addEventListener('click', refreshAll);
    $('rwLandingSelect').addEventListener('change', () => {
      updateVersionOptions();
      updateDeleteDataButtonState();
      refreshAll();
    });
    $('rwVersionSelect').addEventListener('change', refreshAll);

    $('rwParameterFieldSelect').addEventListener(
      'change',
      renderParameterValueOptions
    );

    $('rwParameterValueSelect').addEventListener(
      'change',
      () => {
        $('rwAddParameterFilter').disabled =
          !$('rwParameterValueSelect').value;
      }
    );

    $('rwAddParameterFilter').addEventListener(
      'click',
      addSelectedParameterFilter
    );

    $('rwActiveParameterFilters').addEventListener(
      'click',
      (event) => {
        const button = event.target.closest(
          '[data-remove-parameter]'
        );

        if (!button) return;

        removeParameterFilter(
          button.getAttribute('data-remove-parameter')
        );
      }
    );

    $('rwOpenDeleteDataButton').addEventListener(
      'click',
      openDeleteDataDialog
    );

    $('rwDeleteDataCloseButton').addEventListener(
      'click',
      closeDeleteDataDialog
    );

    $('rwDeleteCancelButton').addEventListener(
      'click',
      closeDeleteDataDialog
    );

    $('rwDeleteConfirmButton').addEventListener(
      'click',
      confirmDeleteData
    );

    document
      .querySelectorAll('input[name="rwDeleteMode"]')
      .forEach((input) => {
        input.addEventListener(
          'change',
          () => {
            state.deleteMode =
              deleteDataCurrentMode();

            loadDeleteDataPreview();
          }
        );
      });

    $('rwDeleteDataOverlay').addEventListener(
      'click',
      (event) => {
        if (
          event.target ===
          $('rwDeleteDataOverlay')
        ) {
          closeDeleteDataDialog();
        }
      }
    );

    main.addEventListener(
      'keydown',
      (event) => {
        if (
          event.key === 'Escape' &&
          $('rwDeleteDataOverlay')
            .classList
            .contains('is-open')
        ) {
          closeDeleteDataDialog();
        }
      }
    );

    updateDeleteDataButtonState();

    $('rwVersionsRefreshButton').addEventListener('click', refreshVersions);
    $('rwCreateVersionButton').addEventListener('click', openCreateVersionModal);

    $('rwVersionRows').addEventListener('click', (event) => {
      const row = event.target.closest('[data-landing-key]');
      if (!row || !state.versionsPayload) return;
      const items = Array.isArray(state.versionsPayload.items)
        ? state.versionsPayload.items
        : [];
      const item = items.find((candidate) =>
        candidate.landing_key === row.getAttribute('data-landing-key')
      );
      if (item) openVersionDrawer(item);
    });

    $('rwVersionTrack').addEventListener('click', (event) => {
      const button = event.target.closest('[data-activate-version]');
      if (!button) return;

      activateVersion(
        number(button.getAttribute('data-activate-version')),
        button
      );
    });

    $('rwActivationModalClose').addEventListener(
      'click',
      () => closeActivationConfirmation(false)
    );

    $('rwActivationModalCancel').addEventListener(
      'click',
      () => closeActivationConfirmation(false)
    );

    $('rwActivationModalConfirm').addEventListener(
      'click',
      () => closeActivationConfirmation(true)
    );

    $('rwActivationModalLayer').addEventListener(
      'click',
      (event) => {
        if (event.target === $('rwActivationModalLayer')) {
          closeActivationConfirmation(false);
        }
      }
    );

    $('rwCreateVersionClose').addEventListener(
      'click',
      () => closeCreateVersionModal()
    );

    $('rwCreateVersionCancel').addEventListener(
      'click',
      () => closeCreateVersionModal()
    );

    $('rwCreateVersionModalLayer').addEventListener(
      'click',
      (event) => {
        if (event.target === $('rwCreateVersionModalLayer')) {
          closeCreateVersionModal();
        }
      }
    );

    $('rwCreateLandingSelect').addEventListener(
      'change',
      updateCreateVersionContext
    );

    $('rwCreateVersionForm').addEventListener(
      'submit',
      submitCreateVersion
    );

    document.querySelectorAll('[data-rw-tab]').forEach((button) => {
      button.addEventListener('click', () =>
        switchTab(button.getAttribute('data-rw-tab'))
      );
    });

    $('rwVersionDrawerClose').addEventListener('click', closeVersionDrawer);
    $('rwVersionDrawerBackdrop').addEventListener('click', closeVersionDrawer);
    $('rwCompareA').addEventListener('change', renderComparison);
    $('rwCompareB').addEventListener('change', renderComparison);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      if (!$('rwActivationModalLayer').hidden) {
        closeActivationConfirmation(false);
        return;
      }

      if (!$('rwCreateVersionModalLayer').hidden) {
        closeCreateVersionModal();
        return;
      }

      closeVersionDrawer();
    });

    refreshAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('sazzu:page:load', init);
})();
