/**
 * Frontend Excel helper — replaces xlsx with exceljs/browser.
 *
 * MIGRATION GUIDE (xlsx → exceljs):
 *
 * BEFORE (xlsx export):
 *   import * as XLSX from "xlsx";
 *   const ws = XLSX.utils.json_to_sheet(data);
 *   const wb = XLSX.utils.book_new();
 *   XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
 *   XLSX.writeFile(wb, "export.xlsx");
 *
 * AFTER:
 *   import { exportToExcel } from "../../utils/excelHelper";
 *   await exportToExcel(data, "Sheet1", "export.xlsx");
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * BEFORE (xlsx bulk upload read):
 *   const workbook = XLSX.read(data, { type: "array" });
 *   const sheet = workbook.Sheets[workbook.SheetNames[0]];
 *   const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
 *
 * AFTER:
 *   import { readExcelFile } from "../../utils/excelHelper";
 *   const rows = await readExcelFile(file); // returns array of row objects
 */
import ExcelJS from "exceljs/dist/exceljs.bare.min.js";

/**
 * Export an array of objects to an .xlsx file and trigger browser download.
 *
 * @param {object[]} rows       — data rows (keys become column headers)
 * @param {string}   sheetName  — worksheet tab name
 * @param {string}   filename   — download filename (include .xlsx)
 * @param {object}   [colWidths] — optional: { "Column Header": 20 }
 */
export async function exportToExcel(rows, sheetName = "Sheet1", filename = "export.xlsx", colWidths = {}) {
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (!rows || rows.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    triggerDownload(buffer, filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  worksheet.columns = headers.map((key) => ({
    header: key,
    key,
    width: colWidths[key] || Math.max(key.length + 4, 14),
  }));

  // Bold header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern", pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer, filename);
}

/**
 * Read an .xlsx File object (from <input type="file">) and return rows as objects.
 *
 * @param {File} file
 * @returns {Promise<object[]>}
 */
export async function readExcelFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook    = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows    = [];
  let   headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // index 0 is always undefined in exceljs

    if (rowNumber === 1) {
      headers = values.map((v) => (v?.toString() ?? "").trim());
      return;
    }

    if (values.every((v) => v === null || v === undefined || v === "")) return;

    const obj = {};
    headers.forEach((header, i) => {
      let val = values[i];
      if (val && typeof val === "object" && val.richText) {
        val = val.richText.map((r) => r.text).join("");
      }
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      }
      obj[header] = val ?? null;
    });
    rows.push(obj);
  });

  return rows;
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
