/* TexasPOS — 3 ไฟล์ (index.html + styles.css + app.js)
 * หมายเหตุ: เนื่องจากผมไม่สามารถเข้าถึงไฟล์ต้นฉบับที่อัปโหลดไว้ได้ในสภาพแวดล้อมนี้
 * โค้ดชุดนี้จึงสร้างตามโครง POS ทั่วไป โดยตั้งใจให้แทนที่ของเดิมได้ทันที
 * เมื่อคุณส่งไฟล์ต้นฉบับมา ผมจะ map ฟิลด์/พฤติกรรมให้เหมือนเดิม 100% ได้อีกครั้ง
 */

// -------------------- Config --------------------
const CONFIG = {
  storeName: localStorage.getItem('pos.storeName') || 'TexasPOS',
  currency: localStorage.getItem('pos.currency') || 'THB',
  defaultTax: parseFloat(localStorage.getItem('pos.defaultTax') || '7'),
  receiptNote: localStorage.getItem('pos.receiptNote') || 'ขอบคุณที่อุดหนุน',
};

// -------------------- Data (ตัวอย่าง) --------------------
// ราคาทั้งหมดเก็บเป็นหน่วย "สตางค์" (integer) เพื่อหลีกเลี่ยงปัญหา floating point
const PRODUCTS = [
  { id:'CF001', name:'กาแฟร้อน',  price:5500, category:'เครื่องดื่ม',  popular:9, sku:'1001' },
  { id:'CF002', name:'กาแฟเย็น',  price:6500, category:'เครื่องดื่ม',  popular:10, sku:'1002' },
  { id:'TE001', name:'ชานม',       price:4500, category:'เครื่องดื่ม',  popular:7, sku:'2001' },
  { id:'FD001', name:'ครัวซองต์',  price:4000, category:'เบเกอรี่',     popular:8, sku:'3001' },
  { id:'FD002', name:'โดนัท',       price:3000, category:'เบเกอรี่',     popular:6, sku:'3002' },
  { id:'FD003', name:'แซนด์วิช',   price:5200, category:'อาหาร',        popular:5, sku:'4001' },
  { id:'FD004', name:'พายไก่',     price:5800, category:'อาหาร',        popular:6, sku:'4002' },
  { id:'OT001', name:'ถุงผ้า',     price:9900, category:'ของใช้',       popular:3, sku:'5001' },
];

// -------------------- State --------------------
const state = {
  cart: loadCart(),
  discountPercent: 0,
  discountFixed: 0,
  taxPercent: CONFIG.defaultTax || 0,
  customer: '',
  theme: localStorage.getItem('pos.theme') || 'dark',
  selectedRow: null, // ไว้สำหรับลบด้วยคีย์ลัด
};

// -------------------- Helpers --------------------
let fmt = new Intl.NumberFormat('th-TH', { style:'currency', currency: CONFIG.currency });
function money(cents){ return fmt.format((cents||0)/100); }
function toCents(value){
  if(value === '' || value == null || isNaN(value)) return 0;
  return Math.round(parseFloat(value)*100);
}
function uid(){
  return 'B' + Math.random().toString(36).slice(2,7).toUpperCase();
}
function saveCart(){ localStorage.setItem('pos.cart', JSON.stringify(state.cart)); }
function loadCart(){ try{ return JSON.parse(localStorage.getItem('pos.cart')) || []; } catch{ return []; } }
function saveSettings(){
  localStorage.setItem('pos.storeName', CONFIG.storeName);
  localStorage.setItem('pos.currency', CONFIG.currency);
  localStorage.setItem('pos.defaultTax', String(CONFIG.defaultTax));
  localStorage.setItem('pos.receiptNote', CONFIG.receiptNote);
}

