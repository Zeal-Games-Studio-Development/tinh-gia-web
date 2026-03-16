// ============================================================
// APP.JS — UI Logic & Rendering (v2.0)
// ============================================================

let currentResult = null;
let calcTimeout = null;

// ══════════════════════════════════════════════
// NUMBER INPUT FORMATTING (thousand separators)
// ══════════════════════════════════════════════
/** Parse a formatted string like "30.000" → 30000 */
function parseFmtNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.')) || 0;
}

/** Format a number into Vietnamese thousand-separator string: 30000 → "30.000" */
function fmtInput(n) {
  if (n == null || isNaN(n) || n === 0) return '0';
  // Handle decimals: only format the integer part
  const str = String(n);
  const parts = str.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.length > 1 ? intPart + ',' + parts[1] : intPart;
}

/** Setup live formatting for all inputs with data-fmt="number" */
function setupFmtInputs() {
  document.querySelectorAll('[data-fmt="number"]').forEach(el => {
    el.addEventListener('input', () => {
      const cursorPos = el.selectionStart;
      const oldLen = el.value.length;
      const raw = parseFmtNumber(el.value);
      if (raw === 0 && el.value === '') return; // allow empty
      const formatted = fmtInput(raw);
      el.value = formatted;
      // Adjust cursor position after formatting
      const newLen = formatted.length;
      const diff = newLen - oldLen;
      el.setSelectionRange(cursorPos + diff, cursorPos + diff);
    });
    el.addEventListener('focus', () => {
      // Select all on focus for easy overwrite
      setTimeout(() => el.select(), 50);
    });
  });
}

/** Set a formatted input's value programmatically */
function setFmtValue(id, num) {
  const el = document.getElementById(id);
  if (el && el.dataset.fmt === 'number') {
    el.value = fmtInput(num);
  } else if (el) {
    el.value = num;
  }
}

/** Get raw number from a formatted input */
function getFmtValue(id, fallback) {
  const el = document.getElementById(id);
  if (!el) return fallback || 0;
  if (el.dataset.fmt === 'number') {
    const v = parseFmtNumber(el.value);
    return v || fallback || 0;
  }
  return parseFloat(el.value) || fallback || 0;
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  renderHistory();
  setupAutoCalc();
  setupFmtInputs();
  updateStructurePreview();
  updateCylinderPreview();
  loadDisplayPreferences();

  // Validate order info on text input changes
  document.getElementById('customer').addEventListener('input', validateOrderInfo);
  document.getElementById('productName').addEventListener('input', validateOrderInfo);
  validateOrderInfo();
});

// ══════════════════════════════════════════════
// DISPLAY PREFERENCES (Theme, Layout, Density)
// ══════════════════════════════════════════════
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('lts_theme', newTheme);
  showToast(newTheme === 'dark' ? '🌙 Chế độ tối' : '☀️ Chế độ sáng', 'info');
}

function setLayout(layout) {
  document.documentElement.setAttribute('data-layout', layout);
  localStorage.setItem('lts_layout', layout);
  document.querySelectorAll('#layoutToolbar .toolbar-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.layout === layout)
  );
  if (layout === 'bento' && currentResult) {
    switchView('bento');
  } else if (layout !== 'bento') {
    const activeView = document.querySelector('.tab.active')?.dataset.view;
    if (activeView === 'bento') switchView('sale');
  }
}

function setDensity(density) {
  document.documentElement.setAttribute('data-density', density);
  localStorage.setItem('lts_density', density);
  document.querySelectorAll('#densityToolbar .toolbar-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.density === density)
  );
}

function toggleAdvanced() {
  const section = document.getElementById('advancedSection');
  const arrow = document.getElementById('advancedArrow');
  const isOpen = section.classList.toggle('open');
  arrow.classList.toggle('open', isOpen);
  localStorage.setItem('lts_advanced_open', isOpen ? '1' : '0');
}

function loadDisplayPreferences() {
  const theme = localStorage.getItem('lts_theme') || 'light';
  const layout = localStorage.getItem('lts_layout') || 'default';
  const density = localStorage.getItem('lts_density') || 'comfortable';

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-layout', layout);
  document.documentElement.setAttribute('data-density', density);

  document.querySelectorAll('#layoutToolbar .toolbar-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.layout === layout)
  );
  document.querySelectorAll('#densityToolbar .toolbar-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.density === density)
  );

  // Restore advanced panel state
  if (localStorage.getItem('lts_advanced_open') === '1') {
    document.getElementById('advancedSection')?.classList.add('open');
    document.getElementById('advancedArrow')?.classList.add('open');
  }
}

// ══════════════════════════════════════════════
// TOAST NOTIFICATION
// ══════════════════════════════════════════════
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4200);
}

// ══════════════════════════════════════════════
// PRODUCT TYPE HANDLERS
// ══════════════════════════════════════════════
function handleProductType() {
  const type = document.getElementById('productType').value;
  const bagGroup = document.getElementById('bagTypeGroup');
  const filmGroup = document.getElementById('filmTypeGroup');
  const structSection = document.getElementById('structureSection');

  // Reset sub-type selections
  document.getElementById('bagType').value = '';
  document.getElementById('filmType').value = '';

  // Show/hide sub-type dropdowns
  bagGroup.style.display = type === 'tui' ? 'block' : 'none';
  filmGroup.style.display = type === 'mang' ? 'block' : 'none';

  // Hide structure until sub-type is selected
  structSection.style.display = 'none';
  validateOrderInfo();
}

function handleSubType() {
  const type = document.getElementById('productType').value;
  const structSection = document.getElementById('structureSection');

  let subVal = '';
  if (type === 'tui') {
    subVal = document.getElementById('bagType').value;
  } else if (type === 'mang') {
    subVal = document.getElementById('filmType').value;
  }

  // Show structure section when a sub-type is selected
  if (subVal) {
    structSection.style.display = 'block';
    // Re-trigger auto-calc setup for newly visible elements
    setupAutoCalc();
  } else {
    structSection.style.display = 'none';
  }
  validateOrderInfo();
}

// ══════════════════════════════════════════════
// ORDER VALIDATION — enable/disable Tính Giá
// ══════════════════════════════════════════════
function isOrderInfoComplete() {
  const productType = document.getElementById('productType').value;

  if (!productType) return false;

  // Check sub-type based on product type
  if (productType === 'tui') {
    return !!document.getElementById('bagType').value;
  } else if (productType === 'mang') {
    return !!document.getElementById('filmType').value;
  }
  return false;
}

function validateOrderInfo() {
  const btn = document.getElementById('btnCalculate');
  if (!btn) return;
  const complete = isOrderInfoComplete();
  btn.disabled = !complete;
}

// ══════════════════════════════════════════════
// DROPDOWNS
// ══════════════════════════════════════════════
function populateDropdowns() {
  const l1 = document.getElementById('layer1');
  const l2 = document.getElementById('layer2');
  const l3 = document.getElementById('layer3');
  const l4 = document.getElementById('layer4');
  // IDs that should only appear in Layer 1 (outer/print layer)
  const layer1Only = ['BOPP18', 'BOPP20', 'BOPP30', 'MattBOPP20'];
  MATERIALS.forEach(m => {
    const opt = `<option value="${m.id}">${m.name}</option>`;
    l1.innerHTML += opt;
    if (!layer1Only.includes(m.id)) {
      l2.innerHTML += opt;
      l3.innerHTML += opt;
      l4.innerHTML += opt;
    }
  });
  l4.value = 'LLDPE';

  // Setup mic adjust listeners for each layer
  [1, 2, 3, 4].forEach(i => {
    const select = document.getElementById('layer' + i);
    select.addEventListener('change', () => handleLayerChange(i));
    handleLayerChange(i); // init
  });
}

function handleLayerChange(layerNum) {
  const select = document.getElementById('layer' + layerNum);
  const micAdjust = document.getElementById('micAdjust' + layerNum);
  const micInput = document.getElementById('micLayer' + layerNum);
  const val = select.value;
  const mat = val ? getMaterial(val) : null;

  if (mat && mat.adjustableMic) {
    micAdjust.style.display = 'block';
    micInput.value = mat.thickness;
  } else {
    micAdjust.style.display = 'none';
    if (micInput) micInput.value = '';
  }
}

// ══════════════════════════════════════════════
// AUTO CALCULATE
// ══════════════════════════════════════════════
function setupAutoCalc() {
  document.querySelectorAll('.calc-trigger').forEach(el => {
    const event = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
    el.addEventListener(event, () => {
      clearTimeout(calcTimeout);
      calcTimeout = setTimeout(() => {
        updateStructurePreview();
        updateCylinderPreview();
        doCalculate(true);
      }, 300);
    });
  });
  // Setup segmented option groups
  setupOptionGroups();
}

function setupOptionGroups() {
  document.querySelectorAll('.option-group').forEach(group => {
    group.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        clearTimeout(calcTimeout);
        calcTimeout = setTimeout(() => doCalculate(true), 100);
      });
    });
  });
}

