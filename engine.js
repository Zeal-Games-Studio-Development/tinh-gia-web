// ============================================================
// ENGINE TÍNH GIÁ - Dựa trên SP2 (A87:Q95) sheet TRANG
// ============================================================

function calculate(input) {
  const {
    quantity, spreadWidth, cutStep, numColors, metallicSurcharge = 0,
    handleWeight = 0, coverageRatio = 1, profitColumn = 2,
    commissionRate = 0, hasZipper = false,
    layer1Id, layer2Id, layer3Id,
    shippingPerKm, shippingKm,
    boxPrice, bagsPerBox
  } = input;

  const layer1 = getMaterial(layer1Id);
  const layer2 = layer2Id ? getMaterial(layer2Id) : null;
  const layer3 = layer3Id ? getMaterial(layer3Id) : null;
  if (!layer1 || !layer3) return null;

  // ── 1. KÍCH THƯỚC CƠ BẢN (Row 89) ──
  const bagArea = spreadWidth * cutStep;                                    // E89
  const totalArea = quantity * bagArea;                                      // F89
  const printWidth = spreadWidth > 0.4 ? spreadWidth : spreadWidth * 2;     // G89
  const filmLength = totalArea / printWidth;                                 // H89

  // ── 2. CPSX CẮT (Row 94) ──
  const cutWidth = printWidth;                                               // F94 = G89
  const cutMeters = filmLength;                                              // G94 = H89
  const cutWaste = cutMeters / 3000 * 20 + 100;                             // H94
  const cutWastePercent = (!layer2 || !layer3) ? 3 : 6;                     // E94

  // ── 3. GHÉP LẦN 2 - Lớp trong (Row 93) ──
  const lam2Width = cutWidth + 0.02;                                         // F93
  const lam2Meters = cutMeters + cutWaste;                                   // G93 = G94+H94
  const lam2Waste = lam2Meters / 3000 * 20 + 100;                           // H93
  const lam2CPSX = CONSTANTS.ghepCPSX;                                      // K93 = 684
  const lam2CostCPSX = lam2CPSX * (lam2Waste + lam2Meters) * lam2Width;    // L93
  const lam2CostMaterial = layer3.pricePerM2 * (lam2Waste + lam2Meters) * lam2Width; // M93
  const lam2TotalCost = lam2CostCPSX + lam2CostMaterial;                   // N93

  // ── 4. GHÉP LẦN 1 - Lớp giữa (Row 92) ──
  let lam1Width = 0, lam1Meters = 0, lam1Waste = 0, lam1TotalCost = 0;
  let lam1CostCPSX = 0, lam1CostMaterial = 0;
  if (layer2) {
    lam1Width = cutWidth + 0.02;                                             // F92
    lam1Meters = lam2Meters + lam2Waste;                                     // G92
    lam1Waste = lam1Meters / 3000 * 20 + 100;                               // H92
    const lam1CPSX = CONSTANTS.ghepCPSX;
    lam1CostCPSX = lam1CPSX * (lam1Waste + lam1Meters) * lam1Width;
    lam1CostMaterial = layer2.pricePerM2 * (lam1Waste + lam1Meters) * lam1Width;
    lam1TotalCost = lam1CostCPSX + lam1CostMaterial;
  }

  // ── 5. CPSX IN - Lớp ngoài (Row 91) ──
  const printNLWidth = cutWidth + 0.02;                                      // F91
  const printMeters = cutMeters + cutWaste + lam2Waste + lam1Waste;          // G91
  const colorSetup = COLOR_SETUP[numColors] || 400;
  const printWaste = colorSetup + (printMeters / 6000 * 40)
    + (printMeters > 50000 ? printMeters / 50000 * 400 : 0);                // H91
  const cpsxFactor = layer1.isPETorPA ? 135 : 120;
  const printCPSX = numColors * cpsxFactor * coverageRatio
    + CONSTANTS.baseCPSX + metallicSurcharge;                                // K91
  const printCostCPSX = printCPSX * (printWaste + printMeters) * printNLWidth; // L91
  const printCostMaterial = layer1.pricePerM2 * (printWaste + printMeters) * printNLWidth; // M91
  const printTotalCost = printCostCPSX + printCostMaterial;                  // N91

  // ── 6. CPSX CẮT chi phí (Row 94) ──
  let cutCPSX;
  if (bagArea < 0.07)      cutCPSX = 971 * 1.4;
  else if (bagArea < 0.2)  cutCPSX = 971 * 1.2;
  else                     cutCPSX = 971 * 0.8;                              // K94
  const cutCostCPSX = cutCPSX * (cutWaste + cutMeters) * cutWidth;           // L94
  const cutTotalCost = cutCostCPSX;                                          // N94

  // ── 7. TỔNG GIÁ VỐN (O91) ──
  const totalProductionCost = printTotalCost + lam1TotalCost + lam2TotalCost + cutTotalCost;

  // ── 8. LỢI NHUẬN (P91, P93, Q91) ──
  const profitRate = lookupProfit(totalProductionCost, profitColumn);
  const profitAmount = profitRate * totalProductionCost;
  const revenue = totalProductionCost + profitAmount;

  // ── 9. GIÁ VỐN + LN / TÚI (I89) ──
  const costPerUnit = revenue / quantity;

  // ── 10. CHI PHÍ PHỤ / TÚI ──
  const totalThickness = layer1.thickness + (layer2 ? layer2.thickness : 0)
    + layer3.thickness + cutWastePercent;

  // Zipper (K89)
  const zipperTotal = hasZipper ? (cutMeters + cutWaste) * CONSTANTS.zipperPrice : 0;
  const zipperPerUnit = zipperTotal / quantity;

  // Thùng giấy (L89) — sử dụng input hoặc mặc định
  const actualBagsPerBox = bagsPerBox || CONSTANTS.bagsPerBoxDefault;
  const actualBoxPrice = boxPrice || CONSTANTS.boxPriceDefault;
  const numBoxes = quantity / actualBagsPerBox;
  const boxTotal = actualBoxPrice * numBoxes;
  const boxPerUnit = boxTotal / quantity;

  // Tare (gr/cái) - B98
  const tareWeight = (bagArea * totalThickness) * 0.93 + handleWeight;

  // Vận chuyển (M89) — pricePerKm × km × tấn
  const actualShippingPerKm = shippingPerKm || CONSTANTS.shippingPerKmDefault;
  const actualShippingKm = shippingKm || CONSTANTS.shippingKmDefault;
  const shippingRate = actualShippingPerKm * actualShippingKm; // đ/tấn
  const totalWeightTons = tareWeight * quantity / 1000000;
  const shippingTotal = totalWeightTons * shippingRate;
  const shippingPerUnit = shippingTotal / quantity;

  // Lãi vay (N89)
  const dailyInterest = CONSTANTS.interestRate / 365;
  const interestRate30 = dailyInterest * CONSTANTS.paymentDays;
  const interestPerUnit = interestRate30 * costPerUnit;

  // Hoa hồng (O89)
  const commissionPerUnit = commissionRate * costPerUnit;

  // ── 11. GIÁ CUỐI (P89) ──
  const finalPrice = costPerUnit + zipperPerUnit + boxPerUnit
    + shippingPerUnit + interestPerUnit + commissionPerUnit;

  // ── 12. TRỤC IN (E97/G97) ──
  const optimalStep = cutStep >= 0.4 ? cutStep
    : cutStep * 2 >= 0.4 ? cutStep * 2
    : cutStep * 3 >= 0.4 ? cutStep * 3
    : cutStep * 4 >= 0.4 ? cutStep * 4 : cutStep * 5;
  const cylinderWidth = Math.max(spreadWidth + 0.1, 0.7);
  const cylinderCost = optimalStep * cylinderWidth * CONSTANTS.cylinderPricePerUnit;

  // ── 13. THỜI GIAN SX ──
  const productionDays = Math.ceil(quantity / 30000) + 4;

  // ── 14. CẤU TRÚC TEXT ──
  let structureText = layer1.name.split(' ')[0] + ' ' + layer1.thickness;
  if (layer2) structureText += '//' + layer2.name.split(' ')[0] + ' ' + layer2.thickness;
  structureText += '//' + layer3.name.split(' ')[0] + ' ' + layer3.thickness;

  return {
    // Đầu vào
    input,
    structureText,
    totalThickness,

    // Kích thước
    bagArea, totalArea, printWidth, filmLength,

    // Cắt
    cutWidth, cutMeters, cutWaste, cutWastePercent, cutCPSX, cutCostCPSX, cutTotalCost,

    // Ghép 2
    lam2Width, lam2Meters, lam2Waste, lam2CPSX, lam2CostCPSX, lam2CostMaterial, lam2TotalCost,

    // Ghép 1
    lam1Width, lam1Meters, lam1Waste, lam1CostCPSX, lam1CostMaterial, lam1TotalCost,

    // In
    printNLWidth, printMeters, printWaste, printCPSX, printCostCPSX, printCostMaterial, printTotalCost,

    // Tổng hợp
    totalProductionCost, profitRate, profitAmount, revenue,
    costPerUnit,

    // Phụ phí
    zipperPerUnit, zipperTotal,
    boxPerUnit, boxTotal, actualBoxPrice, actualBagsPerBox, numBoxes,
    tareWeight, shippingPerUnit, shippingTotal, shippingRate,
    actualShippingPerKm, actualShippingKm,
    interestPerUnit, interestRate30,
    commissionPerUnit,

    // Kết quả
    finalPrice,
    cylinderCost,
    productionDays,

    // Chi tiết layers
    layers: {
      print: { material: layer1, width: printNLWidth, meters: printMeters, waste: printWaste, cpsx: printCPSX, costCPSX: printCostCPSX, costMat: printCostMaterial, total: printTotalCost },
      lam1: layer2 ? { material: layer2, width: lam1Width, meters: lam1Meters, waste: lam1Waste, costCPSX: lam1CostCPSX, costMat: lam1CostMaterial, total: lam1TotalCost } : null,
      lam2: { material: layer3, width: lam2Width, meters: lam2Meters, waste: lam2Waste, costCPSX: lam2CostCPSX, costMat: lam2CostMaterial, total: lam2TotalCost },
      cut: { width: cutWidth, meters: cutMeters, waste: cutWaste, cpsx: cutCPSX, costCPSX: cutCostCPSX, total: cutTotalCost },
    }
  };
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtVND(n) { return fmt(n) + ' đ'; }
function fmtPercent(n) { return (n * 100).toFixed(1) + '%'; }
function fmtM(n) { return fmt(n, 2) + ' m'; }
function fmtM2(n) { return fmt(n, 4) + ' m²'; }

// ============================================================
// LOCAL STORAGE
// ============================================================
function saveHistory(entry) {
  const history = JSON.parse(localStorage.getItem('lts_history') || '[]');
  entry.id = Date.now();
  entry.date = new Date().toLocaleString('vi-VN');
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem('lts_history', JSON.stringify(history));
}
function getHistory() {
  return JSON.parse(localStorage.getItem('lts_history') || '[]');
}
function clearHistory() {
  localStorage.removeItem('lts_history');
}
