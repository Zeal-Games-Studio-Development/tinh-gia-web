// ============================================================
// APP.JS — UI Logic & Rendering (v2.0)
// ============================================================

let currentResult = null;
let calcTimeout = null;

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  renderHistory();
  setupAutoCalc();
  updateStructurePreview();
  loadDisplayPreferences();
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
// DROPDOWNS
// ══════════════════════════════════════════════
function populateDropdowns() {
  const l1 = document.getElementById('layer1');
  const l2 = document.getElementById('layer2');
  const l3 = document.getElementById('layer3');
  MATERIALS.forEach(m => {
    const opt = `<option value="${m.id}">${m.name} — ${fmt(m.pricePerM2,1)} đ/m²</option>`;
    l1.innerHTML += opt;
    l2.innerHTML += opt;
    l3.innerHTML += opt;
  });
  l3.value = 'LLDPE';
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
        doCalculate(true);
      }, 300);
    });
  });
}

// ══════════════════════════════════════════════
// STRUCTURE VISUAL PREVIEW
// ══════════════════════════════════════════════
function updateStructurePreview() {
  const l1 = getMaterial(document.getElementById('layer1').value);
  const l2id = document.getElementById('layer2').value;
  const l2 = l2id ? getMaterial(l2id) : null;
  const l3 = getMaterial(document.getElementById('layer3').value);
  const preview = document.getElementById('structurePreview');

  if (l2) {
    preview.innerHTML = `
      <div class="layer"><div class="layer-name">${l1 ? l1.name.split(' ')[0] : '—'}</div><div class="layer-thickness">${l1 ? l1.thickness + 'mic' : ''}</div></div>
      <div class="layer"><div class="layer-name">${l2.name.split(' ')[0]}</div><div class="layer-thickness">${l2.thickness}mic</div></div>
      <div class="layer"><div class="layer-name">${l3 ? l3.name.split(' ')[0] : '—'}</div><div class="layer-thickness">${l3 ? l3.thickness + 'mic' : ''}</div></div>
    `;
  } else {
    preview.innerHTML = `
      <div class="layer"><div class="layer-name">${l1 ? l1.name.split(' ')[0] : '—'}</div><div class="layer-thickness">${l1 ? l1.thickness + 'mic' : ''}</div></div>
      <div class="layer" style="background:linear-gradient(135deg,#94a3b8,#cbd5e1);opacity:0.35"><div class="layer-name">—</div><div class="layer-thickness">Không dùng</div></div>
      <div class="layer"><div class="layer-name">${l3 ? l3.name.split(' ')[0] : '—'}</div><div class="layer-thickness">${l3 ? l3.thickness + 'mic' : ''}</div></div>
    `;
  }
}

// ══════════════════════════════════════════════
// VIEW SWITCH
// ══════════════════════════════════════════════
function switchView(view) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + view);
  if (panel) panel.classList.add('active');
  if (view === 'history') renderHistory();
  if (view === 'moq' && currentResult) renderMOQView(currentResult);
  if (view === 'bento' && currentResult) renderBentoView(currentResult);
}

// ══════════════════════════════════════════════
// INPUT GATHERING
// ══════════════════════════════════════════════
function gatherInput() {
  return {
    customer: document.getElementById('customer').value || 'N/A',
    productName: document.getElementById('productName').value || 'N/A',
    quantity: parseInt(document.getElementById('quantity').value) || 30000,
    numColors: parseInt(document.getElementById('numColors').value) || 4,
    layer1Id: document.getElementById('layer1').value,
    layer2Id: document.getElementById('layer2').value || null,
    layer3Id: document.getElementById('layer3').value,
    spreadWidth: parseFloat(document.getElementById('spreadWidth').value) || 0.53,
    cutStep: parseFloat(document.getElementById('cutStep').value) || 0.145,
    metallicSurcharge: parseInt(document.getElementById('metallic').value) || 0,
    coverageRatio: (parseInt(document.getElementById('coverage').value) || 100) / 100,
    handleWeight: parseFloat(document.getElementById('handleWeight').value) || 0,
    hasZipper: document.getElementById('hasZipper').checked,
    profitColumn: parseInt(document.getElementById('profitCol').value) || 2,
    commissionRate: (parseFloat(document.getElementById('commission').value) || 0) / 100,
    bagsPerBox: parseInt(document.getElementById('bagsPerBox').value) || 1000,
    boxPrice: parseInt(document.getElementById('boxPrice').value) || 18000,
    shippingPerKm: parseInt(document.getElementById('shippingPerKm').value) || 5000,
    shippingKm: parseInt(document.getElementById('shippingKm').value) || 200,
  };
}