// -------------------- DOM Refs --------------------
const els = {
  statusText: document.getElementById('statusText'),
  productGrid: document.getElementById('productGrid'),
  categorySelect: document.getElementById('categorySelect'),
  sortSelect: document.getElementById('sortSelect'),
  searchInput: document.getElementById('searchInput'),
  cartBody: document.getElementById('cartBody'),
  subTotalText: document.getElementById('subTotalText'),
  discountText: document.getElementById('discountText'),
  taxText: document.getElementById('taxText'),
  grandTotalText: document.getElementById('grandTotalText'),
  discountPercent: document.getElementById('discountPercent'),
  discountFixed: document.getElementById('discountFixed'),
  taxPercent: document.getElementById('taxPercent'),
  customerName: document.getElementById('customerName'),
  nowTime: document.getElementById('nowTime'),
  billId: document.getElementById('billId'),
  payBtn: document.getElementById('payBtn'),
  newSaleBtn: document.getElementById('newSaleBtn'),
  themeBtn: document.getElementById('themeBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  // dialogs
  settingsDialog: document.getElementById('settingsDialog'),
  storeNameInput: document.getElementById('storeNameInput'),
  currencyInput: document.getElementById('currencyInput'),
  defaultTaxInput: document.getElementById('defaultTaxInput'),
  receiptNoteInput: document.getElementById('receiptNoteInput'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),

  payDialog: document.getElementById('payDialog'),
  payGrand: document.getElementById('payGrand'),
  payGiven: document.getElementById('payGiven'),
  payChange: document.getElementById('payChange'),
  completePayBtn: document.getElementById('completePayBtn'),
  // receipt
  rStore: document.getElementById('rStore'),
  rBillId: document.getElementById('rBillId'),
  rDate: document.getElementById('rDate'),
  rCustomer: document.getElementById('rCustomer'),
  rBody: document.getElementById('rBody'),
  rSub: document.getElementById('rSub'),
  rDisc: document.getElementById('rDisc'),
  rTax: document.getElementById('rTax'),
  rGrand: document.getElementById('rGrand'),
  rNote: document.getElementById('rNote'),
};

// -------------------- Init --------------------
function init(){
  // theme
  document.documentElement.classList.toggle('light', state.theme === 'light');

  // mock bill id / time
  state.billId = uid();
  els.billId.textContent = 'บิล #: ' + state.billId;
  setInterval(()=>{
    const now = new Date();
    els.nowTime.textContent = now.toLocaleString('th-TH');
  }, 900);

  // load categories
  const cats = Array.from(new Set(PRODUCTS.map(p=>p.category))).sort();
  for(const c of cats){
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    els.categorySelect.appendChild(opt);
  }

  // wire events
  els.sortSelect.addEventListener('change', renderProducts);
  els.categorySelect.addEventListener('change', renderProducts);
  els.searchInput.addEventListener('input', renderProducts);
  els.searchInput.addEventListener('keydown', e => {
    if(e.key === 'Enter' && e.target.value.trim() !== ''){
      // หากพิมพ์ SKU/บาร์โค้ดตรงๆ แล้ว Enter ให้หยิบลงตะกร้า
      const txt = e.target.value.trim().toLowerCase();
      const found = PRODUCTS.find(p => p.id.toLowerCase() === txt || String(p.sku).toLowerCase() === txt);
      if(found){ addToCart(found.id); e.target.select(); }
    }
  });

  els.discountPercent.addEventListener('input', e=>{
    state.discountPercent = parseFloat(e.target.value || '0');
    renderCart();
  });
  els.discountFixed.addEventListener('input', e=>{
    state.discountFixed = toCents(e.target.value);
    renderCart();
  });
  els.taxPercent.addEventListener('input', e=>{
    state.taxPercent = parseFloat(e.target.value || '0');
    renderCart();
  });
  els.customerName.addEventListener('input', e=>{
    state.customer = e.target.value;
  });

  els.payBtn.addEventListener('click', openPay);
  els.newSaleBtn.addEventListener('click', newSale);
  els.themeBtn.addEventListener('click', ()=>{
    state.theme = (state.theme === 'dark') ? 'light' : 'dark';
    localStorage.setItem('pos.theme', state.theme);
    document.documentElement.classList.toggle('light', state.theme === 'light');
  });
  els.settingsBtn.addEventListener('click', openSettings);
  els.saveSettingsBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    CONFIG.storeName = els.storeNameInput.value || CONFIG.storeName;
    CONFIG.currency = (els.currencyInput.value || CONFIG.currency).toUpperCase().slice(0,3);
    CONFIG.defaultTax = parseFloat(els.defaultTaxInput.value || CONFIG.defaultTax || 0);
    CONFIG.receiptNote = els.receiptNoteInput.value || CONFIG.receiptNote;
    saveSettings();
    // re-init currency format
    fmt = new Intl.NumberFormat('th-TH', { style:'currency', currency: CONFIG.currency });
    els.settingsDialog.close();
    toast('บันทึกการตั้งค่าแล้ว');
  });

  // kbd shortcuts
  document.addEventListener('keydown', e=>{
    if(e.key === '/'){ e.preventDefault(); els.searchInput.focus(); els.searchInput.select(); }
    if(e.key === 'N' || e.key === 'n'){ newSale(); }
    if(e.key === 'P' || e.key === 'p'){ openPay(); }
    if(e.key === 'Delete' && state.selectedRow){ removeLine(state.selectedRow); }
  });

  // inputs default
  els.taxPercent.value = state.taxPercent;
  els.discountPercent.value = state.discountPercent;
  els.discountFixed.value = (state.discountFixed/100).toFixed(2);

  // settings defaults
  els.storeNameInput.value = CONFIG.storeName;
  els.currencyInput.value = CONFIG.currency;
  els.defaultTaxInput.value = CONFIG.defaultTax;
  els.receiptNoteInput.value = CONFIG.receiptNote;

  renderProducts();
  renderCart();

  toast('พร้อมใช้งาน');
}

