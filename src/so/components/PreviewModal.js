import { Modal, Table, Badge, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { Download } from "lucide-react";
import soApi from "../../so/axiosSetup";
import "bootstrap/dist/css/bootstrap.min.css";

const PreviewModal = ({ isOpen, onClose, entry }) => {
  if (!entry) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
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
  const handleDownload = async (filePath, label = "AV_EdTech") => {
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

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGST = 0;
    if (entry.products && entry.products.length > 0) {
      entry.products.forEach((product) => {
        const qty = product.qty || 0;
        const unitPrice = product.unitPrice || 0;
        const gstRate = parseFloat(product.gst) || 0;
        subtotal += qty * unitPrice;
        totalGST += (qty * unitPrice * gstRate) / 100;
      });
    }
    return {
      subtotal: subtotal.toFixed(2),
      totalGST: totalGST.toFixed(2),
    };
  };

  const { subtotal, totalGST } = calculateTotals();
  const total = entry.total
    ? parseFloat(entry.total).toFixed(2)
    : (parseFloat(subtotal) + parseFloat(totalGST)).toFixed(2);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Order Form #${entry.orderId || "N/A"}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              color: #333; 
              font-size: 0.9rem; 
            }
            .invoice-container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
              padding: 1.5rem;
              margin: 1rem;
            }
            .invoice-header {
              background: linear-gradient(135deg, #2575fc, #6a11cb);
              color: white;
              height: 80px;
              padding: 1.25rem;
              border-radius: 8px 8px 0 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .invoice-section {
              margin-bottom: 1.25rem;
              padding: 1rem;
              background: #f9fafb;
              border-radius: 8px;
            }
            .invoice-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1.5rem;
            }
            .invoice-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
            }
            .invoice-table th, .invoice-table td {
              padding: 0.5rem;
              vertical-align: middle;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .invoice-table th {
              background: #d1d5db;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 0.75rem;
              color: #1f2937;
              letter-spacing: 0.05em;
            }
            .invoice-table tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            .invoice-table tbody tr:hover {
              background: #f3f4f6;
              transition: background 0.2s ease;
            }
            .totals-section {
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1.5rem;
            }
            .badge-custom {
              font-size: 0.85rem;
              padding: 0.4rem 0.8rem;
              border-radius: 0.375rem;
              color: white;
            }
            .modal-body {
              max-height: 85vh;
              overflow-y: auto;
              background: #f1f5f9;
              padding: 0;
            }
            .logo-image {
              width: 110px;
              height: auto;
              margin-left: 15px;
              margin-top: 17px;
              filter: brightness(0) invert(1);
            }
            .footer-branding {
              color: #4b5563;
              font-size: 0.75rem;
              text-align: center;
              margin-top: 1.5rem;
            }
            .saffron { color: #ff9933; }
            .green { color: #138808; }
            h4, h5 {
              text-transform: uppercase;
              font-weight: 700;
              color: #1f2937;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 4px;
            }
            @media print { 
              .no-print { display: none; } 
              .invoice-container { 
                border: none; 
                box-shadow: none; 
                margin: 0; 
              } 
              .invoice-section { box-shadow: none; } 
              .modal-body { padding: 0; background: white; }
            }
            @media (max-width: 768px) {
              .invoice-grid, .totals-section {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="modal-body">
            <div class="invoice-container">
              <div class="invoice-section">
                <h4 class="text-lg mb-3">Customer Details</h4>
                <div class="invoice-grid">
                  <div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Order Date</strong>
                      <span class="text-gray-900">${
                        formatDate(entry.soDate) || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Customer's/Partner Company Name:</strong>
                      <span class="text-gray-900">${
                        entry.customername || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Customer's/Partner's Billing Address:</strong>
                      <span class="text-gray-900">${
                        entry.billingAddress || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Customer's/Partner's Shipping Address:</strong>
                      <span class="text-gray-900">${
                        entry.shippingAddress || "N/A"
                      }</span>
                    </div>
                  </div>
                  <div>
                    <div class="mb-2">
                      <strong class="text-gray-700">GSTIN No:</strong>
                      <span class="text-gray-900">${entry.gstno || "N/A"}</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Contact Person Name/Designation:</strong>
                      <span class="text-gray-900">${entry.name || "N/A"}</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Contact No:</strong>
                      <span class="text-gray-900">${
                        entry.contactNo || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Mail ID of Partner/Customer:</strong>
                      <span class="text-gray-900">${
                        entry.customerEmail || "N/A"
                      }</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="invoice-section">
                <h4 class="text-lg mb-3">Additional Details</h4>
                <div class="invoice-grid">
                  <div>
                  <div class="mb-2">
                      <strong class="text-gray-700">Company:</strong>
                      <span class="text-gray-900">${
                        entry.company || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Transporter:</strong>
                      <span class="text-gray-900">${
                        entry.transporter || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Transporter Details:</strong>
                      <span class="text-gray-900">${
                        entry.transporterRemarks || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Order Type:</strong>
                      <span class="text-gray-900">${
                        entry.orderType || "N/A"
                      }</span>
                    </div>
                  </div>
                  <div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Dispatch From:</strong>
                      <span class="text-gray-900">${
                        entry.dispatchFrom || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Name of the Sales Person:</strong>
                      <span class="text-gray-900">${
                        entry.salesPerson || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Remarks By SalesPerson:</strong>
                      <span class="text-gray-900">${
                        entry.remarks || "N/A"
                      }</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="invoice-section">
                <h4 class="text-lg mb-3">Invoice Details</h4>
                <div class="invoice-grid">
                  <div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Invoice Date:</strong>
                      <span class="text-gray-900">${formatDate(
                        entry.invoiceDate,
                      )}</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Bill Number:</strong>
                      <span class="text-gray-900">${
                        entry.billNumber || "N/A"
                      }</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">PI Number:</strong>
                      <span class="text-gray-900">${
                        entry.piNumber || "N/A"
                      }</span>
                    </div>
                  </div>
                  <div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Payment Terms:</strong>
                      <span class="badge-custom" style="background: ${
                        entry.paymentTerms === "100% Advance"
                          ? "#2196f3"
                          : entry.paymentTerms === "Partial Advance"
                            ? "#3b82f6"
                            : entry.paymentTerms === "Credit"
                              ? "#eab308"
                              : "#6b7280"
                      };">${entry.paymentTerms || "N/A"}</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Payment Method:</strong>
                      <span class="badge-custom" style="background: ${
                        entry.paymentMethod === "Cash"
                          ? "#2196f3"
                          : entry.paymentMethod === "NEFT"
                            ? "#3b82f6"
                            : entry.paymentMethod === "RTGS"
                              ? "#9333ea"
                              : entry.paymentMethod === "Cheque"
                                ? "#eab308"
                                : "#6b7280"
                      };">${entry.paymentMethod || "N/A"}</span>
                    </div>
                    <div class="mb-2">
                      <strong class="text-gray-700">Credit Days:</strong>
                      <span class="text-gray-900">${
                        entry.creditDays || "N/A"
                      }</span>
                    </div>
                    ${
                      entry.neftTransactionId
                        ? `
                    <div class="mb-2">
                      <strong class="text-gray-700">NEFT Transaction ID:</strong>
                      <span class="text-gray-900">${entry.neftTransactionId}</span>
                    </div>
                    `
                        : ""
                    }
                    ${
                      entry.chequeId
                        ? `
                    <div class="mb-2">
                      <strong class="text-gray-700">Cheque ID:</strong>
                      <span class="text-gray-900">${entry.chequeId}</span>
                    </div>
                    `
                        : ""
                    }
                  </div>
                </div>
              </div>
              <div class="invoice-section">
                <h4 class="text-lg mb-3">Product Details</h4>
                <table class="invoice-table">
                  <thead>
                    <tr>
                      <th style="width: 5%">#</th>
                      <th style="width: 40%">Description</th>
                      <th style="width: 10%">Qty</th>
                      <th style="width: 15%">Unit Price</th>
                      <th style="width: 15%">GST (%)</th>
                      <th style="width: 15%">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      entry.products && entry.products.length > 0
                        ? entry.products
                            .map((product, index) => {
                              const qty = product.qty || 0;
                              const unitPrice = product.unitPrice || 0;
                              const gstRate = parseFloat(product.gst) || 0;
                              const lineTotal =
                                (qty * unitPrice * (100 + gstRate)) / 100;
                              return `
                        <tr>
                          <td>${index + 1}</td>
                          <td><strong>${
                            product.productType || "N/A"
                          }</strong><br /><small>Size: ${
                            product.size || "N/A"
                          }, Spec: ${product.spec || "N/A"}, Brand: ${
                            product.brand || "N/A"
                          }, Warranty: ${product.warranty || "N/A"}${
                            product.serialNos?.length > 0
                              ? `, Serial: ${product.serialNos.join(", ")}`
                              : ""
                          }${
                            product.modelNos?.length > 0
                              ? `, Model: ${product.modelNos.join(", ")}`
                              : ""
                          }</small></td>
                          <td>${qty}</td>
                          <td>₹${unitPrice.toFixed(2)}</td>
                          <td>${gstRate.toFixed(2)}%</td>
                          <td>₹${lineTotal.toFixed(2)}</td>
                        </tr>
                      `;
                            })
                            .join("")
                        : '<tr><td colspan="6" style="text-align: center; font-style: italic;">No products available.</td></tr>'
                    }
                  </tbody>
                </table>
              </div>
              <div class="totals-section">
                <div class="text-gray-700 space-y-1">
                  <p><strong>Freight Status:</strong> ${
                    entry.freightstatus || "N/A"
                  }</p>
                  <p><strong>Installation Status:</strong> ${
                    entry.installchargesstatus || "N/A"
                  }</p>
                  <p><strong>Freight Charges:</strong> ₹${
                    entry.actualFreight?.toFixed(2) || entry.freightcs || "N/A"
                  }</p>
                  <p><strong>Installation Charges:</strong> ${
                    entry.installation || "N/A"
                  }</p>
                </div>
                <div class="text-gray-700 space-y-1">
                  <p><strong>Subtotal:</strong> ₹${subtotal}</p>
                  <p><strong>Total GST:</strong> ₹${totalGST}</p>
                  <p class="text-lg font-semibold text-gray-800"><strong>Total Amount:</strong> ₹${total}</p>
                </div>
              </div>
              <div class="footer-branding">
                <p class="font-semibold">Thank you for your business!</p>
                <p>Promark Techsolutions Pvt Ltd | Phone: 1800 103 8878 | Email: info@promark.co.in</p>
                <p><span class="saffron">Proudly</span> Made <span class="green">in India</span></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      size="xl"
      centered
      backdrop="static"
      keyboard={true}
      aria-labelledby="preview-modal-title"
      className="font-sans"
    >
      <style>
        {`
          .invoice-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            margin: 1rem;
          }
          .invoice-header {
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            color: white;
            height: 80px;
            padding: 1.25rem;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .invoice-section {
            margin-bottom: 1.25rem;
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
          }
          .invoice-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
          .invoice-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
          }
          .invoice-table th, .invoice-table td {
            padding: 0.5rem;
            vertical-align: middle;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }
          .invoice-table th {
            background: #d1d5db;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            color: #1f2937;
            letter-spacing: 0.05em;
          }
          .invoice-table tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          .invoice-table tbody tr:hover {
            background: #f3f4f6;
            transition: background 0.2s ease;
          }
          .totals-section {
            background: #f3f4f6;
            padding: 1rem;
            border-radius: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
          .badge-custom {
            font-size: 0.85rem;
            padding: 0.4rem 0.8rem;
            border-radius: 0.375rem;
          }
          .modal-body {
            max-height: 85vh;
            overflow-y: auto;
            background: #f1f5f9;
            padding: 0;
          }
          .close-btn, .print-btn {
            transition: transform 0.2s ease, background 0.2s ease;
          }
          .close-btn:hover, .print-btn:hover {
            transform: scale(1.1);
            background: rgba(255, 255, 255, 0.2);
          }
          .logo-image {
            width: 110px;
            height: auto;
            margin-left: 15px;
            margin-top: 17px;
            filter: brightness(0) invert(1);
          }
          .print-btn {
            background: linear-gradient(135deg, #10b981, #34d399);
            border: none;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            margin-right: 15px;
          }
          .footer-branding {
            color: #4b5563;
            font-size: 0.75rem;
            text-align: center;
            margin-top: 1.5rem;
          }
          .saffron { color: #ff9933; }
          .green { color: #138808; }
          h4, h5 {
            text-transform: uppercase;
            font-weight: 700;
            color: #1f2937;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
          }
          @media (max-width: 768px) {
            .invoice-grid, .totals-section {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
      <Modal.Header className="p-0 border-0">
        <div className="invoice-header w-100">
          <div className="flex items-center gap-4">
            <img src="logo.png" alt="Promark Logo" className="logo-image" />
            <div>
              <p className="text-sm opacity-80" style={{ marginLeft: "20px" }}>
                OrderId: {entry.orderId || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="print-btn"
              onClick={handlePrint}
              aria-label="Print sales order"
            >
              Print
            </Button>
            <button
              onClick={onClose}
              className="close-btn text-white bg-transparent border-0 text-xl w-10 h-10 rounded-full flex items-center justify-center"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="modal-body">
        <div className="invoice-container">
          <div className="invoice-section">
            <h4 className="text-lg mb-3">Customer Details</h4>
            <div className="invoice-grid">
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">Order Date</strong>{" "}
                  <span className="text-gray-900">
                    {formatDate(entry.soDate) || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Customer's/Partner Company Name:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.customername || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Customer's/Partner's Billing Address:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.billingAddress || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Customer's/Partner's Shipping Address:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.shippingAddress || "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">GSTIN No:</strong>{" "}
                  <span className="text-gray-900">{entry.gstno || "N/A"}</span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Contact Person Name/Designation:
                  </strong>{" "}
                  <span className="text-gray-900">{entry.name || "N/A"}</span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Contact No:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.contactNo || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Mail ID of Partner/Customer:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.customerEmail || "N/A"}
                  </span>
                </div>
                {entry.poFilePath && isValidPoFilePath(entry.poFilePath) && (
                  <div
                    className="mb-2"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <strong className="text-gray-700">Attachment:</strong>

                    {entry.poFilePath && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleDownload(entry.poFilePath)}
                        style={{
                          background:
                            "linear-gradient(135deg, #2575fc, #6a11cb)",
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
                          e.target.style.boxShadow =
                            "0 4px 12px rgba(106, 17, 203, 0.4)";
                          e.target.style.background =
                            "linear-gradient(135deg, #3b82f6, #7e22ce)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = "scale(1)";
                          e.target.style.boxShadow =
                            "0 2px 6px rgba(0, 0, 0, 0.15)";
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
                    )}
                  </div>
                )}
                {entry.gemOrderNumber && (
                  <div className="mb-2">
                    <strong className="text-gray-700">Gem Order Number:</strong>{" "}
                    <span className="text-gray-900">
                      {entry.gemOrderNumber || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="invoice-section">
            <h4 className="text-lg mb-3">Additional Details</h4>
            <div className="invoice-grid">
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">Company:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.company || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Transporter:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.transporter || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Transporter Details:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.transporterRemarks || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Order Type:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.orderType || "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">Dispatch From:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.dispatchFrom || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Name of the Sales Person:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.salesPerson || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">
                    Remarks By SalesPerson:
                  </strong>{" "}
                  <span className="text-gray-900">
                    {entry.remarks || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Product Code:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.productno || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="invoice-section">
            <h4 className="text-lg mb-3">Invoice Details</h4>
            <div className="invoice-grid">
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">Invoice Date:</strong>{" "}
                  <span className="text-gray-900">
                    {formatDate(entry.invoiceDate)}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Bill Number:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.billNumber || "N/A"}
                  </span>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">PI Number:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.piNumber || "N/A"}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <strong className="text-gray-700">Payment Terms:</strong>{" "}
                  <Badge
                    className="badge-custom"
                    style={{
                      background:
                        entry.paymentTerms === "100% Advance"
                          ? "#2196f3"
                          : entry.paymentTerms === "Partial Advance"
                            ? "#3b82f6"
                            : entry.paymentTerms === "Credit"
                              ? "#eab308"
                              : "#6b7280",
                    }}
                  >
                    {entry.paymentTerms || "N/A"}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Payment Method:</strong>{" "}
                  <Badge
                    className="badge-custom"
                    style={{
                      backgroundColor:
                        entry.paymentMethod === "Cash"
                          ? "#2196f3"
                          : entry.paymentMethod === "NEFT"
                            ? "#3b82f6"
                            : entry.paymentMethod === "RTGS"
                              ? "#9333ea"
                              : entry.paymentMethod === "Cheque"
                                ? "#eab308"
                                : "#6b7280",
                    }}
                  >
                    {entry.paymentMethod || "N/A"}
                  </Badge>
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Credit Days:</strong>{" "}
                  <span className="text-gray-900">
                    {entry.creditDays || "N/A"}
                  </span>
                </div>
                {entry.neftTransactionId && (
                  <div className="mb-2">
                    <strong className="text-gray-700">
                      NEFT Transaction ID:
                    </strong>{" "}
                    <span className="text-gray-900">
                      {entry.neftTransactionId}
                    </span>
                  </div>
                )}
                {entry.chequeId && (
                  <div className="mb-2">
                    <strong className="text-gray-700">Cheque ID:</strong>{" "}
                    <span className="text-gray-900">{entry.chequeId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="invoice-section">
            <h4 className="text-lg mb-3">Product Details</h4>
            {entry.products && entry.products.length > 0 ? (
              <Table className="invoice-table" responsive>
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th style={{ width: "40%" }}>Description</th>
                    <th style={{ width: "10%" }}>Qty</th>
                    <th style={{ width: "15%" }}>Unit Price</th>
                    <th style={{ width: "15%" }}>GST (%)</th>
                    <th style={{ width: "15%" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.products.map((product, index) => {
                    const qty = product.qty || 0;
                    const unitPrice = product.unitPrice || 0;
                    const gstRate = parseFloat(product.gst) || 0;
                    const lineTotal = (qty * unitPrice * (100 + gstRate)) / 100;
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{product.productType || "N/A"}</strong>
                          <br />

                          {/* First line details */}
                          <small className="text-gray-600">
                            Size: {product.size || "N/A"}, Spec:{" "}
                            {product.spec || "N/A"}, Brand:{" "}
                            {product.brand || "N/A"}, Warranty:{" "}
                            {product.warranty || "N/A"}
                          </small>

                          {/* Serial line (no break inside) */}
                          {product.serialNos?.length > 0 && (
                            <div
                              className="text-gray-600">
                              Serial: {product.serialNos.join(", ")}
                            </div>
                          )}

                          {/* Model line */}
                          {product.modelNos?.length > 0 && (
                            <div
                              className="text-gray-600">
                              Model: {product.modelNos.join(", ")}
                            </div>
                          )}
                        </td>
                        <td>{qty}</td>
                        <td>₹{unitPrice.toFixed(2)}</td>
                        <td>{gstRate.toFixed(2)}%</td>
                        <td>₹{lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <p className="text-gray-600 italic text-center">
                No products available.
              </p>
            )}
          </div>
          <div className="totals-section">
            <div className="text-gray-700 space-y-1">
              <p>
                <strong>Freight Status:</strong> {entry.freightstatus || "N/A"}
              </p>{" "}
              <p>
                <strong>Freight Charges:</strong> ₹
                {entry.actualFreight?.toFixed(2) || entry.freightcs || "0"}
              </p>
              <p>
                <strong>Installation Status:</strong>{" "}
                {entry.installchargesstatus || "N/A"}
              </p>
              <p>
                <strong>Installation Charges:</strong> ₹
                {entry.installation || "0"}
              </p>
            </div>
            <div className="text-gray-700 space-y-1">
              <p>
                <strong>Subtotal:</strong> ₹{subtotal}
              </p>
              <p>
                <strong>Total GST:</strong> ₹{totalGST}
              </p>
              <p className="text-lg font-semibold text-gray-800">
                <strong>Total Amount:</strong> ₹{total}
              </p>
            </div>
          </div>
          <div className="footer-branding">
            <p className="font-semibold">Thank you for your business!</p>
            <p>
              Promark Techsolutions Pvt Ltd | Phone: 1800 103 8878 | Email:
              info@promark.co.in
            </p>
            <p>
              <span className="saffron">Proudly</span> Made{" "}
              <span className="green">in India</span>
            </p>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default PreviewModal;
