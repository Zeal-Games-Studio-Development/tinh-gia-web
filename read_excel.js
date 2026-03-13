const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Tinh gia tui LTS 2023 S1 (1).xlsx');
const workbook = XLSX.readFile(filePath, { cellFormula: true, cellStyles: true });

const lines = [];

lines.push('=== SHEET NAMES ===');
lines.push(JSON.stringify(workbook.SheetNames));
lines.push('');

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  lines.push(`\n========== SHEET: "${sheetName}" ==========`);
  lines.push(`Range: ${sheet['!ref']}`);
  lines.push(`Rows: ${range.e.r - range.s.r + 1}, Cols: ${range.e.c - range.s.c + 1}`);
  
  // Check for merged cells
  if (sheet['!merges'] && sheet['!merges'].length > 0) {
    lines.push(`\nMerged cells (${sheet['!merges'].length}):`);
    sheet['!merges'].forEach(m => {
      const startCell = XLSX.utils.encode_cell(m.s);
      const endCell = XLSX.utils.encode_cell(m.e);
      lines.push(`  ${startCell}:${endCell}`);
    });
  }
  
  lines.push('\n--- Cell Data (with formulas) ---');
  
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 120); r++) {
    const rowData = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellRef];
      if (cell) {
        let info = `${cellRef}:v=${JSON.stringify(cell.v)}`;
        if (cell.f) info += ` f="${cell.f}"`;
        if (cell.t) info += ` t=${cell.t}`;
        rowData.push(info);
      }
    }
    if (rowData.length > 0) {
      lines.push(`Row${r + 1}: ${rowData.join(' | ')}`);
    }
  }
});

fs.writeFileSync(path.join(__dirname, 'excel_output.txt'), lines.join('\n'), 'utf-8');
console.log('Done! Written to excel_output.txt');
