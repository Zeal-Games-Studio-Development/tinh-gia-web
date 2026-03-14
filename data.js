// ============================================================
// DATABASE NGUYÊN LIỆU - Lấy từ Data2023 sheet
// ============================================================
const MATERIALS = [
  { id: 'PET', name: 'PET 12mic', density: 1.4, thickness: 12, pricePerKg: 34091, isPETorPA: true, rollLength: 6000 },
  { id: 'PA', name: 'PA 15mic', density: 1.16, thickness: 15, pricePerKg: 70000, isPETorPA: true, rollLength: 6000 },
  { id: 'MPET', name: 'MPET 12mic', density: 1.4, thickness: 12, pricePerKg: 40909, isPETorPA: false, rollLength: 6000 },
  { id: 'CPP25', name: 'CPP 25mic', density: 0.92, thickness: 25, pricePerKg: 40909, isPETorPA: false, rollLength: 6000 },
  { id: 'CPP50', name: 'CPP 50mic', density: 0.92, thickness: 50, pricePerKg: 40909, isPETorPA: false, rollLength: 6000 },
  { id: 'LLDPE', name: 'LLDPE 120mic', density: 0.925, thickness: 120, pricePerKg: 40000, isPETorPA: false, adjustableMic: true, rollLength: 6000 },
  { id: 'AL', name: 'Nhôm AL 6mic', density: 2.76, thickness: 6, pricePerKg: 110909, isPETorPA: false, rollLength: 6000 },
  { id: 'BOPP18', name: 'BOPP 18mic', density: 0.91, thickness: 18, pricePerKg: 41364, isPETorPA: false, rollLength: 4000 },
  { id: 'BOPP20', name: 'BOPP 20mic', density: 0.91, thickness: 20, pricePerKg: 41364, isPETorPA: false, rollLength: 4000 },
  { id: 'BOPP30', name: 'BOPP 30mic', density: 0.91, thickness: 30, pricePerKg: 40000, isPETorPA: false, rollLength: 4000 },
  { id: 'MattBOPP20', name: 'Matt BOPP 20mic', density: 0.88, thickness: 20, pricePerKg: 50000, isPETorPA: false, rollLength: 4000 },
  { id: 'MangNgoc40', name: 'Màng ngọc 40mic', density: 0.604, thickness: 40, pricePerKg: 63636, isPETorPA: false, rollLength: 6000 },
  { id: 'MangNgoc60', name: 'Màng ngọc 60mic', density: 0.604, thickness: 60, pricePerKg: 73000, isPETorPA: false, rollLength: 6000 },
  { id: 'MCPP25', name: 'MCPP 25mic', density: 0.91, thickness: 25, pricePerKg: 49000, isPETorPA: false, rollLength: 6000 },
];

// Tính giá VNĐ/m² = pricePerKg × thickness × density / 1000
MATERIALS.forEach(m => {
  m.pricePerM2 = m.pricePerKg * m.thickness * m.density / 1000;
});

// ============================================================
// BẢNG SET-UP PHI HAO THEO SỐ MÀU IN (H91 logic)
// ============================================================
const COLOR_SETUP = { 1: 400, 2: 500, 3: 800, 4: 1000, 5: 1200, 6: 1500, 7: 1700, 8: 1800 };

// ============================================================
// BẢNG LỢI NHUẬN - Kết hợp Data2023 + TRANG S66:X73
// col1 = Túi thường (3,4 biên, 2 lớp)
// col2 = Túi zip, đáy đứng, 3 lớp
// ============================================================
const PROFIT_TABLE = [
  { threshold: 9900000,   col1: 0.50, col2: 0.80 },
  { threshold: 19000000,  col1: 0.22, col2: 0.42 },
  { threshold: 30000000,  col1: 0.17, col2: 0.27 },
  { threshold: 40000000,  col1: 0.11, col2: 0.20 },
  { threshold: 60000000,  col1: 0.08, col2: 0.19 },
  { threshold: 80000000,  col1: 0.08, col2: 0.18 },
  { threshold: 100000000, col1: 0.075, col2: 0.17 },
  { threshold: 150000000, col1: 0.07, col2: 0.16 },
  { threshold: 200000000, col1: 0.07, col2: 0.16 },
  { threshold: 300000000, col1: 0.06, col2: 0.15 },
  { threshold: 400000000, col1: 0.05, col2: 0.15 },
  { threshold: 600000000, col1: 0.05, col2: 0.15 },
];
const PROFIT_DEFAULT = { col1: 0.04, col2: 0.11 };

// ============================================================
// HẰNG SỐ
// ============================================================
const CONSTANTS = {
  zipperPrice: 378,            // VNĐ/m (=360*1.05)
  boxPriceDefault: 18000,      // VNĐ/thùng (mặc định)
  bagsPerBoxDefault: 1000,     // túi/thùng (mặc định)
  interestRate: 0.10,          // 10%/năm
  paymentDays: 30,             // ngày thanh toán
  cylinderPricePerUnit: 7300000, // VNĐ/đơn vị trục
  ghepCPSX: 684,               // CPSX ghép cố định/m
  shippingPerKmDefault: 5000,  // VNĐ/km/tấn (mặc định)
  shippingKmDefault: 200,      // km mặc định
  baseCPSX: 318,               // CPSX cơ bản cố định
};

// ============================================================
// HÀM LOOKUP
// ============================================================
function getMaterial(id) {
  return MATERIALS.find(m => m.id === id) || null;
}

function lookupProfit(totalCost, column) {
  const col = column === 1 ? 'col1' : 'col2';
  for (const row of PROFIT_TABLE) {
    if (totalCost < row.threshold) return row[col];
  }
  return PROFIT_DEFAULT[col];
}