// -------------------- UI: Products --------------------
function renderProducts(){
  const q = els.searchInput.value.trim().toLowerCase();
  const cat = els.categorySelect.value;
  const sort = els.sortSelect.value;

  let list = PRODUCTS.filter(p => {
    const passCat = !cat || p.category === cat;
    const passQ = !q || p.name.toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q) || String(p.sku).toLowerCase().includes(q);
    return passCat && passQ;
  });

  list.sort((a,b)=>{
    if(sort === 'name') return a.name.localeCompare(b.name, 'th');
    if(sort === 'price') return a.price - b.price;
    if(sort === 'popular') return b.popular - a.popular;
    return 0;
  });

  els.productGrid.innerHTML = '';
  for(const p of list){
    const card = document.createElement('button');
    card.className = 'product-card';
    card.type = 'button';
    card.setAttribute('role','listitem');
    card.innerHTML = `
      <div class="thumb" aria-hidden="true">${p.name[0] || '?'}</div>
      <div class="meta">
        <div>
          <div class="name">${p.name}</div>
          <div class="price">${money(p.price)}</div>
        </div>
        <div>
          <div class="badge">${p.category}</div>
        </div>
      </div>
      <div>
        <div class="btn primary">หยิบใส่ตะกร้า</div>
      </div>
    `;
    card.addEventListener('click', ()=> addToCart(p.id));
    els.productGrid.appendChild(card);
  }
}

