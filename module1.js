(() => {
  'use strict';
  const SUPABASE_URL='https://otopgejrkngurroucmxd.supabase.co';
  const SUPABASE_KEY='sb_publishable_ZkolpArGVOpzVY76dsIt7w_vA1Ym2R9';
  const $=(s)=>document.querySelector(s);
  const money=(v)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
  const num=(v)=>Number(String(v||'').replace(',','.'))||0;
  let client,session,profile,companyId=null,suppliers=[],purchases=[],toastTimer;

  function toast(message){const el=$('#toast');clearTimeout(toastTimer);el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),3200)}
  function today(){return new Date().toISOString().slice(0,10)}
  function openDialog(id){const d=$(id);if(typeof d.showModal==='function')d.showModal()}
  function closeDialog(id){$(id)?.close()}
  function safe(value){return String(value??'').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

  async function loadContext(){
    const {data,error}=await client.auth.getSession();
    if(error||!data.session){location.replace('./index.html');return false}
    session=data.session;
    const profileResult=await client.from('profiles').select('full_name,approved_profile,approval_status,is_platform_admin').eq('id',session.user.id).maybeSingle();
    if(profileResult.error||!profileResult.data||profileResult.data.approval_status!=='aprovado'){await client.auth.signOut();location.replace('./index.html');return false}
    profile=profileResult.data;
    const allowed=['compras','gestor','administrador'];
    if(!profile.is_platform_admin&&!allowed.includes(profile.approved_profile)){toast('Seu perfil não possui acesso ao módulo de compras.');setTimeout(()=>location.replace('./dashboard.html'),1400);return false}
    const membership=await client.from('company_members').select('company_id').eq('user_id',session.user.id).eq('is_active',true).limit(1).maybeSingle();
    if(!membership.error&&membership.data)companyId=membership.data.company_id;
    return true;
  }

  async function loadData(){
    const [supplierResult,purchaseResult]=await Promise.all([
      client.from('suppliers').select('*').order('name'),
      client.from('purchases').select('*,suppliers(name)').order('purchase_date',{ascending:false}).order('created_at',{ascending:false})
    ]);
    if(supplierResult.error)throw supplierResult.error;
    if(purchaseResult.error)throw purchaseResult.error;
    suppliers=supplierResult.data||[];purchases=purchaseResult.data||[];
    renderAll();
  }

  function renderAll(){renderSupplierOptions();renderSuppliers();renderPurchases();renderSummary()}
  function renderSummary(){
    const active=suppliers.filter(s=>s.is_active).length;
    const valid=purchases.filter(p=>p.purchase_status!=='cancelada');
    const total=valid.reduce((sum,p)=>sum+num(p.total_amount),0);
    const balance=valid.reduce((sum,p)=>sum+Math.max(num(p.total_amount)-num(p.paid_amount),0),0);
    $('#supplierCount').textContent=active;$('#purchaseCount').textContent=valid.length;$('#purchaseTotal').textContent=money(total);$('#balanceTotal').textContent=money(balance);
  }
  function renderSupplierOptions(){
    const current=$('#purchaseSupplier').value;
    $('#purchaseSupplier').innerHTML='<option value="">Selecione o fornecedor</option>'+suppliers.filter(s=>s.is_active).map(s=>`<option value="${s.id}">${safe(s.name)}</option>`).join('');
    if(current)$('#purchaseSupplier').value=current;
  }
  function renderSuppliers(){
    const q=$('#supplierSearch').value.trim().toLowerCase();
    const rows=suppliers.filter(s=>[s.name,s.document,s.city,s.community_or_origin].some(v=>String(v||'').toLowerCase().includes(q)));
    $('#supplierList').innerHTML=rows.length?rows.map(s=>`<article class="item-card"><div class="item-head"><div><h3>${safe(s.name)}</h3><p>${safe(s.document||'Documento não informado')} • ${safe([s.city,s.state].filter(Boolean).join('/'))}</p></div><span class="badge">${s.is_active?'Ativo':'Inativo'}</span></div><div class="details"><div class="detail"><span>Contato</span><strong>${safe(s.phone||'Não informado')}</strong></div><div class="detail"><span>Origem</span><strong>${safe(s.community_or_origin||'Não informada')}</strong></div></div><div class="actions"><button data-edit-supplier="${s.id}">Editar</button><button data-toggle-supplier="${s.id}">${s.is_active?'Inativar':'Ativar'}</button></div></article>`).join(''):'<div class="empty">Nenhum fornecedor encontrado.</div>';
  }
  function renderPurchases(){
    const q=$('#purchaseSearch').value.trim().toLowerCase();
    const rows=purchases.filter(p=>[p.suppliers?.name,p.origin_location,p.quality_classification].some(v=>String(v||'').toLowerCase().includes(q)));
    $('#purchaseList').innerHTML=rows.length?rows.map(p=>{
      const balance=Math.max(num(p.total_amount)-num(p.paid_amount),0);
      const statusClass=p.price_mode==='aberto'?'open':p.purchase_status==='cancelada'?'cancelled':'';
      return `<article class="item-card"><div class="item-head"><div><h3>${safe(p.suppliers?.name||'Fornecedor')}</h3><p>${new Date(p.purchase_date+'T12:00:00').toLocaleDateString('pt-BR')} • ${num(p.quantity_kg).toLocaleString('pt-BR')} kg</p></div><span class="badge ${statusClass}">${p.price_mode==='aberto'?'Preço aberto':safe(p.purchase_status)}</span></div><div class="details"><div class="detail"><span>Valor total</span><strong>${p.total_amount==null?'A definir':money(p.total_amount)}</strong></div><div class="detail"><span>Pago</span><strong>${money(p.paid_amount)}</strong></div><div class="detail"><span>Saldo</span><strong>${p.total_amount==null?'A definir':money(balance)}</strong></div><div class="detail"><span>Pagamento</span><strong>${safe(p.payment_status)}</strong></div></div><div class="actions"><button data-edit-purchase="${p.id}">Editar</button><button class="pay" data-pay-purchase="${p.id}" ${p.purchase_status==='cancelada'?'disabled':''}>Registrar pagamento</button></div></article>`;
    }).join(''):'<div class="empty">Nenhuma compra registrada.</div>';
  }

  function resetSupplier(){
    $('#supplierForm').reset();$('#supplierId').value='';$('#supplierType').value='pessoa_fisica';
  }
  function editSupplier(id){const s=suppliers.find(x=>x.id===id);if(!s)return;$('#supplierId').value=s.id;$('#supplierType').value=s.supplier_type;$('#supplierName').value=s.name||'';$('#supplierDocument').value=s.document||'';$('#supplierPhone').value=s.phone||'';$('#supplierEmail').value=s.email||'';$('#supplierCity').value=s.city||'';$('#supplierState').value=s.state||'';$('#supplierOrigin').value=s.community_or_origin||'';$('#supplierNotes').value=s.notes||'';openDialog('#supplierDialog')}
  async function saveSupplier(event){
    event.preventDefault();
    const id=$('#supplierId').value;
    const payload={company_id:companyId,created_by:session.user.id,supplier_type:$('#supplierType').value,name:$('#supplierName').value.trim(),document:$('#supplierDocument').value.trim()||null,phone:$('#supplierPhone').value.trim()||null,email:$('#supplierEmail').value.trim()||null,city:$('#supplierCity').value.trim()||null,state:$('#supplierState').value.trim().toUpperCase()||null,community_or_origin:$('#supplierOrigin').value.trim()||null,notes:$('#supplierNotes').value.trim()||null,updated_at:new Date().toISOString()};
    const result=id?await client.from('suppliers').update(payload).eq('id',id):await client.from('suppliers').insert(payload);
    if(result.error)return toast(`Não foi possível salvar: ${result.error.message}`);
    closeDialog('#supplierDialog');toast('Fornecedor salvo com sucesso.');await loadData();
  }
  async function toggleSupplier(id){const s=suppliers.find(x=>x.id===id);if(!s)return;const result=await client.from('suppliers').update({is_active:!s.is_active,updated_at:new Date().toISOString()}).eq('id',id);if(result.error)return toast(result.error.message);toast(s.is_active?'Fornecedor inativado.':'Fornecedor ativado.');await loadData()}

  function setPriceMode(){const open=$('#priceMode').value==='aberto';$('#unitPriceLabel').hidden=open;$('#estimatedPriceLabel').hidden=!open;$('#unitPrice').required=!open;calculateTotal()}
  function calculateTotal(){const quantity=num($('#purchaseQuantity').value);const price=$('#priceMode').value==='aberto'?num($('#estimatedUnitPrice').value):num($('#unitPrice').value);$('#calculatedTotal').textContent=price?money(quantity*price):'A definir'}
  function resetPurchase(){
    $('#purchaseForm').reset();$('#purchaseId').value='';$('#purchaseDate').value=today();$('#priceMode').value='fechado';$('#purchaseStatus').value='confirmada';setPriceMode();renderSupplierOptions();
  }
  function editPurchase(id){const p=purchases.find(x=>x.id===id);if(!p)return;$('#purchaseId').value=p.id;$('#purchaseSupplier').value=p.supplier_id;$('#purchaseDate').value=p.purchase_date;$('#purchaseQuantity').value=p.quantity_kg;$('#priceMode').value=p.price_mode;$('#unitPrice').value=p.unit_price??'';$('#estimatedUnitPrice').value=p.estimated_unit_price??'';$('#purchaseStatus').value=p.purchase_status;$('#expectedDelivery').value=p.expected_delivery_date||'';$('#originLocation').value=p.origin_location||'';$('#qualityClassification').value=p.quality_classification||'';$('#purchaseNotes').value=p.notes||'';setPriceMode();openDialog('#purchaseDialog')}
  async function savePurchase(event){
    event.preventDefault();
    const id=$('#purchaseId').value,quantity=num($('#purchaseQuantity').value),mode=$('#priceMode').value;
    const unitPrice=mode==='fechado'?num($('#unitPrice').value):null,estimated=mode==='aberto'?num($('#estimatedUnitPrice').value):null;
    const price=mode==='fechado'?unitPrice:estimated;
    const payload={company_id:companyId,created_by:session.user.id,supplier_id:$('#purchaseSupplier').value,purchase_date:$('#purchaseDate').value,quantity_kg:quantity,price_mode:mode,unit_price:unitPrice,estimated_unit_price:estimated,total_amount:price>0?Number((quantity*price).toFixed(2)):null,purchase_status:$('#purchaseStatus').value,quality_classification:$('#qualityClassification').value.trim()||null,origin_location:$('#originLocation').value.trim()||null,expected_delivery_date:$('#expectedDelivery').value||null,notes:$('#purchaseNotes').value.trim()||null,updated_at:new Date().toISOString()};
    const result=id?await client.from('purchases').update(payload).eq('id',id):await client.from('purchases').insert(payload);
    if(result.error)return toast(`Não foi possível salvar: ${result.error.message}`);
    closeDialog('#purchaseDialog');toast('Compra salva com sucesso.');await loadData();
  }

  function openPayment(id){const p=purchases.find(x=>x.id===id);if(!p)return;$('#paymentForm').reset();$('#paymentPurchaseId').value=id;$('#paymentDate').value=today();const balance=Math.max(num(p.total_amount)-num(p.paid_amount),0);if(balance>0)$('#paymentAmount').value=balance.toFixed(2);openDialog('#paymentDialog')}
  async function savePayment(event){event.preventDefault();const purchaseId=$('#paymentPurchaseId').value;const purchase=purchases.find(p=>p.id===purchaseId);const payload={purchase_id:purchaseId,company_id:purchase?.company_id||companyId,created_by:session.user.id,payment_date:$('#paymentDate').value,amount:num($('#paymentAmount').value),payment_method:$('#paymentMethod').value.trim()||null,reference:$('#paymentReference').value.trim()||null,notes:$('#paymentNotes').value.trim()||null};const result=await client.from('purchase_payments').insert(payload);if(result.error)return toast(`Não foi possível registrar: ${result.error.message}`);closeDialog('#paymentDialog');toast('Pagamento registrado.');await loadData()}

  function bind(){
    $('#backButton').addEventListener('click',()=>location.replace('./dashboard.html'));
    $('#logoutButton').addEventListener('click',async()=>{await client.auth.signOut();location.replace('./index.html')});
    document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===button));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));$(`#${button.dataset.tab}Panel`).classList.add('active')}));
    $('#newSupplierButton').addEventListener('click',()=>{resetSupplier();openDialog('#supplierDialog')});
    $('#newPurchaseButton').addEventListener('click',()=>{if(!suppliers.some(s=>s.is_active))return toast('Cadastre um fornecedor antes de registrar uma compra.');resetPurchase();openDialog('#purchaseDialog')});
    $('#supplierForm').addEventListener('submit',saveSupplier);$('#purchaseForm').addEventListener('submit',savePurchase);$('#paymentForm').addEventListener('submit',savePayment);
    $('#priceMode').addEventListener('change',setPriceMode);['purchaseQuantity','unitPrice','estimatedUnitPrice'].forEach(id=>$(`#${id}`).addEventListener('input',calculateTotal));
    $('#supplierSearch').addEventListener('input',renderSuppliers);$('#purchaseSearch').addEventListener('input',renderPurchases);
    document.addEventListener('click',(event)=>{const close=event.target.dataset.close;if(close)closeDialog(`#${close}`);const es=event.target.dataset.editSupplier;if(es)editSupplier(es);const ts=event.target.dataset.toggleSupplier;if(ts)toggleSupplier(ts);const ep=event.target.dataset.editPurchase;if(ep)editPurchase(ep);const pp=event.target.dataset.payPurchase;if(pp)openPayment(pp)});
  }

  async function init(){
    try{if(!window.supabase?.createClient)throw new Error('Supabase indisponível');client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});if(!await loadContext())return;bind();await loadData();$('#app').hidden=false;$('#loading').remove()}catch(error){console.error(error);$('#loading').textContent='Não foi possível abrir Compras e Fornecedores.'}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();