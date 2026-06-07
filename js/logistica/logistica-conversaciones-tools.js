/* Protocol Data · Logistica · herramientas operativas de chat */
(function(){
  const PAGE_EVENT='sazzu:page:load';
  const READY='__logConversationToolsReady';
  const segmentState={loaded:false,loading:false,items:[]};

  function root(){return document.querySelector('main.logisticsMain');}
  function esc(v){return String(v==null||v===''?'—':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function text(el){return (el&&el.textContent||'').trim();}
  function cfg(){return window.SAZZU_SUPABASE_CONFIG||window.PROTOCOL_SUPABASE_CONFIG||null;}
  function client(){
    if(window.ProtocolAuth&&typeof window.ProtocolAuth.getClient==='function'){const shared=window.ProtocolAuth.getClient();if(shared)return shared;}
    if(window.__protocolLogisticaSupportClient)return window.__protocolLogisticaSupportClient;
    const c=cfg();const key=c&&(c.anonKey||c.publishableKey||c.key);
    if(!window.supabase||!c||!c.url||!key)return null;
    window.__protocolLogisticaSupportClient=window.supabase.createClient(c.url,key);
    return window.__protocolLogisticaSupportClient;
  }
  async function rpc(name,args){const c=client();if(!c)throw new Error('Supabase no configurado');const res=await c.rpc(name,args||{});if(res.error)throw res.error;return res.data;}
  function getConversationId(){
    const form=document.querySelector('#logConversationSlide [data-log-conversation-reply-real]');
    const raw=form?.dataset?.logConversationReplyReal||'';
    if(raw)return raw;
    const copy=document.querySelector('#logConversationSlide [data-log-copy-conversation-id]');
    if(copy?.dataset?.logCopyConversationId)return copy.dataset.logCopyConversationId;
    return text(document.querySelector('#logConversationSlideTitle'));
  }

  function ensureStyles(){
    if(document.getElementById('logConversationToolsStyles'))return;
    const s=document.createElement('style');
    s.id='logConversationToolsStyles';
    s.textContent=`
      .logConversationSlide__panel{background:#fff!important}
      .logConversationSlide__header{background:#EDEDED!important;color:#252A32!important;box-shadow:none!important;border-bottom:0!important;z-index:5!important;display:flex!important;align-items:center!important;gap:14px!important}
      .logConversationSlide__header button{background:#fff!important;color:#2479FF!important;box-shadow:none!important}
      .logConversationSlide__header>div[style*="width:38px"]{display:none!important}
      .logConversationSlide__title{flex:1 1 auto!important;display:grid!important;grid-template-columns:minmax(0,1fr)auto!important;align-items:center!important;gap:14px!important;width:100%!important;min-width:0!important}
      .logConversationHeaderMain{min-width:0;display:grid;gap:3px}
      .logConversationHeaderMain strong{display:block;color:#252A32!important;font-size:17px!important;line-height:1.1!important;font-weight:950!important;letter-spacing:-.02em!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .logConversationHeaderMain span{display:block;color:#697386!important;font-size:12px!important;line-height:1.15!important;font-weight:850!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .logConversationHeaderId{display:inline-flex!important;align-items:center!important;gap:8px!important;background:#F4F6F9!important;border:1px solid #DFE5EE!important;border-radius:5px!important;padding:7px 9px!important;color:#697386!important;font-size:11px!important;font-weight:900!important;max-width:330px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;justify-self:end!important}
      .logConversationCopyId{width:24px!important;height:24px!important;min-width:24px!important;border-radius:5px!important;background:#fff!important;color:#2479FF!important;border:1px solid #dfe5ee!important;box-shadow:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:13px!important;line-height:1!important;cursor:pointer!important;padding:0!important}
      .logConversationSlide__content{background:#fff!important;overflow:hidden!important}
      .logConversationStatusRow{padding:10px 0!important;border-bottom:0!important}
      .logConversationDetailGrid{grid-template-columns:minmax(0,1fr)340px!important;gap:0!important;border-top:1px solid #e6eaf0!important;height:calc(100dvh - 152px)!important;min-height:0!important;overflow:hidden!important}
      .logConversationBox{border:0!important;box-shadow:none!important;border-radius:0!important;background:#fff!important;min-height:0!important}
      .logConversationBox--chat{border-right:1px solid #e6eaf0!important;padding:14px!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)auto!important;overflow:hidden!important;background:#EDEDED!important}
      .logConversationBox--data{padding:14px!important;overflow-y:auto!important;background:#fff!important}
      .logConversationBox__head{border-bottom:1px solid #dfe5ee!important;padding-bottom:10px!important;margin-bottom:0!important;display:grid!important;grid-template-columns:1fr!important;gap:3px!important}
      .logConversationBox__head h3,.logConversationBox__head strong{display:block!important;font-size:16px!important;line-height:1.15!important;color:#252A32!important;font-weight:950!important;margin:0!important}
      .logConversationBox__head span,.logConversationBox__head small{display:block!important;font-size:12px!important;line-height:1.2!important;color:#697386!important;font-weight:800!important;margin:0!important}
      .logConversationChatMeta{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:0!important;margin-bottom:0;background:#EDEDED!important}
      .logConversationChatMeta strong{font-size:15px;color:#252a32;font-weight:950}.logConversationChatMeta span{font-size:12px;font-weight:850;color:#697386}
      .logConversationChat{background:#EDEDED!important;overflow-y:auto!important;padding:12px 10px 18px!important;display:flex!important;flex-direction:column!important;gap:10px!important;min-height:0!important}
      .logConversationBubble{position:relative!important;width:fit-content!important;max-width:min(72%,620px)!important;min-width:0!important;border-radius:18px!important;padding:10px 12px 9px!important;box-shadow:0 2px 7px rgba(15,23,42,.08),0 10px 22px rgba(15,23,42,.06)!important;border:0!important;line-height:1.35!important;margin:0!important}
      .logConversationBubble strong{display:block!important;font-size:12px!important;font-weight:950!important;margin:0 0 4px!important;line-height:1.1!important}.logConversationBubble p{margin:0!important;font-size:13px!important;font-weight:850!important;line-height:1.34!important}.logConversationBubble small{display:block!important;margin-top:6px!important;font-size:11px!important;font-weight:850!important;opacity:.72!important;text-align:right!important}
      .logConversationBubble--customer{align-self:flex-start!important;background:#fff!important;color:#252A32!important;border-bottom-left-radius:6px!important}
      .logConversationBubble--operator{align-self:flex-end!important;background:#2479FF!important;color:#fff!important;border-bottom-right-radius:6px!important}
      .logConversationBubble--customer::after{content:""!important;position:absolute!important;left:-4px!important;right:auto!important;bottom:1px!important;width:13px!important;height:13px!important;background:#fff!important;border-radius:0!important;box-shadow:none!important;clip-path:polygon(100% 0,0 100%,100% 100%)!important}
      .logConversationBubble--operator::after{content:""!important;position:absolute!important;right:-4px!important;left:auto!important;bottom:1px!important;width:13px!important;height:13px!important;background:#2479FF!important;border-radius:0!important;box-shadow:none!important;clip-path:polygon(0 0,0 100%,100% 100%)!important}
      .logConversationReply{display:flex!important;align-items:center!important;gap:8px!important;border:1px solid #d6dde8!important;border-radius:999px!important;padding:8px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.07)!important;margin-top:10px!important}
      .logConversationReply textarea{flex:1!important;min-height:42px!important;max-height:82px!important;border:0!important;box-shadow:none!important;padding:11px 8px!important;resize:none!important;outline:0!important;background:transparent!important;font-size:13px!important;font-weight:750!important;line-height:1.3!important}
      .logConversationReply__actions{display:flex!important;gap:8px!important;align-items:center!important}.logConversationReply__actions .btn--secondary{display:none!important}.logConversationReply__actions .btn--primary{width:44px!important;height:44px!important;min-width:44px!important;border-radius:999px!important;padding:0!important;font-size:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.logConversationReply__actions .btn--primary::before{content:">";font-size:28px;font-weight:950;line-height:1;transform:translateX(1px)}
      .logChatAttachBtn,.logChatToolsBtn{width:44px;height:44px;min-width:44px;border:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:950;cursor:pointer}.logChatAttachBtn{background:#eef1f5;color:#252a32}.logChatToolsBtn{background:#eef5ff;color:#2479ff}
      .logQuickTools{display:grid;gap:0;border:1px solid #e3e8ef;border-radius:5px;overflow:hidden;background:#fff;max-height:54vh;overflow-y:auto}.logQuickTool{border:0;border-bottom:1px solid #e3e8ef;background:#fff;text-align:left;padding:11px 12px;cursor:pointer;display:grid;gap:3px}.logQuickTool:hover{background:#f7fbff}.logQuickTool:last-child{border-bottom:0}.logQuickTool strong{font-size:12px;color:#2479ff}.logQuickTool span{font-size:12px;color:#252a32;font-weight:850}
      .logSegmentWrap{position:relative;margin:0 0 12px}.logSegmentBtn{width:100%;border:1px solid #BDEFEA!important;background:#E6FFFB!important;color:#0F766E!important;border-radius:5px;padding:11px 36px 11px 12px;font-size:12px;font-weight:950;cursor:pointer;text-align:left;position:relative}.logSegmentBtn::after{content:"⌄";position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:15px;color:#0F766E;font-weight:950}.logSegmentBtn:hover{background:#D8FBF5!important}.logSegmentPanel{display:none;margin-top:8px;border:1px solid #dce5f2;background:#fff;border-radius:5px;overflow:hidden;box-shadow:0 14px 30px rgba(15,23,42,.10)}.logSegmentWrap.is-open .logSegmentPanel{display:grid}.logSegmentItem{border:0;border-bottom:1px solid #edf1f7;background:#fff;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:11px 12px;cursor:pointer}.logSegmentItem:hover{background:#f7fbff}.logSegmentItem:last-child{border-bottom:0}.logSegmentDot{width:30px;height:30px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:950}.logSegmentCopy{display:grid;gap:3px}.logSegmentCopy strong{font-size:13px;color:#252a32}.logSegmentCopy span{font-size:11px;color:#697386;font-weight:750;line-height:1.25}.logSegmentBadges{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.logSegmentBadge{display:inline-flex;align-items:center;gap:6px;border-radius:5px;padding:5px 8px;color:#fff;font-size:11px;font-weight:950}.logSegmentRemove{border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:999px;width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:950;line-height:1;cursor:pointer;padding:0}.logSegmentStatus{font-size:11px;font-weight:850;color:#697386;margin:6px 0 10px}
      @media(max-width:980px){.logConversationDetailGrid{grid-template-columns:1fr!important}.logConversationBox--chat{border-right:0!important}.logConversationBox--data{border-top:1px solid #e6eaf0;padding-left:0!important;margin-top:12px;padding-top:12px!important}.logConversationHeaderId{display:none!important}.logConversationDetailGrid{height:calc(100dvh - 150px)!important}}
    `;
    document.head.appendChild(s);
  }

  function getData(){
    const list=Array.from(document.querySelectorAll('#logConversationSlide .logConversationDataItem'));
    const map={};
    list.forEach(item=>{const k=text(item.querySelector('span')).toLowerCase();const v=text(item.querySelector('strong'));map[k]=v;});
    return map;
  }
  function insertText(value){
    const ta=document.querySelector('#logConversationSlide [data-log-conversation-reply-real] textarea');
    if(!ta)return;
    const current=ta.value||'';
    ta.value=current+(current&&!current.endsWith(' ')?' ':'')+value;
    ta.focus();
    ta.dispatchEvent(new Event('input',{bubbles:true}));
  }
  async function loadSegments(){
    if(segmentState.loaded)return segmentState.items;
    if(segmentState.loading)return segmentState.items;
    segmentState.loading=true;
    try{
      const data=await rpc('protocol_support_get_segments',{});
      segmentState.items=Array.isArray(data)?data:[];
      segmentState.loaded=true;
      return segmentState.items;
    }catch(err){console.warn('[Segmentos soporte]',err);return[];}finally{segmentState.loading=false;}
  }
  function renderSegmentOptions(items){
    const panel=document.querySelector('#logConversationSlide .logSegmentPanel');
    if(!panel)return;
    if(!items.length){panel.innerHTML='<div class="logSegmentStatus">No se pudieron cargar segmentos.</div>';return;}
    panel.innerHTML=items.map(seg=>'<button class="logSegmentItem" type="button" data-log-assign-segment="'+esc(seg.segment_key)+'"><span class="logSegmentDot" style="background:'+esc(seg.segment_color||'#2479FF')+'">•</span><span class="logSegmentCopy"><strong>'+esc(seg.segment_label)+'</strong><span>'+esc(seg.segment_description||seg.segment_key)+'</span></span></button>').join('');
  }
  function renderAssignedSegments(segments){
    const box=document.querySelector('#logConversationSlide .logSegmentBadges');
    if(!box)return;
    if(!Array.isArray(segments)||!segments.length){box.innerHTML='';return;}
    box.innerHTML=segments.map(seg=>'<span class="logSegmentBadge" style="background:'+esc(seg.segment_color||'#2479FF')+'">'+esc(seg.segment_label||seg.segment_key)+'<button class="logSegmentRemove" type="button" data-log-remove-segment="'+esc(seg.segment_key)+'" title="Quitar segmento">×</button></span>').join('');
  }
  async function assignSegment(key){
    const conversationId=getConversationId();
    const status=document.querySelector('#logConversationSlide .logSegmentStatus');
    if(status)status.textContent='Guardando segmento...';
    try{
      const result=await rpc('protocol_support_assign_segment',{input_conversation_id:conversationId,input_segment_key:key,input_assigned_by:'Soporte',input_note:null});
      if(!result||result.status!=='ok')throw new Error(result?.message||'No se pudo segmentar');
      renderAssignedSegments(result.segments||[]);
      if(status)status.textContent='Segmento asignado correctamente.';
      const wrap=document.querySelector('#logConversationSlide .logSegmentWrap');
      if(wrap)wrap.classList.remove('is-open');
    }catch(err){console.warn('[Asignar segmento]',err);if(status)status.textContent='No se pudo guardar el segmento.';}
  }
  async function removeSegment(key){
    const conversationId=getConversationId();
    const status=document.querySelector('#logConversationSlide .logSegmentStatus');
    if(status)status.textContent='Quitando segmento...';
    try{
      const result=await rpc('protocol_support_remove_segment',{input_conversation_id:conversationId,input_segment_key:key});
      if(!result||result.status!=='ok')throw new Error(result?.message||'No se pudo quitar');
      renderAssignedSegments(result.segments||[]);
      if(status)status.textContent='Segmento eliminado correctamente.';
    }catch(err){console.warn('[Quitar segmento]',err);if(status)status.textContent='No se pudo eliminar el segmento.';}
  }
  async function fetchAssignedSegments(){
    const conversationId=getConversationId();
    if(!conversationId)return;
    try{const data=await rpc('protocol_support_get_conversation_segments',{input_conversation_id:conversationId});renderAssignedSegments(Array.isArray(data)?data:[]);}catch(err){console.warn('[Segmentos activos]',err);}
  }
  function enhanceHeader(slide){
    const titleEl=slide.querySelector('#logConversationSlideTitle');
    const subtitleEl=slide.querySelector('#logConversationSlideSubtitle');
    if(!titleEl||!subtitleEl)return;
    const form=slide.querySelector('[data-log-conversation-reply-real]');
    const rawId=form?.dataset?.logConversationReplyReal||titleEl.querySelector('[data-log-copy-conversation-id]')?.dataset?.logCopyConversationId||text(titleEl);
    const rawSubtitle=text(subtitleEl);
    const parts=rawSubtitle.split('·').map(x=>x.trim()).filter(Boolean);
    const clientName=parts[0]||text(titleEl.querySelector('.logConversationHeaderMain strong'))||'Cliente';
    const tracking=parts[1]||text(titleEl.querySelector('.logConversationHeaderMain span'))||'Sin tracking';
    if(titleEl.dataset.headerConversationId===rawId&&titleEl.querySelector('.logConversationHeaderMain')&&titleEl.querySelector('.logConversationHeaderId'))return;
    titleEl.innerHTML='<span class="logConversationHeaderMain"><strong>'+esc(clientName)+'</strong><span>'+esc(tracking)+'</span></span><span class="logConversationHeaderId" title="'+esc(rawId)+'">ID '+esc(rawId)+' <button class="logConversationCopyId" type="button" data-log-copy-conversation-id="'+esc(rawId)+'" title="Copiar ID">▣</button></span>';
    subtitleEl.style.display='none';
    titleEl.dataset.headerConversationId=rawId;
  }
  function enhance(){
    const slide=document.getElementById('logConversationSlide');
    if(!slide||!slide.classList.contains('is-open'))return;
    enhanceHeader(slide);
    const chatBox=slide.querySelector('.logConversationBox--chat');
    const dataBox=slide.querySelector('.logConversationBox--data');
    const form=slide.querySelector('[data-log-conversation-reply-real]');
    if(!chatBox||!dataBox||!form||form.dataset.toolsReady==='1')return;
    form.dataset.toolsReady='1';
    const sub=text(slide.querySelector('#logConversationSlideSubtitle'));
    const titleFromHeader=text(slide.querySelector('.logConversationHeaderMain strong'));
    const last=Array.from(slide.querySelectorAll('.logConversationBubble--customer small')).pop();
    const head=chatBox.querySelector('.logConversationBox__head');
    if(head){head.insertAdjacentHTML('afterend','<div class="logConversationChatMeta"><strong>'+esc(titleFromHeader||sub.split('·')[0]||'Cliente')+'</strong><span>Último mensaje: '+esc(text(last)||'—')+'</span></div>');}
    const actions=form.querySelector('.logConversationReply__actions');
    form.insertAdjacentHTML('afterbegin','<button class="logChatAttachBtn" type="button" title="Adjuntar archivo">⌘</button>');
    if(actions){actions.insertAdjacentHTML('afterbegin','<button class="logChatToolsBtn" type="button" data-log-tools-toggle="1" title="Insertar dato">{ }</button>');}
    const data=getData();
    const options=[['tracking_id',data.tracking],['domicilio_usuario',data.dirección],['codigo_postal',data['código postal']],['producto',data.producto],['estado_envio',data['estado envío']],['pedido_shopify',data['pedido shopify']],['email_cliente',data.email],['entrega_estimada',data['entrega estimada']],['monto_a_cobrar',data['monto a cobrar']]];
    const segmentHtml='<div class="logSegmentBadges"></div><div class="logSegmentWrap"><button class="logSegmentBtn" type="button" data-log-segment-toggle="1">Segmentar conversación</button><div class="logSegmentPanel"><div class="logSegmentStatus">Cargando segmentos...</div></div></div><div class="logSegmentStatus">Seleccioná un segmento para clasificar este caso.</div>';
    const html=segmentHtml+'<div class="logQuickTools">'+options.map(o=>'<button class="logQuickTool" type="button" data-log-insert-value="'+esc(o[1])+'"><strong>{'+esc(o[0])+'}</strong><span>'+esc(o[1])+'</span></button>').join('')+'</div>';
    const dataHead=dataBox.querySelector('.logConversationBox__head');
    if(dataHead){dataHead.insertAdjacentHTML('afterend',html);}
    loadSegments().then(renderSegmentOptions);
    fetchAssignedSegments();
  }
  function bind(){
    if(window[READY])return;window[READY]=true;ensureStyles();
    document.addEventListener('click',e=>{
      const copy=e.target.closest('[data-log-copy-conversation-id]');if(copy){e.preventDefault();navigator.clipboard?.writeText(copy.dataset.logCopyConversationId||'');copy.textContent='✓';setTimeout(()=>{copy.textContent='▣';},900);return;}
      const remove=e.target.closest('[data-log-remove-segment]');if(remove){e.preventDefault();e.stopPropagation();removeSegment(remove.dataset.logRemoveSegment||'');return;}
      const insert=e.target.closest('[data-log-insert-value]');if(insert){e.preventDefault();insertText(insert.dataset.logInsertValue||'');return;}
      const toggle=e.target.closest('[data-log-segment-toggle]');if(toggle){e.preventDefault();const wrap=toggle.closest('.logSegmentWrap');if(wrap)wrap.classList.toggle('is-open');loadSegments().then(renderSegmentOptions);return;}
      const assign=e.target.closest('[data-log-assign-segment]');if(assign){e.preventDefault();assignSegment(assign.dataset.logAssignSegment||'');return;}
    });
    const obs=new MutationObserver(()=>enhance());
    const main=root();if(main)obs.observe(main,{childList:true,subtree:true});
    setInterval(enhance,800);
  }
  document.addEventListener('DOMContentLoaded',bind);document.addEventListener(PAGE_EVENT,bind);if(document.readyState!=='loading')bind();
})();

/* Protocol Data · Logistica · puente seguro Conversaciones ↔ Pedidos */
(function(){
  const PAGE_EVENT='sazzu:page:load';
  const READY='__logConversationOrderBridgeReady';
  const ORDERS_TTL=45000;
  const state={orders:[],loadedAt:0,loading:null};

  function root(){return document.querySelector('main.logisticsMain');}
  function cfg(){return window.SAZZU_SUPABASE_CONFIG||window.PROTOCOL_SUPABASE_CONFIG||null;}
  function client(){
    if(window.ProtocolAuth&&typeof window.ProtocolAuth.getClient==='function'){const shared=window.ProtocolAuth.getClient();if(shared)return shared;}
    if(window.__protocolLogisticaSupportClient)return window.__protocolLogisticaSupportClient;
    const c=cfg();const key=c&&(c.anonKey||c.publishableKey||c.key);
    if(!window.supabase||!c||!c.url||!key)return null;
    window.__protocolLogisticaSupportClient=window.supabase.createClient(c.url,key);
    return window.__protocolLogisticaSupportClient;
  }
  async function rpc(name,args){const c=client();if(!c)throw new Error('Supabase no configurado');const res=await c.rpc(name,args||{});if(res.error)throw res.error;return res.data;}
  function text(el){return (el&&el.textContent||'').trim();}
  function esc(v){return String(v==null||v===''?'—':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function norm(v){return String(v||'').trim().toLowerCase();}
  function digits(v){return String(v||'').replace(/\D/g,'');}
  function comparable(v){return norm(v).replace(/[#\s]/g,'');}
  function useful(v){const raw=String(v??'').trim();if(!raw)return false;return !['—','--','-','null','undefined','sin dato','sin datos','sin contacto','cliente'].includes(raw.toLowerCase());}
  function coalesce(){for(const value of arguments){if(useful(value))return value;}return '';}
  function genericTracking(v){const current=norm(v);return !current||current==='alp-soporte-general'||current.includes('soporte-general')||current.includes('support-general');}
  function dateMs(v){const d=new Date(v||0);return Number.isNaN(d.getTime())?0:d.getTime();}
  function orderTime(o){return dateMs(o?.fecha_ultima_actualizacion||o?.updated_at||o?.created_at||o?.fecha_creacion||0);}
  function moneyNumber(v){if(typeof v==='number'&&Number.isFinite(v))return v;let clean=String(v??'').trim();if(!clean)return null;clean=clean.replace(/[^0-9,.-]/g,'');if(!clean)return null;if(clean.includes(','))clean=clean.replace(/\./g,'').replace(',','.');const n=Number(clean);return Number.isFinite(n)?n:null;}
  function moneyLabel(v){const n=moneyNumber(v);if(n===null)return coalesce(v,'$ 0,00');return n.toLocaleString('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2});}
  function postal(o){const explicit=coalesce(o?.postal_code,o?.codigo_postal,o?.cp,o?.zip,o?.zipcode);if(explicit)return explicit;const address=String(o?.domicilio_entrega||o?.shipping_address||'');const match=address.match(/(?:^|[\s,])(\d{4,8})(?:\s*)$/);return match?match[1]:'';}
  function locationParts(o){const locality=coalesce(o?.locality,o?.localidad,o?.city);const province=coalesce(o?.province,o?.provincia,o?.state);if(locality||province)return{locality,province};const address=String(o?.domicilio_entrega||o?.shipping_address||'');const cp=postal(o);const parts=address.split(',').map(x=>x.trim()).filter(Boolean).filter(x=>x!==cp);return{locality:parts.length>=2?parts[parts.length-2]:'',province:parts.length>=1?parts[parts.length-1]:''};}
  function paymentLabel(o){const status=norm(o?.pago_estado||o?.payment_status);if(!status)return'';if(status==='pagado'||status==='paid')return'Pagado';if(['no_pagado','cash_on_delivery','pending','pendiente'].includes(status))return'No pagado · cobra repartidor';return coalesce(o?.pago_estado,o?.payment_status);}
  function shippingLabel(o){const status=norm(o?.envio_estado||o?.shipping_status);const value=coalesce(o?.envio_valor,o?.shipping_value,o?.shipping_cost);if(status==='gratis'||status==='free')return'Gratis';if(status==='a_confirmar')return'A confirmar';if(status==='pagado'||status==='paid')return value?'Pagado · '+value:'Pagado';return coalesce(o?.envio_estado,o?.shipping_status,value);}
  function logisticsLabel(o){const status=norm(o?.estado_logistico||o?.logistics_status);return({recibido:'Recibido',despachado:'Despachado',en_camino:'En camino',entregado:'Entregado',intervenido:'Intervenido'}[status])||coalesce(o?.estado_logistico,o?.logistics_status);}
  async function loadOrders(force){const now=Date.now();if(!force&&state.orders.length&&(now-state.loadedAt)<ORDERS_TTL)return state.orders;if(state.loading)return state.loading;state.loading=rpc('protocol_logistics_orders_list',{input_query:'',input_status:'todos',input_limit:250,input_offset:0}).then(data=>{state.orders=Array.isArray(data?.items)?data.items:[];state.loadedAt=Date.now();return state.orders;}).catch(err=>{console.warn('[Conversaciones ↔ Pedidos]',err);return state.orders||[];}).finally(()=>{state.loading=null;});return state.loading;}
  function findOrder(info,orders){if(!info||!orders?.length)return null;const tr=comparable(info.tracking);const hasRealTracking=tr&&!genericTracking(info.tracking);const orderName=comparable(info.orderName);const email=norm(info.email);const phone=digits(info.phone);if(hasRealTracking){const found=orders.find(o=>comparable(o.tracking_id)===tr);if(found)return found;}if(orderName){const found=orders.find(o=>comparable(o.shopify_order_name)===orderName);if(found)return found;}if(email){const found=orders.filter(o=>norm(o.email_cliente||o.customer_email||o.email)===email).sort((a,b)=>orderTime(b)-orderTime(a));if(found.length)return found[0];}if(phone){const found=orders.filter(o=>{const p=digits(o.telefono_cliente||o.customer_phone||o.phone);return p&&p===phone;}).sort((a,b)=>orderTime(b)-orderTime(a));if(found.length)return found[0];}return null;}
  function orderContext(o){const loc=locationParts(o);const monto=coalesce(o?.monto_a_pagar_repartidor,o?.amount_to_collect,o?.monto_a_cobrar,o?.total_to_collect);return{tracking:coalesce(o?.tracking_id,o?.trackingId),orderName:coalesce(o?.shopify_order_name,o?.order_name),name:coalesce(o?.cliente,o?.customer_name,o?.nombre_cliente),email:coalesce(o?.email_cliente,o?.customer_email,o?.email),phone:coalesce(o?.telefono_cliente,o?.customer_phone,o?.phone),product:coalesce(o?.producto,o?.product_name,o?.product_title),sku:coalesce(o?.sku,o?.sku_producto),variant:coalesce(o?.variant_name,o?.variante,o?.nombre_variante),address:coalesce(o?.domicilio_entrega,o?.shipping_address,o?.address),locality:loc.locality,province:loc.province,postalCode:postal(o),payment:paymentLabel(o),amount:moneyLabel(monto),shipping:shippingLabel(o),logistics:logisticsLabel(o),estimated:coalesce(o?.fecha_entrega_estimada,o?.estimated_delivery,o?.banda_horaria_estimada),responsible:coalesce(o?.responsable,'Equipo de logística Al Paso Store')};}
  function badge(label,associated){return '<span class="logConversationVerified logConversationPurchaseBadge '+(associated?'logConversationVerified--yes':'logConversationVerified--no')+'"><span class="logVerifyIcon">'+(associated?'✓':'×')+'</span>'+esc(label)+'</span>';}
  function setVerifyCell(cell,associated){if(!cell)return;const verify=cell.querySelector('.logConversationVerified:not(.logConversationPurchaseBadge)');if(verify&&associated){verify.classList.remove('logConversationVerified--no');verify.classList.add('logConversationVerified--yes');verify.innerHTML='<span class="logVerifyIcon">✓</span>Verificada';}cell.querySelectorAll('.logConversationPurchaseBadge').forEach(x=>x.remove());cell.insertAdjacentHTML('beforeend',badge(associated?'Compra asociada':'Compra no asociada',associated));}
  function updateSummary(){const metrics=document.querySelectorAll('#logConversationsSummary .logConversationMetric');if(!metrics.length)return;const rows=Array.from(document.querySelectorAll('#logConversationsTbody tr[data-log-row-open]'));const notVerified=rows.filter(row=>{const customerCell=row.children[1];const verify=customerCell?.querySelector('.logConversationVerified:not(.logConversationPurchaseBadge)');return verify&&/No verificada/i.test(verify.textContent||'');}).length;const last=metrics[metrics.length-1]?.querySelector('strong');if(last)last.textContent=String(notVerified);}
  async function patchTable(){const tbody=document.querySelector('#logConversationsTbody');if(!tbody)return;const rows=Array.from(tbody.querySelectorAll('tr[data-log-row-open]'));if(!rows.length)return;const orders=await loadOrders(false);rows.forEach(row=>{const cells=row.children;if(cells.length<4)return;const email=text(cells[1]?.querySelector('.logClampMuted'));const existingOrderText=text(cells[2]?.querySelector('strong'));const parts=existingOrderText.split('·').map(x=>x.trim());const info={email,tracking:parts[0]||'',orderName:parts[1]||'',phone:''};const order=findOrder(info,orders);setVerifyCell(cells[1],Boolean(order));if(!order)return;const ctx=orderContext(order);cells[2].innerHTML='<div class="logConversationOrder"><strong class="logClamp logClampStrong">'+esc(ctx.tracking)+' · '+esc(ctx.orderName)+'</strong><em>'+esc(ctx.product)+'</em><em>'+esc(ctx.address)+'</em></div>';cells[3].innerHTML='<strong class="logClamp logClampStrong">'+esc(ctx.shipping)+'</strong><span class="logClamp logClampMuted">'+esc(ctx.logistics)+'</span><span class="logClamp logClampMuted">'+esc(ctx.payment)+'</span>';});updateSummary();}
  function dataMap(){const map={};document.querySelectorAll('#logConversationSlide .logConversationDataItem').forEach(item=>{const label=norm(text(item.querySelector('span')));map[label]=item;});return map;}
  function setData(map,label,value){const item=map[norm(label)];if(!item)return;const strong=item.querySelector('strong');if(strong&&useful(value))strong.textContent=value;}
  function updateQuickTools(map){const values={tracking_id:text(map[norm('Tracking')]?.querySelector('strong')),domicilio_usuario:text(map[norm('Dirección')]?.querySelector('strong')),codigo_postal:text(map[norm('Código postal')]?.querySelector('strong')),producto:text(map[norm('Producto')]?.querySelector('strong')),estado_envio:text(map[norm('Estado envío')]?.querySelector('strong')),pedido_shopify:text(map[norm('Pedido Shopify')]?.querySelector('strong')),email_cliente:text(map[norm('Email')]?.querySelector('strong')),entrega_estimada:text(map[norm('Entrega estimada')]?.querySelector('strong')),monto_a_cobrar:text(map[norm('Monto a cobrar')]?.querySelector('strong'))};document.querySelectorAll('#logConversationSlide .logQuickTool').forEach(btn=>{const key=(text(btn.querySelector('strong')).match(/\{([^}]+)\}/)||[])[1];if(!key||!(key in values))return;const value=values[key]||'—';btn.dataset.logInsertValue=value;const span=btn.querySelector('span');if(span)span.textContent=value;});}
  async function patchSlide(){const slide=document.getElementById('logConversationSlide');if(!slide||!slide.classList.contains('is-open'))return;const map=dataMap();const email=text(map[norm('Email')]?.querySelector('strong'));const tracking=text(map[norm('Tracking')]?.querySelector('strong'));const orderName=text(map[norm('Pedido Shopify')]?.querySelector('strong'));const phone=text(map[norm('Teléfono')]?.querySelector('strong'));const orders=await loadOrders(false);const order=findOrder({email,tracking,orderName,phone},orders);const statusRow=slide.querySelector('.logConversationStatusRow');if(statusRow){statusRow.querySelectorAll('.logConversationPurchaseBadge').forEach(x=>x.remove());statusRow.insertAdjacentHTML('beforeend',badge(order?'Compra asociada':'Compra no asociada',Boolean(order)));const verify=statusRow.querySelector('.logConversationVerified:not(.logConversationPurchaseBadge)');if(verify&&order){verify.classList.remove('logConversationVerified--no');verify.classList.add('logConversationVerified--yes');verify.innerHTML='<span class="logVerifyIcon">✓</span>Verificada';}}if(!order){updateQuickTools(map);return;}const ctx=orderContext(order);setData(map,'Cliente',ctx.name);setData(map,'Email',ctx.email);setData(map,'Teléfono',ctx.phone);setData(map,'Tracking',ctx.tracking);setData(map,'Pedido Shopify',ctx.orderName);setData(map,'Producto',ctx.product);setData(map,'SKU / variante',(ctx.sku||'—')+' · '+(ctx.variant||'—'));setData(map,'Dirección',ctx.address);setData(map,'Localidad / provincia',(ctx.locality||'—')+' · '+(ctx.province||'—'));setData(map,'Código postal',ctx.postalCode);setData(map,'Pago',ctx.payment);setData(map,'Monto a cobrar',ctx.amount);setData(map,'Estado envío',ctx.shipping);setData(map,'Estado logístico',ctx.logistics);setData(map,'Entrega estimada',ctx.estimated);setData(map,'Responsable',ctx.responsible);const headerTracking=slide.querySelector('.logConversationHeaderMain span');if(headerTracking&&ctx.tracking)headerTracking.textContent=ctx.tracking;updateQuickTools(dataMap());}
  function patch(){patchTable();patchSlide();}
  function bind(){if(window[READY])return;window[READY]=true;loadOrders(true).then(patch);const main=root();if(main){const obs=new MutationObserver(()=>window.clearTimeout(window.__logConversationOrderBridgeTimer)|| (window.__logConversationOrderBridgeTimer=window.setTimeout(patch,80)));obs.observe(main,{childList:true,subtree:true});}setInterval(patch,1200);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadOrders(true).then(patch);});}
  document.addEventListener('DOMContentLoaded',bind);document.addEventListener(PAGE_EVENT,bind);if(document.readyState!=='loading')bind();
})();
