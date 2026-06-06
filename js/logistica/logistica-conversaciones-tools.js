/* Protocol Data · Logistica · herramientas operativas de chat */
(function(){
  const PAGE_EVENT='sazzu:page:load';
  const READY='__logConversationToolsReady';
  function root(){return document.querySelector('main.logisticsMain');}
  function esc(v){return String(v==null||v===''?'—':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function text(el){return (el&&el.textContent||'').trim();}
  function ensureStyles(){
    if(document.getElementById('logConversationToolsStyles'))return;
    const s=document.createElement('style');
    s.id='logConversationToolsStyles';
    s.textContent='.logConversationSlide__panel{background:#fff!important}.logConversationSlide__content{background:#fff!important}.logConversationStatusRow{padding-bottom:10px;border-bottom:1px solid #e6eaf0}.logConversationDetailGrid{grid-template-columns:minmax(0,1fr)340px!important;gap:0!important;border-top:1px solid #e6eaf0}.logConversationBox{border:0!important;box-shadow:none!important;border-radius:0!important;background:#fff!important}.logConversationBox--chat{border-right:1px solid #e6eaf0!important;padding-right:14px!important}.logConversationBox--data{padding-left:14px!important}.logConversationBox__head{border-bottom:1px solid #e6eaf0;padding-bottom:10px}.logConversationChatMeta{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 12px;border-bottom:1px solid #eef1f5;margin-bottom:12px}.logConversationChatMeta strong{font-size:15px;color:#252a32}.logConversationChatMeta span{font-size:12px;font-weight:850;color:#697386}.logConversationReply{display:flex!important;align-items:flex-end;gap:10px;border:1px solid #dde1e8!important;border-radius:999px!important;padding:8px!important;background:#fff!important}.logConversationReply textarea{flex:1!important;min-height:42px!important;max-height:92px!important;border:0!important;box-shadow:none!important;padding:10px 8px!important;resize:none!important}.logConversationReply__actions{display:flex!important;gap:8px!important;align-items:center!important}.logConversationReply__actions .btn--secondary{display:none!important}.logConversationReply__actions .btn--primary{width:44px!important;height:44px!important;border-radius:999px!important;padding:0!important;font-size:0!important}.logConversationReply__actions .btn--primary::before{content:">";font-size:26px;font-weight:950;line-height:1}.logChatAttachBtn,.logChatToolsBtn{width:44px;height:44px;border:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-weight:950;cursor:pointer}.logChatAttachBtn{background:#eef1f5;color:#252a32}.logChatToolsBtn{background:#eef5ff;color:#2479ff}.logQuickTools{display:grid;gap:0;border:1px solid #e3e8ef;border-radius:5px;overflow:hidden;background:#fff;max-height:54vh;overflow-y:auto}.logQuickTool{border:0;border-bottom:1px solid #e3e8ef;background:#fff;text-align:left;padding:11px 12px;cursor:pointer;display:grid;gap:3px}.logQuickTool:hover{background:#f7fbff}.logQuickTool:last-child{border-bottom:0}.logQuickTool strong{font-size:12px;color:#2479ff}.logQuickTool span{font-size:12px;color:#252a32;font-weight:850}.logSegmentBtn{width:100%;border:1px solid #dde6f3;background:#fff7ed;color:#c05621;border-radius:5px;padding:11px 12px;font-size:12px;font-weight:950;cursor:pointer;margin:0 0 12px}.logSegmentBtn:hover{background:#fff1df}@media(max-width:980px){.logConversationDetailGrid{grid-template-columns:1fr!important}.logConversationBox--chat{border-right:0!important}.logConversationBox--data{border-top:1px solid #e6eaf0;padding-left:0!important;margin-top:12px;padding-top:12px!important}}';
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
    const html='<button class="logSegmentBtn" type="button" data-log-segment-chat="1">Enviar conversación a segmento especial</button><div class="logQuickTools">'+options.map(o=>'<button class="logQuickTool" type="button" data-log-insert-value="'+esc(o[1])+'"><strong>{'+esc(o[0])+'}</strong><span>'+esc(o[1])+'</span></button>').join('')+'</div>';
    const dataHead=dataBox.querySelector('.logConversationBox__head');
    if(dataHead){dataHead.insertAdjacentHTML('afterend',html);}
  }
  function bind(){
    if(window[READY])return;window[READY]=true;ensureStyles();
    document.addEventListener('click',e=>{const insert=e.target.closest('[data-log-insert-value]');if(insert){e.preventDefault();insertText(insert.dataset.logInsertValue||'');return;} const seg=e.target.closest('[data-log-segment-chat]');if(seg){e.preventDefault();seg.textContent='Segmentación preparada';seg.disabled=true;}});
    const obs=new MutationObserver(()=>enhance());
    const main=root();if(main)obs.observe(main,{childList:true,subtree:true});
    setInterval(enhance,800);
  }
  document.addEventListener('DOMContentLoaded',bind);document.addEventListener(PAGE_EVENT,bind);if(document.readyState!=='loading')bind();
})();