// -------------------- UI: Cart --------------------
function renderCart(){
  els.cartBody.innerHTML = '';
  state.cart.forEach((item, idx)=>{
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td>
        <div class="name">${item.name}</div>
        <div class="muted">#${item.id}${item.sku ? ' · SKU ' + item.sku : ''}</div>
      </td>
      <td style="text-align:right">${money(item.price)}</td>
      <td class="qty">
        <span class="qtywrap">
          <button class="btn" data-act="dec" title="ลด">−</button>
          <input class="qtyInput" type="number" min="1" step="1" value="${item.qty}">
          <button class="btn" data-act="inc" title="เพิ่ม">+</button>
        </span>
      </td>
      <td style="text-align:right">${money(item.price * item.qty)}</td>
      <td style="text-align:right"><button class="btn danger" data-act="remove" title="ลบ">ลบ</button></td>
    `;
    tr.addEventListener('click', ()=>{
      state.selectedRow = idx;
      // highlight row
      [...els.cartBody.children].forEach(r => r.style.outline = '');
      tr.style.outline = '2px solid var(--ring)';
    });
    tr.addEventListener('change', e=>{
      if(e.target.classList.contains('qtyInput')){
        const v = parseInt(e.target.value || '1', 10);
        updateQty(idx, Math.max(1, v));
      }
    });
    tr.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const act = e.currentTarget.dataset.act;
        if(act === 'inc') updateQty(idx, state.cart[idx].qty + 1);
        if(act === 'dec') updateQty(idx, Math.max(1, state.cart[idx].qty - 1));
        if(act === 'remove') removeLine(idx);
      });
    });
    els.cartBody.appendChild(tr);
  });

  const calc = calcTotals();
  els.subTotalText.textContent = money(calc.subTotal);
  els.discountText.textContent = '−' + money(calc.discount);
  els.taxText.textContent = money(calc.tax);
  els.grandTotalText.textContent = money(calc.grand);

  saveCart();
}

function addToCart(id){
  const p = PRODUCTS.find(x => x.id === id);
  if(!p){ toast('ไม่พบสินค้า'); return; }
  const exist = state.cart.find(x => x.id === id);
  if(exist){ exist.qty += 1; }
  else { state.cart.push({...p, qty:1}); }
  renderCart();
  // scroll cart to bottom if overflow
  document.querySelector('.cart-table-wrap')?.scrollTo({ top: 99999, behavior: 'smooth' });
}

function updateQty(idx, qty){
  state.cart[idx].qty = qty;
  renderCart();
}
function removeLine(idx){
  state.cart.splice(idx, 1);
  state.selectedRow = null;
  renderCart();
}

function calcTotals(){
  const sub = state.cart.reduce((s,i)=> s + i.price * i.qty, 0);
  const discP = Math.round(sub * (Math.max(0, state.discountPercent)/100));
  const discF = Math.min(sub, Math.max(0, state.discountFixed|0));
  const discount = Math.min(sub, discP + discF);
  const base = sub - discount;
  const tax = Math.round(base * (Math.max(0, state.taxPercent)/100));
  const grand = base + tax;
  return { subTotal: sub, discount, tax, grand };
}

// -------------------- Payment --------------------
function openPay(){
  if(state.cart.length === 0){ toast('ยังไม่มีสินค้าในตะกร้า'); return; }
  const calc = calcTotals();
  els.payGrand.textContent = money(calc.grand);
  els.payGiven.value = '';
  els.payChange.textContent = money(0);

  // set method quick buttons
  document.querySelectorAll('.pay-methods .btn').forEach(btn => {
    btn.onclick = () => {
      const method = btn.dataset.method;
      els.payGiven.value = (calc.grand/100).toFixed(2);
      updateChange();
      toast('เลือกวิธีชำระ: ' + method);
    };
  });

  els.payGiven.oninput = updateChange;
  function updateChange(){
    const given = toCents(els.payGiven.value);
    const change = Math.max(0, given - calc.grand);
    els.payChange.textContent = money(change);
  }

  els.completePayBtn.onclick = (e)=>{
    e.preventDefault();
    printReceipt();
    // หลังพิมพ์ ให้เริ่มบิลใหม่
    newSale();
    els.payDialog.close();
  };

  els.payDialog.showModal();
}

function printReceipt(){
  const calc = calcTotals();
  els.rStore.textContent = CONFIG.storeName;
  els.rBillId.textContent = 'บิล #: ' + state.billId;
  els.rDate.textContent = new Date().toLocaleString('th-TH');
  els.rCustomer.textContent = 'ลูกค้า: ' + (state.customer || '-');
  els.rNote.textContent = CONFIG.receiptNote;
  els.rSub.textContent = money(calc.subTotal);
  els.rDisc.textContent = '−' + money(calc.discount);
  els.rTax.textContent = money(calc.tax);
  els.rGrand.textContent = money(calc.grand);

  els.rBody.innerHTML = '';
  state.cart.forEach(i => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i.name}</td><td>${i.qty}</td><td style="text-align:right">${money(i.price * i.qty)}</td>`;
    els.rBody.appendChild(tr);
  });

  window.print();
}

// -------------------- Settings --------------------
function openSettings(){
  els.storeNameInput.value = CONFIG.storeName;
  els.currencyInput.value = CONFIG.currency;
  els.defaultTaxInput.value = CONFIG.defaultTax;
  els.receiptNoteInput.value = CONFIG.receiptNote;
  els.settingsDialog.showModal();
}

// -------------------- Sale --------------------
function newSale(){
  state.cart = [];
  state.discountPercent = 0;
  state.discountFixed = 0;
  state.taxPercent = CONFIG.defaultTax || 0;
  state.customer = '';
  state.billId = uid();
  els.billId.textContent = 'บิล #: ' + state.billId;
  els.customerName.value = '';
  els.discountPercent.value = 0;
  els.discountFixed.value = '0.00';
  els.taxPercent.value = state.taxPercent;
  renderCart();
  toast('เริ่มบิลใหม่แล้ว');
}

// -------------------- Toast (เล็กๆ) --------------------
let toastTimer;
function toast(text){
  clearTimeout(toastTimer);
  els.statusText.textContent = text;
  els.statusText.style.opacity = '1';
  toastTimer = setTimeout(()=>{
    els.statusText.style.opacity = '.75';
  }, 1800);
}

// -------------------- Start --------------------
window.addEventListener('DOMContentLoaded', init);