// ══════════════════════════════════════════════
// CALCULATE
// ══════════════════════════════════════════════
function doCalculate(silent = false) {
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
    <div class="stat-card cyan"><div class="stat-label">Tổng Doanh Thu</div><div class="stat-value">${fmt(r.revenue/1000000,1)}tr</div></div>
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
  const pLam = (r.lam1TotalCost + r.lam2TotalCost) / total * 100;
  const pCut = r.cutTotalCost / total * 100;
  document.getElementById('m-costbar').innerHTML = `
    <div class="segment seg-print" style="width:${pIn}%">${pIn.toFixed(0)}%</div>
    <div class="segment seg-lam" style="width:${pLam}%">${pLam.toFixed(0)}%</div>
    <div class="segment seg-cut" style="width:${pCut}%">${pCut.toFixed(0)}%</div>
  `;
  document.getElementById('m-legend').innerHTML = `
    <div class="legend-item"><div class="dot" style="background:var(--accent)"></div>In: ${fmt(r.printTotalCost/1000000,2)}tr</div>
    <div class="legend-item"><div class="dot" style="background:var(--accent2)"></div>Ghép: ${fmt((r.lam1TotalCost+r.lam2TotalCost)/1000000,2)}tr</div>
    <div class="legend-item"><div class="dot" style="background:var(--orange)"></div>Cắt: ${fmt(r.cutTotalCost/1000000,2)}tr</div>
  `;

  const rows = [
    ['CPSX IN', r.layers.print.material.name, fmt(r.printCostCPSX), fmt(r.printCostMaterial), fmt(r.printTotalCost)],
  ];
  if (r.layers.lam1) rows.push(['GHÉP Lần 1', r.layers.lam1.material.name, fmt(r.lam1CostCPSX), fmt(r.lam1CostMaterial), fmt(r.lam1TotalCost)]);
  rows.push(['GHÉP Lần 2', r.layers.lam2.material.name, fmt(r.lam2CostCPSX), fmt(r.lam2CostMaterial), fmt(r.lam2TotalCost)]);
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
    <tr><td>Lãi vay (${CONSTANTS.paymentDays} ngày)</td><td>—</td><td class="num">${fmtPercent(r.interestRate30)}</td><td class="num">—</td><td class="num">${fmt(r.interestPerUnit * r.input.quantity)}</td><td class="num">${fmt(r.interestPerUnit,1)}</td></tr>
    <tr><td>Hoa hồng</td><td>—</td><td class="num">${fmtPercent(r.input.commissionRate)}</td><td class="num">—</td><td class="num">${fmt(r.commissionPerUnit * r.input.quantity)}</td><td class="num">${fmt(r.commissionPerUnit,1)}</td></tr>
  `;
}

// ══════════════════════════════════════════════
// TECH VIEW RENDER
// ══════════════════════════════════════════════
function renderTechView(r) {
  document.getElementById('t-structure').textContent = r.structureText;

  document.getElementById('t-stats').innerHTML = `
    <div class="stat-card accent"><div class="stat-label">Tổng Mét In</div><div class="stat-value">${fmt(r.printMeters + r.printWaste, 0)} m</div></div>
    <div class="stat-card cyan"><div class="stat-label">Tổng Mét Cắt</div><div class="stat-value">${fmt(r.cutMeters + r.cutWaste, 0)} m</div></div>
    <div class="stat-card green"><div class="stat-label">Khổ In TP</div><div class="stat-value">${fmt(r.printWidth*100, 1)} cm</div></div>
    <div class="stat-card orange"><div class="stat-label">Khổ Màng NL</div><div class="stat-value">${fmt(r.printNLWidth*100, 1)} cm</div></div>
    <div class="stat-card pink"><div class="stat-label">Ngày SX</div><div class="stat-value">${r.productionDays}</div></div>
  `;

  const prodRows = [];
  prodRows.push(['CPSX IN', r.layers.print.material.name, fmt(r.printNLWidth*100,1), fmt(r.printMeters,0), fmt(r.printWaste,0), fmt(r.printMeters + r.printWaste,0), fmt(r.printCPSX,0)]);
  if (r.layers.lam1) prodRows.push(['GHÉP L1', r.layers.lam1.material.name, fmt(r.lam1Width*100,1), fmt(r.lam1Meters,0), fmt(r.lam1Waste,0), fmt(r.lam1Meters + r.lam1Waste,0), CONSTANTS.ghepCPSX]);
  prodRows.push(['GHÉP L2', r.layers.lam2.material.name, fmt(r.lam2Width*100,1), fmt(r.lam2Meters,0), fmt(r.lam2Waste,0), fmt(r.lam2Meters + r.lam2Waste,0), CONSTANTS.ghepCPSX]);
  prodRows.push(['CẮT', '—', fmt(r.cutWidth*100,1), fmt(r.cutMeters,0), fmt(r.cutWaste,0), fmt(r.cutMeters + r.cutWaste,0), fmt(r.cutCPSX,0)]);

  document.getElementById('t-production-table').innerHTML = `
    <tr><th>Công đoạn</th><th>Màng</th><th class="num">Khổ (cm)</th><th class="num">Mét TP</th><th class="num">Phi hao</th><th class="num">Tổng mét</th><th class="num">CPSX/m</th></tr>
    ${prodRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td class="num">${r[4]}</td><td class="num highlight">${r[5]}</td><td class="num">${r[6]}</td></tr>`).join('')}
  `;

  const matRows = [];
  const addMat = (label, m) => {
    matRows.push([label, m.name, m.density, m.thickness, fmt(m.pricePerKg), fmt(m.pricePerM2, 1)]);
  };
  addMat('Lớp 1 (In)', r.layers.print.material);
  if (r.layers.lam1) addMat('Lớp 2 (Ghép 1)', r.layers.lam1.material);
  addMat(r.layers.lam1 ? 'Lớp 3 (Ghép 2)' : 'Lớp 2 (Ghép 2)', r.layers.lam2.material);

  document.getElementById('t-material-table').innerHTML = `
    <tr><th>Vị trí</th><th>Màng</th><th class="num">Tỉ trọng</th><th class="num">Độ dầy (mic)</th><th class="num">Giá (đ/kg)</th><th class="num">Giá (đ/m²)</th></tr>
    ${matRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td class="num">${r[4]}</td><td class="num highlight">${r[5]}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="3">Tổng độ dầy</td><td class="num">${r.totalThickness} mic</td><td colspan="2"></td></tr>
  `;

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

  let rows = '';
  let results = [];
  moqLevels.forEach(qty => {
    const inp = { ...baseInput, quantity: qty };
    const res = calculate(inp);
    if (!res) return;
    const isCurrent = qty === currentQty;
    results.push({ qty, res, isCurrent });
    rows += `
      <tr class="${isCurrent ? 'moq-highlight' : ''}">
        <td style="font-weight:${isCurrent ? '700' : '400'}">${fmt(qty)}</td>
        <td>${fmtPercent(res.profitRate)}</td>
        <td>${fmt(res.costPerUnit, 1)}</td>
        <td style="font-weight:700;color:${isCurrent ? 'var(--accent)' : 'inherit'}">${fmt(res.finalPrice, 0)}</td>
        <td>${fmt(res.finalPrice * qty / 1000000, 2)}tr</td>
        <td>${res.productionDays} ngày</td>
      </tr>
    `;
  });

  document.getElementById('moq-table').innerHTML = `
    <tr><th>Số lượng</th><th>LN %</th><th>Giá vốn+LN/túi</th><th>Giá đề xuất</th><th>Tổng DT</th><th>TGSX</th></tr>
    ${rows}
  `;

  if (results.length >= 2) {
    const min = results.reduce((a, b) => a.res.finalPrice < b.res.finalPrice ? a : b);
    const max = results.reduce((a, b) => a.res.finalPrice > b.res.finalPrice ? a : b);
    const cur = results.find(r => r.isCurrent);
    const savings = max.res.finalPrice - min.res.finalPrice;

    document.getElementById('moq-analysis').innerHTML = [
      ['Giá thấp nhất', `${fmt(min.res.finalPrice, 0)} đ @ ${fmt(min.qty)} túi`],
      ['Giá cao nhất', `${fmt(max.res.finalPrice, 0)} đ @ ${fmt(max.qty)} túi`],
      ['Chênh lệch', `${fmt(savings, 0)} đ/túi (${fmtPercent(savings / max.res.finalPrice)})`],
      ['Giá hiện tại', `${fmt(cur.res.finalPrice, 0)} đ @ ${fmt(cur.qty)} túi`],
      ['Nếu tăng gấp đôi SL', (() => {
        const dbl = calculate({ ...baseInput, quantity: currentQty * 2 });
        if (!dbl) return 'N/A';
        return `${fmt(dbl.finalPrice, 0)} đ (giảm ${fmt(cur.res.finalPrice - dbl.finalPrice, 0)} đ)`;
      })()],
    ].map(([l, v]) => `<li><span class="bl-label">${l}</span><span class="bl-value">${v}</span></li>`).join('');
  }
}

// ══════════════════════════════════════════════
// BENTO VIEW RENDER (Creative Dashboard)
// ══════════════════════════════════════════════
function renderBentoView(r) {
  const total = r.totalProductionCost;
  const pIn = r.printTotalCost / total * 100;
  const pLam = (r.lam1TotalCost + r.lam2TotalCost) / total * 100;
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
  const l2 = r.layers.lam1 ? r.layers.lam1.material : null;
  const l3 = r.layers.lam2.material;

  const layerBlocks = l2
    ? `<div class="bento-layer-block"><div class="bento-layer-name">${l1.name.split(' ')[0]}</div><div class="bento-layer-thick">${l1.thickness}mic</div><div class="bento-layer-price">${fmt(l1.pricePerM2,0)} đ/m²</div></div>
       <div class="bento-layer-block"><div class="bento-layer-name">${l2.name.split(' ')[0]}</div><div class="bento-layer-thick">${l2.thickness}mic</div><div class="bento-layer-price">${fmt(l2.pricePerM2,0)} đ/m²</div></div>
       <div class="bento-layer-block"><div class="bento-layer-name">${l3.name.split(' ')[0]}</div><div class="bento-layer-thick">${l3.thickness}mic</div><div class="bento-layer-price">${fmt(l3.pricePerM2,0)} đ/m²</div></div>`
    : `<div class="bento-layer-block"><div class="bento-layer-name">${l1.name.split(' ')[0]}</div><div class="bento-layer-thick">${l1.thickness}mic</div><div class="bento-layer-price">${fmt(l1.pricePerM2,0)} đ/m²</div></div>
       <div class="bento-layer-block" style="background:linear-gradient(180deg,#94a3b8,#64748b);opacity:0.4"><div class="bento-layer-name">—</div><div class="bento-layer-thick">Không dùng</div></div>
       <div class="bento-layer-block"><div class="bento-layer-name">${l3.name.split(' ')[0]}</div><div class="bento-layer-thick">${l3.thickness}mic</div><div class="bento-layer-price">${fmt(l3.pricePerM2,0)} đ/m²</div></div>`;

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
        <div class="bento-metric-label">Tổng Doanh Thu</div>
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
          <div><span class="bsi-label">Tổng mét in</span><span class="bsi-value">${fmt(r.printMeters + r.printWaste, 0)} m</span></div>
          <div><span class="bsi-label">Tổng mét cắt</span><span class="bsi-value">${fmt(r.cutMeters + r.cutWaste, 0)} m</span></div>
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
  const val = parseFloat(document.getElementById('chotGia').value);
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
  document.getElementById('quantity').value = inp.quantity || 30000;
  document.getElementById('numColors').value = inp.numColors || 4;
  document.getElementById('layer1').value = inp.layer1Id || 'PET';
  document.getElementById('layer2').value = inp.layer2Id || '';
  document.getElementById('layer3').value = inp.layer3Id || 'LLDPE';
  document.getElementById('spreadWidth').value = inp.spreadWidth || 0.53;
  document.getElementById('cutStep').value = inp.cutStep || 0.145;
  document.getElementById('metallic').value = inp.metallicSurcharge || 0;
  document.getElementById('coverage').value = (inp.coverageRatio || 1) * 100;
  document.getElementById('handleWeight').value = inp.handleWeight || 0;
  document.getElementById('hasZipper').checked = inp.hasZipper || false;
  document.getElementById('profitCol').value = inp.profitColumn || 2;
  document.getElementById('commission').value = (inp.commissionRate || 0) * 100;
  document.getElementById('bagsPerBox').value = inp.bagsPerBox || 1000;
  document.getElementById('boxPrice').value = inp.boxPrice || 18000;
  document.getElementById('shippingPerKm').value = inp.shippingPerKm || 5000;
  document.getElementById('shippingKm').value = inp.shippingKm || 200;
  if (item.chotGia) document.getElementById('chotGia').value = item.chotGia;
  updateStructurePreview();
  doCalculate();
  switchView('sale');
  showToast('Đã tải: ' + item.customer + ' — ' + item.productName, 'info');
}

// ══════════════════════════════════════════════
// CHỐT GIÁ SAVE
// ══════════════════════════════════════════════
function saveChotGia() {
  const val = parseFloat(document.getElementById('chotGia').value);
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
  document.getElementById('quantity').value = 30000;
  document.getElementById('numColors').value = 4;
  document.getElementById('layer1').selectedIndex = 0;
  document.getElementById('layer2').value = '';
  document.getElementById('layer3').value = 'LLDPE';
  document.getElementById('spreadWidth').value = 0.53;
  document.getElementById('cutStep').value = 0.145;
  document.getElementById('metallic').value = 0;
  document.getElementById('coverage').value = 100;
  document.getElementById('handleWeight').value = 0;
  document.getElementById('hasZipper').checked = false;
  document.getElementById('profitCol').value = 2;
  document.getElementById('commission').value = 0;
  document.getElementById('bagsPerBox').value = 1000;
  document.getElementById('boxPrice').value = 18000;
  document.getElementById('shippingPerKm').value = 5000;
  document.getElementById('shippingKm').value = 200;
  document.getElementById('chotGia').value = '';
  document.getElementById('chotAnalysis').innerHTML = '';
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
  const chotGia = parseFloat(document.getElementById('chotGia').value) || null;
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
    `Tổng doanh thu: ${fmt(r.revenue)} đ`,
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
