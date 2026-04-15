import React, { useState, useEffect } from "react";
import { Modal, Button, Badge, Accordion, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import { Copy, Download, FileText } from "lucide-react";
import soApi from "../../so/axiosSetup";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useRef } from "react";
import { Spinner } from "react-bootstrap";

function ViewEntry({ isOpen, onClose, entry }) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);

  // Utility function to check if a field is valid (not null, undefined, empty, or "N/A")
  const isValidField = (value) => {
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "string" && value.trim() === "N/A") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (
      typeof value === "object" &&
      value !== null &&
      Object.keys(value).length === 0
    )
      return false;
    return true;
  };

  // Utility: get createdBy's username/name, supports id fallback for current user
  const getCreatedByName = React.useCallback((createdBy) => {
    if (!isValidField(createdBy)) return null;
    if (typeof createdBy === "object") {
      if (isValidField(createdBy.username)) return createdBy.username;
      if (isValidField(createdBy.name)) return createdBy.name;
    }
    // If createdBy is a string id (from change stream) and matches current user, derive from localStorage
    try {
      const currentUserId = localStorage.getItem("userId");
      if (
        typeof createdBy === "string" &&
        currentUserId &&
        String(createdBy) === String(currentUserId)
      ) {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.username) return user.username;
        if (user?.name) return user.name;
      }
    } catch (e) {
      // ignore parse errors
    }
    return null;
  }, []);
  const [createdByName, setCreatedByName] = useState(() => {
    const initial = getCreatedByName(entry?.createdBy);
    if (initial) return initial;
    const key = entry?._id || entry?.orderId || entry?.id || null;
    if (key) {
      try {
        const cached = localStorage.getItem(`createdByName:${key}`);
        if (cached) return cached;
      } catch (_) { }
    }
    return null;
  });
  const createdByCacheKey = entry?._id || entry?.orderId || entry?.id || null;
  useEffect(() => {
    if (!createdByCacheKey) return;
    const name = getCreatedByName(entry?.createdBy);
    if (name) {
      setCreatedByName(name);
      try {
        localStorage.setItem(`createdByName:${createdByCacheKey}`, name);
      } catch (_) { }
    } else {
      try {
        const cached = localStorage.getItem(
          `createdByName:${createdByCacheKey}`,
        );
        if (cached) setCreatedByName(cached);
      } catch (_) { }
    }
  }, [createdByCacheKey, entry?.createdBy, getCreatedByName]);

  // Utility function to format date fields
  const formatDate = (dateStr) => {
    if (!isValidField(dateStr)) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-GB");
  };

  // Utility function to format date and time for soDate
  const formatDateTime = (dateStr) => {
    if (!isValidField(dateStr)) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const datePart = date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    if (hours < 5 || (hours === 5 && minutes <= 30)) {
      return datePart;
    }
    const timePart = date.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} ${timePart}`;
  };
  // Utility function to format timestamps (date + time)
  const formatTimestamp = (dateStr) => {
    if (!isValidField(dateStr)) return null;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const formatted = date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return formatted.replace(",", "");
  };
  const isValidPoFilePath = (filePath) => {
    return (
      filePath &&
      typeof filePath === "string" &&
      filePath.trim() !== "" &&
      filePath !== "N/A" &&
      filePath !== "/"
    );
  };
  const handleDownload = async (filePath, label = "SalesOrder_POFile") => {
    const targetPath = filePath || entry?.poFilePath;

    if (!isValidPoFilePath(targetPath)) {
      toast.error("No valid file available to download!");
      return;
    }

    try {
      const fileName = targetPath.split("/").pop();
      if (!fileName) {
        toast.error("Invalid file name!");
        return;
      }

      const response = await soApi.get(`/api/download/${encodeURIComponent(fileName)}`, {
        responseType: "blob",
      });

      const blob = response.data;
      const ext = fileName.includes(".") ? "." + fileName.split(".").pop() : "";
      const orderSlug = entry?.orderId ? `Order_${entry.orderId}` : "SO";
      const downloadFileName = `${orderSlug}_SO_${label}${ext}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      toast.success("File download started!");
    } catch (err) {
      toast.error("Failed to download file! Check server or file path.");
      console.error("Download error:", err);
    }
  };

  const handleCopy = () => {
    if (!entry) return;

    const productsText = isValidField(entry.products)
      ? entry.products
        .map(
          (p, i) =>
            `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"
            }, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"
            }, Unit Price: ₹${p.unitPrice?.toFixed(2) || "0.00"}, GST: ${p.gst || "N/A"
            }%, Serial Nos: ${isValidField(p.serialNos) && p.serialNos.length > 0
              ? p.serialNos.join(", ")
              : "N/A"
            }, Model Nos: ${isValidField(p.modelNos) && p.modelNos.length > 0
              ? p.modelNos.join(", ")
              : "N/A"
            }, Brand: ${p.brand || "N/A"}, Warranty: ${p.warranty || "N/A"
            }, Product Code: ${isValidField(p.productCode) && p.productCode.length > 0
              ? p.productCode.join(", ")
              : "N/A"
            })`,
        )
        .join("\n")
      : "N/A";

    const totalUnitPrice = isValidField(entry.products)
      ? entry.products.reduce(
        (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
        0,
      )
      : null;

    const gstText = isValidField(entry.products)
      ? entry.products
        .map((p) => p.gst)
        .filter(Boolean)
        .join(", ")
      : null;

    // Define all fields for copying
    const fieldsToCopy = [
      { key: "orderId", label: "Order ID" },
      { key: "soDate", label: "SO Date", formatter: formatDateTime },
      { key: "customername", label: "Customer Name" },
      { key: "name", label: "Contact Person Name" },
      { key: "contactNo", label: "Contact No" },
      { key: "alterno", label: "Alternate No" },
      { key: "customerEmail", label: "Customer Email" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "pinCode", label: "Pin Code" },
      { key: "gstno", label: "GST No" },
      {
        key: "products",
        label: "Products",
        value: productsText,
        condition: isValidField(entry.products),
      },
      {
        key: "totalUnitPrice",
        label: "Total Unit Price",
        value: isValidField(totalUnitPrice)
          ? `₹${totalUnitPrice.toFixed(2)}`
          : null,
        condition: isValidField(entry.products),
      },
      {
        key: "gstText",
        label: "GST",
        value: gstText,
        condition: isValidField(entry.products),
      },
      { key: "freightcs", label: "Freight Charges" },
      { key: "freightstatus", label: "Freight Status" },
      {
        key: "actualFreight",
        label: "Actual Freight",
        formatter: (v) => (isValidField(v) ? `₹${v.toFixed(2)}` : null),
      },
      { key: "installchargesstatus", label: "Install Charges Status" },
      { key: "installation", label: "Installation" },
      { key: "installationeng", label: "Installation Engineer" },
      {
        key: "total",
        label: "Total",
        formatter: (v) => (isValidField(v) ? `₹${v.toFixed(2)}` : null),
      },
      { key: "paymentCollected", label: "Payment Collected" },
      { key: "paymentMethod", label: "Payment Method" },
      { key: "paymentDue", label: "Payment Due" },
      { key: "neftTransactionId", label: "NEFT Transaction ID" },
      { key: "chequeId", label: "Cheque ID" },
      { key: "paymentTerms", label: "Payment Terms" },
      { key: "creditDays", label: "Credit Days" },
      { key: "orderType", label: "Order Type" },
      { key: "gemOrderNumber", label: "GEM Order Number" },
      { key: "report", label: "Reporting Person" },
      { key: "transporter", label: "Transporter" },
      { key: "transporterDetails", label: "Transporter Details" },
      { key: "shippingAddress", label: "Shipping Address" },
      { key: "billingAddress", label: "Billing Address" },
      { key: "dispatchFrom", label: "Dispatch From" },
      { key: "dispatchDate", label: "Dispatch Date", formatter: formatDate },
      { key: "docketNo", label: "Docket No", condition: isValidField(entry.docketNo) },
      { key: "deliveryDate", label: "Delivery Date", formatter: formatDate },
      { key: "receiptDate", label: "Receipt Date", formatter: formatDate },
      { key: "invoiceNo", label: "Invoice No" },
      { key: "invoiceDate", label: "Invoice Date", formatter: formatDate },
      { key: "billNumber", label: "Bill Number" },
      { key: "piNumber", label: "PI Number" },
      { key: "billStatus", label: "Bill Status" },
      { key: "paymentReceived", label: "Payment Received" },
      { key: "fulfillingStatus", label: "Production Fulfilling Status" },
      { key: "sostatus", label: "SO Status" },
      { key: "dispatchStatus", label: "Dispatch Status" },
      { key: "fStatus", label: "Installation Status" },

      { key: "completionStatus", label: "Production Status" },
      { key: "stockStatus", label: "Stock Status" },
      { key: "demoDate", label: "Demo Date", formatter: formatDate },
      { key: "demostatus", label: "Demo Status" },
      {
        key: "demoRecivedDate",
        label: "Demo Received Date",
        formatter: formatDate,
      },
      { key: "demoBillno", label: "Demo Bill Number" },
      {
        key: "fulfillmentDate",
        label: "Fulfillment Date",
        formatter: formatDate,
      },
      { key: "remarks", label: "Remarks" },
      { key: "remarksByProduction", label: "Remarks By Production" },
      { key: "remarksByAccounts", label: "Remarks By Accounts" },
      { key: "remarksByBilling", label: "Remarks By Billing" },
      { key: "remarksByInstallation", label: "Remarks By Installation" },
      { key: "verificationRemarks", label: "Verification Remarks" },
      { key: "salesPerson", label: "Sales Person" },
      { key: "company", label: "Company" },
      {
        key: "createdBy",
        label: "Created By",
        formatter: () => (isValidField(createdByName) ? createdByName : null),
      },
      { key: "poFilePath", label: "Attachments" },
    ];

    const textToCopy = fieldsToCopy
      .filter(
        ({ key, condition, value }) =>
          (condition !== undefined
            ? condition
            : isValidField(value || entry[key])) &&
          (value !== undefined ||
            (entry[key] !== null && entry[key] !== undefined)),
      )
      .map(({ label, key, value, formatter }) => {
        const val =
          value !== undefined
            ? value
            : formatter
              ? formatter(entry[key])
              : entry[key];
        return isValidField(val) ? `${label}: ${val}` : null;
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    if (!textToCopy) {
      toast.error("No valid data to copy!");
      return;
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  };
  const handleExportPDF = async () => {
    if (!entry) return;
    setIsGeneratingPDF(true);

    try {
      const input = pdfRef.current;

      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");

      const PAGE_WIDTH = 210;
      const PAGE_HEIGHT = 297;

      const MARGIN_TOP = 15;
      const MARGIN_BOTTOM = 15;

      const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const imgWidth = PAGE_WIDTH;
      const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

      const pxPerMm = canvasHeight / imgHeight;
      const SAFE_BOTTOM_MM = 8;
      const pageContentHeightPx =
        (CONTENT_HEIGHT - SAFE_BOTTOM_MM) * pxPerMm;


      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvasHeight) {
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");

        pageCanvas.width = canvasWidth;
        pageCanvas.height = Math.min(
          pageContentHeightPx,
          canvasHeight - sourceY,
        );

        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvasWidth,
          pageCanvas.height,
          0,
          0,
          canvasWidth,
          pageCanvas.height,
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);

        if (pageIndex > 0) pdf.addPage();

        const renderedHeightMm = (pageCanvas.height * imgWidth) / canvasWidth;

        const yPosition = pageIndex === 0 ? 0 : MARGIN_TOP;

        pdf.addImage(imgData, "JPEG", 0, yPosition, imgWidth, renderedHeightMm);

        sourceY += pageCanvas.height;

        pageIndex++;
      }

      pdf.save(`Sales_Order_${entry.orderId || "Details"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!entry) return null;

  const totalUnitPrice = isValidField(entry.products)
    ? entry.products.reduce(
      (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
      0,
    )
    : null;

  const gstText = isValidField(entry.products)
    ? entry.products
      .map((p) => p.gst)
      .filter(Boolean)
      .join(", ")
    : null;

  // Define fields that should use badges
  const badgeFields = {
    orderType: {
      Demo: "warning",
      B2C: "success",
      B2B: "info",
      B2G: "primary",
      default: "secondary",
    },
    sostatus: {
      "Pending for Approval": "warning",
      "Accounts Approved": "info",
      Approved: "success",
      "On Hold Due to Low Price": "danger",
      default: "secondary",
    },
    dispatchStatus: {
      "Not Dispatched": "warning",
      "Partially Shipped": "info",
      Dispatched: "info",
      Delivered: "success",
      "Docket Awaited Dispatched": "primary",
      default: "secondary",
    },
    completionStatus: {
      Complete: "success",
      default: "warning",
    },
    stockStatus: {
      "In Stock": "success",
      default: "danger",
    },
    demostatus: {
      Recived: "success",
      "Not Recived": "warning",
      default: "secondary",
    },
    freightstatus: {
      Including: "success",
      "To Pay": "warning",
      "Self-Pickup": "info",
      default: "primary",
    },
    installchargesstatus: {
      Including: "success",
      "To Pay": "warning",
      "Not in Scope": "warning",
      default: "primary",
    },
    paymentMethod: {
      Cash: "success",
      NEFT: "info",
      RTGS: "primary",
      Cheque: "warning",
      default: "secondary",
    },
    paymentTerms: {
      "100% Advance": "success",
      "Partial Advance": "info",
      Credit: "warning",
      default: "secondary",
    },
    paymentReceived: {
      Received: "success",
      default: "warning",
    },
    billStatus: {
      Pending: "warning",
      "Under Billing": "info",
      "Billing Complete": "success",
      default: "secondary",
    },
    fulfillingStatus: {
      "Under Process": {
        bg: "linear-gradient(135deg, #f39c12, #f7c200)",
        color: "#fff",
      },
      Pending: {
        bg: "linear-gradient(135deg, #ff6b6b, #ff8787)",
        color: "#fff",
      },
      "Partial Dispatch": {
        bg: "linear-gradient(135deg, #00c6ff, #0072ff)",
        color: "#fff",
      },
      Fulfilled: {
        bg: "linear-gradient(135deg, #28a745, #4cd964)",
        color: "#fff",
      },
      default: {
        bg: "linear-gradient(135deg, #6c757d, #a9a9a9)",
        color: "#fff",
      },
    },
    installationStatus: {
      Pending: "warning",
      "In Progress": "info",
      Completed: "success",
      Failed: "danger",
      default: "secondary",
    },
    company: {
      Promark: "success",
      Foxmate: "info",
      Promine: "warning",
      default: "primary",
    },
    installationReport: {
      Yes: "success",
      Installed: "info",
      No: "warning",
      default: "secondary",
    },
    stamp: {
      Received: "success",
      "Not Received": "warning",
      default: "secondary",
    },
  };

  // Define fields for each accordion section
  const orderInfoFields = [
    { key: "orderId", label: "Order ID" },
    { key: "soDate", label: "SO Date & Time", formatter: formatDateTime },
    { key: "orderType", label: "Order Type" },
    { key: "gemOrderNumber", label: "GEM Order Number" },
    { key: "dispatchDate", label: "Dispatch Date", formatter: formatDate },
    { key: "deliveryDate", label: "Delivery Date", formatter: formatDate },
    { key: "receiptDate", label: "Receipt Date", formatter: formatDate },
    { key: "sostatus", label: "SO Status" },
    { key: "dispatchStatus", label: "Dispatch Status" },
    // { key: "completionStatus", label: "Completion Status" },
    { key: "stockStatus", label: "Stock Status" },
    { key: "demoDate", label: "Demo Date", formatter: formatDate },
    { key: "demostatus", label: "Demo Status" },
    {
      key: "demoRecivedDate",
      label: "Demo Received Date",
      formatter: formatDate,
    },
    { key: "demoBillno", label: "Demo Bill Number" },
    {
      key: "fulfillmentDate",
      label: "Fulfillment Date",
      formatter: formatDate,
    },
    {
      key: "createdBy",
      label: "Created By",
      condition: true,
      formatter: () => (isValidField(createdByName) ? createdByName : "N/A"),
    },
    { key: "salesPerson", label: "Sales Person" },
    { key: "report", label: "Reporting Person" },
    {
      key: "approvalTimestamp",
      label: "Approval Timestamp",
      formatter: formatTimestamp,
    },
    {
      key: "productsEditTimestamp",
      label: "Products Edit Timestamp",
      formatter: formatTimestamp,
    },
    {
      key: "poFilePath",
      label: "Attachments",
      renderer: () =>
        isValidPoFilePath(entry.poFilePath) ? (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleDownload(entry.poFilePath, "SalesOrder_POFile")}
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: "6px 12px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#ffffff",
              border: "1px solid #ffffff22",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
              transition:
                "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 4px 12px rgba(106, 17, 203, 0.4)";
              e.target.style.background =
                "linear-gradient(135deg, #3b82f6, #7e22ce)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.15)";
              e.target.style.background =
                "linear-gradient(135deg, #2575fc, #6a11cb)";
            }}
            onMouseDown={(e) => {
              e.target.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              e.target.style.transform = "scale(1.05)";
            }}
          >
            <Download size={14} />
            Download
          </Button>
        ) : (
          <span>No file attached</span>
        ),
    },
  ];
  const customerInfoFields = [
    { key: "customername", label: "Customer Name" },
    { key: "name", label: "Contact Person" },
    { key: "contactNo", label: "Contact No" },
    { key: "alterno", label: "Alternate No" },
    { key: "customerEmail", label: "Email" },
    { key: "gstno", label: "GST No" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "pinCode", label: "Pin Code" },
    { key: "shippingAddress", label: "Shipping Address" },
    { key: "billingAddress", label: "Billing Address" },
  ];

  const financialInfoFields = [
    {
      key: "totalUnitPrice",
      label: "Total Unit Price",
      value: isValidField(totalUnitPrice)
        ? `₹${totalUnitPrice.toFixed(2)}`
        : null,
      condition: isValidField(entry.products),
    },
    {
      key: "gstText",
      label: "GST",
      value: gstText ? `${gstText}%` : "",
      condition: isValidField(entry.products),
    },

    { key: "freightcs", label: "Freight Charges" },
    { key: "freightstatus", label: "Freight Status" },
    {
      key: "actualFreight",
      label: "Actual Freight",
      formatter: (v) => (isValidField(v) ? `₹${v.toFixed(2)}` : null),
    },
    { key: "installchargesstatus", label: "Install Charges Status" },
    { key: "installation", label: "Installation Charges" },

    {
      key: "total",
      label: "Total",
      formatter: (v) => (isValidField(v) ? `₹${v.toFixed(2)}` : null),
    },
    { key: "paymentCollected", label: "Payment Collected" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "paymentDue", label: "Payment Due" },
    { key: "neftTransactionId", label: "NEFT Transaction ID" },
    { key: "chequeId", label: "Cheque ID" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "creditDays", label: "Credit Days" },
    {
      key: "paymentReceived",
      label: "Payment Received",
      condition: entry.paymentReceived === "Received",
    },
    { key: "invoiceNo", label: "Invoice No" },
    { key: "invoiceDate", label: "Invoice Date", formatter: formatDate },
    { key: "billNumber", label: "Bill Number" },
    { key: "piNumber", label: "PI Number" },
    { key: "billStatus", label: "Bill Status" },
    { key: "remarksByAccounts", label: "Remarks (Accounts)" },
    { key: "remarksByBilling", label: "Remarks (Billing)" },
    { key: "verificationRemarks", label: "Verification Remarks" },
  ];

  const productionInfoFields = [
    { key: "fulfillingStatus", label: "Production Status" },
    { key: "remarksByProduction", label: "Remarks (Production)" },
    { key: "remarks", label: "Remarks" },
  ];

  const logisticsInfoFields = [
    { key: "installationStatus", label: "Installation Status" },
    { key: "installationeng", label: "Installation Engineer" },
    { key: "remarksByInstallation", label: "Remarks (Installation)" },
    { key: "company", label: "Company" },
    { key: "dispatchFrom", label: "Dispatch From" },
    { key: "transporter", label: "Transporter" },
    { key: "transporterDetails", label: "Transporter Details" },
    { key: "docketNo", label: "Docket Number", condition: isValidField(entry.docketNo) },
    { key: "stamp", label: "Stamp Signed Received" },
    { key: "installationReport", label: "Installation Report" },
    {
      key: "installationFile",
      label: "Installation Report",
      condition: !!entry.installationFile,
      renderer: () =>
        entry.installationFile ? (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleDownload(entry.installationFile, "SalesOrder_InstallationReport")}
            style={{
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 3px 8px rgba(0,0,0,0.2)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-1px) scale(1.02)";
              e.target.style.boxShadow = "0 5px 12px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0) scale(1)";
              e.target.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)";
            }}
          >
            <Download size={14} />
            Download Report
          </Button>
        ) : null,
    },
  ];

  // Filter sections to only show those with at least one valid field
  const sections = [
    {
      eventKey: "0",
      title: "📅 Order Information",
      fields: orderInfoFields,
    },
    {
      eventKey: "1",
      title: "👤 Customer Information",
      fields: customerInfoFields,
    },
    {
      eventKey: "2",
      title: "📦 Product Information",
      condition: isValidField(entry.products),
    },
    {
      eventKey: "3",
      title: "💰 Financial Information",
      fields: financialInfoFields,
    },
    {
      eventKey: "4",
      title: "🛠️ Production Information",
      fields: productionInfoFields,
    },
    {
      eventKey: "5",
      title: "🚚 Logistics & Installation",
      fields: logisticsInfoFields,
    },
  ].filter((section) => {
    if (section.condition !== undefined) return section.condition;
    return section.fields?.some(
      ({ key, condition, value, formatter, renderer }) =>
        condition !== undefined
          ? condition
          : renderer
            ? renderer()
            : isValidField(
              value || (formatter ? formatter(entry[key]) : entry[key]),
            ),
    );
  });

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      size="xl"
      aria-labelledby="view-entry-modal-title"
      centered
      style={{ backdropFilter: "blur(5px)" }}
    >
      <style>
        {`
      @keyframes fadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      /* Print Styles */
     .pdf-print-container {
  width: 210mm;

  /* 🔥 ONLY ONE padding */
  padding: 15mm 15mm 10mm 15mm;

  background: #fff;
  color: #333;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.5;

  /* 🔥 CRITICAL */
  min-height: unset;
  height: auto;

  position: absolute;
  left: -9999px;
  top: -9999px;
}

      .pdf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #2575fc;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .pdf-title {
        color: #2575fc;
        margin: 0;
        font-size: 24px;
        text-transform: uppercase;
        font-weight: bold;
      }
      .pdf-logo {
        height: 60px;
        width: auto;
      }
     .pdf-section {
  margin-bottom: 12px;
  page-break-inside: avoid;
}

      .pdf-section-title {
        background: #f8f9fa;
        padding: 6px 10px;
        border-left: 4px solid #6a11cb;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 10px;
        font-size: 15px;
      }
      .pdf-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .pdf-item {
        font-size: 13px;
      }
      .pdf-item strong {
        color: #444;
      }
      .pdf-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 5px;
      }
      .pdf-table th {
        background: #f1f3f5;
        text-align: left;
        padding: 8px;
        border: 1px solid #dee2e6;
        font-size: 12px;
      }
      .pdf-table td {
        padding: 8px;
        border: 1px solid #dee2e6;
        font-size: 12px;
        vertical-align: top;
      }
    `}
      </style>
      <Modal.Header
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "#fff",
          padding: "1.2rem 2rem",
          border: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Modal.Title
          id="view-entry-modal-title"
          style={{
            fontWeight: "700",
            fontSize: "1.6rem",
            letterSpacing: "1px",
            textTransform: "uppercase",
            fontFamily: "'Poppins', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: 0,
          }}
        >
          <span role="img" aria-label="clipboard">
            📋
          </span>
          Sales Order #{entry.orderId || "N/A"}
        </Modal.Title>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <Button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "50px",
              padding: "6px 20px",
              fontSize: "0.9rem",
              fontWeight: "600",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
            }
          >
            {isGeneratingPDF ? (
              <>
                <Spinner size="sm" animation="border" /> Exporting...
              </>
            ) : (
              <>
                <FileText size={18} /> Export PDF
              </>
            )}
          </Button>

          <Button
            variant="light"
            onClick={onClose}
            style={{
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
              border: "none",
              fontSize: "1.2rem",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body
        style={{
          padding: "2rem",
          background: "linear-gradient(180deg, #f8fafc, #e2e8f0)",
          borderRadius: "0 0 15px 15px",
          minHeight: "500px",
          maxHeight: "80vh",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#2575fc #e6f0fa",
          animation: "fadeIn 0.5s ease-out",
        }}
      >
        {/* Printable Template (Off-screen) */}
        <div ref={pdfRef} className="pdf-print-container">
          <div className="pdf-header">
            <div>
              <h1 className="pdf-title">Sales Order</h1>
              <div
                style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}
              >
                Official Business Record
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <img
                src="/logo.png"
                alt="Logo"
                className="pdf-logo"
                onError={(e) => (e.target.style.display = "none")}
              />
              <div
                style={{
                  marginTop: "10px",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                Order ID: {entry.orderId || "N/A"}
              </div>
            </div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">Order Information</div>
            <div className="pdf-grid">
              <div className="pdf-item">
                <strong>SO Date:</strong>{" "}
                {formatDateTime(entry.soDate) || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Order Type:</strong> {entry.orderType || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>GEM Order No:</strong> {entry.gemOrderNumber || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Sales Person:</strong> {entry.salesPerson || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Reporting Person:</strong> {entry.report || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Branch/Company:</strong> {entry.company || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Created By:</strong> {createdByName || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Stock Status:</strong> {entry.stockStatus || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>SO Status:</strong> {entry.sostatus || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Dispatch Status:</strong>{" "}
                {entry.dispatchStatus || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>PI Number:</strong> {entry.piNumber || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Bill Number:</strong> {entry.billNumber || "N/A"}
              </div>
            </div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">Customer Details</div>
            <div className="pdf-grid">
              <div className="pdf-item">
                <strong>Customer Name:</strong> {entry.customername || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Contact Person:</strong> {entry.name || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Contact No:</strong> {entry.contactNo || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Alternate No:</strong> {entry.alterno || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Email:</strong> {entry.customerEmail || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>GST No:</strong> {entry.gstno || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>City/State:</strong> {entry.city || "N/A"},{" "}
                {entry.state || "N/A"} ({entry.pinCode || "N/A"})
              </div>
              <div className="pdf-item" style={{ gridColumn: "span 2" }}>
                <strong>Shipping Address:</strong>{" "}
                {entry.shippingAddress || "N/A"}
              </div>
              <div className="pdf-item" style={{ gridColumn: "span 2" }}>
                <strong>Billing Address:</strong>{" "}
                {entry.billingAddress || "N/A"}
              </div>
            </div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">Product & Technical Details</div>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Size/Spec</th>
                  <th>Unit Price</th>
                  <th>GST</th>
                  <th>Details (SN/MN)</th>
                </tr>
              </thead>
              <tbody>
                {entry.products && entry.products.length > 0 ? (
                  entry.products.map((p, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        {isValidField(p.productType) && (
                          <strong>{p.productType}</strong>
                        )}
                        {isValidField(p.brand) && (
                          <>
                            <br />
                            <small>{p.brand}</small>
                          </>
                        )}
                      </td>
                      <td>{p.qty || 0}</td>
                      <td>
                        {isValidField(p.size) ? p.size : ""}
                        {isValidField(p.size) && isValidField(p.spec)
                          ? " / "
                          : ""}
                        {isValidField(p.spec) ? p.spec : ""}
                      </td>
                      <td>₹{p.unitPrice?.toFixed(2) || "0.00"}</td>
                      <td>{p.gst || 0}%</td>
                      <td>
                        {isValidField(p.serialNos) && (
                          <div style={{ fontSize: "10px" }}>
                            <strong>SN:</strong> {p.serialNos.join(", ")}
                          </div>
                        )}
                        {isValidField(p.modelNos) && (
                          <div style={{ fontSize: "10px" }}>
                            <strong>MN:</strong> {p.modelNos.join(", ")}
                          </div>
                        )}
                        {isValidField(p.productCode) && (
                          <div style={{ fontSize: "10px" }}>
                            <strong>Code:</strong> {p.productCode.join(", ")}
                          </div>
                        )}
                        {isValidField(p.warranty) && (
                          <div style={{ fontSize: "10px" }}>
                            <strong>Warranty:</strong> {p.warranty}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center" }}>
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">
              Financial & Payment Information
            </div>
            <div className="pdf-grid">
              <div className="pdf-item">
                <strong>Total Unit Value:</strong> ₹
                {totalUnitPrice?.toFixed(2) || "0.00"}
              </div>
              <div className="pdf-item">
                <strong>Order Total:</strong> ₹
                {entry.total?.toFixed(2) || "0.00"}
              </div>
              <div className="pdf-item">
                <strong>Payment Method:</strong> {entry.paymentMethod || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Payment Terms:</strong> {entry.paymentTerms || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Payment Collected:</strong>{" "}
                {entry.paymentCollected || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Payment Due:</strong> {entry.paymentDue || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>NEFT/Trans ID:</strong>{" "}
                {entry.neftTransactionId || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Cheque ID:</strong> {entry.chequeId || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Credit Days:</strong> {entry.creditDays || "0"}
              </div>
              <div className="pdf-item">
                <strong>Invoice No/Date:</strong> {entry.invoiceNo || "N/A"} (
                {formatDate(entry.invoiceDate) || "N/A"})
              </div>
              <div className="pdf-item">
                <strong>Freight:</strong> ₹
                {entry.actualFreight?.toFixed(2) || "0.00"} (
                {entry.freightstatus || "N/A"})
              </div>
              <div className="pdf-item">
                <strong>Installation Charges:</strong>{" "}
                {entry.installation || "N/A"} (
                {entry.installchargesstatus || "N/A"})
              </div>
            </div>
          </div>

          <div className="pdf-section">
            <div className="pdf-section-title">
              Production, Logistics & Installation
            </div>
            <div className="pdf-grid">
              <div className="pdf-item">
                <strong>Production Status:</strong>{" "}
                {entry.fulfillingStatus || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Fulfillment Date:</strong>{" "}
                {formatDate(entry.fulfillmentDate) || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Dispatch From/Date:</strong>{" "}
                {entry.dispatchFrom || "N/A"} (
                {formatDate(entry.dispatchDate) || "N/A"})
              </div>
              <div className="pdf-item">
                <strong>Transporter/Details:</strong>{" "}
                {entry.transporter || "N/A"} (
                {entry.transporterDetails || "N/A"})
              </div>
              {isValidField(entry.docketNo) && (
                <div className="pdf-item">
                  <strong>Docket No:</strong> {entry.docketNo}
                </div>
              )}
              <div className="pdf-item">
                <strong>Delivery Date:</strong>{" "}
                {formatDate(entry.deliveryDate) || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Installation Status:</strong>{" "}
                {entry.installationStatus || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Engineer:</strong> {entry.installationeng || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Receipt Date:</strong>{" "}
                {formatDate(entry.receiptDate) || "N/A"}
              </div>
              <div className="pdf-item">
                <strong>Demo Date/Status:</strong>{" "}
                {formatDate(entry.demoDate) || "N/A"} (
                {entry.demostatus || "N/A"})
              </div>
            </div>
          </div>

          {(entry.remarks ||
            entry.remarksByProduction ||
            entry.remarksByAccounts ||
            entry.remarksByBilling ||
            entry.remarksByInstallation ||
            entry.verificationRemarks) && (
              <div className="pdf-section">
                <div className="pdf-section-title">Official Remarks</div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: "5px" }}
                >
                  {entry.remarks && (
                    <div className="pdf-item">
                      <strong>General:</strong> {entry.remarks}
                    </div>
                  )}
                  {entry.remarksByProduction && (
                    <div className="pdf-item">
                      <strong>Production:</strong> {entry.remarksByProduction}
                    </div>
                  )}
                  {entry.remarksByAccounts && (
                    <div className="pdf-item">
                      <strong>Accounts:</strong> {entry.remarksByAccounts}
                    </div>
                  )}
                  {entry.remarksByBilling && (
                    <div className="pdf-item">
                      <strong>Billing:</strong> {entry.remarksByBilling}
                    </div>
                  )}
                  {entry.remarksByInstallation && (
                    <div className="pdf-item">
                      <strong>Installation:</strong> {entry.remarksByInstallation}
                    </div>
                  )}
                  {entry.verificationRemarks && (
                    <div className="pdf-item">
                      <strong>Verification:</strong> {entry.verificationRemarks}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
        {sections.length === 0 ? (
          <p style={{ color: "#555", textAlign: "center" }}>
            No valid data available to display.
          </p>
        ) : (
          <Accordion
            defaultActiveKey={sections.map((s) => s.eventKey)}
            alwaysOpen
          >
            {sections.map((section) => (
              <Accordion.Item
                key={section.eventKey}
                eventKey={section.eventKey}
              >
                <Accordion.Header
                  style={{
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Poppins', sans-serif",
                    border: "none",
                  }}
                >
                  {section.title}
                </Accordion.Header>
                <Accordion.Body
                  style={{
                    background: "#fff",
                    borderRadius: "10px",
                    padding: "1.5rem",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {section.eventKey === "2" ? (
                    isValidField(entry.products) ? (
                      entry.products.map((product, index) => (
                        <Card
                          key={index}
                          style={{
                            marginBottom: "1rem",
                            border: "none",
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            borderRadius: "10px",
                            transition: "transform 0.2s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.transform = "scale(1.02)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                          }
                        >
                          <Card.Body>
                            <Card.Title
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                color: "#1e293b",
                              }}
                            >
                              Product {index + 1}:{" "}
                              {product.productType || "N/A"}
                            </Card.Title>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "0.5rem",
                              }}
                            >
                              {[
                                { key: "qty", label: "Quantity" },
                                { key: "size", label: "Size" },
                                { key: "spec", label: "Spec" },
                                {
                                  key: "unitPrice",
                                  label: "Unit Price",
                                  formatter: (v) =>
                                    isValidField(v) ? `₹${v.toFixed(2)}` : null,
                                },
                                {
                                  key: "gst",
                                  label: "GST",
                                  formatter: (v) =>
                                    isValidField(v) ? `${v}%` : null,
                                },
                                { key: "brand", label: "Brand" },
                                { key: "warranty", label: "Warranty" },
                                {
                                  key: "serialNos",
                                  label: "Serial Nos",
                                  formatter: (v) =>
                                    isValidField(v) && v.length > 0
                                      ? v.join(", ")
                                      : null,
                                },
                                {
                                  key: "modelNos",
                                  label: "Model Nos",
                                  formatter: (v) =>
                                    isValidField(v) && v.length > 0
                                      ? v.join(", ")
                                      : null,
                                },
                                {
                                  key: "productCode",
                                  label: "Product Code",
                                  formatter: (v) =>
                                    product.productType ===
                                      "Fujifilm-Printer" &&
                                      isValidField(v) &&
                                      v.length > 0
                                      ? v.join(", ")
                                      : null,
                                },
                              ]
                                .filter(({ key, formatter }) =>
                                  isValidField(
                                    formatter
                                      ? formatter(product[key])
                                      : product[key],
                                  ),
                                )
                                .map(({ key, label, formatter }) => (
                                  <div key={key}>
                                    <strong>{label}:</strong>{" "}
                                    {formatter
                                      ? formatter(product[key])
                                      : product[key]}
                                  </div>
                                ))}
                            </div>
                          </Card.Body>
                        </Card>
                      ))
                    ) : null
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(250px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      {section.fields
                        .filter(
                          ({ key, condition, value, formatter, renderer }) =>
                            condition !== undefined
                              ? condition
                              : renderer
                                ? renderer()
                                : isValidField(
                                  value ||
                                  (formatter
                                    ? formatter(entry[key])
                                    : entry[key]),
                                ),
                        )
                        .map(({ key, label, value, formatter, renderer }) => {
                          const displayValue =
                            value ||
                            (formatter ? formatter(entry[key]) : entry[key]);
                          const badgeStyle = badgeFields[key];
                          return (
                            <div
                              key={key}
                              style={{
                                display: renderer ? "flex" : "block",
                                alignItems: renderer ? "center" : "initial",
                                gap: renderer ? "10px" : "0",
                              }}
                            >
                              {renderer ? (
                                <>
                                  <strong>{label}:</strong> {renderer()}
                                </>
                              ) : badgeStyle && isValidField(displayValue) ? (
                                <div>
                                  <strong>{label}:</strong>{" "}
                                  <Badge
                                    bg={
                                      typeof badgeStyle[displayValue] ===
                                        "string"
                                        ? badgeStyle[displayValue] ||
                                        badgeStyle.default
                                        : undefined
                                    }
                                    style={
                                      typeof badgeStyle[displayValue] ===
                                        "object"
                                        ? {
                                          background:
                                            badgeStyle[displayValue].bg,
                                          color:
                                            badgeStyle[displayValue].color,
                                          padding: "5px 10px",
                                          borderRadius: "12px",
                                          fontWeight: "500",
                                        }
                                        : key === "fulfillingStatus"
                                          ? {
                                            background:
                                              badgeStyle[displayValue]?.bg ||
                                              badgeStyle.default.bg,
                                            color:
                                              badgeStyle[displayValue]
                                                ?.color ||
                                              badgeStyle.default.color,
                                            padding: "5px 10px",
                                            borderRadius: "12px",
                                            fontWeight: "500",
                                          }
                                          : {}
                                    }
                                  >
                                    {displayValue}
                                  </Badge>
                                </div>
                              ) : (
                                <div>
                                  <strong>{label}:</strong> {displayValue}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}

        <Button
          onClick={handleCopy}
          style={{
            marginTop: "2rem",
            background: "linear-gradient(135deg, #2563eb, #7e22ce)",
            border: "none",
            borderRadius: "50px",
            padding: "12px 24px",
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            justifyContent: "center",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-3px)";
            e.target.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
          }}
        >
          <Copy size={20} />
          {copied ? "Copied to Clipboard!" : "Copy Details"}
        </Button>
      </Modal.Body>
    </Modal>
  );
}

export default ViewEntry;
