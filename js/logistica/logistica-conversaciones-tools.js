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
    s.textContent=`
      .logConversationSlide__panel{background:#fff!important}
      .logConversationSlide__header{background:#EDEDED!important;color:#252A32!important;box-shadow:0 12px 32px rgba(15,23,42,.16)!important;border-bottom:1px solid #dce2ea!important;z-index:5!important}
      .logConversationSlide__header button{background:#fff!important;color:#2479FF!important;box-shadow:0 3px 10px rgba(15,23,42,.10)!important}
      .logConversationSlide__title{display:grid!important;grid-template-columns:minmax(0,1fr)auto!important;align-items:center!important;gap:14px!important;width:100%!important}
      .logConversationHeaderMain{min-width:0;display:grid;gap:3px}
      .logConversationHeaderMain strong{display:block;color:#252A32!important;font-size:17px!important;line-height:1.1!important;font-weight:950!important;letter-spacing:-.02em!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .logConversationHeaderMain span{display:block;color:#697386!important;font-size:12px!important;line-height:1.15!important;font-weight:850!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .logConversationHeaderId{display:inline-flex;align-items:center;gap:8px;background:#f4f6f9;border:1px solid #dfe5ee;border-radius:5px;padding:7px 9px;color:#697386;font-size:11px;font-weight:900;max-width:310px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
      .logConversationBubble--customer::after{content:"";position:absolute;left:-5px;bottom:0;width:12px;height:12px;background:#fff;border-bottom-right-radius:12px;box-shadow:-2px 2px 4px rgba(15,23,42,.04)}
      .logConversationBubble--operator::after{content:"";position:absolute;right:-5px;bottom:0;width:12px;height:12px;background:#2479FF;border-bottom-left-radius:12px;box-shadow:2px 2px 4px rgba(15,23,42,.04)}
      .logConversationReply{display:flex!important;align-items:center!important;gap:8px!important;border:1px solid #d6dde8!important;border-radius:999px!important;padding:8px!important;background:#fff!important;box-shadow:0 2px 8px rgba(15,23,42,.07)!important;margin-top:10px!important}
      .logConversationReply textarea{flex:1!important;min-height:42px!important;max-height:82px!important;border:0!important;box-shadow:none!important;padding:11px 8px!important;resize:none!important;outline:0!important;background:transparent!important;font-size:13px!important;font-weight:750!important;line-height:1.3!important}
      .logConversationReply__actions{display:flex!important;gap:8px!important;align-items:center!important}.logConversationReply__actions .btn--secondary{display:none!important}.logConversationReply__actions .btn--primary{width:44px!important;height:44px!important;min-width:44px!important;border-radius:999px!important;padding:0!important;font-size:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.logConversationReply__actions .btn--primary::before{content:">";font-size:28px;font-weight:950;line-height:1;transform:translateX(1px)}
      .logChatAttachBtn,.logChatToolsBtn{width:44px;height:44px;min-width:44px;border:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:950;cursor:pointer}.logChatAttachBtn{background:#eef1f5;color:#252a32}.logChatToolsBtn{background:#eef5ff;color:#2479ff}
      .logQuickTools{display:grid;gap:0;border:1px solid #e3e8ef;border-radius:5px;overflow:hidden;background:#fff;max-height:54vh;overflow-y:auto}.logQuickTool{border:0;border-bottom:1px solid #e3e8ef;background:#fff;text-align:left;padding:11px 12px;cursor:pointer;display:grid;gap:3px}.logQuickTool:hover{background:#f7fbff}.logQuickTool:last-child{border-bottom:0}.logQuickTool strong{font-size:12px;color:#2479ff}.logQuickTool span{font-size:12px;color:#252a32;font-weight:850}
      .logSegmentWrap{position:relative;margin:0 0 12px}.logSegmentBtn{width:100%;border:1px solid #dde6f3;background:#fff7ed;color:#c05621;border-radius:5px;padding:11px 12px;font-size:12px;font-weight:950;cursor:pointer;text-align:left}.logSegmentBtn:hover{background:#fff1df}.logSegmentPanel{display:none;margin-top:8px;border:1px solid #dce5f2;background:#fff;border-radius:5px;overflow:hidden;box-shadow:0 14px 30px rgba(15,23,42,.10)}.logSegmentWrap.is-open .logSegmentPanel{display:grid}.logSegmentItem{border:0;border-bottom:1px solid #edf1f7;background:#fff;text-align:left;display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:11px 12px;cursor:pointer}.logSegmentItem:hover{background:#f7fbff}.logSegmentItem:last-child{border-bottom:0}.logSegmentDot{width:30px;height:30px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:950}.logSegmentCopy{display:grid;gap:3px}.logSegmentCopy strong{font-size:13px;color:#252a32}.logSegmentCopy span{font-size:11px;color:#697386;font-weight:750;line-height:1.25}.logSegmentBadges{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.logSegmentBadge{display:inline-flex;align-items:center;gap:5px;border-radius:5px;padding:5px 8px;color:#fff;font-size:11px;font-weight:950}.logSegmentStatus{font-size:11px;font-weight:850;color:#697386;margin:6px 0 10px}
      @media(max-width:980px){.logConversationDetailGrid{grid-template-columns:1fr!important}.logConversationBox--chat{border-right:0!important}.logConversationBox--data{border-top:1px solid #e6eaf0;padding-left:0!important;margin-top:12px;padding-top:12px!important}.logConversationHeaderId{display:none}.logConversationDetailGrid{height:calc(100dvh - 150px)!important}}
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
  function enhanceHeader(slide){
    if(slide.dataset.headerToolsReady==='1')return;
    const titleEl=slide.querySelector('#logConversationSlideTitle');
    const subtitleEl=slide.querySelector('#logConversationSlideSubtitle');
    if(!titleEl||!subtitleEl)return;
    const conversationId=text(titleEl);
    const parts=text(subtitleEl).split('·').map(x=>x.trim()).filter(Boolean);
    const clientName=parts[0]||'Cliente';
    const tracking=parts[1]||'Sin tracking';
    titleEl.innerHTML='<span class="logConversationHeaderMain"><strong>'+esc(clientName)+'</strong><span>'+esc(tracking)+'</span></span><span class="logConversationHeaderId" title="'+esc(conversationId)+'">ID '+esc(conversationId)+' <button class="logConversationCopyId" type="button" data-log-copy-conversation-id="'+esc(conversationId)+'" title="Copiar ID">▣</button></span>';
    subtitleEl.style.display='none';
    slide.dataset.headerToolsReady='1';
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
