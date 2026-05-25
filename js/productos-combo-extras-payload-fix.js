/*
  DESACTIVADO · Sync agresivo de extras de combos

  Motivo:
  El sincronizador anterior alteraba IDs del combo y podía convertir una edición
  en un alta nueva, provocando duplicación de combos.

  A partir de ahora este archivo queda como diagnóstico seguro/no-op.
  No crea combos.
  No cambia IDs.
  No escribe storage.
  No intercepta guardados.
*/
(function () {
  window.ProductosComboExtrasPayloadFixDisabled = true;

  window.ProductosComboExtrasDebug = {
    snapshot: function () {
      const slide = document.getElementById('prodComboSlide');
      const comboId = slide && slide.dataset ? String(slide.dataset.comboId || '').trim() : '';
      const cards = Array.from(document.querySelectorAll('.prodComboExtrasList[data-combo-extras-list="1"] .prodComboSelectedExtraCard'));
      return {
        disabled: true,
        reason: 'sync_agresivo_desactivado_para_evitar_duplicados',
        combo_id: comboId,
        visible_cards_detected: cards.length,
        time: new Date().toISOString()
      };
    }
  };
})();
