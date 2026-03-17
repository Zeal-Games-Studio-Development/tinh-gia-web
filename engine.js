// ============================================================
// ENGINE TÍNH GIÁ - Dựa trên SP2 (A87:Q95) sheet TRANG
// ============================================================

function calculate(input) {
  const {
    quantity, spreadWidth, cutStep, numColors, metallicSurcharge = 0,
    handleWeight = 0, coverageRatio = 1, profitColumn = 2,
    commissionRate = 0, hasZipper = false,
    layer1Id, layer2Id, layer3Id, layer4Id,
    shippingPerKm, shippingKm,
    boxPrice, bagsPerBox,
    micOverrides = {}
  } = input;

  // Clone materials to avoid mutating MATERIALS array, and apply mic overrides
  const cloneMat = (mat, layerKey) => {
    if (!mat) return null;
    const clone = { ...mat };
    if (micOverrides[layerKey] && mat.adjustableMic) {
      clone.thickness = micOverrides[layerKey];
      clone.pricePerM2 = clone.pricePerKg * clone.thickness * clone.density / 1000;
    }
    return clone;
  };

  const layer1 = cloneMat(getMaterial(layer1Id), 'layer1');
  const layer2 = layer2Id ? cloneMat(getMaterial(layer2Id), 'layer2') : null;
  const layer3 = layer3Id ? cloneMat(getMaterial(layer3Id), 'layer3') : null;
  const layer4 = layer4Id ? cloneMat(getMaterial(layer4Id), 'layer4') : null;
  if (!layer1) return null; // At minimum, layer1 is required

  // Count active middle layers for waste calculation
  const middleLayers = [layer2, layer3].filter(Boolean);
  const numLaminations = (layer4 ? 1 : 0) + middleLayers.length; // lamination steps needed

  // ── 1. KÍCH THƯỚC CƠ BẢN ──
  const bagArea = spreadWidth * cutStep;
  const totalArea = quantity * bagArea;
  const printWidth = spreadWidth > 0.4 ? spreadWidth : spreadWidth * 2;
  const filmLength = totalArea / printWidth;

  // ── 2. CPSX CẮT ──
  const cutWidth = printWidth;
  const cutMeters = filmLength;
  const cutWaste = cutMeters / 3000 * 20 + 100;
  const cutWastePercent = numLaminations <= 1 ? 3 : 6;

  // ── 3. GHÉP - Build lamination chain from innermost (layer4) outward ──
  // Each lamination step ghéps one more layer onto the growing composite.
  // Order: layer4 (seal) → layer3 (if exists) → layer2 (if exists) → layer1 (print)

  // Ghép Lần 1: Layer 4 (seal/inner) - optional now
  let lam1Width = 0, lam1Meters = 0, lam1Waste = 0, lam1TotalCost = 0;
  let lam1CostCPSX = 0, lam1CostMaterial = 0, lam1CPSX = 0;
  if (layer4) {
    lam1Width = cutWidth + 0.02;
    lam1Meters = cutMeters + cutWaste;
    lam1Waste = lam1Meters / 3000 * 20 + 100;
    lam1CPSX = CONSTANTS.ghepCPSX;
    lam1CostCPSX = lam1CPSX * (lam1Waste + lam1Meters) * lam1Width;
    lam1CostMaterial = layer4.pricePerM2 * (lam1Waste + lam1Meters) * lam1Width;
    lam1TotalCost = lam1CostCPSX + lam1CostMaterial;
  }

  // Ghép Lần 2: Layer 3 (optional)
  let lam2Width = 0, lam2Meters = 0, lam2Waste = 0, lam2TotalCost = 0;
  let lam2CostCPSX = 0, lam2CostMaterial = 0, lam2CPSX = 0;
  if (layer3) {
    lam2Width = cutWidth + 0.02;
    lam2Meters = lam1Meters + lam1Waste;
    lam2Waste = lam2Meters / 3000 * 20 + 100;
    lam2CPSX = CONSTANTS.ghepCPSX;
    lam2CostCPSX = lam2CPSX * (lam2Waste + lam2Meters) * lam2Width;
    lam2CostMaterial = layer3.pricePerM2 * (lam2Waste + lam2Meters) * lam2Width;
    lam2TotalCost = lam2CostCPSX + lam2CostMaterial;
  }

  // Ghép Lần 3: Layer 2 (optional)
  let lam3Width = 0, lam3Meters = 0, lam3Waste = 0, lam3TotalCost = 0;
  let lam3CostCPSX = 0, lam3CostMaterial = 0, lam3CPSX = 0;
  if (layer2) {
    lam3Width = cutWidth + 0.02;
    // Chain: layer3 → layer4 → cut stage
    let prevMeters, prevWaste;
    if (layer3) {
      prevMeters = lam2Meters;
      prevWaste = lam2Waste;
    } else if (layer4) {
      prevMeters = lam1Meters;
      prevWaste = lam1Waste;
    } else {
      // Only Layer1 + Layer2, no Layer3/4: base from cut stage
      prevMeters = cutMeters;
      prevWaste = cutWaste;
    }
    lam3Meters = prevMeters + prevWaste;
    lam3Waste = lam3Meters / 3000 * 20 + 100;
    lam3CPSX = CONSTANTS.ghepCPSX;
    lam3CostCPSX = lam3CPSX * (lam3Waste + lam3Meters) * lam3Width;
    lam3CostMaterial = layer2.pricePerM2 * (lam3Waste + lam3Meters) * lam3Width;
    lam3TotalCost = lam3CostCPSX + lam3CostMaterial;
  }

  // Total lamination waste for print meters
  const totalLamWaste = lam1Waste + (layer3 ? lam2Waste : 0) + (layer2 ? lam3Waste : 0);

  // ── 4. CPSX IN - Lớp 1 (ngoài) ──
  const printNLWidth = cutWidth + 0.02;
  const printMeters = cutMeters + cutWaste + totalLamWaste;
  // Fallbacks: defaults to the values requested by user if somehow undefined
  const cSetup = numColors > 0 ? (CONSTANTS.colorSetup[numColors] || (numColors * 200 + 200)) : 0; 
  const pA = CONSTANTS.printWasteA || 6000;
  const pB = CONSTANTS.printWasteB || 40;
  const pC = CONSTANTS.printWasteC || 50000;
  const pD = CONSTANTS.printWasteD || 400;
  
  const printWaste = numColors > 0 
    ? (cSetup + (printMeters / pA * pB) + (printMeters > pC ? printMeters / pC * pD : 0)) 
    : 0;
  const inkPrice = layer1.inkPricePerColor || (layer1.isPETorPA ? 135 : 120);
  const printCPSX = numColors > 0 
    ? (numColors * inkPrice * coverageRatio + CONSTANTS.laborCost + metallicSurcharge) 
    : 0;
  const printCostCPSX = printCPSX * (printWaste + printMeters) * printNLWidth;
  const printCostMaterial = layer1.pricePerM2 * (printWaste + printMeters) * printNLWidth;
  const printTotalCost = printCostCPSX + printCostMaterial;

  // ── 5. CPSX CẮT chi phí ──
  let cutCPSX;
  const cutBase = CONSTANTS.cutBase || 971;
  const cutT1 = CONSTANTS.cutThreshold1 || 0.07;
  const cutT2 = CONSTANTS.cutThreshold2 || 0.2;
  const cutM1 = CONSTANTS.cutMult1 || 1.4;
  const cutM2 = CONSTANTS.cutMult2 || 1.2;
  const cutM3 = CONSTANTS.cutMult3 || 0.8;
  if (bagArea < cutT1)           cutCPSX = cutBase * cutM1;
  else if (bagArea < cutT2)      cutCPSX = cutBase * cutM2;
  else                           cutCPSX = cutBase * cutM3;
  const cutCostCPSX = cutCPSX * (cutWaste + cutMeters) * cutWidth;
  const cutTotalCost = cutCostCPSX;

  // ── 6. TỔNG GIÁ VỐN ──
  const totalLamCost = lam1TotalCost + lam2TotalCost + lam3TotalCost;
  const totalProductionCost = printTotalCost + totalLamCost + cutTotalCost;

  // ── 7. LỢI NHUẬN ──
  const profitRate = lookupProfit(totalProductionCost, profitColumn);
  const profitAmount = profitRate * totalProductionCost;
  const revenue = totalProductionCost + profitAmount;

  // ── 8. GIÁ VỐN + LN / TÚI ──
  const costPerUnit = revenue / quantity;

  // ── 9. CHI PHÍ PHỤ / TÚI ──
  const totalThickness = layer1.thickness
    + (layer2 ? layer2.thickness : 0)
    + (layer3 ? layer3.thickness : 0)
    + (layer4 ? layer4.thickness : 0);

  // Tổng tỉ trọng (g/m²)
  // density lưu theo g/cm³ → g/m³ (×1.000.000)
  // thickness lưu theo mic → m (÷1.000.000)
  // g/m² = thickness(m) × density(g/m³) = (mic/1e6) × (g_cm3 × 1e6) = mic × g_cm3
  const layerGSM = (thk, dens) => (thk / 1000000) * (dens * 1000000);
  const totalGSM = layerGSM(layer1.thickness, layer1.density)
    + (layer2 ? layerGSM(layer2.thickness, layer2.density) : 0)
    + (layer3 ? layerGSM(layer3.thickness, layer3.density) : 0)
    + (layer4 ? layerGSM(layer4.thickness, layer4.density) : 0);

  // Zipper
  const zipperTotal = hasZipper ? (cutMeters + cutWaste) * CONSTANTS.zipperPrice : 0;
  const zipperPerUnit = zipperTotal / quantity;

  // Thùng giấy
  const actualBagsPerBox = bagsPerBox || CONSTANTS.bagsPerBoxDefault;
  const actualBoxPrice = boxPrice || CONSTANTS.boxPriceDefault;
  const numBoxes = quantity / actualBagsPerBox;
  const boxTotal = actualBoxPrice * numBoxes;
  const boxPerUnit = boxTotal / quantity;

  // Tare (gr/cái) = Tổng tỉ trọng (g/m²) × diện tích túi (m²)
  const tareWeight = totalGSM * bagArea + handleWeight;

  // Vận chuyển
  const actualShippingPerKm = shippingPerKm || CONSTANTS.shippingPerKmDefault;
  const actualShippingKm = shippingKm || CONSTANTS.shippingKmDefault;
  const shippingRate = actualShippingPerKm * actualShippingKm;
  const totalWeightTons = tareWeight * quantity / 1000000;
  const shippingTotal = totalWeightTons * shippingRate;
  const shippingPerUnit = shippingTotal / quantity;

  // Lãi vay — direct rate from payment term selection
  const paymentDays = input.paymentDays || 30;
  const interestRate30 = input.paymentInterestRate || 0.0025;
  const interestPerUnit = interestRate30 * costPerUnit;

  // Hoa hồng — supports % rate or fixed VND per unit
  const commissionFixedVND = input.commissionFixedVND || 0;
  let commissionPerUnit;
  if (commissionFixedVND > 0) {
    commissionPerUnit = commissionFixedVND;
  } else {
    commissionPerUnit = commissionRate * costPerUnit;
  }

  // ── 10. GIÁ CUỐI ──
  const finalPrice = costPerUnit + zipperPerUnit + boxPerUnit
    + shippingPerUnit + interestPerUnit + commissionPerUnit;

  // ── 11. TRỤC IN (manual input) ──
  const cylLength = input.cylLength || 0.63;
  const cylCircum = input.cylCircum || 0.4;
  const cylUnitPrice = input.cylUnitPrice || CONSTANTS.cylinderPricePerUnit;
  const cylArea = cylLength * cylCircum;
  const cylinderCostPerUnit = cylArea * cylUnitPrice;
  const cylinderCost = cylinderCostPerUnit * numColors;

  // ── 12. THỜI GIAN SX ──
  const productionDays = Math.ceil(quantity / 30000) + 4;

  // ── 13. CẤU TRÚC TEXT ──
  let structureText = layer1.name + ' ' + layer1.thickness;
  if (layer2) structureText += '//' + layer2.name + ' ' + layer2.thickness;
  if (layer3) structureText += '//' + layer3.name + ' ' + layer3.thickness;
  if (layer4) structureText += '//' + layer4.name + ' ' + layer4.thickness;

  return {
    // Đầu vào
    input,
    structureText,
    totalThickness,
    totalGSM,

    // Kích thước
    bagArea, totalArea, printWidth, filmLength,

    // Cắt
    cutWidth, cutMeters, cutWaste, cutWastePercent, cutCPSX, cutCostCPSX, cutTotalCost,

    // Ghép 1 (Layer 4 - seal)
    lam1Width, lam1Meters, lam1Waste, lam1CPSX, lam1CostCPSX, lam1CostMaterial, lam1TotalCost,

    // Ghép 2 (Layer 3 - optional)
    lam2Width, lam2Meters, lam2Waste, lam2CPSX, lam2CostCPSX, lam2CostMaterial, lam2TotalCost,

    // Ghép 3 (Layer 2 - optional)
    lam3Width, lam3Meters, lam3Waste, lam3CPSX, lam3CostCPSX, lam3CostMaterial, lam3TotalCost,

    // In
    printNLWidth, printMeters, printWaste, printCPSX, printCostCPSX, printCostMaterial, printTotalCost,

    // Tổng hợp
    totalProductionCost, totalLamCost, profitRate, profitAmount, revenue,
    costPerUnit,

    // Phụ phí
    zipperPerUnit, zipperTotal,
    boxPerUnit, boxTotal, actualBoxPrice, actualBagsPerBox, numBoxes,
    tareWeight, shippingPerUnit, shippingTotal, shippingRate,
    actualShippingPerKm, actualShippingKm,
    interestPerUnit, interestRate30, paymentDays,
    commissionPerUnit,

    // Kết quả
    finalPrice,
    cylinderCost,
    cylinderCostPerUnit,
    cylArea,
    cylLength,
    cylCircum,
    productionDays,

    // Chi tiết layers
    layers: {
      print: { material: layer1, width: printNLWidth, meters: printMeters, waste: printWaste, cpsx: printCPSX, costCPSX: printCostCPSX, costMat: printCostMaterial, total: printTotalCost },
      lam1: layer4 ? { material: layer4, width: lam1Width, meters: lam1Meters, waste: lam1Waste, costCPSX: lam1CostCPSX, costMat: lam1CostMaterial, total: lam1TotalCost } : null,
      lam2: layer3 ? { material: layer3, width: lam2Width, meters: lam2Meters, waste: lam2Waste, costCPSX: lam2CostCPSX, costMat: lam2CostMaterial, total: lam2TotalCost } : null,
      lam3: layer2 ? { material: layer2, width: lam3Width, meters: lam3Meters, waste: lam3Waste, costCPSX: lam3CostCPSX, costMat: lam3CostMaterial, total: lam3TotalCost } : null,
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
function fmtPercent(n) { 
  const val = n * 100;
  // Use minimal decimal places needed (trim trailing zeros)
  return parseFloat(val.toFixed(2)) + '%';
}
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
