import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { FaDownload, FaUpload, FaFileExcel, FaCheckCircle } from "react-icons/fa";
import { readExcelFile } from "../../../utils/excelHelper";
import { statesAndDistricts } from "../statesAndDistricts";
import api from "../../api/api";

// ── Dropdown values (exact match with AddEntry.js & backend) ─────────────────
const PRODUCT_OPTIONS      = ["Ed-Tech", "Furniture", "AV"];
const ORGANIZATION_OPTIONS = ["School", "College", "University", "Construction Agency", "Partner", "Customer", "Others"];
const CATEGORY_OPTIONS     = ["Private", "Government"];
const STATUS_OPTIONS       = ["Not Found", "Maybe", "Interested", "Not Interested", "Closed", "Not", "Service"];
const STATE_LIST           = Object.keys(statesAndDistricts);

function DMSBulkUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile]                     = useState(null);
  const [previewData, setPreviewData]       = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult]     = useState(null);

  // ── Dropdown helper: inline (short lists) ──────────────────────────────────
  const addDropdown = (ws, col, from, to, values) => {
    ws.dataValidations.add(`${col}${from}:${col}${to}`, {
      type: "list", allowBlank: true,
      formulae: [`"${values.join(",")}"`],
      showErrorMessage: true, errorStyle: "warning",
      errorTitle: "Invalid value", error: "Select from the dropdown",
      showInputMessage: true, promptTitle: "Select", prompt: "Choose from the list",
    });
  };

  // ── Dropdown helper: named range (long lists like states) ─────────────────
  const addNamedRange = (ws, hiddenWs, sheetName, col, from, to, values) => {
    values.forEach((v, i) => { hiddenWs.getCell(i + 1, 1).value = v; });
    ws.dataValidations.add(`${col}${from}:${col}${to}`, {
      type: "list", allowBlank: true,
      formulae: [`${sheetName}!$A$1:$A$${values.length}`],
      showErrorMessage: true, errorStyle: "warning",
      errorTitle: "Invalid value", error: "Select from the dropdown list",
    });
  };

  // ── Download template with real Excel dropdowns ───────────────────────────
  const downloadTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("DMS Bulk Upload");
      const wsStates = wb.addWorksheet("_States");
      wsStates.state = "veryHidden";

      ws.columns = [
        { header: "Customer Name",    key: "Customer Name",    width: 28 },
        { header: "Contact Person",   key: "Contact Person",   width: 24 },
        { header: "Email",            key: "Email",            width: 30 },
        { header: "Contact Number",   key: "Contact Number",   width: 18 },
        { header: "Alternate Number", key: "Alternate Number", width: 18 },
        { header: "Product",          key: "Product",          width: 16 },
        { header: "Address",          key: "Address",          width: 35 },
        { header: "State",            key: "State",            width: 22 },
        { header: "District",         key: "District",         width: 22 },
        { header: "Organization",     key: "Organization",     width: 22 },
        { header: "Category",         key: "Category",         width: 16 },
        { header: "Status",           key: "Status",           width: 18 },
        { header: "Remarks",          key: "Remarks",          width: 40 },
        { header: "Created At",       key: "Created At",       width: 18 },
      ];

      // Style header
      const hRow = ws.getRow(1);
      hRow.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      hRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6a11cb" } };
      hRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      hRow.height    = 30;

      // Required cols highlighted in red
      ["Customer Name", "Contact Number", "Status"].forEach((key) => {
        const cell = ws.getRow(1).getCell(ws.getColumn(key).number);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFe53935" } };
      });

      // Sample rows
      ws.addRow({
        "Customer Name": "Sunrise Public School", "Contact Person": "Mr. Verma",
        "Email": "school@sunrise.com", "Contact Number": "9876543210",
        "Alternate Number": "", "Product": "Ed-Tech",
        "Address": "12 Station Road", "State": "Bihar", "District": "Patna",
        "Organization": "School", "Category": "Government",
        "Status": "Interested", "Remarks": "Demo booked", "Created At": "",
      });
      ws.addRow({
        "Customer Name": "City Furniture Hub", "Contact Person": "Ms. Priya",
        "Email": "info@cityfurni.com", "Contact Number": "8765432109",
        "Alternate Number": "9988776655", "Product": "Furniture",
        "Address": "78 Ring Road", "State": "Maharashtra", "District": "Mumbai",
        "Organization": "Customer", "Category": "Private",
        "Status": "Maybe", "Remarks": "Follow up next week", "Created At": "",
      });

      // Dropdowns (rows 2–1001)
      const F = 2, T = 1001;
      const CL = (key) => ws.getColumn(key).letter;
      addDropdown(ws, CL("Product"),      F, T, PRODUCT_OPTIONS);
      addDropdown(ws, CL("Organization"), F, T, ORGANIZATION_OPTIONS);
      addDropdown(ws, CL("Category"),     F, T, CATEGORY_OPTIONS);
      addDropdown(ws, CL("Status"),       F, T, STATUS_OPTIONS);
      addNamedRange(ws, wsStates, "_States", CL("State"), F, T, STATE_LIST);

      // Number formats
      ws.getColumn("Contact Number").numFmt   = "@";
      ws.getColumn("Alternate Number").numFmt = "@";

      // Instructions sheet
      const wsInfo = wb.addWorksheet("Instructions");
      wsInfo.columns = [
        { header: "Column",      key: "col",  width: 26 },
        { header: "Required",    key: "req",  width: 12 },
        { header: "Description", key: "desc", width: 65 },
        { header: "Example",     key: "ex",   width: 38 },
      ];
      wsInfo.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      wsInfo.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2575fc" } };
      [
        { col: "Customer Name",    req: "YES *", desc: "Full name of customer or institution",                   ex: "Sunrise Public School" },
        { col: "Contact Person",   req: "No",    desc: "Name of contact person",                                 ex: "Mr. Verma" },
        { col: "Email",            req: "No",    desc: "Email address",                                          ex: "info@school.com" },
        { col: "Contact Number",   req: "YES *", desc: "Exactly 10 digits, no spaces",                          ex: "9876543210" },
        { col: "Alternate Number", req: "No",    desc: "Alternate 10-digit number",                             ex: "8765432109" },
        { col: "Product",          req: "No",    desc: "Select: Ed-Tech / Furniture / AV",                      ex: "Ed-Tech" },
        { col: "Address",          req: "No",    desc: "Full address",                                          ex: "12 Station Road" },
        { col: "State",            req: "No",    desc: "Select from dropdown - Indian state",                   ex: "Bihar" },
        { col: "District",         req: "No",    desc: "District name (city field in the system)",              ex: "Patna" },
        { col: "Organization",     req: "No",    desc: "Select: School / College / University / etc.",          ex: "School" },
        { col: "Category",         req: "No",    desc: "Select: Private or Government",                        ex: "Government" },
        { col: "Status",           req: "YES *", desc: "Select: Not Found / Maybe / Interested / etc.",        ex: "Interested" },
        { col: "Remarks",          req: "No",    desc: "Notes or comments",                                     ex: "Demo booked" },
        { col: "Created At",       req: "No",    desc: "Entry date (defaults to today). Format: DD/MM/YYYY",   ex: "22/06/2026" },
      ].forEach((r) => wsInfo.addRow(r));

      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href = url; a.download = `DMS_Bulk_Upload_Template_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success("Template downloaded! Fill in data and upload.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate template.");
    }
  };

  // ── Parse uploaded file ───────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!/\.(xlsx|xls)$/i.test(selectedFile.name)) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
    setFile(selectedFile);
    setValidationErrors([]);
    setPreviewData([]);
    setUploadResult(null);

    try {
      const parsedData = await readExcelFile(selectedFile);
      if (!parsedData.length) { toast.error("No data found in file!"); setFile(null); return; }

      const errors = [];
      parsedData.forEach((row, idx) => {
        const rowNum = idx + 2;
        if (!row["Customer Name"]) errors.push(`Row ${rowNum}: Customer Name is required`);
        if (!row["Status"])        errors.push(`Row ${rowNum}: Status is required`);
        const mob = row["Contact Number"] ? String(row["Contact Number"]).replace(/\s/g,"") : "";
        if (mob && !/^\d{10}$/.test(mob)) errors.push(`Row ${rowNum}: Contact Number must be exactly 10 digits`);
        if (row["Status"] && !STATUS_OPTIONS.includes(row["Status"]))
          errors.push(`Row ${rowNum}: Status "${row["Status"]}" is not valid`);
        if (row["Product"] && !PRODUCT_OPTIONS.includes(row["Product"]))
          errors.push(`Row ${rowNum}: Product "${row["Product"]}" is not valid`);
      });

      setPreviewData(parsedData.slice(0, 10));
      setValidationErrors(errors);
      if (errors.length > 0) toast.warning(`${errors.length} validation issue(s) found.`);
      else toast.success(`Parsed ${parsedData.length} rows — ready to upload!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse file. Please use the provided template.");
      setFile(null);
    }
  };

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file first"); return; }
    if (validationErrors.length > 0) { toast.error("Fix validation errors first"); return; }

    setLoading(true);
    setUploadProgress(0);
    const timer = setInterval(() => setUploadProgress((p) => Math.min(p + 7, 88)), 300);

    try {
      const parsedData = await readExcelFile(file);
      const entries = parsedData.map((item) => ({
        "Customer Name":    item["Customer Name"]    || "",
        "Contact Person":   item["Contact Person"]   || "",
        "Email":            item["Email"]            || "",
        "Contact Number":   item["Contact Number"] ? String(item["Contact Number"]).replace(/\s/g,"") : "",
        "Alternate Number": item["Alternate Number"] ? String(item["Alternate Number"]).replace(/\s/g,"") : "",
        "Product":          item["Product"]          || "",
        "Address":          item["Address"]          || "",
        "State":            item["State"]            || "",
        "District":         item["District"]         || "",
        "Organization":     item["Organization"]     || "",
        "Category":         item["Category"]         || "",
        "Status":           item["Status"]            || "Not Found",
        "Remarks":          item["Remarks"]           || "",
        "Created At":       item["Created At"]        || null,
      })).filter((e) => Object.values(e).some((v) => v && String(v).trim() !== ""));

      const res = await api.post("/api/entries", entries, { timeout: 300000 });
      clearInterval(timer);
      setUploadProgress(100);

      const { totalRecords, added, duplicatesSkipped, failed } = res.data;
      setUploadResult({ totalRecords, added, duplicatesSkipped, failed });

      if (added > 0) {
        toast.success(`Upload complete — ${added} entries added!`);
        onUploadComplete?.();
      } else {
        toast.warn(`Upload done — ${duplicatesSkipped} duplicates skipped, ${failed} failed.`);
      }
    } catch (err) {
      clearInterval(timer);
      const msg = err.response?.data?.message || (err.code === "ECONNABORTED" ? "Timed out — try fewer rows" : "Upload failed");
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null); setPreviewData([]); setValidationErrors([]);
    setUploadProgress(0); setUploadResult(null);
  };
  const handleClose = () => { if (!loading) { resetForm(); onClose(); } };

  // ── Status badge ─────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      "Interested":     { bg: "#d1fae5", color: "#065f46" },
      "Maybe":          { bg: "#fef3c7", color: "#92400e" },
      "Not Found":      { bg: "#f3f4f6", color: "#374151" },
      "Not Interested": { bg: "#fee2e2", color: "#991b1b" },
      "Closed":         { bg: "#dbeafe", color: "#1e40af" },
      "Not":            { bg: "#fce7f3", color: "#9d174d" },
      "Service":        { bg: "#ede9fe", color: "#5b21b6" },
    };
    const s = map[status] || { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, background: s.bg, color: s.color }}>
        {status || "-"}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static" centered>

      {/* Header */}
      <Modal.Header closeButton={!loading} style={{
        background: "linear-gradient(135deg,#6a11cb 0%,#2575fc 100%)",
        color: "white", padding: "14px 22px",
      }}>
        <Modal.Title style={{ fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
          <FaUpload style={{ fontSize: "1rem" }} /> DMS Bulk Upload
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "18px 22px", background: "#f8f9fa" }}>

        {/* Step chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[{ n: "1", label: "Download Template" }, { n: "2", label: "Fill in Data" }, { n: "3", label: "Upload File" }].map(({ n, label }) => (
            <div key={n} style={{ flex: 1, background: "white", borderRadius: 8, padding: "8px 10px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#6a11cb,#2575fc)", color: "white", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Download + Upload cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>

          {/* Download card */}
          <div style={{ flex: 1, background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaFileExcel style={{ color: "#6a11cb", marginRight: 5 }} />Get Template
            </div>
            <button onClick={downloadTemplate}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 7, border: "1.5px solid #6a11cb", background: "white", color: "#6a11cb", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", width: "fit-content" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#6a11cb"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#6a11cb"; }}
            >
              <FaDownload /> Download Template
            </button>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Dropdowns for Product, Organization, Category, Status &amp; State &middot; Red = required
            </div>
          </div>

          {/* Upload card */}
          <div style={{ flex: 1, background: "white", borderRadius: 10, padding: "14px 16px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaUpload style={{ color: "#2575fc", marginRight: 5 }} />Upload Filled File
            </div>
            <Form.Control type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={loading} size="sm"
              style={{ borderRadius: 7, fontSize: "0.8rem", border: "1.5px solid #e5e7eb" }} />
            {file ? (
              <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                {file.name} &mdash; <strong>{previewData.length}+ rows</strong>
              </div>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Excel .xlsx / .xls only</div>
            )}
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <Alert variant="warning" style={{ borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", marginBottom: 10 }}>
            <strong>&#9888; {validationErrors.length} issue(s) found</strong>
            <ul style={{ maxHeight: 100, overflowY: "auto", marginBottom: 0, marginTop: 4, paddingLeft: 18 }}>
              {validationErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              {validationErrors.length > 10 && <li>...and {validationErrors.length - 10} more</li>}
            </ul>
          </Alert>
        )}

        {/* Progress bar */}
        {loading && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 18, borderRadius: 8, background: "#e5e7eb", overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${uploadProgress}%`, background: "linear-gradient(90deg,#6a11cb,#2575fc)", transition: "width 0.3s ease", borderRadius: 8 }} />
              <span style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", fontSize: "0.7rem", fontWeight: 700, color: "white", lineHeight: "18px" }}>
                {uploadProgress}%
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}>Uploading, please wait...</div>
          </div>
        )}

        {/* Upload result */}
        {uploadResult && !loading && (
          <div style={{ background: "white", borderRadius: 10, padding: "12px 16px", border: "1px solid #d1fae5", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#065f46", marginBottom: 8, fontSize: "0.85rem" }}>
              <FaCheckCircle /> Upload Complete
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[
                { label: "Total",      value: uploadResult.totalRecords, bg: "#f3f4f6", color: "#374151" },
                { label: "Added",      value: uploadResult.added,        bg: "#d1fae5", color: "#065f46" },
                { label: "Duplicates", value: uploadResult.duplicatesSkipped, bg: "#fef3c7", color: "#92400e" },
                { label: "Failed",     value: uploadResult.failed,       bg: "#fee2e2", color: "#991b1b" },
              ].map(({ label, value, bg, color }) => (
                <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: "8px 0", textAlign: "center" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: "0.68rem", color, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview table */}
        {previewData.length > 0 && !loading && (
          <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "white", overflow: "hidden" }}>
            <div style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6a11cb,#2575fc)", color: "white", fontSize: "0.78rem", fontWeight: 700 }}>
              Preview &mdash; first {previewData.length} rows
            </div>
            <div style={{ overflowX: "auto", maxHeight: 200 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    {["#", "Customer", "Contact No.", "Product", "State / District", "Status"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "5px 10px", color: "#9ca3af" }}>{idx + 1}</td>
                      <td style={{ padding: "5px 10px", fontWeight: 600 }}>{row["Customer Name"] || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{row["Contact Number"] || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{row["Product"] || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{[row["State"], row["District"]].filter(Boolean).join(" / ") || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{statusBadge(row["Status"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer style={{ padding: "10px 22px", background: "white", borderTop: "1px solid #e5e7eb", gap: 8 }}>
        <Button variant="light" onClick={handleClose} disabled={loading}
          style={{ borderRadius: 7, fontSize: "0.85rem", fontWeight: 600, border: "1px solid #d1d5db" }}>
          {uploadResult ? "Close" : "Cancel"}
        </Button>
        {!uploadResult && (
          <button onClick={handleUpload}
            disabled={!file || validationErrors.length > 0 || loading}
            style={{
              borderRadius: 7, fontSize: "0.85rem", fontWeight: 700, padding: "7px 22px",
              display: "flex", alignItems: "center", gap: 7, border: "none",
              background: (!file || validationErrors.length > 0 || loading)
                ? "#9ca3af"
                : "linear-gradient(135deg,#6a11cb,#2575fc)",
              color: "white", cursor: (!file || validationErrors.length > 0 || loading) ? "not-allowed" : "pointer",
            }}>
            <FaUpload /> {loading ? "Uploading..." : `Upload${previewData.length > 0 ? ` ${previewData.length}+ Entries` : ""}`}
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default DMSBulkUploadModal;
