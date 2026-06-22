import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";
import { FaDownload, FaUpload } from "react-icons/fa";
import { readExcelFile } from "../../../utils/excelHelper";
import { statesAndCities } from "../Options";

// Dropdown values (must match AddEntry.js)
const STATUS_OPTIONS = ["Not Found", "Maybe", "Interested", "Not Interested", "Closed"];
const TYPE_OPTIONS = ["Direct Client", "Partner"];
const CATEGORY_OPTIONS = ["Private", "Government"];
const ORGANIZATION_OPTIONS = [
  "Hospital", "Govt department", "Corporate", "Private coaching",
  "Private school", "Private college", "Govt school", "Govt college",
  "Govt aided college", "Ngo", "Dealer/partner", "Others",
];
const STATE_LIST = Object.keys(statesAndCities);

function NormalBulkUploadModal({ isOpen, onClose, onFileSelected }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);

  // Helper: inline dropdown for short lists
  const addDropdown = (ws, colLetter, fromRow, toRow, values) => {
    ws.dataValidations.add(`${colLetter}${fromRow}:${colLetter}${toRow}`, {
      type: "list",
      allowBlank: true,
      formulae: [`"${values.join(",")}"`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Invalid value",
      error: "Please select a value from the dropdown",
      showInputMessage: true,
      promptTitle: "Select",
      prompt: "Choose from the list",
    });
  };

  // Helper: named-range dropdown for long lists (states)
  const addNamedRangeDropdown = (ws, hiddenWs, sheetName, colLetter, fromRow, toRow, values) => {
    values.forEach((val, i) => { hiddenWs.getCell(i + 1, 1).value = val; });
    ws.dataValidations.add(`${colLetter}${fromRow}:${colLetter}${toRow}`, {
      type: "list",
      allowBlank: true,
      formulae: [`${sheetName}!$A$1:$A$${values.length}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Invalid value",
      error: "Please select from the dropdown list",
    });
  };

  const downloadTemplate = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Bulk Upload");

      const wsStates = wb.addWorksheet("_States");
      wsStates.state = "veryHidden";

      ws.columns = [
        { header: "Customer_Name",         key: "Customer_Name",         width: 25 },
        { header: "Customer_Email",        key: "Customer_Email",        width: 30 },
        { header: "Mobile_Number",         key: "Mobile_Number",         width: 18 },
        { header: "Contact_Person",        key: "Contact_Person",        width: 22 },
        { header: "Address",               key: "Address",               width: 35 },
        { header: "State",                 key: "State",                 width: 20 },
        { header: "City",                  key: "City",                  width: 20 },
        { header: "Organization",          key: "Organization",          width: 25 },
        { header: "Category",              key: "Category",              width: 16 },
        { header: "Type",                  key: "Type",                  width: 16 },
        { header: "Status",                key: "Status",                width: 18 },
        { header: "Close_Type",            key: "Close_Type",            width: 16 },
        { header: "Estimated_Value",       key: "Estimated_Value",       width: 18 },
        { header: "Close_Amount",          key: "Close_Amount",          width: 16 },
        { header: "Remarks",               key: "Remarks",               width: 40 },
        { header: "Live_Location",         key: "Live_Location",         width: 22 },
        { header: "Next_Action",           key: "Next_Action",           width: 25 },
        { header: "First_Person_Met",      key: "First_Person_Met",      width: 20 },
        { header: "Second_Person_Met",     key: "Second_Person_Met",     width: 20 },
        { header: "Third_Person_Met",      key: "Third_Person_Met",      width: 20 },
        { header: "Fourth_Person_Met",     key: "Fourth_Person_Met",     width: 20 },
        { header: "Expected_Closing_Date", key: "Expected_Closing_Date", width: 22 },
        { header: "Follow_Up_Date",        key: "Follow_Up_Date",        width: 18 },
        { header: "Products",              key: "Products",              width: 60 },
        { header: "CreatedAt",             key: "CreatedAt",             width: 18 },
      ];

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF667eea" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      headerRow.height    = 30;

      // Mark required columns red
      ["Customer_Name", "Mobile_Number", "Status"].forEach((key) => {
        const cell = ws.getRow(1).getCell(ws.getColumn(key).number);
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFe53935" } };
      });

      // Sample rows
      ws.addRow({
        Customer_Name: "Example School",
        Customer_Email: "school@example.com",
        Mobile_Number: "9876543210",
        Contact_Person: "Mr. Sharma",
        Address: "123 MG Road",
        State: "Bihar",
        City: "Patna",
        Organization: "Govt school",
        Category: "Government",
        Type: "Direct Client",
        Status: "Interested",
        Close_Type: "",
        Estimated_Value: 50000,
        Close_Amount: 0,
        Remarks: "Demo scheduled next week",
        Next_Action: "Follow up call",
        First_Person_Met: "Principal",
        Second_Person_Met: "",
        Third_Person_Met: "",
        Fourth_Person_Met: "",
        Expected_Closing_Date: "30/06/2026",
        Follow_Up_Date: "25/06/2026",
        Products: "IFPD (Spec: Android 13, 8GB RAM, 128GB ROM, 65 inch, Qty: 2)",
        CreatedAt: "22/06/2026",
      });

      ws.addRow({
        Customer_Name: "Corporate Ltd",
        Customer_Email: "info@corporate.com",
        Mobile_Number: "8765432109",
        Contact_Person: "Ms. Gupta",
        Address: "45 Park Street",
        State: "Maharashtra",
        City: "Mumbai",
        Organization: "Corporate",
        Category: "Private",
        Type: "Partner",
        Status: "Maybe",
        Close_Type: "",
        Estimated_Value: 120000,
        Close_Amount: 0,
        Remarks: "Needs approval from management",
        Next_Action: "Send quotation",
        First_Person_Met: "IT Manager",
        Second_Person_Met: "Director",
        Third_Person_Met: "",
        Fourth_Person_Met: "",
        Expected_Closing_Date: "15/07/2026",
        Follow_Up_Date: "28/06/2026",
        Products: "OPS (Spec: i5 12th Gen, 8GB RAM, 256GB ROM, N/A, Qty: 5); IFPD (Spec: Android 14, 8GB RAM, 128GB ROM, 75 inch, Qty: 3)",
        CreatedAt: "20/06/2026",
      });

      // Dropdowns (rows 2-1001)
      const DATA_FROM = 2;
      const DATA_TO   = 1001;
      const CL = (key) => ws.getColumn(key).letter;

      addDropdown(ws, CL("Status"),       DATA_FROM, DATA_TO, STATUS_OPTIONS);
      addDropdown(ws, CL("Close_Type"),   DATA_FROM, DATA_TO, ["", "Closed Won", "Closed Lost"]);
      addDropdown(ws, CL("Type"),         DATA_FROM, DATA_TO, TYPE_OPTIONS);
      addDropdown(ws, CL("Category"),     DATA_FROM, DATA_TO, CATEGORY_OPTIONS);
      addDropdown(ws, CL("Organization"), DATA_FROM, DATA_TO, ORGANIZATION_OPTIONS);
      addNamedRangeDropdown(ws, wsStates, "_States", CL("State"), DATA_FROM, DATA_TO, STATE_LIST);

      // Number / text formats
      ws.getColumn("Estimated_Value").numFmt = "#,##0";
      ws.getColumn("Close_Amount").numFmt    = "#,##0";
      ws.getColumn("Mobile_Number").numFmt   = "@";

      // Instructions sheet
      const wsInfo = wb.addWorksheet("Instructions");
      wsInfo.columns = [
        { header: "Column",      key: "col",  width: 28 },
        { header: "Required",    key: "req",  width: 12 },
        { header: "Description", key: "desc", width: 70 },
        { header: "Example",     key: "ex",   width: 40 },
      ];
      const infoHeaderRow = wsInfo.getRow(1);
      infoHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      infoHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF764ba2" } };

      [
        { col: "Customer_Name",         req: "YES *", desc: "Full name of customer or school/org",                                          ex: "ABC Public School" },
        { col: "Customer_Email",        req: "No",    desc: "Customer email address",                                                        ex: "abc@school.com" },
        { col: "Mobile_Number",         req: "YES *", desc: "Exactly 10 digits, no spaces/dashes",                                          ex: "9876543210" },
        { col: "Contact_Person",        req: "No",    desc: "Name of person you spoke to",                                                  ex: "Mr. Sharma" },
        { col: "Address",               req: "No",    desc: "Street address",                                                               ex: "123 MG Road" },
        { col: "State",                 req: "No",    desc: "Select from dropdown - Indian state name",                                     ex: "Bihar" },
        { col: "City",                  req: "No",    desc: "City name",                                                                    ex: "Patna" },
        { col: "Organization",          req: "No",    desc: "Select from dropdown: Hospital, Govt school, Corporate, etc.",                 ex: "Govt school" },
        { col: "Category",              req: "No",    desc: "Select: Private or Government",                                                ex: "Government" },
        { col: "Type",                  req: "No",    desc: "Select: Direct Client or Partner",                                             ex: "Direct Client" },
        { col: "Status",                req: "YES *", desc: "Select: Not Found / Maybe / Interested / Not Interested / Closed",             ex: "Interested" },
        { col: "Close_Type",            req: "No",    desc: "Only if Status=Closed. Select: Closed Won or Closed Lost",                     ex: "Closed Won" },
        { col: "Estimated_Value",       req: "No",    desc: "Deal value in Rs (numbers only)",                                             ex: "50000" },
        { col: "Close_Amount",          req: "No",    desc: "Final closed amount in Rs (if Status=Closed)",                                ex: "45000" },
        { col: "Remarks",               req: "No",    desc: "Any notes or comments",                                                        ex: "Demo scheduled" },
        { col: "Live_Location",         req: "No",    desc: "GPS: latitude, longitude",                                                    ex: "25.5941, 85.1376" },
        { col: "Next_Action",           req: "No",    desc: "What to do next",                                                              ex: "Follow up call" },
        { col: "First_Person_Met",      req: "No",    desc: "Name/title of 1st person you met",                                            ex: "Principal" },
        { col: "Second_Person_Met",     req: "No",    desc: "Name/title of 2nd person you met",                                            ex: "Vice Principal" },
        { col: "Third_Person_Met",      req: "No",    desc: "Name/title of 3rd person you met",                                            ex: "" },
        { col: "Fourth_Person_Met",     req: "No",    desc: "Name/title of 4th person you met",                                            ex: "" },
        { col: "Expected_Closing_Date", req: "No",    desc: "Expected deal close date. Format: DD/MM/YYYY",                                ex: "30/06/2026" },
        { col: "Follow_Up_Date",        req: "No",    desc: "Next follow-up date. Format: DD/MM/YYYY",                                     ex: "25/06/2026" },
        { col: "Products",              req: "No",    desc: "Format: Name (Spec: SPEC, SIZE, Qty: N). Separate multiple with semicolon ;", ex: "IFPD (Spec: Android 13, 8GB RAM, 128GB ROM, 65 inch, Qty: 2)" },
        { col: "CreatedAt",             req: "No",    desc: "Entry date (defaults to today if blank). Format: DD/MM/YYYY",                 ex: "22/06/2026" },
      ].forEach((r) => wsInfo.addRow(r));

      // Download
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href       = url;
      a.download   = `CRM_Bulk_Upload_Template_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Template downloaded! Fill in data and upload.");
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate template. Please try again.");
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setFile(selectedFile);
    setValidationErrors([]);

    try {
      const parsedData = await readExcelFile(selectedFile);

      if (!parsedData.length) {
        toast.error("No data found in file!");
        setFile(null);
        setPreviewData([]);
        return;
      }

      const errors = [];
      parsedData.forEach((row, idx) => {
        const rowNum = idx + 2;
        if (!row.Customer_Name || !row.Status) {
          errors.push(`Row ${rowNum}: Missing required fields (Customer_Name or Status)`);
        }
        if (row.Mobile_Number && !/^\d{10}$/.test(String(row.Mobile_Number))) {
          errors.push(`Row ${rowNum}: Invalid mobile number (must be exactly 10 digits)`);
        }
      });

      setPreviewData(parsedData.slice(0, 10));
      setValidationErrors(errors);

      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} validation error(s). Please review before uploading.`);
      } else {
        toast.success(`Parsed ${parsedData.length} rows successfully!`);
      }
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      toast.error("Failed to parse Excel file. Please check the format.");
      setFile(null);
      setPreviewData([]);
    }
  };

  const handleUpload = () => {
    if (!file) { toast.error("Please select an Excel file to upload"); return; }
    if (validationErrors.length > 0) { toast.error("Please fix validation errors before uploading"); return; }

    if (onFileSelected) {
      onFileSelected({ target: { files: [file] } });
    }
    onClose();
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setValidationErrors([]);
    onClose();
  };

  // Status badge helper
  const statusBadge = (status) => {
    const map = {
      "Interested":     { bg: "#d1fae5", color: "#065f46" },
      "Maybe":          { bg: "#fef3c7", color: "#92400e" },
      "Not Found":      { bg: "#f3f4f6", color: "#374151" },
      "Not Interested": { bg: "#fee2e2", color: "#991b1b" },
      "Closed":         { bg: "#dbeafe", color: "#1e40af" },
    };
    const s = map[status] || { bg: "#f3f4f6", color: "#374151" };
    return (
      <span style={{
        padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700,
        background: s.bg, color: s.color,
      }}>{status || "-"}</span>
    );
  };

  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static" centered>

      {/* Header */}
      <Modal.Header closeButton style={{
        background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
        color: "white", padding: "14px 22px",
      }}>
        <Modal.Title style={{ fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
          <FaUpload style={{ fontSize: "1rem" }} /> Bulk Upload
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "18px 22px", background: "#f8f9fa" }}>

        {/* Step chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { n: "1", label: "Download Template" },
            { n: "2", label: "Fill in Data" },
            { n: "3", label: "Upload File" },
          ].map(({ n, label }) => (
            <div key={n} style={{
              flex: 1, background: "white", borderRadius: 8, padding: "8px 10px",
              border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                color: "white", fontSize: "0.72rem", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{n}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Download + Upload row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>

          {/* Download card */}
          <div style={{
            flex: 1, background: "white", borderRadius: 10, padding: "14px 16px",
            border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaDownload style={{ color: "#667eea", marginRight: 5 }} />Get Template
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 7, border: "1.5px solid #667eea", background: "white",
                color: "#667eea", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
                width: "fit-content",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#667eea"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#667eea"; }}
            >
              <FaDownload /> Download Template
            </button>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Dropdowns for Status, Type, Category, Organization &amp; State &middot; Red = required
            </div>
          </div>

          {/* Upload card */}
          <div style={{
            flex: 1, background: "white", borderRadius: 10, padding: "14px 16px",
            border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaUpload style={{ color: "#764ba2", marginRight: 5 }} />Upload Filled File
            </div>
            <Form.Control
              type="file" accept=".xlsx,.xls" onChange={handleFileChange} size="sm"
              style={{ borderRadius: 7, fontSize: "0.8rem", border: "1.5px solid #e5e7eb" }}
            />
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

        {/* Preview table */}
        {previewData.length > 0 && (
          <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "white", overflow: "hidden" }}>
            <div style={{
              padding: "8px 14px", background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "white", fontSize: "0.78rem", fontWeight: 700,
            }}>
              Preview &mdash; first {previewData.length} rows
            </div>
            <div style={{ overflowX: "auto", maxHeight: 200 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    {["#", "Customer", "Mobile", "Organization", "Status", "Est. Value"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: "#374151", whiteSpace: "nowrap", minWidth: h === "Est. Value" ? 110 : "auto" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "5px 10px", color: "#9ca3af" }}>{idx + 1}</td>
                      <td style={{ padding: "5px 10px", fontWeight: 600 }}>{row.Customer_Name || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{row.Mobile_Number || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{row.Organization || "-"}</td>
                      <td style={{ padding: "5px 10px" }}>{statusBadge(row.Status)}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {row.Estimated_Value
                          ? "\u20B9" + Number(row.Estimated_Value).toLocaleString("en-IN")
                          : "-"}
                      </td>
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
        <Button variant="light" onClick={handleClose}
          style={{ borderRadius: 7, fontSize: "0.85rem", fontWeight: 600, border: "1px solid #d1d5db" }}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleUpload}
          disabled={!file || validationErrors.length > 0}
          style={{
            borderRadius: 7, fontSize: "0.85rem", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 7,
            background: "linear-gradient(135deg,#10b981,#059669)", border: "none", padding: "7px 20px",
          }}>
          <FaUpload /> Upload Entries
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default NormalBulkUploadModal;
