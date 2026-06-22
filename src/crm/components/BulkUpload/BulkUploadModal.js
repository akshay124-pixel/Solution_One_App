import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, ProgressBar } from "react-bootstrap";
import axios from "axios";
import api, { getAccessToken } from "../../utils/api";
import { toast } from "react-toastify";
import Select from "react-select";
import ExcelJS from "exceljs/dist/exceljs.bare.min.js";
import { FaDownload, FaUpload, FaUser, FaInfoCircle } from "react-icons/fa";
import { statesAndCities } from "../Options";

// ─── Exact dropdown values matching AddEntry.js ───────────────────────────────
const STATUS_OPTIONS    = ["Not Found", "Maybe", "Interested", "Not Interested", "Closed"];
const TYPE_OPTIONS      = ["Direct Client", "Partner"];
const CATEGORY_OPTIONS  = ["Private", "Government"];
const ORGANIZATION_OPTIONS = [
  "Hospital","Govt department","Corporate","Private coaching",
  "Private school","Private college","Govt school","Govt college",
  "Govt aided college","Ngo","Dealer/partner","Others",
];

// States list for dropdown
const STATE_LIST = Object.keys(statesAndCities);

// ─── Styled components ────────────────────────────────────────────────────────
const customSelectStyles = {
  control: (p, s) => ({
    ...p, minHeight: "42px", fontSize: "0.95rem",
    borderColor: s.isFocused ? "#667eea" : "#dee2e6",
    boxShadow: s.isFocused ? "0 0 0 0.2rem rgba(102,126,234,.25)" : "none",
    "&:hover": { borderColor: "#667eea" },
  }),
  menu: (p) => ({ ...p, zIndex: 9999 }),
};

