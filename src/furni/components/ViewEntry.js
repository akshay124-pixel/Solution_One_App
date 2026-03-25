import React, { useState, useCallback } from "react";
import { Modal, Button, Badge, Accordion, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import { Copy, Download } from "lucide-react";

function ViewEntry({ isOpen, onClose, entry }) {
  const [copied, setCopied] = useState(false);
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
  const handleDownload = async (filePath) => {
    // Determine path to use: passed arg or default to poFilePath if it's the specific PO check
    // If filePath is passed (e.g. installation file), use it directly. Otherwise check poFilePath.
    const targetPath = filePath || entry?.poFilePath;

    if (!isValidPoFilePath(targetPath)) {
      toast.error("No valid file available to download!");
      return;
    }

    try {
      // Ensure path points to Uploads directory if not already there
      let processedPath = targetPath;
      if (!processedPath.includes("Uploads") && !processedPath.startsWith("http")) {
        processedPath = `/Uploads/${processedPath.startsWith("/") ? processedPath.slice(1) : processedPath}`;
      }

      const fileUrl = `${(process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni")}${processedPath.startsWith("/") ? "" : "/"}${processedPath}`;

      // Validate file URL
      if (!fileUrl || fileUrl === (process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni") + "/") {
        toast.error("Invalid file path provided!");
        return;
      }

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Accept:
            "application/pdf,image/png,image/jpeg,image/jpg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      const validTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!contentType || !validTypes.includes(contentType)) {
        throw new Error("Invalid file type returned from server!");
      }

      const blob = await response.blob();

      // ✅ FileName fix
      const extension = contentType.split("/")[1] || "file";
      const fileName =
        targetPath.split("/").pop() ||
        `order_${entry.orderId || "unknown"}.${extension}`;

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
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
      </Modal.Header>

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
                    {entry.sostatus || "N/A"}
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
                    {entry.dispatchStatus || "N/A"}
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
                    {entry.fulfillingStatus || "Pending"}
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
                      onClick={() => handleDownload(entry.installationFile)}
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
