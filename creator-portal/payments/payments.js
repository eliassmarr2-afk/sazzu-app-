import { getOnboardingState, isDemoMode } from '../api-client.js';
import {
  confirmCreatorPayableDestination,
  createCreatorPaymentAccount,
  deactivateCreatorPaymentAccount,
  getCreatorPaymentAccounts,
  getCreatorPaymentPayables,
  getCreatorPaymentPayouts,
  getCreatorPayoutProof,
} from './api.js';

const DEMO_PAYABLE_A = '91111111-1111-4111-8111-111111111111';
const DEMO_PAYABLE_B = '92222222-2222-4222-8222-222222222222';
const DEMO_PAYABLE_C = '93333333-3333-4333-8333-333333333333';
const DEMO_ACCOUNT_A = 'a1111111-1111-4111-8111-111111111111';

const demoState = {
  accounts: [
    { payment_account_id: DEMO_ACCOUNT_A, provider: 'mercado_pago', account_type: 'wallet_transfer', holder_name: 'Tomás Pérez', holder_document_masked: '**.***.123', alias: 'tomas.crea.mp', account_identifier_last4: '4821', status: 'active', created_at: '2026-08-18T18:00:00-03:00' },
    { payment_account_id: 'a2222222-2222-4222-8222-222222222222', provider: 'bank_transfer', account_type: 'bank_transfer', holder_name: 'Tomás Pérez', holder_document_masked: '**.***.123', alias: 'tomas.crea.banco', account_identifier_last4: '1934', status: 'inactive', created_at: '2026-08-10T12:00:00-03:00', deactivated_at: '2026-08-18T17:30:00-03:00' },
  ],
  payables: [
    { payable_id: DEMO_PAYABLE_A, purchase_id: 'b1111111-1111-4111-8111-111111111111', concept_type: 'base_purchase', currency: 'ARS', amount_due: 45000, status: 'awaiting_confirmation', confirmed_amount: 0, inflight_amount: 0, unpaid_amount: 45000, remaining_to_schedule: 45000, payment_account_confirmed_at: null, payment_account: null, latest_confirmation: null, can_confirm_payment_account: true, due_at: null, paid_at: null, created_at: '2026-08-19T12:50:00-03:00', purchase: { status: 'agreed', agreed_at: '2026-08-19T12:50:00-03:00' }, creative: { submission_id: '43333333-3333-4333-8333-333333333333', submission_version_id: '53333333-3333-4333-8333-333333333333', version_number: 2, concept_label: 'Unboxing espontáneo en mesa', consignment_title: 'Invitación · Unboxing + reseña corta', original_filename: 'unboxing-v2.mp4' } },
    { payable_id: DEMO_PAYABLE_B, purchase_id: 'b2222222-2222-4222-8222-222222222222', concept_type: 'base_purchase', currency: 'ARS', amount_due: 100000, status: 'processing', confirmed_amount: 40000, inflight_amount: 30000, unpaid_amount: 60000, remaining_to_schedule: 30000, payment_account_confirmed_at: '2026-08-18T14:10:00-03:00', payment_account: { payment_account_id: DEMO_ACCOUNT_A, provider: 'mercado_pago', account_type: 'wallet_transfer', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821' }, can_confirm_payment_account: false, created_at: '2026-08-18T13:55:00-03:00', purchase: { status: 'agreed', agreed_at: '2026-08-18T13:55:00-03:00' }, creative: { submission_id: '46666666-6666-4666-8666-666666666666', submission_version_id: '56666666-6666-4666-8666-666666666666', version_number: 1, concept_label: 'Demostración antes/después', consignment_title: 'Demo · Cuidado personal', original_filename: 'demo-v1.mp4' } },
    { payable_id: DEMO_PAYABLE_C, purchase_id: 'b3333333-3333-4333-8333-333333333333', concept_type: 'base_purchase', currency: 'ARS', amount_due: 35000, status: 'paid', confirmed_amount: 35000, inflight_amount: 0, unpaid_amount: 0, remaining_to_schedule: 0, payment_account_confirmed_at: '2026-08-15T10:00:00-03:00', payment_account: { payment_account_id: DEMO_ACCOUNT_A, provider: 'mercado_pago', account_type: 'wallet_transfer', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821' }, can_confirm_payment_account: false, paid_at: '2026-08-16T16:25:00-03:00', created_at: '2026-08-15T09:45:00-03:00', purchase: { status: 'settled', agreed_at: '2026-08-15T09:45:00-03:00', settled_at: '2026-08-16T16:30:00-03:00' }, creative: { submission_id: '47777777-7777-4777-8777-777777777777', submission_version_id: '57777777-7777-4777-8777-777777777777', version_number: 1, concept_label: 'Uso cotidiano', consignment_title: 'UGC · Producto hogar', original_filename: 'hogar-v1.mp4' } },
  ],
  payouts: [
    { payout_id: 'c1111111-1111-4111-8111-111111111111', status: 'confirmed', provider: 'mercado_pago', method: 'manual_transfer', currency: 'ARS', amount: 40000, provider_reference: 'MP-PCI-001', transferred_at: '2026-08-18T16:00:00-03:00', initiated_at: '2026-08-18T16:02:00-03:00', confirmed_at: '2026-08-18T16:10:00-03:00', proof_available: true, created_at: '2026-08-18T16:02:00-03:00', payable_id: DEMO_PAYABLE_B, payment_destination: { provider: 'mercado_pago', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821' }, creative: { version_number: 1, concept_label: 'Demostración antes/después', consignment_title: 'Demo · Cuidado personal' } },
    { payout_id: 'c2222222-2222-4222-8222-222222222222', status: 'initiated', provider: 'mercado_pago', method: 'manual_transfer', currency: 'ARS', amount: 30000, provider_reference: 'MP-PCI-002', transferred_at: '2026-08-19T12:30:00-03:00', initiated_at: '2026-08-19T12:31:00-03:00', confirmed_at: null, proof_available: true, created_at: '2026-08-19T12:31:00-03:00', payable_id: DEMO_PAYABLE_B, payment_destination: { provider: 'mercado_pago', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821' }, creative: { version_number: 1, concept_label: 'Demostración antes/después', consignment_title: 'Demo · Cuidado personal' } },
    { payout_id: 'c3333333-3333-4333-8333-333333333333', status: 'confirmed', provider: 'mercado_pago', method: 'manual_transfer', currency: 'ARS', amount: 35000, provider_reference: 'MP-PCI-003', transferred_at: '2026-08-16T16:20:00-03:00', confirmed_at: '2026-08-16T16:25:00-03:00', proof_available: true, created_at: '2026-08-16T16:20:00-03:00', payable_id: DEMO_PAYABLE_C, payment_destination: { provider: 'mercado_pago', holder_name: 'Tomás Pérez', alias: 'tomas.crea.mp', account_identifier_last4: '4821' }, creative: { version_number: 1, concept_label: 'Uso cotidiano', consignment_title: 'UGC · Producto hogar' } },
  ],
};

const state = {
  accounts: [], payables: [], payouts: [], creatorName: 'Tomás', filter: 'all', busy: false,
  confirmPayableId: null, deactivateAccountId: null, focusApplied: false,
};

const els = {
  loading: document.querySelector('[data-loading-state]'), view: document.querySelector('[data-payments-view]'),
  payableList: document.querySelector('[data-payable-list]'), payableEmpty: document.querySelector('[data-payable-empty]'),
  accountGrid: document.querySelector('[data-payment-account-grid]'), payoutList: document.querySelector('[data-payout-list]'), payoutEmpty: document.querySelector('[data-payout-empty]'),
  accountDialog: document.querySelector('[data-account-dialog]'), accountForm: document.querySelector('[data-account-form]'),
  confirmDialog: document.querySelector('[data-confirm-dialog]'), confirmContent: document.querySelector('[data-confirm-dialog-content]'),
  deactivateDialog: document.querySelector('[data-deactivate-dialog]'), deactivateContent: document.querySelector('[data-deactivate-dialog-content]'),
  toast: document.querySelector('[data-payment-toast]'),
};

function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function itemsOf(payload){return Array.isArray(payload?.items)?payload.items:[]}
function firstName(value){return String(value||'').trim().split(/\s+/)[0]||'Creator'}
function formatMoney(value,currency='ARS'){const amount=Number(value);if(!Number.isFinite(amount))return '—';try{return new Intl.NumberFormat('es-AR',{style:'currency',currency:currency||'ARS',maximumFractionDigits:0}).format(amount)}catch{return `${currency||''} ${amount.toLocaleString('es-AR')}`.trim()}}
function formatDate(value,withTime=false){if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';return new Intl.DateTimeFormat('es-AR',withTime?{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'short',year:'numeric'}).format(date)}
function shortId(value){return String(value||'').replaceAll('-','').slice(0,8).toUpperCase()||'PCI'}
function providerLabel(value){return ({mercado_pago:'Mercado Pago',bank_transfer:'Banco / billetera',other:'Otro'})[value]||String(value||'').replaceAll('_',' ')}
function payableStatus(status){return ({awaiting_confirmation:['Confirmá tu cuenta','awaiting_confirmation'],ready_to_pay:['Listo para pagar','ready_to_pay'],processing:['Transferencia en proceso','processing'],paid:['Pagado','paid'],failed:['Pago fallido','failed'],in_incident:['En revisión','in_incident'],voided:['Anulado','voided']})[status]||[status||'Pendiente',status||'']}
function payoutStatus(status){return ({initiated:['En proceso','processing'],confirmed:['Confirmado','paid'],failed:['Fallido','failed'],reversed:['Revertido','in_incident']})[status]||[status||'Pendiente','']}
function destinationLabel(account){if(!account)return 'Sin confirmar';const alias=String(account.alias||'').trim();const last4=String(account.account_identifier_last4||'').trim();if(alias&&last4)return `${alias} · •••• ${last4}`;if(alias)return alias;if(last4)return `•••• ${last4}`;return providerLabel(account.provider)}
function creativeTitle(value){return value?.consignment_title||value?.concept_label||'Creativo adquirido'}
function currentFocusId(){return new URL(window.location.href).searchParams.get('id')}

function totalsByCurrency(rows, selector){
  const map=new Map();
  rows.forEach((row)=>{const amount=Number(selector(row)||0);if(amount<=0)return;const currency=String(row.currency||'ARS');map.set(currency,(map.get(currency)||0)+amount)});
  return map;
}
function formatTotals(map){
  const values=[...map.entries()];
  if(!values.length)return formatMoney(0,'ARS');
  if(values.length===1)return formatMoney(values[0][1],values[0][0]);
  return values.map(([currency,amount])=>`${currency} ${Number(amount).toLocaleString('es-AR',{maximumFractionDigits:0})}`).join(' · ');
}

function showToast(message,error=false){if(!els.toast)return;els.toast.textContent=message;els.toast.classList.toggle('is-error',error);els.toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{els.toast.hidden=true},3800)}

function renderIdentity(){document.querySelectorAll('[data-creator-name]').forEach((el)=>{el.textContent=state.creatorName});document.querySelectorAll('[data-creator-avatar]').forEach((el)=>{el.textContent=state.creatorName.slice(0,1).toUpperCase()})}

function renderMetrics(){
  const receivable=totalsByCurrency(state.payables,(p)=>p.unpaid_amount);
  const inflight=totalsByCurrency(state.payables,(p)=>p.inflight_amount);
  const confirmed=totalsByCurrency(state.payables,(p)=>p.confirmed_amount);
  const attention=state.payables.filter((p)=>p.status==='awaiting_confirmation').length;
  const values={receivable:formatTotals(receivable),inflight:formatTotals(inflight),confirmed:formatTotals(confirmed),attention:String(attention)};
  Object.entries(values).forEach(([key,value])=>{const el=document.querySelector(`[data-payment-metric="${key}"]`);if(el)el.textContent=value});
}

function payableMatchesFilter(payable){
  if(state.filter==='attention')return payable.status==='awaiting_confirmation';
  if(state.filter==='processing')return ['ready_to_pay','processing'].includes(payable.status);
  if(state.filter==='paid')return payable.status==='paid';
  return true;
}

function payableActionMarkup(payable){
  if(payable.status==='awaiting_confirmation')return `<button class="pci-payment-primary" type="button" data-confirm-payable="${escapeHtml(payable.payable_id)}">Confirmar cuenta de cobro</button>`;
  if(payable.status==='ready_to_pay'&&payable.can_confirm_payment_account)return `<button class="pci-payment-secondary" type="button" data-confirm-payable="${escapeHtml(payable.payable_id)}">Cambiar cuenta confirmada</button>`;
  return '';
}

function payableActionCopy(payable){
  if(payable.status==='awaiting_confirmation')return 'Protocol necesita que elijas el destino exacto antes de poder transferir.';
  if(payable.status==='ready_to_pay')return 'El destino ya está confirmado. Protocol puede iniciar la transferencia.';
  if(payable.status==='processing')return 'Existe al menos una transferencia iniciada. Solo un payout confirmado reduce el saldo cobrado.';
  if(payable.status==='paid')return 'La obligación quedó completamente cubierta por payouts confirmados.';
  if(payable.status==='in_incident'||payable.status==='failed')return 'Esta obligación requiere revisión operativa de Protocol.';
  return 'Este registro se conserva como parte de tu historial financiero.';
}

function renderPayables(){
  const filtered=state.payables.filter(payableMatchesFilter);
  els.payableEmpty.hidden=filtered.length>0;
  els.payableList.innerHTML=filtered.map((p)=>{
    const [label,tone]=payableStatus(p.status);const due=Math.max(Number(p.amount_due)||0,0);const confirmed=Math.max(Number(p.confirmed_amount)||0,0);const inflight=Math.max(Number(p.inflight_amount)||0,0);const confirmedPct=due?Math.min(confirmed/due*100,100):0;const inflightPct=due?Math.min(inflight/due*100,Math.max(100-confirmedPct,0)):0;const focus=currentFocusId()===p.payable_id;
    return `<article class="pci-payable-card${focus?' is-focus':''}" data-payable-id="${escapeHtml(p.payable_id)}">
      <div class="pci-payable-card__top"><div class="pci-payable-card__title"><span class="pci-payment-status is-${escapeHtml(tone)}">${escapeHtml(label)}</span><h3>${escapeHtml(creativeTitle(p.creative))}</h3><p>${p.creative?.version_number?`V${escapeHtml(p.creative.version_number)} · `:''}${escapeHtml(p.creative?.concept_label||'Compra de creativo')} · #${escapeHtml(shortId(p.purchase_id))}</p></div><div class="pci-payable-card__amount"><strong>${escapeHtml(formatMoney(p.amount_due,p.currency))}</strong><span>obligación total</span></div></div>
      <div class="pci-payable-progress"><div class="pci-payable-progress__track"><span class="pci-payable-progress__confirmed" style="width:${confirmedPct}%"></span><span class="pci-payable-progress__inflight" style="width:${inflightPct}%"></span></div><div class="pci-payable-progress__legend"><span><strong>${escapeHtml(formatMoney(confirmed,p.currency))}</strong> confirmado</span><span><strong>${escapeHtml(formatMoney(inflight,p.currency))}</strong> en transferencia</span><span><strong>${escapeHtml(formatMoney(p.remaining_to_schedule,p.currency))}</strong> todavía sin programar</span></div></div>
      <div class="pci-payable-meta"><div><span>Destino confirmado</span><strong>${escapeHtml(destinationLabel(p.payment_account))}</strong></div><div><span>Confirmado el</span><strong>${escapeHtml(formatDate(p.payment_account_confirmed_at,true))}</strong></div><div><span>Saldo por cobrar</span><strong>${escapeHtml(formatMoney(p.unpaid_amount,p.currency))}</strong></div></div>
      <div class="pci-payable-actions"><small>${escapeHtml(payableActionCopy(p))}</small>${payableActionMarkup(p)}</div>
    </article>`;
  }).join('');

  if(!state.focusApplied){const target=els.payableList.querySelector('.is-focus');if(target){state.focusApplied=true;setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),120)}}
}

function renderAccounts(){
  els.accountGrid.innerHTML=state.accounts.map((a)=>`<article class="pci-payment-account${a.status!=='active'?' is-inactive':''}" data-account-id="${escapeHtml(a.payment_account_id)}"><div class="pci-payment-account__top"><div><h3>${escapeHtml(providerLabel(a.provider))}</h3><p>${escapeHtml(a.holder_name||'Titular')}</p></div><span class="pci-payment-status ${a.status==='active'?'is-paid':''}">${a.status==='active'?'Activa':'Inactiva'}</span></div><div class="pci-payment-account__body"><div><span>Alias</span><strong>${escapeHtml(a.alias||'—')}</strong></div><div><span>Identificador</span><strong>${a.account_identifier_last4?`•••• ${escapeHtml(a.account_identifier_last4)}`:'—'}</strong></div></div><div class="pci-payment-account__footer"><small>Creada ${escapeHtml(formatDate(a.created_at))}</small>${a.status==='active'?`<button class="pci-payment-link" type="button" data-deactivate-account="${escapeHtml(a.payment_account_id)}">Desactivar</button>`:''}</div></article>`).join('')||'<div class="pci-payment-empty"><strong>No agregaste cuentas de cobro.</strong><span>Necesitás una cuenta activa para confirmar una obligación.</span></div>';
}

function renderPayouts(){
  els.payoutEmpty.hidden=state.payouts.length>0;
  els.payoutList.innerHTML=state.payouts.map((p)=>{const [label,tone]=payoutStatus(p.status);return `<article class="pci-payout-card"><div><span class="pci-payment-status is-${escapeHtml(tone)}">${escapeHtml(label)}</span><h3>${escapeHtml(creativeTitle(p.creative))}${p.creative?.version_number?` · V${escapeHtml(p.creative.version_number)}`:''}</h3><p>${escapeHtml(providerLabel(p.provider))}${p.provider_reference?` · Ref. ${escapeHtml(p.provider_reference)}`:''} · ${escapeHtml(formatDate(p.transferred_at||p.created_at,true))}</p></div><div class="pci-payout-card__amount"><strong>${escapeHtml(formatMoney(p.amount,p.currency))}</strong><span>${escapeHtml(destinationLabel(p.payment_destination))}</span></div>${p.proof_available?`<button class="pci-payment-secondary pci-payout-proof" type="button" data-payout-proof="${escapeHtml(p.payout_id)}">Ver comprobante</button>`:'<span></span>'}</article>`}).join('');
}

function renderAll(){renderIdentity();renderMetrics();renderPayables();renderAccounts();renderPayouts()}

function activeAccounts(){return state.accounts.filter((a)=>a.status==='active')}
function payableById(id){return state.payables.find((p)=>p.payable_id===id)||null}
function accountById(id){return state.accounts.find((a)=>a.payment_account_id===id)||null}

function openConfirmDialog(payableId){
  const payable=payableById(payableId);if(!payable)return;state.confirmPayableId=payableId;const accounts=activeAccounts();
  els.confirmContent.innerHTML=`<div class="pci-payment-dialog__header"><div><span>CONFIRMAR DESTINO</span><h2>${escapeHtml(formatMoney(payable.amount_due,payable.currency))} · ${escapeHtml(creativeTitle(payable.creative))}</h2></div><button type="button" data-close-confirm-dialog>×</button></div><p class="pci-payment-dialog-copy">Elegí qué cuenta debe usar Protocol para esta obligación exacta. Confirmar el destino <strong>no marca el pago como cobrado</strong>.</p>${accounts.length?`<form data-confirm-form>${accounts.map((a,index)=>`<label class="pci-payment-account-choice"><input type="radio" name="payment_account_id" value="${escapeHtml(a.payment_account_id)}" ${index===0?'checked':''}><span><strong>${escapeHtml(providerLabel(a.provider))} · ${escapeHtml(a.holder_name)}</strong><span>${escapeHtml(destinationLabel(a))}</span></span></label>`).join('')}<div data-confirm-error></div><div class="pci-payment-dialog__actions"><button class="pci-payment-secondary" type="button" data-close-confirm-dialog>Cancelar</button><button class="pci-payment-primary" type="submit" data-confirm-destination>Confirmar para este cobro</button></div></form>`:`<div class="pci-payment-empty"><strong>Primero necesitás una cuenta activa.</strong><span>Agregá una cuenta de cobro y después confirmala para esta obligación.</span></div><div class="pci-payment-dialog__actions"><button class="pci-payment-secondary" type="button" data-close-confirm-dialog>Cancelar</button><button class="pci-payment-primary" type="button" data-create-account-from-confirm>Agregar cuenta</button></div>`}`;
  els.confirmDialog.showModal();
}

function openDeactivateDialog(accountId){
  const account=accountById(accountId);if(!account)return;state.deactivateAccountId=accountId;
  els.deactivateContent.innerHTML=`<div class="pci-payment-dialog__header"><div><span>DESACTIVAR CUENTA</span><h2>${escapeHtml(providerLabel(account.provider))} · ${escapeHtml(destinationLabel(account))}</h2></div><button type="button" data-close-deactivate-dialog>×</button></div><p class="pci-payment-dialog-copy">La cuenta dejará de estar disponible para nuevas confirmaciones. Los Payables que ya congelaron un snapshot de este destino conservan su historial intacto.</p><div data-deactivate-error></div><div class="pci-payment-dialog__actions"><button class="pci-payment-secondary" type="button" data-close-deactivate-dialog>Cancelar</button><button class="pci-payment-primary" type="button" data-confirm-deactivate>Desactivar cuenta</button></div>`;
  els.deactivateDialog.showModal();
}

function friendlyError(error){const code=String(error?.message||error?.payload?.code||'');return ({pci_payment_provider_invalid:'Elegí un proveedor válido.',pci_payment_holder_name_invalid:'Ingresá el nombre del titular.',pci_payment_destination_required:'Ingresá un alias o un CBU/CVU/identificador.',pci_payment_account_not_active:'Esa cuenta ya no está activa.',pci_payable_not_confirmable:'Este cobro ya no admite cambios de cuenta.',pci_purchase_not_payable:'La compra todavía no está disponible para pago.',pci_auth_session_required:'Tu sesión venció. Volvé a ingresar.',payment_crypto_unavailable:'El cifrado de datos de pago no está disponible en este momento.',pci_payout_proof_not_available:'Este movimiento no tiene comprobante disponible.'})[code]||'No pudimos completar la operación. El estado financiero no fue modificado.'}

async function reloadLive(){
  if(isDemoMode()){renderAll();return}
  const [accounts,payables,payouts,identity]=await Promise.all([getCreatorPaymentAccounts(),getCreatorPaymentPayables(),getCreatorPaymentPayouts(),getOnboardingState()]);
  state.accounts=itemsOf(accounts);state.payables=itemsOf(payables);state.payouts=itemsOf(payouts);state.creatorName=firstName(identity?.display_name);renderAll();
}

async function handleAccountSubmit(form){
  if(state.busy)return;const fd=new FormData(form);const provider=String(fd.get('provider')||'');const accountType=provider==='mercado_pago'?'wallet_transfer':provider==='bank_transfer'?'bank_transfer':'transfer';const payload={provider,account_type:accountType,holder_name:String(fd.get('holder_name')||'').trim(),holder_document_masked:String(fd.get('holder_document_masked')||'').trim(),alias:String(fd.get('alias')||'').trim(),account_identifier:String(fd.get('account_identifier')||'').trim()};const errorRoot=form.querySelector('[data-account-form-error]');if(errorRoot)errorRoot.innerHTML='';state.busy=true;const button=form.querySelector('[data-save-account]');if(button){button.disabled=true;button.textContent='Guardando…'};
  try{const result=await createCreatorPaymentAccount(payload);if(isDemoMode()){state.accounts.unshift({...result,created_at:new Date().toISOString()})}else await reloadLive();els.accountDialog.close();form.reset();renderAll();showToast('Cuenta de cobro guardada. El identificador exacto ya no se mostrará completo.');const pending=state.confirmPayableId;if(pending)setTimeout(()=>openConfirmDialog(pending),80)}catch(error){if(errorRoot)errorRoot.innerHTML=`<div class="pci-payment-form-error">${escapeHtml(friendlyError(error))}</div>`}finally{state.busy=false;if(button){button.disabled=false;button.textContent='Guardar cuenta'}}
}

async function handleConfirmDestination(form){
  if(state.busy||!state.confirmPayableId)return;const fd=new FormData(form);const accountId=String(fd.get('payment_account_id')||'');const payable=payableById(state.confirmPayableId);const account=accountById(accountId);const errorRoot=form.querySelector('[data-confirm-error]');if(!payable||!account){if(errorRoot)errorRoot.innerHTML='<div class="pci-payment-form-error">Elegí una cuenta activa.</div>';return}state.busy=true;const button=form.querySelector('[data-confirm-destination]');if(button){button.disabled=true;button.textContent='Confirmando…'};
  try{const result=await confirmCreatorPayableDestination(payable.payable_id,accountId);if(isDemoMode()){payable.status='ready_to_pay';payable.payment_account_confirmed_at=new Date().toISOString();payable.payment_account={payment_account_id:account.payment_account_id,provider:account.provider,account_type:account.account_type,holder_name:account.holder_name,holder_document_masked:account.holder_document_masked,alias:account.alias,account_identifier_last4:account.account_identifier_last4};payable.latest_confirmation={confirmation_id:result.confirmation_id,payment_account_id:accountId,confirmed_at:payable.payment_account_confirmed_at};payable.can_confirm_payment_account=true}else await reloadLive();els.confirmDialog.close();state.confirmPayableId=null;renderAll();showToast('Destino confirmado. Protocol ya puede usarlo para esta obligación.') }catch(error){if(errorRoot)errorRoot.innerHTML=`<div class="pci-payment-form-error">${escapeHtml(friendlyError(error))}</div>`}finally{state.busy=false;if(button){button.disabled=false;button.textContent='Confirmar para este cobro'}}
}

async function handleDeactivate(){
  if(state.busy||!state.deactivateAccountId)return;const account=accountById(state.deactivateAccountId);if(!account)return;state.busy=true;const button=els.deactivateContent.querySelector('[data-confirm-deactivate]');if(button){button.disabled=true;button.textContent='Desactivando…'};
  try{await deactivateCreatorPaymentAccount(account.payment_account_id);if(isDemoMode()){account.status='inactive';account.deactivated_at=new Date().toISOString()}else await reloadLive();els.deactivateDialog.close();state.deactivateAccountId=null;renderAll();showToast('Cuenta desactivada para futuras confirmaciones.')}catch(error){const root=els.deactivateContent.querySelector('[data-deactivate-error]');if(root)root.innerHTML=`<div class="pci-payment-form-error">${escapeHtml(friendlyError(error))}</div>`}finally{state.busy=false}
}

async function openProof(payoutId,button){
  if(state.busy)return;state.busy=true;const old=button.textContent;button.disabled=true;button.textContent='Abriendo…';
  try{const result=await getCreatorPayoutProof(payoutId);if(isDemoMode()){showToast('Demo: el comprobante se abrirá con URL firmada de 10 minutos en runtime.');return}const url=String(result?.signed_url||'');if(!/^https:\/\//i.test(url))throw new Error('pci_payout_proof_not_available');const anchor=document.createElement('a');anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';document.body.appendChild(anchor);anchor.click();anchor.remove()}catch(error){showToast(friendlyError(error),true)}finally{state.busy=false;button.disabled=false;button.textContent=old}
}

function bindDrawer(){const drawer=document.querySelector('[data-mobile-drawer]');const open=document.querySelector('[data-mobile-menu]');if(!drawer||!open)return;const set=(value)=>{drawer.classList.toggle('is-open',value);drawer.setAttribute('aria-hidden',value?'false':'true');document.body.style.overflow=value?'hidden':''};open.addEventListener('click',()=>set(true));drawer.querySelectorAll('[data-mobile-menu-close]').forEach((b)=>b.addEventListener('click',()=>set(false)));drawer.querySelectorAll('a').forEach((a)=>a.addEventListener('click',()=>set(false)))}

function bindEvents(){
  document.querySelectorAll('[data-open-account-dialog]').forEach((button)=>button.addEventListener('click',()=>{state.confirmPayableId=null;els.accountDialog.showModal()}));
  document.querySelectorAll('[data-close-account-dialog]').forEach((button)=>button.addEventListener('click',()=>els.accountDialog.close()));
  els.accountForm.addEventListener('submit',(event)=>{event.preventDefault();handleAccountSubmit(els.accountForm)});
  document.querySelector('[data-payable-filters]')?.addEventListener('click',(event)=>{const button=event.target.closest('[data-payment-filter]');if(!button)return;state.filter=button.getAttribute('data-payment-filter')||'all';document.querySelectorAll('[data-payment-filter]').forEach((b)=>b.classList.toggle('is-active',b===button));renderPayables()});
  els.payableList.addEventListener('click',(event)=>{const button=event.target.closest('[data-confirm-payable]');if(button)openConfirmDialog(button.getAttribute('data-confirm-payable'))});
  els.accountGrid.addEventListener('click',(event)=>{const button=event.target.closest('[data-deactivate-account]');if(button)openDeactivateDialog(button.getAttribute('data-deactivate-account'))});
  els.payoutList.addEventListener('click',(event)=>{const button=event.target.closest('[data-payout-proof]');if(button)openProof(button.getAttribute('data-payout-proof'),button)});
  els.confirmDialog.addEventListener('click',(event)=>{if(event.target.closest('[data-close-confirm-dialog]')){els.confirmDialog.close();state.confirmPayableId=null;return}if(event.target.closest('[data-create-account-from-confirm]')){const pending=state.confirmPayableId;els.confirmDialog.close();state.confirmPayableId=pending;els.accountDialog.showModal()}});
  els.confirmDialog.addEventListener('submit',(event)=>{const form=event.target.closest('[data-confirm-form]');if(!form)return;event.preventDefault();handleConfirmDestination(form)});
  els.deactivateDialog.addEventListener('click',(event)=>{if(event.target.closest('[data-close-deactivate-dialog]')){els.deactivateDialog.close();state.deactivateAccountId=null;return}if(event.target.closest('[data-confirm-deactivate]'))handleDeactivate()});
}

async function boot(){
  bindDrawer();bindEvents();
  try{if(isDemoMode()){state.accounts=structuredClone(demoState.accounts);state.payables=structuredClone(demoState.payables);state.payouts=structuredClone(demoState.payouts)}else{const [accounts,payables,payouts,identity]=await Promise.all([getCreatorPaymentAccounts(),getCreatorPaymentPayables(),getCreatorPaymentPayouts(),getOnboardingState()]);state.accounts=itemsOf(accounts);state.payables=itemsOf(payables);state.payouts=itemsOf(payouts);state.creatorName=firstName(identity?.display_name)}renderAll();els.loading.hidden=true;els.view.hidden=false}catch(error){els.loading.innerHTML=`<div class="pci-payment-empty"><strong>No pudimos cargar tus pagos.</strong><span>${escapeHtml(friendlyError(error))}</span></div>`}
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