// ══════════════════════════════════════════════
// STRUCTURE VISUAL PREVIEW
// ══════════════════════════════════════════════
function updateStructurePreview() {
  const layers = [1, 2, 3, 4].map(i => {
    const id = document.getElementById('layer' + i).value;
    const mat = id ? getMaterial(id) : null;
    const micInput = document.getElementById('micLayer' + i);
    const customMic = micInput && micInput.value ? parseInt(micInput.value) : null;
    return { mat, customMic, num: i };
  });

  const preview = document.getElementById('structurePreview');
  const activeLayers = layers.filter(l => l.mat);

  if (activeLayers.length === 0) {
    preview.innerHTML = '<div class="layer" style="background:linear-gradient(135deg,#94a3b8,#cbd5e1);opacity:0.35"><div class="layer-name">—</div><div class="layer-thickness">Chưa chọn lớp</div></div>';
    return;
  }

  preview.innerHTML = activeLayers.map(l => {
    const mic = (l.mat.adjustableMic && l.customMic) ? l.customMic : l.mat.thickness;
    return `<div class="layer"><div class="layer-name">${l.mat.name.split(' ')[0]}</div><div class="layer-thickness">${mic}mic</div></div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// VIEW SWITCH
// ══════════════════════════════════════════════
function switchView(view) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  const mainContainer = document.querySelector('.container');
  const configPage = document.getElementById('configPage');

  if (view === 'config') {
    // Hide main content, show config page
    if (mainContainer) mainContainer.style.display = 'none';
    if (configPage) { configPage.style.display = ''; renderMaterialPriceTable(); renderInkPriceTable(); populateCPSXInputs(); }
  } else {
    // Show main content, hide config page
    if (mainContainer) mainContainer.style.display = '';
    if (configPage) { configPage.style.display = 'none'; saveMaterialConfig(); }
    const panel = document.getElementById('panel-' + view);
    if (panel) panel.classList.add('active');
  }

  if (view === 'history') renderHistory();
  if (view === 'moq' && currentResult) renderMOQView(currentResult);
  if (view === 'bento' && currentResult) renderBentoView(currentResult);
}

// ══════════════════════════════════════════════
// INPUT GATHERING
// ══════════════════════════════════════════════
function gatherInput() {
  // Collect custom mic overrides
  const micOverrides = {};
  [1, 2, 3, 4].forEach(i => {
    const micInput = document.getElementById('micLayer' + i);
    if (micInput && micInput.value) {
      micOverrides['layer' + i] = parseInt(micInput.value);
    }
  });

  return {
    customer: document.getElementById('customer').value || 'N/A',
    productName: document.getElementById('productName').value || 'N/A',
    productType: document.getElementById('productType').value || '',
    bagType: document.getElementById('bagType').value || '',
    filmType: document.getElementById('filmType').value || '',
    quantity: getFmtValue('quantity', 30000),
    numColors: parseInt(document.getElementById('numColors').value) || 0,
    layer1Id: document.getElementById('layer1').value || null,
    layer2Id: document.getElementById('layer2').value || null,
    layer3Id: document.getElementById('layer3').value || null,
    layer4Id: document.getElementById('layer4').value || null,
    spreadWidth: parseFloat(document.getElementById('spreadWidth').value) || 0.53,
    cutStep: parseFloat(document.getElementById('cutStep').value) || 0.145,
    metallicSurcharge: (document.getElementById('hasNhu').checked ? CONSTANTS.nhuPrice : 0)
                     + (document.getElementById('hasMo').checked ? CONSTANTS.moPrice : 0),
    coverageRatio: (parseFloat(document.getElementById('coverage').value) || 100) / 100,
    handleWeight: parseFloat(document.getElementById('handleWeight').value) || 0,
    hasZipper: document.getElementById('hasZipper').checked,
    paymentDays: parseInt(document.querySelector('#paymentTermGroup .option-btn.active')?.dataset.value) || 30,
    paymentInterestRate: parseFloat(document.querySelector('#paymentTermGroup .option-btn.active')?.dataset.rate) || 0.0025,
    profitColumn: 2,
    commissionRate: document.getElementById('commissionUnit').value === 'percent'
      ? (parseFloat(document.getElementById('commission').value) || 0) / 100 : 0,
    commissionFixedVND: document.getElementById('commissionUnit').value === 'vnd'
      ? (parseFloat(document.getElementById('commission').value) || 0) : 0,
    commissionUnit: document.getElementById('commissionUnit').value,
    commissionInputValue: parseFloat(document.getElementById('commission').value) || 0,
    bagsPerBox: getFmtValue('bagsPerBox', 1000),
    boxPrice: getFmtValue('boxPrice', 18000),
    shippingPerKm: getFmtValue('shippingPerKm', 5000),
    shippingKm: parseInt(document.getElementById('shippingKm').value) || 200,
    cylLength: parseFloat(document.getElementById('cylLength').value) || 0.63,
    cylCircum: parseFloat(document.getElementById('cylCircum').value) || 0.4,
    cylUnitPrice: getFmtValue('cylUnitPrice', 7300000),
    micOverrides,
  };
}

// ══════════════════════════════════════════════
// CALCULATE
// ══════════════════════════════════════════════
function doCalculate(silent = false) {
  // Block calculation if order info is incomplete
  if (!isOrderInfoComplete()) {
    if (!silent) showToast('Vui lòng nhập đầy đủ Thông tin đơn hàng trước.', 'error');
    return;
  }
  const input = gatherInput();
  currentResult = calculate(input);
  if (!currentResult) {
    if (!silent) showToast('Vui lòng chọn đầy đủ lớp màng.', 'error');
    return;
  }

  document.getElementById('emptyState').style.display = 'none';
  renderSaleView(currentResult);
  renderManagerView(currentResult);
  renderTechView(currentResult);

  const activeTab = document.querySelector('.tab.active');
  const view = activeTab ? activeTab.dataset.view : 'sale';
  const layout = document.documentElement.getAttribute('data-layout');
  if (layout === 'bento') {
    renderBentoView(currentResult);
    switchView('bento');
  } else if (view === 'moq') {
    renderMOQView(currentResult);
    switchView(view);
  } else if (view === 'history') {
    switchView('sale');
  } else {
    switchView(view);
  }

  if (!silent) {
    saveHistory({
      customer: input.customer,
      productName: input.productName,
      structure: currentResult.structureText,
      quantity: input.quantity,
      finalPrice: currentResult.finalPrice,
      input: input,
    });
    showToast(`Giá đề xuất: ${fmt(currentResult.finalPrice, 0)} đ/túi`, 'success');
  }
}

// ══════════════════════════════════════════════
// SALE VIEW RENDER
// ══════════════════════════════════════════════
function renderSaleView(r) {
  document.getElementById('s-price').textContent = fmt(r.finalPrice, 0);
  document.getElementById('s-structure').textContent = `${r.input.customer} — ${r.input.productName} | ${r.structureText} | SL: ${fmt(r.input.quantity)}`;

  document.getElementById('s-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-label">Giá vốn+LN/túi</div><div class="stat-value">${fmt(r.costPerUnit,1)}</div></div>
    <div class="stat-card green"><div class="stat-label">Tỉ lệ LN</div><div class="stat-value">${fmtPercent(r.profitRate)}</div></div>
    <div class="stat-card cyan"><div class="stat-label">Doanh thu túi</div><div class="stat-value">${fmt(r.revenue/1000000,1)}tr</div></div>
    <div class="stat-card orange"><div class="stat-label">Trục in</div><div class="stat-value">${fmt(r.cylinderCost/1000000,1)}tr</div></div>
  `;

  const items = [
    ['Giá vốn + LN', fmt(r.costPerUnit, 1)],
    ['Zipper', fmt(r.zipperPerUnit, 1)],
    ['Thùng giấy', fmt(r.boxPerUnit, 1)],
    ['Vận chuyển', fmt(r.shippingPerUnit, 1)],
    ['Lãi vay (' + fmtPercent(r.interestRate30) + ')', fmt(r.interestPerUnit, 1)],
    ['Hoa hồng', fmt(r.commissionPerUnit, 1)],
  ];
  document.getElementById('s-breakdown').innerHTML = items.map(([l, v]) =>
    `<li><span class="bl-label">${l}</span><span class="bl-value">${v} đ</span></li>`
  ).join('') + `<li class="bl-total"><span class="bl-label">GIÁ ĐỀ XUẤT / TÚI</span><span class="bl-value">${fmt(r.finalPrice, 0)} đ</span></li>`;

  document.getElementById('s-order-info').innerHTML = [
    ['Khách hàng', r.input.customer],
    ['Sản phẩm', r.input.productName],
    ['Cấu trúc', r.structureText],
    ['Số lượng', fmt(r.input.quantity) + ' túi'],
    ['Kích thước túi', `${+(r.input.spreadWidth*100).toFixed(1)}cm × ${+(r.input.cutStep*100).toFixed(1)}cm`],
    ['Diện tích túi', fmtM2(r.bagArea)],
    ['Trọng lượng', fmt(r.tareWeight, 2) + ' gr/cái'],
    ['Thời gian SX', r.productionDays + ' ngày'],
    ['Độ dầy', r.totalThickness + ' mic'],
  ].map(([l, v]) => `<li><span class="bl-label">${l}</span><span class="bl-value">${v}</span></li>`).join('');

  analyzeChotGia();
  updateCommissionHint();
  updateCylinderPreview();
}

// ══════════════════════════════════════════════
// COMMISSION HINT — Show conversion between % ↔ VND
// ══════════════════════════════════════════════
function updateCommissionHint() {
  const hint = document.getElementById('commissionHint');
  if (!currentResult || !hint) { if (hint) hint.textContent = ''; return; }

  const unit = document.getElementById('commissionUnit').value;
  const val = parseFloat(document.getElementById('commission').value) || 0;
  if (val === 0) { hint.textContent = ''; return; }

  const r = currentResult;
  if (unit === 'percent') {
    // Input is %, show equivalent VND/túi
    const vndPerUnit = (val / 100) * r.costPerUnit;
    hint.textContent = `= ${fmt(vndPerUnit, 1)} đ/túi`;
  } else {
    // Input is VND, show equivalent %
    const pct = r.costPerUnit > 0 ? (val / r.costPerUnit * 100) : 0;
    hint.textContent = `= ${pct.toFixed(2)}% (trên giá vốn+LN)`;
  }
}

// ══════════════════════════════════════════════
// CYLINDER PREVIEW — live cost preview
// ══════════════════════════════════════════════
function updateCylinderPreview() {
  const el = document.getElementById('cylinderPreview');
  if (!el) return;
  const L = parseFloat(document.getElementById('cylLength').value) || 0;
  const C = parseFloat(document.getElementById('cylCircum').value) || 0;
  const P = getFmtValue('cylUnitPrice', 7300000);
  const numColors = parseInt(document.getElementById('numColors').value) || 4;
  const area = L * C;
  const perCyl = area * P;
  const total = perCyl * numColors;
  el.innerHTML = `DT: <span class="cyl-val">${(area).toFixed(4)} m²</span> · `
    + `1 trục: <span class="cyl-val">${fmt(perCyl, 0)} đ</span> · `
    + `Cả bộ (${numColors} màu): <span class="cyl-val">${fmt(total, 0)} đ</span>`;
}

// ══════════════════════════════════════════════
// MANAGER VIEW RENDER
// ══════════════════════════════════════════════
function renderManagerView(r) {
  const total = r.totalProductionCost;
  document.getElementById('m-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-label">Tổng Giá Vốn SX</div><div class="stat-value">${fmt(total/1000000,2)}tr</div></div>
    <div class="stat-card green"><div class="stat-label">Lợi Nhuận</div><div class="stat-value">${fmt(r.profitAmount/1000000,2)}tr (${fmtPercent(r.profitRate)})</div></div>
    <div class="stat-card cyan"><div class="stat-label">Doanh Thu</div><div class="stat-value">${fmt(r.revenue/1000000,2)}tr</div></div>
    <div class="stat-card orange"><div class="stat-label">Giá Bán/Túi</div><div class="stat-value">${fmt(r.finalPrice,0)}đ</div></div>
    <div class="stat-card pink"><div class="stat-label">Trục In (riêng)</div><div class="stat-value">${fmt(r.cylinderCost/1000000,1)}tr</div></div>
  `;

  const pIn = r.printTotalCost / total * 100;
  const pLam = r.totalLamCost / total * 100;
  const pCut = r.cutTotalCost / total * 100;
  document.getElementById('m-costbar').innerHTML = `
    <div class="segment seg-print" style="width:${pIn}%">${pIn.toFixed(0)}%</div>
    <div class="segment seg-lam" style="width:${pLam}%">${pLam.toFixed(0)}%</div>
    <div class="segment seg-cut" style="width:${pCut}%">${pCut.toFixed(0)}%</div>
  `;
  document.getElementById('m-legend').innerHTML = `
    <div class="legend-item"><div class="dot" style="background:var(--accent)"></div>In: ${fmt(r.printTotalCost/1000000,2)}tr</div>
    <div class="legend-item"><div class="dot" style="background:var(--accent2)"></div>Ghép: ${fmt(r.totalLamCost/1000000,2)}tr</div>
    <div class="legend-item"><div class="dot" style="background:var(--orange)"></div>Cắt: ${fmt(r.cutTotalCost/1000000,2)}tr</div>
  `;

  const rows = [
    ['CPSX IN', r.layers.print.material.name, fmt(r.printCostCPSX), fmt(r.printCostMaterial), fmt(r.printTotalCost)],
  ];
  if (r.layers.lam1) rows.push(['GHÉP L1 (Lớp 4)', r.layers.lam1.material.name, fmt(r.lam1CostCPSX), fmt(r.lam1CostMaterial), fmt(r.lam1TotalCost)]);
  if (r.layers.lam2) rows.push(['GHÉP L2 (Lớp 3)', r.layers.lam2.material.name, fmt(r.lam2CostCPSX), fmt(r.lam2CostMaterial), fmt(r.lam2TotalCost)]);
  if (r.layers.lam3) rows.push(['GHÉP L3 (Lớp 2)', r.layers.lam3.material.name, fmt(r.lam3CostCPSX), fmt(r.lam3CostMaterial), fmt(r.lam3TotalCost)]);
  rows.push(['CPSX CẮT', '—', fmt(r.cutCostCPSX), '0', fmt(r.cutTotalCost)]);

  document.getElementById('m-cost-table').innerHTML = `
    <tr><th>Công đoạn</th><th>Màng</th><th class="num">Chi phí SX</th><th class="num">Chi phí Màng</th><th class="num">Tổng</th></tr>
    ${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td class="num highlight">${r[4]}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="4">TỔNG GIÁ VỐN SẢN XUẤT</td><td class="num">${fmt(total)}</td></tr>
  `;

  document.getElementById('m-profit').innerHTML = [
    ['Tổng giá vốn SX', fmtVND(total)],
    ['Tỷ lệ LN (' + (r.input.profitColumn === 1 ? 'Túi thường' : 'Túi phức tạp') + ')', fmtPercent(r.profitRate)],
    ['Số tiền LN', fmtVND(r.profitAmount)],
    ['Doanh thu (GV + LN)', fmtVND(r.revenue)],
    ['Giá vốn+LN / túi', fmtVND(r.costPerUnit)],
  ].map(([l, v]) => `<li><span class="bl-label">${l}</span><span class="bl-value">${v}</span></li>`).join('')
    + `<li class="bl-total"><span class="bl-label">GIÁ BÁN / TÚI</span><span class="bl-value">${fmtVND(r.finalPrice)}</span></li>`;

  document.getElementById('m-extra-table').innerHTML = `
    <tr><th>Hạng mục</th><th>ĐVT</th><th class="num">Đơn giá</th><th class="num">SL</th><th class="num">Thành tiền</th><th class="num">Đ/Túi</th></tr>
    <tr><td>Trục in</td><td>bộ</td><td class="num">${fmt(r.cylinderCost)}</td><td class="num">1</td><td class="num">${fmt(r.cylinderCost)}</td><td class="num" style="color:var(--dim)">riêng</td></tr>
    <tr><td>Zipper</td><td>m</td><td class="num">${r.input.hasZipper ? CONSTANTS.zipperPrice : 0}</td><td class="num">${r.input.hasZipper ? fmt(r.cutMeters + r.cutWaste, 0) : 0}</td><td class="num">${fmt(r.zipperTotal)}</td><td class="num">${fmt(r.zipperPerUnit,1)}</td></tr>
    <tr><td>Thùng giấy <span style="color:var(--dim);font-size:0.75rem">(${fmt(r.actualBagsPerBox)} túi/thùng)</span></td><td>thùng</td><td class="num">${fmt(r.actualBoxPrice)}</td><td class="num">${fmt(r.numBoxes,0)}</td><td class="num">${fmt(r.boxTotal)}</td><td class="num">${fmt(r.boxPerUnit,1)}</td></tr>
    <tr><td>Vận chuyển <span style="color:var(--dim);font-size:0.75rem">(${fmt(r.actualShippingPerKm)}đ/km × ${fmt(r.actualShippingKm)}km)</span></td><td>tấn</td><td class="num">${fmt(r.shippingRate)}</td><td class="num">${fmt(r.tareWeight * r.input.quantity / 1000000, 3)}</td><td class="num">${fmt(r.shippingTotal)}</td><td class="num">${fmt(r.shippingPerUnit,1)}</td></tr>
    <tr><td>Lãi vay (${r.paymentDays} ngày)</td><td>—</td><td class="num">${fmtPercent(r.interestRate30)}</td><td class="num">—</td><td class="num">${fmt(r.interestPerUnit * r.input.quantity)}</td><td class="num">${fmt(r.interestPerUnit,1)}</td></tr>
    <tr><td>Hoa hồng</td><td>—</td><td class="num">${fmtPercent(r.input.commissionRate)}</td><td class="num">—</td><td class="num">${fmt(r.commissionPerUnit * r.input.quantity)}</td><td class="num">${fmt(r.commissionPerUnit,1)}</td></tr>
  `;
}

// ══════════════════════════════════════════════
// TECH VIEW RENDER
// ══════════════════════════════════════════════
function renderTechView(r) {
  document.getElementById('t-structure').textContent = r.structureText;

  document.getElementById('t-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-label">Đầu Vào Khâu In</div><div class="stat-value">${fmt(r.printMeters + r.printWaste, 0)} m</div></div>
    <div class="stat-card cyan"><div class="stat-label">Đầu Vào Khâu Cắt</div><div class="stat-value">${fmt(r.cutMeters + r.cutWaste, 0)} m</div></div>
    <div class="stat-card green"><div class="stat-label">Khổ Thành Phẩm</div><div class="stat-value">${fmt(r.printWidth*100, 1)} cm</div></div>
    <div class="stat-card orange"><div class="stat-label">Khổ Màng NL</div><div class="stat-value">${fmt(r.printNLWidth*100, 1)} cm</div></div>
    <div class="stat-card pink"><div class="stat-label">Ngày SX</div><div class="stat-value">${r.productionDays}</div></div>
  `;

  // ── Bảng gộp: Chi tiết sản xuất & nguyên liệu ──
  const uniRows = [];
  // Helper: build a unified row [công đoạn, vật liệu, khổ(m), thành phẩm(m), phi hao, đầu vào VL, CPSX, thành tiền CPSX, chi phí VL (đ/m²), thành tiền CPVL]
  let totalCPSX = 0, totalCPVL = 0;

  // CPSX IN (Lớp 1 - print)
  const printInput = r.printMeters + r.printWaste;
  totalCPSX += r.printCostCPSX;
  totalCPVL += r.printCostMaterial;
  uniRows.push({
    stage: 'CPSX IN', mat: r.layers.print.material.name,
    width: r.printNLWidth, meters: r.printMeters, waste: r.printWaste,
    input: printInput, cpsx: r.printCPSX, costCPSX: r.printCostCPSX,
    matPrice: r.layers.print.material.pricePerM2, costMat: r.printCostMaterial
  });

  // GHÉP L3 (Lớp 2)
  if (r.layers.lam3) {
    const lamInput = r.lam3Meters + r.lam3Waste;
    totalCPSX += r.lam3CostCPSX;
    totalCPVL += r.lam3CostMaterial;
    uniRows.push({
      stage: 'GHÉP L3 (Lớp 2)', mat: r.layers.lam3.material.name,
      width: r.lam3Width, meters: r.lam3Meters, waste: r.lam3Waste,
      input: lamInput, cpsx: CONSTANTS.ghepCPSX, costCPSX: r.lam3CostCPSX,
      matPrice: r.layers.lam3.material.pricePerM2, costMat: r.lam3CostMaterial
    });
  }

  // GHÉP L2 (Lớp 3)
  if (r.layers.lam2) {
    const lamInput = r.lam2Meters + r.lam2Waste;
    totalCPSX += r.lam2CostCPSX;
    totalCPVL += r.lam2CostMaterial;
    uniRows.push({
      stage: 'GHÉP L2 (Lớp 3)', mat: r.layers.lam2.material.name,
      width: r.lam2Width, meters: r.lam2Meters, waste: r.lam2Waste,
      input: lamInput, cpsx: CONSTANTS.ghepCPSX, costCPSX: r.lam2CostCPSX,
      matPrice: r.layers.lam2.material.pricePerM2, costMat: r.lam2CostMaterial
    });
  }

  // GHÉP L1 (Lớp 4)
  if (r.layers.lam1) {
    const lamInput = r.lam1Meters + r.lam1Waste;
    totalCPSX += r.lam1CostCPSX;
    totalCPVL += r.lam1CostMaterial;
    uniRows.push({
      stage: 'GHÉP L1 (Lớp 4)', mat: r.layers.lam1.material.name,
      width: r.lam1Width, meters: r.lam1Meters, waste: r.lam1Waste,
      input: lamInput, cpsx: CONSTANTS.ghepCPSX, costCPSX: r.lam1CostCPSX,
      matPrice: r.layers.lam1.material.pricePerM2, costMat: r.lam1CostMaterial
    });
  }

  // CẮT
  const cutInput = r.cutMeters + r.cutWaste;
  totalCPSX += r.cutCostCPSX;
  uniRows.push({
    stage: 'CẮT', mat: '—',
    width: r.cutWidth, meters: r.cutMeters, waste: r.cutWaste,
    input: cutInput, cpsx: r.cutCPSX, costCPSX: r.cutCostCPSX,
    matPrice: null, costMat: null
  });

  const uniHeader = `<tr>
    <th>Công đoạn</th><th>Vật liệu</th>
    <th class="num">Khổ (m)</th><th class="num">Thành phẩm (m)</th><th class="num">Phi hao</th><th class="num">Đầu vào VL</th>
    <th class="num">CPSX (đ/m²)</th><th class="num">Thành tiền CPSX</th>
    <th class="num">CP vật liệu (đ/m²)</th><th class="num">Thành tiền CPVL</th>
  </tr>`;

  const uniBody = uniRows.map(row => `<tr>
    <td>${row.stage}</td><td>${row.mat}</td>
    <td class="num">${fmt(row.width, 2)}</td>
    <td class="num">${fmt(row.meters, 0)}</td>
    <td class="num">${fmt(row.waste, 0)}</td>
    <td class="num highlight">${fmt(row.input, 0)}</td>
    <td class="num">${fmt(row.cpsx, 0)}</td>
    <td class="num">${fmt(row.costCPSX, 0)}</td>
    <td class="num">${row.matPrice != null ? fmt(row.matPrice, 1) : '—'}</td>
    <td class="num">${row.costMat != null ? fmt(row.costMat, 0) : '—'}</td>
  </tr>`).join('');

  const grandTotal = totalCPSX + totalCPVL;
  const uniFooter = `
    <tr class="total-row">
      <td colspan="7">TỔNG</td>
      <td class="num">${fmt(totalCPSX, 0)}</td>
      <td class="num"></td>
      <td class="num">${fmt(totalCPVL, 0)}</td>
    </tr>
    <tr class="total-row" style="font-size:1.05em">
      <td colspan="7"><strong>TỔNG GIÁ VỐN SẢN XUẤT</strong></td>
      <td colspan="3" class="num" style="color:var(--accent);font-weight:800">${fmt(grandTotal, 0)} đ</td>
    </tr>`;

  document.getElementById('t-unified-table').innerHTML = uniHeader + uniBody + uniFooter;

  document.getElementById('t-weight').innerHTML = [
    ['Diện tích 1 túi', fmtM2(r.bagArea)],
    ['Tổng diện tích đơn hàng', fmt(r.totalArea, 1) + ' m²'],
    ['Trọng lượng / túi (Tare)', fmt(r.tareWeight, 2) + ' gr'],
    ['Tổng trọng lượng', fmt(r.tareWeight * r.input.quantity / 1000, 1) + ' kg'],
    ['Trọng lượng (tấn)', fmt(r.tareWeight * r.input.quantity / 1000000, 3) + ' tấn'],
    ['Kích thước túi', `R${+(r.input.spreadWidth*1000).toFixed(0)} × D${+(r.input.cutStep*1000).toFixed(0)} mm`],
    ['Giá trục in (bộ)', fmtVND(r.cylinderCost)],
  ].map(([l, v]) => `<li><span class="bl-label">${l}</span><span class="bl-value">${v}</span></li>`).join('');
}

// ══════════════════════════════════════════════
// MOQ VIEW RENDER
// ══════════════════════════════════════════════
function renderMOQView(r) {
  const baseInput = gatherInput();
  const currentQty = baseInput.quantity;
  const moqLevels = [5000, 10000, 15000, 20000, 30000, 40000, 50000, 70000, 100000, 150000, 200000];

  if (!moqLevels.includes(currentQty)) {
    moqLevels.push(currentQty);
    moqLevels.sort((a, b) => a - b);
  }

  // Detect active layers from the current result for column headers
  const matCols = [];
  if (r.layers.print) matCols.push({ key: 'print', name: r.layers.print.material.name.split(' ')[0] });
  if (r.layers.lam3) matCols.push({ key: 'lam3', name: r.layers.lam3.material.name.split(' ')[0] });
  if (r.layers.lam2) matCols.push({ key: 'lam2', name: r.layers.lam2.material.name.split(' ')[0] });
  if (r.layers.lam1) matCols.push({ key: 'lam1', name: r.layers.lam1.material.name.split(' ')[0] });

  const getLayerMeters = (res, key) => {
    const layer = res.layers[key];
    if (!layer) return 0;
    return layer.meters + layer.waste;
  };

  let rows = '';
  let results = [];
  moqLevels.forEach(qty => {
    const inp = { ...baseInput, quantity: qty };
    const res = calculate(inp);
    if (!res) return;
    const isCurrent = qty === currentQty;
    results.push({ qty, res, isCurrent });

    const matCells = matCols.map(col =>
      `<td>${fmt(getLayerMeters(res, col.key), 0)}</td>`
    ).join('');

    rows += `
      <tr class="${isCurrent ? 'moq-highlight' : ''}">
        <td style="font-weight:${isCurrent ? '700' : '400'}">${fmt(qty)}</td>
        <td>${fmtPercent(res.profitRate)}</td>
        <td>${fmt(res.costPerUnit, 1)}</td>
        <td style="font-weight:700;color:${isCurrent ? 'var(--accent)' : 'inherit'}">${fmt(res.finalPrice, 0)}</td>
        <td>${fmt(res.finalPrice * qty / 1000000, 2)}tr</td>
        <td>${res.productionDays} ngày</td>
        ${matCells}
      </tr>
    `;
  });

  const matHeaders = matCols.map(col => `<th>${col.name} (m)</th>`).join('');

  document.getElementById('moq-table').innerHTML = `
    <tr><th>Số lượng</th><th>LN %</th><th>Giá vốn+LN/túi</th><th>Giá đề xuất</th><th>Tổng DT</th><th>TGSX</th>${matHeaders}</tr>
    ${rows}
  `;

  // Render roll-based MOQ table
  renderRollMOQ(r, baseInput, matCols, getLayerMeters);
}

// ══════════════════════════════════════════════
// MOQ THEO CUỘN MÀNG
// ══════════════════════════════════════════════
function renderRollMOQ(r, baseInput, matCols, getLayerMeters) {
  const printMat = r.layers.print.material;
  const rollLen = printMat.rollLength || 6000;
  const printName = printMat.name.split(' ')[0];

  // Estimate bags per meter of print film from current result
  const totalPrintMeters = r.printMeters + r.printWaste;
  const currentQty = baseInput.quantity;
  const metersPerBag = totalPrintMeters / currentQty;

  // Build roll-based quantities (1 to 6 rolls of print layer)
  const rollLevels = [1, 2, 3, 4, 5, 6];

  // Build columns for other layers (non-print) showing meters + kg
  const otherLayers = matCols.filter(c => c.key !== 'print');

  // Helper: compute kg from meters for a given layer
  const calcKg = (layerMat, meters, width) => {
    if (!layerMat) return 0;
    // kg = meters × width(m) × thickness(mic)/1e6(→m) × density(g/cm³)×1000(→kg/m³)
    // simplified: meters × width × thickness × density / 1000
    return meters * width * layerMat.thickness * layerMat.density / 1000;
  };

  let rows = '';
  rollLevels.forEach(numRolls => {
    const availableMeters = numRolls * rollLen;
    // Estimate quantity from available print meters
    const estQty = Math.round(availableMeters / metersPerBag / 100) * 100;
    if (estQty <= 0) return;

    const inp = { ...baseInput, quantity: estQty };
    const res = calculate(inp);
    if (!res) return;

    const isCurrent = numRolls === Math.ceil(totalPrintMeters / rollLen);

    // Build cells for other layers: meters + kg
    const otherCells = otherLayers.map(col => {
      const layerMeters = getLayerMeters(res, col.key);
      const layerMat = res.layers[col.key]?.material;
      const layerWidth = res.layers[col.key]?.width || 0;
      const kg = calcKg(layerMat, layerMeters, layerWidth);
      return `<td>${fmt(layerMeters, 0)} m<br><span style="font-size:0.72rem;color:var(--dim)">${fmt(kg, 1)} kg</span></td>`;
    }).join('');

    rows += `
      <tr class="${isCurrent ? 'moq-highlight' : ''}">
        <td style="font-weight:${isCurrent ? '700' : '400'}">${numRolls} cuộn<br><span style="font-size:0.72rem;color:var(--dim)">${fmt(numRolls * rollLen, 0)}m</span></td>
        <td style="font-weight:${isCurrent ? '700' : '400'}">${fmt(estQty)}</td>
        <td>${res.productionDays} ngày</td>
        ${otherCells}
        <td style="font-weight:700;color:${isCurrent ? 'var(--accent)' : 'inherit'}">${fmt(res.finalPrice, 0)}</td>
        <td>${fmt(res.finalPrice * estQty / 1000000, 2)}tr</td>
      </tr>
    `;
  });

  const otherHeaders = otherLayers.map(col => `<th>${col.name}</th>`).join('');

  document.getElementById('moq-roll-table').innerHTML = `
    <tr><th>${printName} (cuộn)</th><th>SL túi</th><th>TGSX</th>${otherHeaders}<th>Giá đề xuất</th><th>Tổng DT</th></tr>
    ${rows}
  `;
}

// ══════════════════════════════════════════════
// BENTO VIEW RENDER (Creative Dashboard)
// ══════════════════════════════════════════════
function renderBentoView(r) {
  const total = r.totalProductionCost;
  const pIn = r.printTotalCost / total * 100;
  const pLam = r.totalLamCost / total * 100;
  const pCut = r.cutTotalCost / total * 100;

  // Donut chart SVG
  const radius = 60;
  const circum = 2 * Math.PI * radius;
  const seg1 = circum * pIn / 100;
  const seg2 = circum * pLam / 100;
  const seg3 = circum * pCut / 100;
  const offset1 = 0;
  const offset2 = seg1;
  const offset3 = seg1 + seg2;

  // Layer blocks
  const l1 = r.layers.print.material;
  const l2 = r.layers.lam3 ? r.layers.lam3.material : null;
  const l3 = r.layers.lam2 ? r.layers.lam2.material : null;
  const l4 = r.layers.lam1 ? r.layers.lam1.material : null;

  const makeBlock = (mat) => {
    if (mat) {
      return `<div class="bento-layer-block"><div class="bento-layer-name">${mat.name.split(' ')[0]}</div><div class="bento-layer-thick">${mat.thickness}mic</div><div class="bento-layer-price">${fmt(mat.pricePerM2,0)} đ/m²</div></div>`;
    } else {
      return `<div class="bento-layer-block" style="background:linear-gradient(180deg,#94a3b8,#64748b);opacity:0.4"><div class="bento-layer-name">—</div><div class="bento-layer-thick">Không dùng</div></div>`;
    }
  };
  const layerBlocks = [l1, l2, l3, l4].filter(Boolean).map(mat => makeBlock(mat)).join('');

  // Price breakdown items for bar chart
  const breakdownItems = [
    { label: 'Giá vốn+LN', value: r.costPerUnit, color: 'var(--accent)' },
    { label: 'Zipper', value: r.zipperPerUnit, color: 'var(--accent2)' },
    { label: 'Thùng', value: r.boxPerUnit, color: 'var(--green)' },
    { label: 'Vận chuyển', value: r.shippingPerUnit, color: 'var(--orange)' },
    { label: 'Lãi vay', value: r.interestPerUnit, color: 'var(--pink)' },
    { label: 'Hoa hồng', value: r.commissionPerUnit, color: 'var(--red)' },
  ];
  const maxVal = Math.max(...breakdownItems.map(i => i.value), 1);

  const barsHTML = breakdownItems.map(item => `
    <div class="bento-bar-row">
      <div class="bento-bar-label">${item.label}</div>
      <div class="bento-bar-track">
        <div class="bento-bar-fill" style="width:${Math.max(item.value / maxVal * 100, 3)}%;background:${item.color}">${fmt(item.value,1)}</div>
      </div>
      <div class="bento-bar-amount">${fmt(item.value,1)} đ</div>
    </div>
  `).join('');

  document.getElementById('bentoGrid').innerHTML = `
    <div class="bento">

      <!-- HERO: Giá chính -->
      <div class="bento-tile bento-hero">
        <div class="bento-hero-label">Giá Đề Xuất / Túi</div>
        <div class="bento-hero-price">${fmt(r.finalPrice, 0)} <span style="font-size:0.35em;opacity:0.7">đ</span></div>
        <div class="bento-hero-unit">chưa VAT · ${r.structureText}</div>
        <div class="bento-hero-sub">${r.input.customer} — ${r.input.productName} · SL: ${fmt(r.input.quantity)} túi · ${r.productionDays} ngày SX</div>
      </div>

      <!-- ROW 2: Metrics -->
      <div class="bento-tile bento-metric bento-accent">
        <div class="bento-metric-label">Giá Vốn + LN / Túi</div>
        <div class="bento-metric-value">${fmt(r.costPerUnit, 1)}</div>
        <div class="bento-metric-sub">đồng / túi</div>
      </div>
      <div class="bento-tile bento-metric bento-green">
        <div class="bento-metric-label">Tỉ Lệ Lợi Nhuận</div>
        <div class="bento-metric-value">${fmtPercent(r.profitRate)}</div>
        <div class="bento-metric-sub">${r.input.profitColumn === 1 ? 'Túi thường' : 'Túi phức tạp'}</div>
      </div>
      <div class="bento-tile bento-metric bento-cyan">
        <div class="bento-metric-label">Doanh thu túi</div>
        <div class="bento-metric-value">${fmt(r.revenue / 1000000, 1)}<span style="font-size:0.5em;opacity:0.7">tr</span></div>
        <div class="bento-metric-sub">${fmt(r.revenue)} đ</div>
      </div>

      <!-- ROW 3: Structure + Donut -->
      <div class="bento-tile bento-structure">
        <div class="bento-section-title">🏗️ Cấu Trúc Màng · ${r.totalThickness} mic</div>
        <div class="bento-layers">${layerBlocks}</div>
        <div class="bento-struct-info">
          <div><span class="bsi-label">Kích thước</span><span class="bsi-value">${+(r.input.spreadWidth*100).toFixed(1)}×${+(r.input.cutStep*100).toFixed(1)}cm</span></div>
          <div><span class="bsi-label">Diện tích</span><span class="bsi-value">${fmtM2(r.bagArea)}</span></div>
          <div><span class="bsi-label">Trọng lượng</span><span class="bsi-value">${fmt(r.tareWeight, 2)} gr</span></div>
          <div><span class="bsi-label">Thời gian SX</span><span class="bsi-value">${r.productionDays} ngày</span></div>
          <div><span class="bsi-label">Đầu vào khâu in</span><span class="bsi-value">${fmt(r.printMeters + r.printWaste, 0)} m</span></div>
          <div><span class="bsi-label">Đầu vào khâu cắt</span><span class="bsi-value">${fmt(r.cutMeters + r.cutWaste, 0)} m</span></div>
        </div>
      </div>

      <div class="bento-tile bento-donut">
        <div class="bento-section-title">📊 Cơ Cấu Giá Vốn SX</div>
        <div class="donut-wrap">
          <svg viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="16"
              stroke-dasharray="${seg1} ${circum - seg1}" stroke-dashoffset="-${offset1}" stroke-linecap="round" />
            <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--accent2)" stroke-width="16"
              stroke-dasharray="${seg2} ${circum - seg2}" stroke-dashoffset="-${offset2}" />
            <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--orange)" stroke-width="16"
              stroke-dasharray="${seg3} ${circum - seg3}" stroke-dashoffset="-${offset3}" />
          </svg>
          <div class="donut-center">
            <div class="donut-center-val">${fmt(total / 1000000, 1)}tr</div>
            <div class="donut-center-label">Tổng GV</div>
          </div>
        </div>
        <div class="donut-legend">
          <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--accent)"></div>In ${pIn.toFixed(0)}%</div>
          <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--accent2)"></div>Ghép ${pLam.toFixed(0)}%</div>
          <div class="donut-legend-item"><div class="donut-legend-dot" style="background:var(--orange)"></div>Cắt ${pCut.toFixed(0)}%</div>
        </div>
      </div>

      <!-- ROW 4: Breakdown bars + extra metrics -->
      <div class="bento-tile bento-breakdown">
        <div class="bento-section-title">💰 Chi Tiết Giá / Túi</div>
        ${barsHTML}
        <div class="bento-bar-row" style="margin-top:8px;border-top:2px solid var(--accent);padding-top:10px">
          <div class="bento-bar-label" style="font-weight:700;color:var(--accent)">TỔNG</div>
          <div style="flex:1"></div>
          <div class="bento-bar-amount" style="color:var(--accent);font-size:1.1rem;font-weight:800">${fmt(r.finalPrice,0)} đ</div>
        </div>
      </div>

      <div class="bento-tile bento-breakdown">
        <div class="bento-section-title">💵 Chi Phí Phụ</div>
        <div class="bento-bar-row">
          <div class="bento-bar-label">Trục in</div>
          <div class="bento-bar-track"><div class="bento-bar-fill" style="width:100%;background:var(--accent)">${fmt(r.cylinderCost/1000000,1)}tr</div></div>
          <div class="bento-bar-amount">${fmt(r.cylinderCost/1000000,1)}tr</div>
        </div>
        <div class="bento-bar-row">
          <div class="bento-bar-label">Zipper tổng</div>
          <div class="bento-bar-track"><div class="bento-bar-fill" style="width:${r.zipperTotal > 0 ? Math.max(r.zipperTotal / r.cylinderCost * 100, 5) : 0}%;background:var(--accent2)">${fmt(r.zipperTotal)}</div></div>
          <div class="bento-bar-amount">${fmt(r.zipperTotal)}</div>
        </div>
        <div class="bento-bar-row">
          <div class="bento-bar-label">Thùng tổng</div>
          <div class="bento-bar-track"><div class="bento-bar-fill" style="width:${Math.max(r.boxTotal / r.cylinderCost * 100, 5)}%;background:var(--green)">${fmt(r.boxTotal)}</div></div>
          <div class="bento-bar-amount">${fmt(r.boxTotal)}</div>
        </div>
        <div class="bento-bar-row">
          <div class="bento-bar-label">Vận chuyển</div>
          <div class="bento-bar-track"><div class="bento-bar-fill" style="width:${Math.max(r.shippingTotal / r.cylinderCost * 100, 5)}%;background:var(--orange)">${fmt(r.shippingTotal)}</div></div>
          <div class="bento-bar-amount">${fmt(r.shippingTotal)}</div>
        </div>
      </div>

      <!-- ROW 5: Full-width order info -->
      <div class="bento-tile bento-wide">
        <div class="bento-section-title">🧾 Tổng Quan Đơn Hàng</div>
        <div class="bento-kv-grid">
          <div class="bento-kv"><span class="bento-kv-label">Khách hàng</span><span class="bento-kv-value">${r.input.customer}</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Sản phẩm</span><span class="bento-kv-value">${r.input.productName}</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Cấu trúc</span><span class="bento-kv-value">${r.structureText}</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Số lượng</span><span class="bento-kv-value">${fmt(r.input.quantity)} túi</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Kích thước</span><span class="bento-kv-value">${+(r.input.spreadWidth*100).toFixed(1)}×${+(r.input.cutStep*100).toFixed(1)} cm</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Độ dầy</span><span class="bento-kv-value">${r.totalThickness} mic</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Trọng lượng</span><span class="bento-kv-value">${fmt(r.tareWeight,2)} gr/cái</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Tổng TL</span><span class="bento-kv-value">${fmt(r.tareWeight * r.input.quantity / 1000,1)} kg</span></div>
          <div class="bento-kv"><span class="bento-kv-label">Diện tích</span><span class="bento-kv-value">${fmtM2(r.bagArea)}</span></div>
        </div>
      </div>

      <!-- Bottom metrics -->
      <div class="bento-tile bento-metric bento-orange">
        <div class="bento-metric-label">Trục In</div>
        <div class="bento-metric-value">${fmt(r.cylinderCost / 1000000, 1)}<span style="font-size:0.5em;opacity:0.7">tr</span></div>
        <div class="bento-metric-sub">tính riêng</div>
      </div>
      <div class="bento-tile bento-metric bento-pink">
        <div class="bento-metric-label">Thời Gian SX</div>
        <div class="bento-metric-value">${r.productionDays}</div>
        <div class="bento-metric-sub">ngày</div>
      </div>
      <div class="bento-tile bento-metric bento-accent">
        <div class="bento-metric-label">Tổng Giá Vốn SX</div>
        <div class="bento-metric-value">${fmt(total / 1000000, 1)}<span style="font-size:0.5em;opacity:0.7">tr</span></div>
        <div class="bento-metric-sub">${fmt(total)} đ</div>
      </div>

      <!-- CTA to edit -->
      <div class="bento-tile bento-cta" onclick="setLayout('default');switchView('sale');">
        <span class="bento-cta-icon">✏️</span>
        <span class="bento-cta-text">Quay lại chỉnh sửa thông số</span>
      </div>

    </div>
  `;
}

// ══════════════════════════════════════════════
// CHỐT GIÁ ANALYSIS (LIVE)
// ══════════════════════════════════════════════
function analyzeChotGia() {
  const el = document.getElementById('chotAnalysis');
  const val = parseFmtNumber(document.getElementById('chotGia').value);
  if (!val || !currentResult) { el.innerHTML = ''; return; }

  const r = currentResult;
  const diff = val - r.finalPrice;
  const diffPercent = diff / r.finalPrice;
  const totalDiff = diff * r.input.quantity;
  const actualProfit = (val * r.input.quantity) - r.totalProductionCost - r.zipperTotal - r.boxTotal - r.shippingTotal;
  const actualProfitRate = actualProfit / r.totalProductionCost;

  const cls = diff >= 0 ? 'positive' : 'negative';
  const icon = diff >= 0 ? '✅' : '⚠️';

  el.innerHTML = `
    <div class="chot-analysis ${cls}">
      <div class="chot-row"><span class="chot-label">${icon} Chênh lệch / túi</span><span class="chot-value">${diff >= 0 ? '+' : ''}${fmt(diff, 1)} đ (${diff >= 0 ? '+' : ''}${(diffPercent * 100).toFixed(1)}%)</span></div>
      <div class="chot-row"><span class="chot-label">Tổng chênh lệch</span><span class="chot-value">${diff >= 0 ? '+' : ''}${fmt(totalDiff)} đ</span></div>
      <div class="chot-row"><span class="chot-label">LN thực tế (GV SX)</span><span class="chot-value">${fmtPercent(actualProfitRate)}</span></div>
      <div class="chot-row"><span class="chot-label">Tổng LN thực tế</span><span class="chot-value">${fmt(actualProfit / 1000000, 2)} triệu</span></div>
    </div>
  `;
}

// ══════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════
function renderHistory() {
  const list = getHistory();
  const el = document.getElementById('historyList');
  const searchVal = (document.getElementById('historySearch')?.value || '').toLowerCase();

  const filtered = searchVal
    ? list.filter(h => [h.customer, h.productName, h.structure, String(h.finalPrice)]
        .some(s => s && s.toLowerCase().includes(searchVal)))
    : list;

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>${searchVal ? 'Không tìm thấy kết quả' : 'Chưa có lịch sử tính giá'}</p></div>`;
    return;
  }
  el.innerHTML = filtered.map(h => `
    <div class="history-item" onclick="loadFromHistory(${h.id})">
      <div class="hi-info">
        <div class="hi-name">${h.customer} — ${h.productName}</div>
        <div class="hi-date">${h.date} | ${h.structure} | SL: ${fmt(h.quantity)}</div>
        ${h.chotGia ? `<div class="hi-chot">Giá chốt: ${fmt(h.chotGia)} đ</div>` : ''}
      </div>
      <div style="text-align:right">
        <div class="hi-price">${fmt(h.finalPrice, 0)} đ</div>
        ${h.chotGia ? `<span class="badge ${h.chotGia >= h.finalPrice ? 'badge-green' : 'badge-red'}">${h.chotGia >= h.finalPrice ? '↑' : '↓'} ${fmt(h.chotGia - h.finalPrice, 0)}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function loadFromHistory(id) {
  const list = getHistory();
  const item = list.find(h => h.id === id);
  if (!item || !item.input) return;
  const inp = item.input;
  document.getElementById('customer').value = inp.customer || '';
  document.getElementById('productName').value = inp.productName || '';
  // Restore product type and sub-type
  document.getElementById('productType').value = inp.productType || 'tui';
  handleProductType();
  if (inp.productType === 'mang') {
    document.getElementById('filmType').value = inp.filmType || '';
  } else {
    document.getElementById('bagType').value = inp.bagType || '';
  }
  handleSubType();
  setFmtValue('quantity', inp.quantity || 30000);
  document.getElementById('numColors').value = inp.numColors != null ? inp.numColors : 4;
  document.getElementById('layer1').value = inp.layer1Id || 'PET';
  document.getElementById('layer2').value = inp.layer2Id || '';
  document.getElementById('layer3').value = inp.layer3Id || '';
  document.getElementById('layer4').value = inp.layer4Id || 'LLDPE';
  document.getElementById('spreadWidth').value = inp.spreadWidth || 0.53;
  document.getElementById('cutStep').value = inp.cutStep || 0.145;
  document.getElementById('hasNhu').checked = (inp.metallicSurcharge || 0) >= CONSTANTS.nhuPrice;
  document.getElementById('hasMo').checked = (inp.metallicSurcharge || 0) >= (CONSTANTS.nhuPrice + CONSTANTS.moPrice);
  document.getElementById('coverage').value = (inp.coverageRatio || 1) * 100;
  document.getElementById('handleWeight').value = inp.handleWeight || 0;
  document.getElementById('hasZipper').checked = inp.hasZipper || false;
  // Restore payment term
  const savedDays = String(inp.paymentDays || 30);
  document.querySelectorAll('#paymentTermGroup .option-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === savedDays);
  });
  document.getElementById('cylLength').value = inp.cylLength || 0.63;
  document.getElementById('cylCircum').value = inp.cylCircum || 0.4;
  setFmtValue('cylUnitPrice', inp.cylUnitPrice || 7300000);
  // Restore commission settings
  if (inp.commissionUnit === 'vnd') {
    document.getElementById('commissionUnit').value = 'vnd';
    document.getElementById('commission').value = inp.commissionInputValue || inp.commissionFixedVND || 0;
  } else {
    document.getElementById('commissionUnit').value = 'percent';
    document.getElementById('commission').value = inp.commissionInputValue || (inp.commissionRate || 0) * 100;
  }
  setFmtValue('bagsPerBox', inp.bagsPerBox || 1000);
  setFmtValue('boxPrice', inp.boxPrice || 18000);
  setFmtValue('shippingPerKm', inp.shippingPerKm || 5000);
  document.getElementById('shippingKm').value = inp.shippingKm || 200;
  if (item.chotGia) setFmtValue('chotGia', item.chotGia);
  updateStructurePreview();
  doCalculate();
  switchView('sale');
  showToast('Đã tải: ' + item.customer + ' — ' + item.productName, 'info');
}

// ══════════════════════════════════════════════
// CHỐT GIÁ SAVE
// ══════════════════════════════════════════════
function saveChotGia() {
  const val = parseFmtNumber(document.getElementById('chotGia').value);
  if (!val || !currentResult) {
    showToast('Vui lòng nhập giá chốt và tính giá trước.', 'error');
    return;
  }
  const list = getHistory();
  if (list.length > 0) {
    list[0].chotGia = val;
    localStorage.setItem('lts_history', JSON.stringify(list));
  }
  showToast(`Đã lưu giá chốt: ${fmt(val)} đ/túi`, 'success');
}

// ══════════════════════════════════════════════
// RESET FORM
// ══════════════════════════════════════════════
function resetForm() {
  document.getElementById('customer').value = '';
  document.getElementById('productName').value = '';
  setFmtValue('quantity', 30000);
  document.getElementById('numColors').value = 4;
  document.getElementById('layer1').selectedIndex = 0;
  document.getElementById('layer2').value = '';
  document.getElementById('layer3').value = '';
  document.getElementById('layer4').value = 'LLDPE';
  document.getElementById('spreadWidth').value = 0.53;
  document.getElementById('cutStep').value = 0.145;
  document.getElementById('hasNhu').checked = false;
  document.getElementById('hasMo').checked = false;
  document.getElementById('coverage').value = 100;
  document.getElementById('handleWeight').value = 0;
  document.getElementById('hasZipper').checked = false;
  // Reset payment term to 30 days
  document.querySelectorAll('#paymentTermGroup .option-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('#paymentTermGroup .option-btn[data-value="30"]').classList.add('active');
  document.getElementById('cylLength').value = 0.63;
  document.getElementById('cylCircum').value = 0.4;
  setFmtValue('cylUnitPrice', 7300000);
  document.getElementById('commission').value = 0;
  document.getElementById('commissionUnit').value = 'percent';
  document.getElementById('commissionHint').textContent = '';
  setFmtValue('bagsPerBox', 1000);
  setFmtValue('boxPrice', 18000);
  setFmtValue('shippingPerKm', 5000);
  document.getElementById('shippingKm').value = 200;
  document.getElementById('chotGia').value = '';
  document.getElementById('chotAnalysis').innerHTML = '';
  // Reset mic adjust inputs
  [1, 2, 3, 4].forEach(i => handleLayerChange(i));
  currentResult = null;
  document.getElementById('emptyState').style.display = '';
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  updateStructurePreview();
  showToast('Đã reset form.', 'info');
}

// ══════════════════════════════════════════════
// COPY RESULT
// ══════════════════════════════════════════════
function copyResult() {
  if (!currentResult) { showToast('Chưa có kết quả để copy.', 'error'); return; }
  const r = currentResult;
  const text = [
    `${r.input.customer} — ${r.input.productName}`,
    `Cấu trúc: ${r.structureText} | Độ dầy: ${r.totalThickness}mic`,
    `SL: ${fmt(r.input.quantity)} túi | KT: ${r.input.spreadWidth*100}×${r.input.cutStep*100}cm`,
    `GIÁ ĐỀ XUẤT: ${fmt(r.finalPrice, 0)} đ/túi (chưa VAT)`,
    `Giá vốn: ${fmt(r.costPerUnit, 1)} | LN: ${fmtPercent(r.profitRate)} | DT: ${fmt(r.revenue/1000000,1)}tr`,
    `Trục in: ${fmt(r.cylinderCost/1000000,1)}tr (riêng) | TGSX: ${r.productionDays} ngày`,
  ].join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã copy kết quả!', 'success');
  }).catch(() => showToast('Không thể copy.', 'error'));
}

// ══════════════════════════════════════════════
// EXPORT TXT
// ══════════════════════════════════════════════
function exportResult() {
  if (!currentResult) { showToast('Chưa có kết quả để xuất.', 'error'); return; }
  const r = currentResult;
  const chotGia = parseFmtNumber(document.getElementById('chotGia').value) || null;
  const text = [
    'BÁO GIÁ TÚI BAO BÌ - CTY CP LAI TRƯỜNG SƠN',
    '═'.repeat(50),
    `Ngày: ${new Date().toLocaleDateString('vi-VN')}`,
    `Khách hàng: ${r.input.customer}`,
    `Sản phẩm: ${r.input.productName}`,
    `Cấu trúc: ${r.structureText}`,
    `Số lượng: ${fmt(r.input.quantity)} túi`,
    `Kích thước: ${r.input.spreadWidth*100}cm × ${r.input.cutStep*100}cm`,
    `Độ dầy: ${r.totalThickness} mic`,
    `Trọng lượng: ${fmt(r.tareWeight, 2)} gr/cái`,
    '',
    'CHI TIẾT GIÁ BÁN / TÚI',
    '─'.repeat(40),
    `Giá vốn + LN:  ${fmt(r.costPerUnit,1)} đ`,
    `Zipper:         ${fmt(r.zipperPerUnit,1)} đ`,
    `Thùng giấy:     ${fmt(r.boxPerUnit,1)} đ`,
    `Vận chuyển:     ${fmt(r.shippingPerUnit,1)} đ`,
    `Lãi vay:        ${fmt(r.interestPerUnit,1)} đ`,
    `Hoa hồng:       ${fmt(r.commissionPerUnit,1)} đ`,
    '─'.repeat(40),
    `GIÁ ĐỀ XUẤT:   ${fmt(r.finalPrice,0)} đ/túi (chưa VAT)`,
    chotGia ? `GIÁ CHỐT:       ${fmt(chotGia,0)} đ/túi` : '',
    '',
    `Tỉ lệ LN: ${fmtPercent(r.profitRate)}`,
    `Doanh thu túi: ${fmt(r.revenue)} đ`,
    `Giá trục in: ${fmt(r.cylinderCost)} đ (riêng)`,
    `Thời gian SX: ${r.productionDays} ngày`,
  ].filter(Boolean).join('\n');

  const blob = new Blob(['\ufeff' + text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BaoGia_${r.input.customer}_${r.input.productName}_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất file báo giá!', 'success');
}

// ══════════════════════════════════════════════
// EXPORT HISTORY CSV
// ══════════════════════════════════════════════
function exportHistory() {
  const list = getHistory();
  if (!list.length) { showToast('Chưa có lịch sử.', 'error'); return; }
  let csv = '\ufeffNgày,Khách hàng,Sản phẩm,Cấu trúc,Số lượng,Giá đề xuất,Giá chốt\n';
  list.forEach(h => {
    csv += `"${h.date}","${h.customer}","${h.productName}","${h.structure}",${h.quantity},${Math.round(h.finalPrice)},${h.chotGia || ''}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LichSu_BaoGia_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất lịch sử CSV!', 'success');
}

// ══════════════════════════════════════════════
// CONFIG PAGE – Cơ số sản xuất (full-page tab)
// ══════════════════════════════════════════════

// Store original defaults for reset
const MATERIALS_DEFAULTS = MATERIALS.map(m => ({
  id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor
}));

// ── Number formatting with "." thousands separator ──
function dotFmt(n) {
  if (n == null || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('vi-VN');
}
function parseDotFmt(s) {
  // "7.300.000" → 7300000, "34.091" → 34091
  return parseFloat(String(s).replace(/\./g, '').replace(/,/g, '.')) || 0;
}
function fmtCfgInput(input) {
  // Save cursor position
  const pos = input.selectionStart;
  const oldLen = input.value.length;
  const raw = parseDotFmt(input.value);
  if (raw > 0) {
    input.value = dotFmt(raw);
    // Restore cursor position accounting for added dots
    const newLen = input.value.length;
    input.selectionStart = input.selectionEnd = pos + (newLen - oldLen);
  }
}

function renderMaterialPriceTable() {
  const tbody = document.getElementById('materialPriceBody');
  if (!tbody) return;
  const fmtM2 = n => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  tbody.innerHTML = MATERIALS.map((m, i) => {
    const defaultM = MATERIALS_DEFAULTS[i];
    const thkChanged = m.thickness !== defaultM.thickness ? ' changed' : '';
    const priceChanged = m.pricePerKg !== defaultM.pricePerKg ? ' changed' : '';
    return `<tr>
      <td>${i + 1}</td>
      <td class="mat-name">${m.name}</td>
      <td class="mat-density">${m.density}</td>
      <td><input class="cfg-input${thkChanged}" type="text" value="${dotFmt(m.thickness)}"
           data-idx="${i}" data-field="thickness" oninput="fmtCfgInput(this)" onchange="updateMaterialPrice(this)"></td>
      <td><input class="cfg-input${priceChanged}" type="text" value="${dotFmt(m.pricePerKg)}"
           data-idx="${i}" data-field="pricePerKg" oninput="fmtCfgInput(this)" onchange="updateMaterialPrice(this)"></td>
      <td class="mat-price-m2" id="priceM2_${i}">${fmtM2(m.pricePerM2)}</td>
    </tr>`;
  }).join('');
}

function updateMaterialPrice(input) {
  const idx = parseInt(input.dataset.idx);
  const field = input.dataset.field;
  const val = parseDotFmt(input.value);
  const m = MATERIALS[idx];
  const defaultM = MATERIALS_DEFAULTS[idx];

  m[field] = val;
  // Recalculate VND/m²
  m.pricePerM2 = m.pricePerKg * m.thickness * m.density / 1000;

  // Update display
  const cell = document.getElementById('priceM2_' + idx);
  if (cell) cell.textContent = m.pricePerM2.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

  // Highlight if changed from default
  const isChanged = m[field] !== defaultM[field];
  input.classList.toggle('changed', isChanged);

  // Update material name to reflect new thickness
  m.name = m.id.replace(/\d+/g, '') + ' ' + m.thickness + 'mic';
  const nameCell = input.closest('tr').querySelector('.mat-name');
  if (nameCell) nameCell.textContent = m.name;

  // Also update the layer dropdown options
  updateLayerDropdowns();
  saveMaterialConfig();
}

// ── Ink Price Table ──
function renderInkPriceTable() {
  const tbody = document.getElementById('inkPriceBody');
  if (!tbody) return;
  tbody.innerHTML = MATERIALS.map((m, i) => {
    const defaultM = MATERIALS_DEFAULTS[i];
    const inkChanged = m.inkPricePerColor !== defaultM.inkPricePerColor ? ' changed' : '';
    return `<tr>
      <td>${i + 1}</td>
      <td class="mat-name">${m.name}</td>
      <td><input class="cfg-input${inkChanged}" type="text" value="${dotFmt(m.inkPricePerColor)}"
           data-idx="${i}" oninput="fmtCfgInput(this)" onchange="updateInkPrice(this)"></td>
    </tr>`;
  }).join('');
}

function updateInkPrice(input) {
  const idx = parseInt(input.dataset.idx);
  const val = parseDotFmt(input.value);
  const m = MATERIALS[idx];
  const defaultM = MATERIALS_DEFAULTS[idx];
  m.inkPricePerColor = val;
  input.classList.toggle('changed', val !== defaultM.inkPricePerColor);
  saveMaterialConfig();
}

function updateLayerDropdowns() {
  [1, 2, 3, 4].forEach(i => {
    const sel = document.getElementById('layer' + i);
    if (!sel) return;
    const currentVal = sel.value;
    const firstOpt = sel.querySelector('option:first-child');
    sel.innerHTML = '';
    if (firstOpt) sel.appendChild(firstOpt);
    MATERIALS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

function resetMaterialPrices() {
  if (!confirm('Reset tất cả giá về mặc định?')) return;
  MATERIALS_DEFAULTS.forEach((def, i) => {
    MATERIALS[i].thickness = def.thickness;
    MATERIALS[i].pricePerKg = def.pricePerKg;
    MATERIALS[i].inkPricePerColor = def.inkPricePerColor;
    MATERIALS[i].pricePerM2 = MATERIALS[i].pricePerKg * MATERIALS[i].thickness * MATERIALS[i].density / 1000;
  });
  renderMaterialPriceTable();
  renderInkPriceTable();
  updateLayerDropdowns();
  localStorage.removeItem('lts_material_config');
  showToast('Đã reset tất cả giá về mặc định!', 'success');
}

function populateCPSXInputs() {
  document.getElementById('cfgGhepCPSX').value = dotFmt(CONSTANTS.ghepCPSX);
  document.getElementById('cfgLaborCost').value = dotFmt(CONSTANTS.laborCost);
  document.getElementById('cfgCutBase').value = dotFmt(CONSTANTS.cutBase || 971);
  document.getElementById('cfgCylinderPrice').value = dotFmt(CONSTANTS.cylinderPricePerUnit);
  document.getElementById('cfgNhuPrice').value = dotFmt(CONSTANTS.nhuPrice);
  document.getElementById('cfgMoPrice').value = dotFmt(CONSTANTS.moPrice);
}

function updateCPSXConstants() {
  CONSTANTS.ghepCPSX = parseDotFmt(document.getElementById('cfgGhepCPSX').value) || 684;
  CONSTANTS.laborCost = parseDotFmt(document.getElementById('cfgLaborCost').value) || 318;
  CONSTANTS.cutBase = parseDotFmt(document.getElementById('cfgCutBase').value) || 971;
  CONSTANTS.cylinderPricePerUnit = parseDotFmt(document.getElementById('cfgCylinderPrice').value) || 7300000;
  CONSTANTS.nhuPrice = parseDotFmt(document.getElementById('cfgNhuPrice').value) || 200;
  CONSTANTS.moPrice = parseDotFmt(document.getElementById('cfgMoPrice').value) || 200;
  saveMaterialConfig();
  showToast('Đã cập nhật!', 'success');
}

// Persist to localStorage
function saveMaterialConfig() {
  const data = {
    materials: MATERIALS.map(m => ({
      id: m.id, thickness: m.thickness, pricePerKg: m.pricePerKg, inkPricePerColor: m.inkPricePerColor
    })),
    cpsx: {
      ghepCPSX: CONSTANTS.ghepCPSX,
      laborCost: CONSTANTS.laborCost,
      cutBase: CONSTANTS.cutBase || 971,
      cylinderPricePerUnit: CONSTANTS.cylinderPricePerUnit,
      nhuPrice: CONSTANTS.nhuPrice,
      moPrice: CONSTANTS.moPrice
    }
  };
  localStorage.setItem('lts_material_config', JSON.stringify(data));
}

function loadMaterialConfig() {
  const saved = localStorage.getItem('lts_material_config');
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.materials) {
      data.materials.forEach(saved => {
        const m = MATERIALS.find(x => x.id === saved.id);
        if (m) {
          m.thickness = saved.thickness;
          m.pricePerKg = saved.pricePerKg;
          if (saved.inkPricePerColor != null) m.inkPricePerColor = saved.inkPricePerColor;
          m.pricePerM2 = m.pricePerKg * m.thickness * m.density / 1000;
        }
      });
    }
    if (data.cpsx) {
      CONSTANTS.ghepCPSX = data.cpsx.ghepCPSX;
      CONSTANTS.laborCost = data.cpsx.laborCost ?? data.cpsx.baseCPSX ?? 318;
      CONSTANTS.cutBase = data.cpsx.cutBase;
      CONSTANTS.cylinderPricePerUnit = data.cpsx.cylinderPricePerUnit;
      if (data.cpsx.nhuPrice != null) CONSTANTS.nhuPrice = data.cpsx.nhuPrice;
      if (data.cpsx.moPrice != null) CONSTANTS.moPrice = data.cpsx.moPrice;
    }
  } catch (e) { /* ignore corrupt data */ }
}

// Load config on startup
loadMaterialConfig();
