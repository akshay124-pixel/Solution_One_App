import React, { useState, useCallback, useRef } from "react";
import { Modal, Button, Badge, Accordion, Card } from "react-bootstrap";
import { Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import { Copy, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import furniApi from "../axiosSetup";

function ViewEntry({ isOpen, onClose, entry }) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfRef = useRef(null);
  const isObjectId = (v) =>
    typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
  const getCreatedByName = useCallback((cb) =>
    cb && typeof cb === "object"
      ? cb.username || "Unknown"
      : typeof cb === "string"
        ? isObjectId(cb)
          ? "Sales Order Team"
          : cb
        : "N/A",
    []);

  const isValidPoFilePath = (filePath) => {
    return (
      filePath &&
      typeof filePath === "string" &&
      filePath.trim() !== "" &&
      filePath !== "N/A" &&
      filePath !== "/"
    );
  };
  const handleDownload = async (filePath, label = "SalesOrder") => {
    const targetPath = filePath || entry?.poFilePath;

    if (!isValidPoFilePath(targetPath)) {
      toast.error("No valid file available to download!");
      return;
    }

    try {
      const filename = targetPath.split("/").pop();
      if (!filename) {
        toast.error("Invalid file path provided!");
        return;
      }

      const response = await furniApi.get(
        `/api/download/${encodeURIComponent(filename)}`,
        { responseType: "blob" }
      );

      const blob = response.data;
      const ext = filename.includes(".") ? "." + filename.split(".").pop() : "";
      const orderSlug = entry?.orderId ? `Order_${entry.orderId}` : "Furni";
      const downloadFilename = `${orderSlug}_Furni${label ? "_" + label : ""}${ext}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = downloadFilename;
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
  const handleCopy = useCallback(() => {
    if (!entry) return;

    const productsText = entry.products
      ? entry.products
        .map(
          (p, i) =>
            `Product ${i + 1}: ${p.productType || "N/A"} (Qty: ${p.qty || "N/A"
            }, Size: ${p.size || "N/A"}, Spec: ${p.spec || "N/A"
            }, Unit Price: ₹${p.unitPrice?.toFixed(2) || "0.00"}, GST: ${p.gst || "N/A"
            }, Serial Nos: ${p.serialNos?.length > 0 ? p.serialNos.join(", ") : "N/A"
            }, Model Nos: ${p.modelNos?.length > 0 ? p.modelNos.join(", ") : "N/A"
            }, Brand: ${p.brand || "N/A"}, Warranty: ${p.warranty || "N/A"})`
        )
        .join("\n")
      : "N/A";

    const totalUnitPrice = entry.products
      ? entry.products.reduce(
        (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
        0
      )
      : 0;

    const gstText = entry.products
      ? entry.products
        .map((p) => p.gst)
        .filter(Boolean)
        .join(", ")
      : "N/A";

    const textToCopy = `
Order ID: ${entry.orderId || "N/A"}
SO Date: ${entry.soDate ? new Date(entry.soDate).toLocaleDateString("en-GB") : "N/A"
      }
Customer Name: ${entry.customername || "N/A"}
Contact Person Name: ${entry.name || "N/A"}
Contact No: ${entry.contactNo || "N/A"}
Alternate No: ${entry.alterno || "N/A"}
Customer Email: ${entry.customerEmail || "N/A"}
City: ${entry.city || "N/A"}
State: ${entry.state || "N/A"}
Pin Code: ${entry.pinCode || "N/A"}
GST No: ${entry.gstno || "N/A"}
Products:\n${productsText}
Total Unit Price: ₹${totalUnitPrice.toFixed(2)}
GST: ${gstText}
Freight Charges: ${entry.freightcs || "N/A"}
Freight Status: ${entry.freightstatus || "N/A"}
Actual Freight: ${entry.actualFreight ? `₹${entry.actualFreight.toFixed(2)}` : "N/A"
      }
Install Charges Status: ${entry.installchargesstatus || "N/A"}
Installation: ${entry.installation || "N/A"}
Total: ₹${entry.total?.toFixed(2) || "0.00"}
Payment Collected: ${entry.paymentCollected || "N/A"}
Payment Method: ${entry.paymentMethod || "N/A"}
Payment Due: ${entry.paymentDue || "N/A"}
NEFT Transaction ID: ${entry.neftTransactionId || "N/A"}
Cheque ID: ${entry.chequeId || "N/A"}
Payment Terms: ${entry.paymentTerms || "N/A"}

Order Type: ${entry.orderType || "N/A"}
GEM Order Number: ${entry.gemOrderNumber || "N/A"}
Reporting Person: ${entry.report || "N/A"}

Transporter Details: ${entry.transporterDetails || "N/A"}
Shipping Address: ${entry.shippingAddress || "N/A"}
Billing Address: ${entry.billingAddress || "N/A"}
Dispatch From: ${entry.dispatchFrom || "N/A"}
Dispatch Date: ${entry.dispatchDate
        ? new Date(entry.dispatchDate).toLocaleDateString("en-GB")
        : "N/A"
      }

Delivery Date: ${entry.deliveryDate
        ? new Date(entry.deliveryDate).toLocaleDateString("en-GB")
        : "N/A"
      }
Receipt Date: ${entry.receiptDate
        ? new Date(entry.receiptDate).toLocaleDateString("en-GB")
        : "N/A"
      }
Invoice No: ${entry.invoiceNo || "N/A"}
Invoice Date: ${entry.invoiceDate
        ? new Date(entry.invoiceDate).toLocaleDateString("en-GB")
        : "N/A"
      }
Bill Number: ${entry.billNumber || "N/A"}
PI Number: ${entry.piNumber || "N/A"}
Bill Status: ${entry.billStatus || "N/A"}
Payment Received: ${entry.paymentReceived || "N/A"}
Fulfilling Status: ${entry.fulfillingStatus || "N/A"}
SO Status: ${entry.sostatus || "N/A"}
Dispatch Status: ${entry.dispatchStatus || "N/A"}
Installation Status: ${entry.installationStatus || "N/A"}
Completion Status: ${entry.completionStatus || "N/A"}

Demo Date: ${entry.demoDate
        ? new Date(entry.demoDate).toLocaleDateString("en-GB")
        : "N/A"
      }
Fulfillment Date: ${entry.fulfillmentDate
        ? new Date(entry.fulfillmentDate).toLocaleDateString("en-GB")
        : "N/A"
      }
Remarks: ${entry.remarks || "N/A"}
Product Remarks: ${entry.productRemarks || "N/A"}
Remarks By Production: ${entry.remarksByProduction || "N/A"}
Remarks By Accounts: ${entry.remarksByAccounts || "N/A"}
Remarks By Billing: ${entry.remarksByBilling || "N/A"}
Remarks By Installation: ${entry.remarksByInstallation || "N/A"}
Verification Remarks: ${entry.verificationRemarks || "N/A"}
Sales Person: ${entry.salesPerson || "N/A"}
Company: ${entry.company || "N/A"}
Created By: ${getCreatedByName(entry.createdBy)}
    `.trim();

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
  }, [entry, getCreatedByName]);

  const handleExportPDF = useCallback(async () => {
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
      const pageContentHeightPx = (CONTENT_HEIGHT - SAFE_BOTTOM_MM) * pxPerMm;

      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvasHeight) {
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = Math.min(pageContentHeightPx, canvasHeight - sourceY);
        ctx.drawImage(canvas, 0, sourceY, canvasWidth, pageCanvas.height, 0, 0, canvasWidth, pageCanvas.height);
        const imgData = pageCanvas.toDataURL("image/jpeg", 0.98);
        if (pageIndex > 0) pdf.addPage();
        const renderedHeightMm = (pageCanvas.height * imgWidth) / canvasWidth;
        const yPosition = pageIndex === 0 ? 0 : MARGIN_TOP;
        pdf.addImage(imgData, "JPEG", 0, yPosition, imgWidth, renderedHeightMm);
        sourceY += pageCanvas.height;
        pageIndex++;
      }

      pdf.save(`Furni_Order_${entry.orderId || "Details"}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [entry]);

  if (!entry) return null;

  const totalUnitPrice = entry.products
    ? entry.products.reduce(
      (sum, p) => sum + (p.unitPrice || 0) * (p.qty || 0),
      0
    )
    : 0;

  const gstText = entry.products
    ? entry.products
      .map((p) => p.gst)
      .filter(Boolean)
      .join(", ")
    : "N/A";

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
      <Modal.Header
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "#fff",
          padding: "1.5rem 2rem",
          border: "none",

          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Modal.Title
          id="view-entry-modal-title"
          style={{
            fontWeight: "700",
            fontSize: "1.8rem",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            fontFamily: "'Poppins', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span role="img" aria-label="clipboard">
            📋
          </span>
          Sales Order #{entry.orderId || "N/A"}
        </Modal.Title>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(255,255,255,0.85)",
              borderRadius: "50px",
              padding: "8px 20px",
              fontSize: "0.95rem",
              fontWeight: "600",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { if (!isGeneratingPDF) e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
          >
            {isGeneratingPDF ? (
              <><Spinner size="sm" animation="border" /> Exporting...</>
            ) : (
              <><FileText size={16} /> Export PDF</>
            )}
          </Button>
          <Button
            variant="light"
            onClick={onClose}
            style={{
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            }}
          >
            ✕
          </Button>
        </div>
      </Modal.Header>

      <style>{`
        .pdf-print-container {
          width: 210mm;
          padding: 15mm 15mm 10mm 15mm;
          background: #fff;
          color: #333;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
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
        .pdf-title { color: #2575fc; margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold; }
        .pdf-logo { height: 60px; width: auto; }
        .pdf-section { margin-bottom: 12px; page-break-inside: avoid; }
        .pdf-section-title {
          background: #f8f9fa;
          padding: 6px 10px;
          border-left: 4px solid #6a11cb;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
          font-size: 15px;
        }
        .pdf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pdf-item { font-size: 13px; }
        .pdf-item strong { color: #444; }
        .pdf-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .pdf-table th { background: #f1f3f5; text-align: left; padding: 8px; border: 1px solid #dee2e6; font-size: 12px; }
        .pdf-table td { padding: 8px; border: 1px solid #dee2e6; font-size: 12px; vertical-align: top; }
      `}</style>

      <Modal.Body
        style={{
          padding: "2rem",
          background: "linear-gradient(180deg, #f8fafc, #e2e8f0)",
          borderRadius: "0 0 15px 15px",
          minHeight: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "#2575fc #e6f0fa",
        }}
      >
        {/* ── Off-screen PDF print container (captured by html2canvas) ── */}
        <div ref={pdfRef} className="pdf-print-container">
          <div className="pdf-header">
            <div>
              <h1 className="pdf-title">Furniture Order</h1>
              <div style={{ fontSize: "14px", color: "#666", marginTop: "5px" }}>Official Business Record</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <img src="/logo.png" alt="Logo" className="pdf-logo" onError={(e) => (e.target.style.display = "none")} />
              <div style={{ marginTop: "10px", fontWeight: "bold", fontSize: "16px" }}>
                Order ID: {entry.orderId || "N/A"}
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="pdf-section">
            <div className="pdf-section-title">Order Information</div>
            <div className="pdf-grid">
              <div className="pdf-item"><strong>SO Date:</strong> {entry.soDate ? new Date(entry.soDate).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "N/A"}</div>
              <div className="pdf-item"><strong>Order Type:</strong> {entry.orderType || "N/A"}</div>
              <div className="pdf-item"><strong>GEM Order No:</strong> {entry.gemOrderNumber || "N/A"}</div>
              <div className="pdf-item"><strong>Sales Person:</strong> {entry.salesPerson || "N/A"}</div>
              <div className="pdf-item"><strong>Reporting Person:</strong> {entry.report || "N/A"}</div>
              <div className="pdf-item"><strong>Company:</strong> {entry.company || "N/A"}</div>
              <div className="pdf-item"><strong>Created By:</strong> {getCreatedByName(entry.createdBy)}</div>
              <div className="pdf-item"><strong>SO Status:</strong> {entry.sostatus === "Hold By Production" ? "On Hold" : entry.sostatus || "N/A"}</div>
              <div className="pdf-item"><strong>Dispatch Status:</strong> {entry.dispatchStatus || "N/A"}</div>
              <div className="pdf-item"><strong>PI Number:</strong> {entry.piNumber || "N/A"}</div>
              <div className="pdf-item"><strong>Bill Number:</strong> {entry.billNumber || "N/A"}</div>
              <div className="pdf-item"><strong>Dispatch From:</strong> {entry.dispatchFrom || "N/A"}</div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="pdf-section">
            <div className="pdf-section-title">Customer Details</div>
            <div className="pdf-grid">
              <div className="pdf-item"><strong>Customer Name:</strong> {entry.customername || "N/A"}</div>
              <div className="pdf-item"><strong>Contact Person:</strong> {entry.name || "N/A"}</div>
              <div className="pdf-item"><strong>Contact No:</strong> {entry.contactNo || "N/A"}</div>
              <div className="pdf-item"><strong>Alternate No:</strong> {entry.alterno || "N/A"}</div>
              <div className="pdf-item"><strong>Email:</strong> {entry.customerEmail || "N/A"}</div>
              <div className="pdf-item"><strong>GST No:</strong> {entry.gstno || "N/A"}</div>
              <div className="pdf-item"><strong>City/State:</strong> {entry.city || "N/A"}, {entry.state || "N/A"} ({entry.pinCode || "N/A"})</div>
              <div className="pdf-item" style={{ gridColumn: "span 2" }}><strong>Shipping Address:</strong> {entry.shippingAddress || "N/A"}</div>
              <div className="pdf-item" style={{ gridColumn: "span 2" }}><strong>Billing Address:</strong> {entry.billingAddress || "N/A"}</div>
            </div>
          </div>

          {/* Products */}
          <div className="pdf-section">
            <div className="pdf-section-title">Product & Technical Details</div>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Size / Spec</th>
                  <th>Unit Price</th>
                  <th>GST</th>
                  <th>Model Nos</th>
                </tr>
              </thead>
              <tbody>
                {entry.products && entry.products.length > 0 ? entry.products.map((p, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <strong>{p.productType || "N/A"}</strong>
                      {p.brand && <><br /><small>{p.brand}</small></>}
                    </td>
                    <td>{p.qty || 0}</td>
                    <td>{[p.size, p.spec].filter(v => v && v !== "N/A").join(" / ") || "N/A"}</td>
                    <td>₹{p.unitPrice?.toFixed(2) || "0.00"}</td>
                    <td>{p.gst || 0}%</td>
                    <td style={{ fontSize: "10px" }}>
                      {p.modelNos?.length > 0 && <div><strong>MN:</strong> {p.modelNos.join(", ")}</div>}
                      {p.warranty && <div><strong>Warranty:</strong> {p.warranty}</div>}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" style={{ textAlign: "center" }}>No products found</td></tr>
                )}
              </tbody>
            </table>
            {entry.productRemarks && (
              <div style={{ marginTop: "8px", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", fontSize: "11px", color: "#475569" }}>
                <strong>Product Remarks:</strong> {entry.productRemarks}
              </div>
            )}
          </div>

          {/* Financial */}
          <div className="pdf-section">
            <div className="pdf-section-title">Financial & Payment Information</div>
            <div className="pdf-grid">
              <div className="pdf-item"><strong>Total Unit Value:</strong> ₹{totalUnitPrice.toFixed(2)}</div>
              <div className="pdf-item"><strong>Order Total:</strong> ₹{entry.total?.toFixed(2) || "0.00"}</div>
              <div className="pdf-item"><strong>Payment Method:</strong> {entry.paymentMethod || "N/A"}</div>
              <div className="pdf-item"><strong>Payment Terms:</strong> {entry.paymentTerms || "N/A"}</div>
              <div className="pdf-item"><strong>Payment Collected:</strong> {entry.paymentCollected || "N/A"}</div>
              <div className="pdf-item"><strong>Payment Due:</strong> {entry.paymentDue || "N/A"}</div>
              <div className="pdf-item"><strong>NEFT/Trans ID:</strong> {entry.neftTransactionId || "N/A"}</div>
              <div className="pdf-item"><strong>Cheque ID:</strong> {entry.chequeId || "N/A"}</div>
              <div className="pdf-item"><strong>Invoice No/Date:</strong> {entry.invoiceNo || "N/A"} ({entry.invoiceDate ? new Date(entry.invoiceDate).toLocaleDateString("en-GB") : "N/A"})</div>
              <div className="pdf-item"><strong>Freight:</strong> ₹{entry.actualFreight?.toFixed(2) || "0.00"} ({entry.freightstatus || "N/A"})</div>
              <div className="pdf-item"><strong>Installation Charges:</strong> {entry.installation || "N/A"} ({entry.installchargesstatus || "N/A"})</div>
              <div className="pdf-item"><strong>Bill Status:</strong> {entry.billStatus || "N/A"}</div>
            </div>
          </div>

          {/* Production, Logistics & Installation */}
          <div className="pdf-section">
            <div className="pdf-section-title">Production, Logistics & Installation</div>
            <div className="pdf-grid">
              <div className="pdf-item"><strong>Production Status:</strong> {entry.fulfillingStatus === "Order Cancel" ? "Order Cancelled" : entry.fulfillingStatus || "N/A"}</div>
              <div className="pdf-item"><strong>Fulfillment Date:</strong> {entry.fulfillmentDate ? new Date(entry.fulfillmentDate).toLocaleDateString("en-GB") : "N/A"}</div>
              <div className="pdf-item"><strong>Dispatch Date:</strong> {entry.dispatchDate ? new Date(entry.dispatchDate).toLocaleDateString("en-GB") : "N/A"}</div>
              <div className="pdf-item"><strong>Transporter Details:</strong> {entry.transporterDetails || "N/A"}</div>
              <div className="pdf-item"><strong>Delivery Date:</strong> {entry.deliveryDate ? new Date(entry.deliveryDate).toLocaleDateString("en-GB") : "N/A"}</div>
              <div className="pdf-item"><strong>Receipt Date:</strong> {entry.receiptDate ? new Date(entry.receiptDate).toLocaleDateString("en-GB") : "N/A"}</div>
              <div className="pdf-item"><strong>Installation Status:</strong> {entry.installationStatus || "N/A"}</div>
              <div className="pdf-item"><strong>Installation Report:</strong> {entry.installationReport || "N/A"}</div>
              <div className="pdf-item"><strong>Stamp Signed:</strong> {entry.stamp || "N/A"}</div>
              <div className="pdf-item"><strong>Demo Date:</strong> {entry.demoDate ? new Date(entry.demoDate).toLocaleDateString("en-GB") : "N/A"}</div>
            </div>
          </div>

          {/* Remarks */}
          {(entry.remarks || entry.productRemarks || entry.remarksByProduction || entry.remarksByAccounts || entry.remarksByBilling || entry.remarksByInstallation || entry.verificationRemarks) && (
            <div className="pdf-section">
              <div className="pdf-section-title">Official Remarks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {entry.remarks && <div className="pdf-item"><strong>General:</strong> {entry.remarks}</div>}
                {entry.productRemarks && <div className="pdf-item"><strong>Product Remarks:</strong> {entry.productRemarks}</div>}
                {entry.remarksByProduction && <div className="pdf-item"><strong>Production:</strong> {entry.remarksByProduction}</div>}
                {entry.remarksByAccounts && <div className="pdf-item"><strong>Accounts:</strong> {entry.remarksByAccounts}</div>}
                {entry.remarksByBilling && <div className="pdf-item"><strong>Billing:</strong> {entry.remarksByBilling}</div>}
                {entry.remarksByInstallation && <div className="pdf-item"><strong>Installation:</strong> {entry.remarksByInstallation}</div>}
                {entry.verificationRemarks && <div className="pdf-item"><strong>Verification:</strong> {entry.verificationRemarks}</div>}
              </div>
            </div>
          )}
        </div>
        {/* ── End PDF container ── */}

        <Accordion defaultActiveKey={["0"]} alwaysOpen>
          {/* Order Info Section */}
          <Accordion.Item eventKey="0">
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
              📅 Order Information
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Order ID:</strong> {entry.orderId || "N/A"}
                </div>
                <div>
                  <strong>SO Date & Time:</strong>{" "}
                  {entry.soDate
                    ? new Date(entry.soDate).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                    : "N/A"}
                </div>
                <div>
                  <strong>Order Type:</strong>{" "}
                  <Badge
                    bg={
                      entry.orderType === "Demo"
                        ? "warning"
                        : entry.orderType === "B2C"
                          ? "success"
                          : entry.orderType === "B2B"
                            ? "info"
                            : entry.orderType === "B2G"
                              ? "primary"
                              : "secondary"
                    }
                  >
                    {entry.orderType || "N/A"}
                  </Badge>
                </div>
                {entry.gemOrderNumber && (
                  <div>
                    <strong>GEM Order Number:</strong>{" "}
                    {entry.gemOrderNumber || "N/A"}
                  </div>
                )}
                <div>
                  <strong>Signed Stamp Receiving:</strong>{" "}
                  {entry.stamp || "Not Received"}
                </div>

                {entry.stampReport && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <strong>Stamp Signed Report:</strong>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleDownload(entry.stampReport, "StampSignedReport")}
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
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 5px 12px rgba(0,0,0,0.3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)"; }}
                    >
                      <Download size={14} />
                      Download Report
                    </Button>
                  </div>
                )}

                <div>
                  <strong>Dispatch Date:</strong>{" "}
                  {entry.dispatchDate
                    ? new Date(entry.dispatchDate).toLocaleDateString("en-GB")
                    : "N/A"}
                </div>
                <div>
                  <strong>Delivery Date:</strong>{" "}
                  {entry.deliveryDate
                    ? new Date(entry.deliveryDate).toLocaleDateString("en-GB")
                    : "N/A"}
                </div>
                {entry.receiptDate && (
                  <div>
                    <strong>Receipt Date:</strong>{" "}
                    {entry.receiptDate
                      ? new Date(entry.receiptDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </div>
                )}

                <div>
                  <strong>SO Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.sostatus === "Pending for Approval"
                        ? "warning"
                        : entry.sostatus === "Accounts Approved"
                          ? "info"
                          : entry.sostatus === "Approved"
                            ? "success"
                            : "secondary"
                    }
                  >
                    {entry.sostatus === "Hold By Production" ? "On Hold" : entry.sostatus || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Dispatch Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.dispatchStatus === "Not Dispatched"
                        ? "warning"
                        : entry.dispatchStatus === "Dispatched"
                          ? "info"
                          : entry.dispatchStatus === "Delivered"
                            ? "success"
                            : entry.dispatchStatus === "Docket Awaited Dispatched"
                              ? "primary"
                              : "secondary"
                    }
                  >
                    {entry.dispatchStatus === "Not Dispatched" ? "Pending Dispatched" : entry.dispatchStatus || "N/A"}
                  </Badge>
                </div>
                {/* <div>
                  <strong>Completion Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.completionStatus === "Complete"
                        ? "success"
                        : "warning"
                    }
                  >
                    {entry.completionStatus || "N/A"}
                  </Badge>
                </div> */}

                {entry.demoDate && (
                  <div>
                    <strong>Demo Date:</strong>{" "}
                    {entry.demoDate
                      ? new Date(entry.demoDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </div>
                )}
                <div>
                  <strong>Production Date:</strong>{" "}
                  {entry.fulfillmentDate
                    ? new Date(entry.fulfillmentDate).toLocaleDateString(
                      "en-GB"
                    )
                    : "N/A"}
                </div>
                <div>
                  <strong>Created By:</strong>{" "}
                  {getCreatedByName(entry.createdBy)}
                </div>
                <div>
                  <strong>Sales Person:</strong> {entry.salesPerson || "N/A"}
                </div>
                <div>
                  <strong>Reporting Person:</strong> {entry.report || "N/A"}
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* Customer Info Section */}
          <Accordion.Item eventKey="1">
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
              👤 Customer Information
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Customer Name:</strong> {entry.customername || "N/A"}
                </div>
                <div>
                  <strong>Contact Person:</strong> {entry.name || "N/A"}
                </div>
                <div>
                  <strong>Contact No:</strong> {entry.contactNo || "N/A"}
                </div>
                <div>
                  <strong>Alternate No:</strong> {entry.alterno || "N/A"}
                </div>
                <div>
                  <strong>Email:</strong> {entry.customerEmail || "N/A"}
                </div>
                <div>
                  <strong>GST No:</strong> {entry.gstno || "N/A"}
                </div>
                <div>
                  <strong>City:</strong> {entry.city || "N/A"}
                </div>
                <div>
                  <strong>State:</strong> {entry.state || "N/A"}
                </div>
                <div>
                  <strong>Pin Code:</strong> {entry.pinCode || "N/A"}
                </div>
                <div>
                  <strong>Shipping Address:</strong>{" "}
                  {entry.shippingAddress || "N/A"}
                </div>
                <div>
                  <strong>Billing Address:</strong>{" "}
                  {entry.billingAddress || "N/A"}
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* Product Info Section */}
          <Accordion.Item eventKey="2">
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
              📦 Product Information
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              {entry.products && entry.products.length > 0 ? (
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
                        Product Category {index + 1}:{" "}
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
                        <div>
                          <strong>Quantity:</strong> {product.qty || "N/A"}
                        </div>
                        <div>
                          <strong>Size:</strong> {product.size || "N/A"}
                        </div>
                        <div>
                          <strong>Spec:</strong> {product.spec || "N/A"}
                        </div>
                        <div>
                          <strong>Unit Price:</strong> ₹
                          {product.unitPrice?.toFixed(2) || "0.00"}
                        </div>
                        <div>
                          <strong>GST:</strong> {product.gst || "N/A"}%
                        </div>
                        {product.brand && (
                          <div>
                            <strong>Brand:</strong> {product.brand || "N/A"}
                          </div>
                        )}
                        {product.warranty && (
                          <div>
                            <strong>Warranty:</strong>{" "}
                            {product.warranty || "N/A"}
                          </div>
                        )}
                        <div>
                          <strong>Model Nos:</strong>{" "}
                          {product.modelNos?.length > 0
                            ? product.modelNos.join(", ")
                            : "N/A"}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              ) : (
                <p style={{ color: "#555" }}>No products available.</p>
              )}
              {entry.productRemarks && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#f1f5f9", borderRadius: "0.75rem", fontSize: "0.95rem", color: "#475569", borderLeft: "4px solid #6366f1" }}>
                  <strong>Product Remarks:</strong> {entry.productRemarks}
                </div>
              )}
            </Accordion.Body>
          </Accordion.Item>

          {/* Financial Info Section */}
          <Accordion.Item eventKey="3">
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
              💰 Financial Information
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Total Unit Price:</strong> ₹
                  {totalUnitPrice.toFixed(2)}
                </div>
                <div>
                  <strong>GST:</strong> {gstText}
                </div>
                {entry.freightcs && (
                  <div>
                    <strong>Freight Charges:</strong> {entry.freightcs || "N/A"}
                  </div>
                )}
                <div>
                  <strong>Freight Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.freightstatus === "Including"
                        ? "success"
                        : entry.freightstatus === "To Pay"
                          ? "warning"
                          : entry.freightstatus === "Self-Pickup"
                            ? "info"
                            : "primary"
                    }
                  >
                    {entry.freightstatus || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Actual Freight:</strong>{" "}
                  {entry.actualFreight
                    ? `₹${entry.actualFreight.toFixed(2)}`
                    : "N/A"}
                </div>
                <div>
                  <strong>Install Charges Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.installchargesstatus === "Including"
                        ? "success"
                        : entry.installchargesstatus === "To Pay"
                          ? "warning"
                          : entry.installchargesstatus === "Not in Scope"
                            ? "warning"
                            : "primary"
                    }
                  >
                    {entry.installchargesstatus || "N/A"}
                  </Badge>
                </div>
                {entry.installation && (
                  <div>
                    <strong>Installation:</strong> {entry.installation || "N/A"}
                  </div>
                )}
                <div>
                  <strong>Total:</strong> ₹{entry.total?.toFixed(2) || "0.00"}
                </div>
                <div>
                  <strong>Payment Collected:</strong>{" "}
                  {entry.paymentCollected || "N/A"}
                </div>
                <div>
                  <strong>Payment Method:</strong>{" "}
                  <Badge
                    bg={
                      entry.paymentMethod === "Cash"
                        ? "success"
                        : entry.paymentMethod === "NEFT"
                          ? "info"
                          : entry.paymentMethod === "RTGS"
                            ? "primary"
                            : entry.paymentMethod === "Cheque"
                              ? "warning"
                              : "secondary"
                    }
                  >
                    {entry.paymentMethod || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Payment Due:</strong> {entry.paymentDue || "N/A"}
                </div>
                {entry.neftTransactionId && (
                  <div>
                    <strong>NEFT Transaction ID:</strong>{" "}
                    {entry.neftTransactionId || "N/A"}
                  </div>
                )}
                {entry.chequeId && (
                  <div>
                    <strong>Cheque ID:</strong> {entry.chequeId || "N/A"}
                  </div>
                )}
                <div>
                  <strong>Payment Terms:</strong>{" "}
                  <Badge
                    bg={
                      entry.paymentTerms === "100% Advance"
                        ? "success"
                        : entry.paymentTerms === "Partial Advance"
                          ? "info"
                          : entry.paymentTerms === "Credit"
                            ? "warning"
                            : "secondary"
                    }
                  >
                    {entry.paymentTerms || "N/A"}
                  </Badge>
                </div>

                {entry.creditDays && (
                  <div>
                    <strong>Credit Days:</strong>{" "}
                    {entry.creditDays} Days
                  </div>
                )}

                {entry.pwc && (
                  <div>
                    <strong>PWC:</strong>{" "}
                    <Badge bg={entry.pwc === "Yes" ? "success" : "secondary"}>
                      {entry.pwc}
                    </Badge>
                  </div>
                )}
                {entry.pwcFile && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <strong>PWC Document:</strong>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleDownload(entry.pwcFile, "PWC_Document")}
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
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 5px 12px rgba(0,0,0,0.3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)"; }}
                    >
                      <Download size={14} />
                      Download PWC
                    </Button>
                  </div>
                )}

                <div>
                  <strong>Payment Received:</strong>{" "}
                  <Badge
                    bg={
                      entry.paymentReceived === "Received"
                        ? "success"
                        : "warning"
                    }
                  >
                    {entry.paymentReceived || "N/A"}
                  </Badge>
                </div>

                <div>
                  <strong>Invoice Date:</strong>{" "}
                  {entry.invoiceDate
                    ? new Date(entry.invoiceDate).toLocaleDateString("en-GB")
                    : "N/A"}
                </div>
                <div>
                  <strong>Bill Number:</strong> {entry.billNumber || "N/A"}
                </div>
                <div>
                  <strong>PI Number:</strong> {entry.piNumber || "N/A"}
                </div>
                <div>
                  <strong>Bill Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.billStatus === "Pending"
                        ? "warning"
                        : entry.billStatus === "Under Billing"
                          ? "info"
                          : entry.billStatus === "Billing Complete"
                            ? "success"
                            : "secondary"
                    }
                  >
                    {entry.billStatus || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Remarks (Accounts):</strong>{" "}
                  {entry.remarksByAccounts || "N/A"}
                </div>
                <div>
                  <strong>Remarks (Billing):</strong>{" "}
                  {entry.remarksByBilling || "N/A"}
                </div>
                {entry.verificationRemarks && (
                  <div>
                    <strong>Verification Remarks:</strong>{" "}
                    {entry.verificationRemarks || "N/A"}
                  </div>
                )}
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* Production Info Section */}
          <Accordion.Item eventKey="4">
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
              🛠️ Production Information
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Production Status:</strong>{" "}
                  <Badge
                    style={{
                      background:
                        entry.fulfillingStatus === "Under Process"
                          ? "linear-gradient(135deg, #f39c12, #f7c200)"
                          : entry.fulfillingStatus === "Pending"
                            ? "linear-gradient(135deg, #ff6b6b, #ff8787)"
                            : entry.fulfillingStatus === "Partial Dispatch"
                              ? "linear-gradient(135deg, #00c6ff, #0072ff)"
                              : entry.fulfillingStatus === "Fulfilled"
                                ? "linear-gradient(135deg, #28a745, #4cd964)"
                                : "linear-gradient(135deg, #6c757d, #a9a9a9)",
                      color: "#fff",
                      padding: "5px 10px",
                      borderRadius: "12px",
                      fontWeight: "500",
                    }}
                  >
                    {entry.fulfillingStatus === "Order Cancel" ? "Order Cancelled" : entry.fulfillingStatus === "Partial Dispatch" ? "Partial Dispatched" : entry.fulfillingStatus === "Fulfilled" ? "Completed" : entry.fulfillingStatus || "Pending"}
                  </Badge>
                </div>
                <div>
                  <strong>Remarks (Production):</strong>{" "}
                  {entry.remarksByProduction || "N/A"}
                </div>
                <div>
                  <strong>Remarks:</strong> {entry.remarks || "N/A"}
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Item>

          {/* Logistics & Installation Info Section */}
          <Accordion.Item eventKey="5">
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
              🚚 Logistics & Installation
            </Accordion.Header>
            <Accordion.Body
              style={{
                background: "#fff",
                borderRadius: "10px",
                padding: "1.5rem",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <strong>Installation Status:</strong>{" "}
                  <Badge
                    bg={
                      entry.installationStatus === "Pending"
                        ? "warning"
                        : entry.installationStatus === "In Progress"
                          ? "info"
                          : entry.installationStatus === "Completed"
                            ? "success"
                            : entry.installationStatus === "Failed"
                              ? "danger"
                              : "secondary"
                    }
                  >
                    {entry.installationStatus || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Installation Report:</strong>{" "}
                  <Badge
                    bg={
                      entry.installationReport === "Yes"
                        ? "success"
                        : entry.installationReport === "No"
                          ? "danger"
                          : "secondary"
                    }
                  >
                    {entry.installationReport || "No"}
                  </Badge>
                </div><div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <strong>Installation Report:</strong>
                  {entry.installationFile ? (
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
                  ) : (
                    "N/A"
                  )}
                </div>

                <div>
                  <strong>Remarks (Installation):</strong>{" "}
                  {entry.remarksByInstallation || "N/A"}
                </div>
                <div>
                  <strong>Remarks (Dispatch):</strong>{" "}
                  {entry.remarksBydispatch || "N/A"}
                </div>
                <div>
                  <strong>Company:</strong>{" "}
                  <Badge
                    bg={
                      entry.company === "Promark"
                        ? "success"
                        : entry.company === "Foxmate"
                          ? "info"
                          : entry.company === "Promine"
                            ? "warning"
                            : "primary"
                    }
                  >
                    {entry.company || "N/A"}
                  </Badge>
                </div>
                <div>
                  <strong>Dispatch From:</strong> {entry.dispatchFrom || "N/A"}
                </div>

                <div>
                  <strong>Transporter Details:</strong>{" "}
                  {entry.transporterDetails || "N/A"}
                </div>{" "}
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>

        {/* PO File Attachment Download */}
        {entry.poFilePath && isValidPoFilePath(entry.poFilePath) && (
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.5rem", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong style={{ color: "#1e293b" }}>📎File Attachment</strong>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleDownload(entry.poFilePath, "SalesOrder")}
              style={{ background: "linear-gradient(135deg, #2575fc, #6a11cb)", padding: "6px 14px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#ffffff", border: "none", boxShadow: "0 3px 8px rgba(0,0,0,0.2)", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 5px 12px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 3px 8px rgba(0,0,0,0.2)"; }}
            >
              <Download size={14} /> Download File
            </Button>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
        <Button
          onClick={handleCopy}
          style={{
            flex: 1,
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
            justifyContent: "center",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
          }}
        >
          <Copy size={20} />
          {copied ? "Copied to Clipboard!" : "Copy Details"}
        </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default ViewEntry;