function BulkUploadModal({ isOpen, onClose, onUploadComplete, currentUser }) {
  const [users, setUsers]               = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [file, setFile]                 = useState(null);
  const [previewData, setPreviewData]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (isOpen && currentUser?.role === "globaladmin") fetchUsers();
  }, [isOpen, currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/allusers");
      setUsers(
        res.data
          .filter((u) => u.role !== "globaladmin")
          .map((u) => ({
            value: u._id,
            label: `${u.username} (${u.email}) — ${u.role}`,
            username: u.username,
            email: u.email,
            role: u.role,
          }))
      );
    } catch {
      toast.error("Failed to fetch users.");
    }
  };

  // ─── Helper: add Excel data-validation dropdown to a range ─────────────────
  // Uses worksheet.dataValidations.add(sqref, model) — most reliable across
  // both ExcelJS node and browser builds.
  const addDropdown = (ws, colLetter, fromRow, toRow, values) => {
    const sqref = `${colLetter}${fromRow}:${colLetter}${toRow}`;
    ws.dataValidations.add(sqref, {
      type: "list",
      allowBlank: true,
      formulae: [`"${values.join(",")}"`],   // must be: "Val1,Val2,Val3"
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Invalid value",
      error: "Please select a value from the dropdown",
      showInputMessage: true,
      promptTitle: "Select",
      prompt: "Choose from the list",
    });
  };

  // ─── Helper: named-range dropdown for long lists (states) ──────────────────
  const addNamedRangeDropdown = (ws, hiddenWs, sheetName, colLetter, fromRow, toRow, values) => {
    values.forEach((val, i) => { hiddenWs.getCell(i + 1, 1).value = val; });
    const sqref = `${colLetter}${fromRow}:${colLetter}${toRow}`;
    ws.dataValidations.add(sqref, {
      type: "list",
      allowBlank: true,
      formulae: [`${sheetName}!$A$1:$A$${values.length}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Invalid value",
      error: "Please select from the dropdown list",
    });
  };

  // ── Column letter helper ──────────────────────────────────────────────────
  const colLetter = (ws, key) => ws.getColumn(key).letter;

  // ─── Download Template with real dropdowns ──────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const wb  = new ExcelJS.Workbook();
      const ws  = wb.addWorksheet("Bulk Upload");

      // Hidden sheets for long dropdown lists
      const wsStates   = wb.addWorksheet("_States");
      wsStates.state   = "veryHidden";

      // ── Column definitions (EXACT keys matching handleFileUpload in Dashboard) ──
      ws.columns = [
        { header: "Customer_Name",         key: "Customer_Name",         width: 25 },
        { header: "Customer_Email",        key: "Customer_Email",        width: 30 },
        { header: "Mobile_Number",         key: "Mobile_Number",         width: 18 },
        { header: "Contact_Person",        key: "Contact_Person",        width: 22 },
        { header: "Address",              key: "Address",               width: 35 },
        { header: "State",               key: "State",                width: 20 },
        { header: "City",                key: "City",                 width: 20 },
        { header: "Organization",        key: "Organization",         width: 25 },
        { header: "Category",            key: "Category",             width: 16 },
        { header: "Type",               key: "Type",                width: 16 },
        { header: "Status",             key: "Status",              width: 18 },
        { header: "Close_Type",         key: "Close_Type",          width: 16 },
        { header: "Estimated_Value",    key: "Estimated_Value",     width: 18 },
        { header: "Close_Amount",       key: "Close_Amount",        width: 16 },
        { header: "Products",           key: "Products",            width: 60 },
        { header: "Remarks",            key: "Remarks",             width: 35 },
        { header: "Live_Location",      key: "Live_Location",       width: 22 },
        { header: "Next_Action",        key: "Next_Action",         width: 25 },
        { header: "First_Person_Met",   key: "First_Person_Met",    width: 20 },
        { header: "Second_Person_Met",  key: "Second_Person_Met",   width: 20 },
        { header: "Third_Person_Met",   key: "Third_Person_Met",    width: 20 },
        { header: "Fourth_Person_Met",  key: "Fourth_Person_Met",   width: 20 },
        { header: "Expected_Closing_Date", key: "Expected_Closing_Date", width: 22 },
        { header: "Follow_Up_Date",     key: "Follow_Up_Date",      width: 18 },
        { header: "CreatedAt",          key: "CreatedAt",           width: 18 },
      ];

      // ── Style header row ────────────────────────────────────────────────────
      const headerRow = ws.getRow(1);
      headerRow.font  = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF667eea" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      headerRow.height = 30;

      // Mark required columns red
      ["Customer_Name", "Mobile_Number", "Status"].forEach((key) => {
        const col  = ws.getColumn(key);
        const cell = ws.getRow(1).getCell(col.number);
        cell.font  = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFe53935" } };
      });

      // ── Sample rows ─────────────────────────────────────────────────────────
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
        Products: "IFPD (Spec: Android 13, 8GB RAM, 128GB ROM, 65 inch, Qty: 2)",
        Remarks: "Demo scheduled next week",
        Next_Action: "Follow up call",
        First_Person_Met: "Principal",
        Second_Person_Met: "",
        Third_Person_Met: "",
        Fourth_Person_Met: "",
        Expected_Closing_Date: "30/06/2026",
        Follow_Up_Date: "25/06/2026",
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
        Products: "OPS (Spec: i5 12th Gen, 8GB RAM, 256GB ROM, N/A, Qty: 5); IFPD (Spec: Android 14, 8GB RAM, 128GB ROM, 75 inch, Qty: 3)",
        Remarks: "Needs approval from management",
        Next_Action: "Send quotation",
        First_Person_Met: "IT Manager",
        Second_Person_Met: "Director",
        Third_Person_Met: "",
        Fourth_Person_Met: "",
        Expected_Closing_Date: "15/07/2026",
        Follow_Up_Date: "28/06/2026",
        CreatedAt: "20/06/2026",
      });

      // ── Data rows range for dropdowns ────────────────────────────────────────
      const DATA_FROM = 2;
      const DATA_TO   = 1001; // Support up to 1000 data rows

      // ── Add dropdowns using column keys (letters resolved from ws.columns) ──
      const CL = (key) => colLetter(ws, key); // get column letter by key

      // Short-list dropdowns (inline formula, fits in 255 chars)
      addDropdown(ws, CL("Status"),       DATA_FROM, DATA_TO, STATUS_OPTIONS);
      addDropdown(ws, CL("Close_Type"),   DATA_FROM, DATA_TO, ["", "Closed Won", "Closed Lost"]);
      addDropdown(ws, CL("Type"),         DATA_FROM, DATA_TO, TYPE_OPTIONS);
      addDropdown(ws, CL("Category"),     DATA_FROM, DATA_TO, CATEGORY_OPTIONS);
      addDropdown(ws, CL("Organization"), DATA_FROM, DATA_TO, ORGANIZATION_OPTIONS);

      // ── Add State dropdown (long list → named range on hidden sheet) ─────────
      addNamedRangeDropdown(ws, wsStates, "_States", CL("State"), DATA_FROM, DATA_TO, STATE_LIST);

      // ── Number format for numeric columns ───────────────────────────────────
      ws.getColumn("Estimated_Value").numFmt = "#,##0";
      ws.getColumn("Close_Amount").numFmt    = "#,##0";
      ws.getColumn("Mobile_Number").numFmt   = "@";

      // ── Instructions sheet ───────────────────────────────────────────────────
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

      const instructions = [
        { col: "Customer_Name",        req: "YES ★", desc: "Full name of customer or school/org", ex: "ABC Public School" },
        { col: "Customer_Email",       req: "No",  desc: "Customer email address", ex: "abc@school.com" },
        { col: "Mobile_Number",        req: "YES ★", desc: "Exactly 10 digits, no spaces/dashes. Do NOT use your own number.", ex: "9876543210" },
        { col: "Contact_Person",       req: "No",  desc: "Name of person you spoke to", ex: "Mr. Sharma" },
        { col: "Address",             req: "No",  desc: "Street address", ex: "123 MG Road" },
        { col: "State",              req: "No",  desc: "Select from dropdown — Indian state name", ex: "Bihar" },
        { col: "City",               req: "No",  desc: "City name (auto-suggests based on state)", ex: "Patna" },
        { col: "Organization",       req: "No",  desc: "Select from dropdown: Hospital, Govt school, Corporate, etc.", ex: "Govt school" },
        { col: "Category",           req: "No",  desc: "Select: Private or Government", ex: "Government" },
        { col: "Type",              req: "No",  desc: "Select: Direct Client or Partner", ex: "Direct Client" },
        { col: "Status",            req: "YES ★", desc: "Select: Not Found / Maybe / Interested / Not Interested / Closed", ex: "Interested" },
        { col: "Close_Type",        req: "No",  desc: "Only if Status=Closed. Select: Closed Won or Closed Lost", ex: "Closed Won" },
        { col: "Estimated_Value",   req: "No",  desc: "Deal value in ₹ (numbers only, no commas)", ex: "50000" },
        { col: "Close_Amount",      req: "No",  desc: "Final closed amount in ₹ (if Status=Closed)", ex: "45000" },
        { col: "Products",          req: "No",  desc: "Format: Name (Spec: SPEC, SIZE, Qty: N). Separate multiple with semicolon (;)", ex: "IFPD (Spec: Android 13, 8GB RAM, 128GB ROM, 65 inch, Qty: 2)" },
        { col: "Remarks",           req: "No",  desc: "Any notes or comments", ex: "Demo scheduled" },
        { col: "Live_Location",     req: "No",  desc: "GPS: latitude, longitude", ex: "25.5941, 85.1376" },
        { col: "Next_Action",       req: "No",  desc: "What to do next", ex: "Follow up call" },
        { col: "First_Person_Met",  req: "No",  desc: "Name/title of 1st person you met", ex: "Principal" },
        { col: "Second_Person_Met", req: "No",  desc: "Name/title of 2nd person you met", ex: "Vice Principal" },
        { col: "Third_Person_Met",  req: "No",  desc: "Name/title of 3rd person you met", ex: "" },
        { col: "Fourth_Person_Met", req: "No",  desc: "Name/title of 4th person you met", ex: "" },
        { col: "Expected_Closing_Date", req: "No", desc: "Expected deal close date. Format: DD/MM/YYYY", ex: "30/06/2026" },
        { col: "Follow_Up_Date",    req: "No",  desc: "Next follow-up date. Format: DD/MM/YYYY", ex: "25/06/2026" },
        { col: "CreatedAt",         req: "No",  desc: "Entry date (defaults to today if blank). Format: DD/MM/YYYY", ex: "22/06/2026" },
      ];
      instructions.forEach((r) => wsInfo.addRow(r));

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
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate template.");
    }
  };

  // ─── Parse uploaded file — same logic as Dashboard handleFileUpload ──────────
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

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook    = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet   = workbook.worksheets[0];
      if (!worksheet) { toast.error("Empty file"); return; }

      const rows    = [];
      let   headers = [];

      worksheet.eachRow((row, rowNumber) => {
        const values = row.values.slice(1);
        if (rowNumber === 1) {
          headers = values.map((v) => (v?.toString() ?? "").trim());
          return;
        }
        if (values.every((v) => v === null || v === undefined || v === "")) return;
        const obj = {};
        headers.forEach((h, i) => {
          let val = values[i];
          if (val && typeof val === "object" && val.richText)
            val = val.richText.map((r) => r.text).join("");
          if (val instanceof Date)
            val = val.toLocaleDateString("en-GB"); // dd/mm/yyyy
          obj[h] = val ?? null;
        });
        rows.push(obj);
      });

      // Validate key fields
      const errors = [];
      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        if (!r["Customer_Name"]) errors.push(`Row ${rowNum}: Customer_Name is required`);
        if (!r["Status"])        errors.push(`Row ${rowNum}: Status is required`);
        if (r["Mobile_Number"] && !/^\d{10}$/.test(String(r["Mobile_Number"]).replace(/\s/g, "")))
          errors.push(`Row ${rowNum}: Mobile_Number must be exactly 10 digits`);
        if (r["Status"] && !STATUS_OPTIONS.includes(r["Status"]))
          errors.push(`Row ${rowNum}: Status "${r["Status"]}" is invalid`);
      });

      setPreviewData(rows);
      setValidationErrors(errors);
      if (errors.length > 0)
        toast.warning(`${errors.length} validation issue(s) found.`);
      else
        toast.success(`Parsed ${rows.length} rows — ready to upload!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse file. Please use the provided template.");
      setFile(null);
    }
  };

  // ─── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedUser) { toast.error("Please select a user"); return; }
    if (!file || !previewData.length) { toast.error("Please select a valid file"); return; }
    if (validationErrors.length) { toast.error("Fix validation errors first"); return; }

    setLoading(true);
    setUploadProgress(0);
    const timer = setInterval(() => setUploadProgress((p) => Math.min(p + 8, 88)), 300);

    try {
      // ── Parse dates helper (same as Dashboard) ──────────────────────────────
      const parseDate = (v) => {
        if (!v) return null;
        if (typeof v === "number" && v > 25569 && v < 1000000) {
          const d = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + v * 86400000);
          return d.toISOString();
        }
        const s = String(v).trim().replace(/-/g, "/");
        const p = s.split("/");
        if (p.length === 3) {
          const [day, month, year] = [parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])];
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 1900 && year <= 2100) {
            const d = new Date(Date.UTC(year, month, day));
            if (d.getUTCDate() === day) return d.toISOString();
          }
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
      };

      // ── Parse products string (same format as Dashboard) ──────────────────
      const parseProducts = (str) => {
        if (!str || typeof str !== "string") return [];
        return str.split(";").map((s) => s.trim()).filter(Boolean).map((item) => {
          let m = item.match(/^(.+?)\s*\(\s*Spec:\s*(.+?)\s*,\s*(.+?)\s*,\s*Qty:\s*(\d+)\s*\)$/i);
          if (m) return { name: m[1].trim(), specification: m[2].trim(), size: m[3].trim(), quantity: Number(m[4]) };
          m = item.match(/^(.+?)\s*\(\s*(.+?)\s*,\s*(.+?)\s*,\s*Qty:\s*(\d+)\s*\)$/i);
          if (m) return { name: m[1].trim(), specification: m[2].trim(), size: m[3].trim(), quantity: Number(m[4]) };
          m = item.match(/^(.+?)\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i);
          if (m) return { name: m[1].trim(), specification: m[2].trim(), size: m[3].trim(), quantity: 1 };
          return { name: item, specification: "", size: "", quantity: 1 };
        });
      };

      // ── Map Excel rows → entry objects (exact same keys as Dashboard) ───────
      const entries = previewData.map((item) => ({
        customerName:        item["Customer_Name"]         || "",
        customerEmail:       item["Customer_Email"]        || "",
        mobileNumber:        item["Mobile_Number"] ? String(item["Mobile_Number"]).replace(/\s/g, "") : "",
        contactperson:       item["Contact_Person"]        || "",
        address:             item["Address"]               || "",
        state:               item["State"]                 || "",
        city:                item["City"]                  || "",
        organization:        item["Organization"]          || "",
        category:            item["Category"]              || "",
        type:                item["Type"]                  || "",
        status:              item["Status"]                || "Not Found",
        closetype:           item["Close_Type"]            || "",
        estimatedValue:      item["Estimated_Value"]  ? Number(item["Estimated_Value"]) : 0,
        closeamount:         item["Close_Amount"]     ? Number(item["Close_Amount"])    : 0,
        products:            parseProducts(item["Products"]),
        remarks:             item["Remarks"]               || "",
        liveLocation:        item["Live_Location"]         || "",
        nextAction:          item["Next_Action"]           || "",
        firstPersonMeet:     item["First_Person_Met"]      || "",
        secondPersonMeet:    item["Second_Person_Met"]     || "",
        thirdPersonMeet:     item["Third_Person_Met"]      || "",
        fourthPersonMeet:    item["Fourth_Person_Met"]     || "",
        expectedClosingDate: parseDate(item["Expected_Closing_Date"]),
        followUpDate:        parseDate(item["Follow_Up_Date"]),
        createdAt:           parseDate(item["CreatedAt"]),
        assignedTo:          [],
      }));

      const baseURL = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
      const token   = getAccessToken();
      const res = await axios.post(
        `${baseURL}/api/admin/bulk-upload-as-user`,
        { userId: selectedUser.value, entries },
        {
          timeout: 120000,
          withCredentials: true,
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            "Content-Type": "application/json",
          },
        }
      );
      clearInterval(timer);
      setUploadProgress(100);

      if (res.data.success) {
        toast.success(`Uploaded ${res.data.count} entries as ${selectedUser.username}!`, { autoClose: 5000 });
        onUploadComplete?.(res.data);
        setTimeout(() => { resetForm(); onClose(); }, 1500);
      } else {
        toast.error(res.data.message || "Upload failed");
      }
    } catch (err) {
      clearInterval(timer);
      const msg = err.response?.data?.message
        || (err.code === "ECONNABORTED" ? "Timed out — try fewer rows" : "Upload failed");
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedUser(null); setFile(null);
    setPreviewData([]); setValidationErrors([]); setUploadProgress(0);
  };

  const handleClose = () => { if (!loading) { resetForm(); onClose(); } };

  if (currentUser?.role !== "globaladmin") return null;

  // ─── Status badge helper ─────────────────────────────────────────────────────
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
        padding: "2px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
        background: s.bg, color: s.color, letterSpacing: "0.02em",
      }}>{status || "—"}</span>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static" centered>
      {/* ── Header ── */}
      <Modal.Header closeButton={!loading} style={{
        background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
        color: "white", padding: "14px 22px",
      }}>
        <Modal.Title style={{ fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
          <FaUpload style={{ fontSize: "1rem" }} /> Bulk Upload as User
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "18px 22px", background: "#f8f9fa" }}>

        {/* ── Step cards ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            { n: "1", label: "Select User" },
            { n: "2", label: "Download Template" },
            { n: "3", label: "Fill & Upload" },
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

        {/* ── User selector ── */}
        <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", marginBottom: 12, border: "1px solid #e5e7eb" }}>
          <Form.Label style={{ fontWeight: 600, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <FaUser style={{ color: "#667eea" }} /> Select User *
          </Form.Label>
          <Select
            options={users}
            value={selectedUser}
            onChange={setSelectedUser}
            styles={customSelectStyles}
            placeholder="Search by name or email…"
            isSearchable isClearable isDisabled={loading}
          />
          {selectedUser && (
            <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
              ✓ Will upload as: <strong>{selectedUser.username}</strong> ({selectedUser.role})
            </div>
          )}
        </div>

        {/* ── Download + Upload row ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {/* Download card */}
          <div style={{
            flex: 1, background: "white", borderRadius: 10, padding: "14px 16px",
            border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaDownload style={{ color: "#667eea", marginRight: 5 }} />Step 1 — Get Template
            </div>
            <Button variant="outline-primary" size="sm" onClick={downloadTemplate} disabled={loading}
              style={{ borderRadius: 7, fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, width: "fit-content" }}>
              <FaDownload /> Download Template
            </Button>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Includes dropdowns for Status, Type, Category, Organization &amp; State
            </div>
          </div>

          {/* Upload card */}
          <div style={{
            flex: 1, background: "white", borderRadius: 10, padding: "14px 16px",
            border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#374151", marginBottom: 2 }}>
              <FaUpload style={{ color: "#764ba2", marginRight: 5 }} />Step 2 — Upload File
            </div>
            <Form.Control type="file" accept=".xlsx,.xls" onChange={handleFileChange}
              disabled={loading} size="sm" style={{ borderRadius: 7, fontSize: "0.8rem" }} />
            {file ? (
              <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                ✓ {file.name} — <strong>{previewData.length} rows</strong>
              </div>
            ) : (
              <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Excel .xlsx / .xls only</div>
            )}
          </div>
        </div>

        {/* ── Validation errors ── */}
        {validationErrors.length > 0 && (
          <Alert variant="warning" style={{ borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", marginBottom: 10 }}>
            <strong>⚠ {validationErrors.length} issue(s) found</strong>
            <ul style={{ maxHeight: 100, overflowY: "auto", marginBottom: 0, marginTop: 4, paddingLeft: 18 }}>
              {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </Alert>
        )}

        {/* ── Progress ── */}
        {loading && (
          <div style={{ marginBottom: 10 }}>
            <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} animated striped variant="success"
              style={{ borderRadius: 8, height: 18, fontSize: "0.72rem" }} />
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}>Uploading, please wait…</div>
          </div>
        )}

        {/* ── Preview table ── */}
        {previewData.length > 0 && !loading && (
          <div style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "white", overflow: "hidden" }}>
            <div style={{
              padding: "8px 14px", background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "white", fontSize: "0.78rem", fontWeight: 700,
            }}>
              Preview — {Math.min(previewData.length, 10)} of {previewData.length} rows
            </div>
            <div style={{ overflowX: "auto", maxHeight: 200 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    {["#", "Customer", "Mobile", "State / City", "Status", "Est. Value"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "5px 10px", color: "#9ca3af" }}>{i + 1}</td>
                      <td style={{ padding: "5px 10px", fontWeight: 600 }}>{r["Customer_Name"] || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{r["Mobile_Number"] || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{[r["State"], r["City"]].filter(Boolean).join(" / ") || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{statusBadge(r["Status"])}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right" }}>
                        {r["Estimated_Value"] ? `₹${Number(r["Estimated_Value"]).toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal.Body>

      {/* ── Footer ── */}
      <Modal.Footer style={{ padding: "10px 22px", background: "white", borderTop: "1px solid #e5e7eb", gap: 8 }}>
        <Button variant="light" onClick={handleClose} disabled={loading}
          style={{ borderRadius: 7, fontSize: "0.85rem", fontWeight: 600, border: "1px solid #d1d5db" }}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleUpload}
          disabled={!selectedUser || !file || !previewData.length || validationErrors.length > 0 || loading}
          style={{ borderRadius: 7, fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 7,
            background: "linear-gradient(135deg,#10b981,#059669)", border: "none", padding: "7px 20px" }}>
          <FaUpload /> Upload {previewData.length > 0 ? `${previewData.length} Entries` : ""}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default BulkUploadModal;
