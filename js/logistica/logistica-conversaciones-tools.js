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
    return text(document.querySelector('#logConversationSlideTitle'));
  }

  function ensureStyles(){
    if(document.getElementById('logConversationToolsStyles'))return;
    const s=document.createElement('style');
    s.id='logConversationToolsStyles';
    s.textContent='.logConversationSlide__panel{background:#fff!important}.logConversationSlide__content{background:#fff!important}.logConversationStatusRow{padding-bottom:10px;border-bottom:1px solid #e6eaf0}.logConversationDetailGrid{grid-template-columns:minmax(0,1fr)340px!important;gap:0!important;border-top:1px solid #e6eaf0}.logConversationBox{border:0!important;box-shadow:none!important;border-radius:0!important;background:#fff!important}.logConversationBox--chat{border-right:1px solid #e6eaf0!important;padding-right:14px!important}.logConversationBox--data{padding-left:14px!important}.logConversationBox__head{border-bottom:1px solid #e6eaf0;padding-bottom:10px}.logConversationChatMeta{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 12px;border-bottom:1px solid #eef1f5;margin-bottom:12px}.logConversationChatMeta strong{font-size:15px;color:#252a32}.logConversationChatMeta span{font-size:12px;font-weight:850;color:#697386}.logConversationReply{display:flex!important;align-items:flex-end;gap:10px;border:1px solid #dde1e8!important;border-radius:999px!important;padding:8px!important;background:#fff!important}.logConversationReply textarea{flex:1!important;min-height:42px!important;max-height:92px!important;border:0!important;box-shadow:none!important;padding:10px 8px!important;resize:none!important}.logConversationReply__actions{display:flex!important;gap:8px!important;align-items:center!important}.logConversationReply__actions .btn--secondary{display:none!important}.logConversationReply__actions .btn--primary{width:44px!important;height:44px!important;border-radius:999px!important;padding:0!important;font-size:0!important}.logConversationReply__actions .btn--primary::before{content:">";font-size:26px;font-weight:950;line-height:1}.logChatAttachBtn,.logChatToolsBtn{width:44px;height:44px;border:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:950;cursor:pointer}.logChatAttachBtn{background:#eef1f5;color:#252a32}.logChatToolsBtn{background:#eef5ff;color:#2479ff}.logQuickTools{display:grid;gap:0;border:1px solid #e3e8ef;border-radius:5px;overflow:hidden;background:#fff;max-height:54vh;overflow-y:auto}.logQuickTool{border:0;border-bottom:1px solid #e3e8ef;background:#fff;text-align:left;padding:11px 12px;cursor:pointer;display:grid;gap:3px}.logQuickTool:hover{background:#f7fbff}.logQuickTool:last-child{border-bottom:0}.logQuickTool strong{font-size:12px;color:#2479ff}.logQuickTool span{font-size:12px;color:#252a32;font-weight:850}.logSegmentWrap{position:relative;margin:0 0 12px}.logSegmentBtn{width:100%;border:1px solid #dde6f3;background:#fff7ed;color:#c05621;border-radius:5px;padding:11px 12px;font-size:12px;font-weight:950;cursor:pointer;text-align:left}.logSegmentBtn:hover{background:#fff1df}.logSegmentPanel{display:none;margin-top:8px;border:1px solid #dce5f2;background:#fff;border-radius:5px;overflow:hidden;box-shadow:0 14px 30px rgba(15,23,42,.10)}.logSegmentWrap.is-open .logSegmentPanel{display:grid}.logSegmentItem{border:0;border-bottom:1px solid #edf1f7;background:#fff;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:11px 12px;cursor:pointer}.logSegmentItem:hover{background:#f7fbff}.logSegmentItem:last-child{border-bottom:0}.logSegmentDot{width:30px;height:30px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:950}.logSegmentCopy{display:grid;gap:3px}.logSegmentCopy strong{font-size:13px;color:#252a32}.logSegmentCopy span{font-size:11px;color:#697386;font-weight:750;line-height:1.25}.logSegmentBadges{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.logSegmentBadge{display:inline-flex;align-items:center;gap:5px;border-radius:5px;padding:5px 8px;color:#fff;font-size:11px;font-weight:950}.logSegmentStatus{font-size:11px;font-weight:850;color:#697386;margin:6px 0 10px}@media(max-width:980px){.logConversationDetailGrid{grid-template-columns:1fr!important}.logConversationBox--chat{border-right:0!important}.logConversationBox--data{border-top:1px solid #e6eaf0;padding-left:0!important;margin-top:12px;padding-top:12px!important}}';
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
    box.innerHTML=segments.map(seg=>'<span class="logSegmentBadge" style="background:'+esc(seg.segment_color||'#2479FF')+'">'+esc(seg.segment_label||seg.segment_key)+'</span>').join('');
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
  async function fetchAssignedSegments(){
    const conversationId=getConversationId();
    if(!conversationId)return;
    try{const data=await rpc('protocol_support_get_conversation_segments',{input_conversation_id:conversationId});renderAssignedSegments(Array.isArray(data)?data:[]);}catch(err){console.warn('[Segmentos activos]',err);}
  }
  function enhance(){
    const slide=document.getElementById('logConversationSlide');
    if(!slide||!slide.classList.contains('is-open'))return;
    const chatBox=slide.querySelector('.logConversationBox--chat');
    const dataBox=slide.querySelector('.logConversationBox--data');
    const form=slide.querySelector('[data-log-conversation-reply-real]');
    if(!chatBox||!dataBox||!form||form.dataset.toolsReady==='1')return;
    form.dataset.toolsReady='1';
    const sub=text(slide.querySelector('#logConversationSlideSubtitle'));
    const last=Array.from(slide.querySelectorAll('.logConversationBubble--customer small')).pop();
    const head=chatBox.querySelector('.logConversationBox__head');
    if(head){head.insertAdjacentHTML('afterend','<div class="logConversationChatMeta"><strong>'+esc(sub.split('·')[0]||'Cliente')+'</strong><span>Último mensaje: '+esc(text(last)||'—')+'</span></div>');}
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
