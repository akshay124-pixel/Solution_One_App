import React, { useEffect, useRef } from "react";
import { Modal, Badge, Alert, Accordion, Button } from "react-bootstrap";
import { User, Calendar, Clock, History, X, Eye, FileText, Download, Package } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import serviceApi from "../axiosSetup";

const ViewIncompleteOrderModal = ({ isOpen, onClose, order }) => {
  const modalBodyRef = useRef(null);

  useEffect(() => {
    // Component is now read-only, no state management needed
  }, [order]);

  const handleDownloadPDF = async () => {
    if (!modalBodyRef.current) return;
    
    try {
      toast.info("Generating PDF...");
      const element = modalBodyRef.current;
      
      // Temporarily remove scroll and height restrictions for capture
      const originalStyle = element.style.cssText;
      element.style.maxHeight = "none";
      element.style.overflow = "visible";
      element.style.height = "auto";
      element.style.background = "white";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      // Restore original styles
      element.style.cssText = originalStyle;
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multi-page PDF if content is too long
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`incomplete-order-${order.orderNumber}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadAttachment = async (filename) => {
    if (!filename) {
      toast.error("No attachment found");
      return;
    }
    
    try {
      toast.info("Starting download...");
      const response = await serviceApi.get(`/download/${encodeURIComponent(filename)}`, {
        responseType: "blob"
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download completed!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error.response?.data?.message || "Failed to download file");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getSystemBadge = (productCategory) => {
    if (productCategory === 'furniture') {
      return {
        bg: 'warning',
        text: 'Furniture',
        icon: '🪑'
      };
    } else {
      return {
        bg: 'info',
        text: 'AV&EdTech',
        icon: '📺'
      };
    }
  };

  const getStatusGradient = (status) => {
    const gradientMap = {
      Pending: "linear-gradient(135deg, #ffc107, #e0a800)",
      "In Progress": "linear-gradient(135deg, #007bff, #0056b3)",
      Dispatched: "linear-gradient(135deg, #17a2b8, #138496)",
      Delivered: "linear-gradient(135deg, #28a745, #1e7e34)",
      Closed: "linear-gradient(135deg, #6c757d, #545b62)",
    };
    return gradientMap[status] || "linear-gradient(135deg, #6c757d, #545b62)";
  };

  const parseChanges = (changesStr) => {
    if (!changesStr) return [];
    return changesStr
      .split(";")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        // Handle "Status changed to X"
        const statusMatch = part.match(/^Status changed to (.+)$/i);
        if (statusMatch) {
          return { label: "Status", value: statusMatch[1], type: "status" };
        }
        // Handle "Stock availability changed to X"
        const stockMatch = part.match(/^Stock availability changed to (.+)$/i);
        if (stockMatch) {
          return { label: "Stock Availability", value: stockMatch[1], type: "text" };
        }
        // Handle "X updated" or "X updated: Y"
        const updateMatch = part.match(/^(.+?)(?: updated)(?:: (.+))?$/i);
        if (updateMatch) {
          const value = updateMatch[2] || "Updated";
          // Skip if value is just "Updated"
          if (value === "Updated") return null;
          return { 
            label: updateMatch[1].replace(/^\w/, c => c.toUpperCase()), 
            value: value, 
            type: "text" 
          };
        }
        // Fallback
        return { label: "Change", value: part, type: "text" };
      })
      .filter(Boolean); // Remove any nulls from skipping "Updated" entries
  };

  const handleClose = () => {
    onClose();
  };

  if (!order) return null;

  return (
    <Modal 
      show={isOpen} 
      onHide={handleClose} 
      size="lg" 
      centered
      backdrop="static"
      contentClassName="border-0 bg-transparent"
    >
      <div
        ref={modalBodyRef}
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          border: "none",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          background: "white"
        }}
      >
        <Modal.Header
          style={{ 
            background: "linear-gradient(135deg, #2575fc, #6a11cb)", 
            color: "white",
            border: "none",
            padding: "24px 30px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: "16px 16px 0 0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "2px",
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)"
            }}>
              <Eye size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                Incomplete Order Details
              </Modal.Title>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                {order.orderNumber}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={handleDownloadPDF}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.2s ease",
                  gap: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
                title="Download as PDF"
              >
                <Download size={18} />
                <span>PDF Export</span>
              </button>
              <button
                onClick={handleClose}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  border: "none",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </Modal.Header>
        
        <Modal.Body 
          style={{ 
            padding: "24px", 
            maxHeight: "70vh", 
            overflowY: "auto",
            background: "white",
          }}
        >
          {/* Order Information */}
          <Alert 
            style={{ 
              marginBottom: "24px",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              padding: "16px"
            }}
          >
            <h6 style={{ 
              fontWeight: "600", 
              marginBottom: "12px", 
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "1rem"
            }}>
              <User size={18} />
              Order Information
            </h6>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Order #</strong>
                <div style={{ 
                  color: "#dc2626", 
                  fontWeight: "700", 
                  fontSize: "1.1rem",
                  marginTop: "4px"
                }}>
                  {order.orderNumber || "-"}
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Category</strong>
                <div style={{ marginTop: "4px" }}>
                  <Badge 
                    bg={getSystemBadge(order.productCategory).bg}
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.75rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      borderRadius: "8px",
                      fontWeight: "600"
                    }}
                  >
                    <span>{getSystemBadge(order.productCategory).icon}</span>
                    {getSystemBadge(order.productCategory).text}
                  </Badge>
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Order ID</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.orderId || "-"}</div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Customer</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.customerName || "-"}</div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Contact</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.contactNumber || "-"}</div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>City / State</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {[order.city, order.state].filter(Boolean).join(", ") || "-"}
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Address</strong>
                <div style={{ color: "#1f2937", fontWeight: "500", gridColumn: "1 / -1" }}>{order.customerAddress || "-"}</div>
              </div>
            </div>
          </Alert>

          {/* Incomplete Order Details */}
          <div>
            <div style={{ marginBottom: "30px" }}>
              <h6 style={{ 
                fontWeight: "600", 
                marginBottom: "20px", 
                color: "#1f2937",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FileText size={18} />
                Incomplete Order Details
              </h6>
              
              {order.remarks && (
                <div style={{ 
                  marginBottom: "20px",
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Remarks</strong>
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "white",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.875rem",
                      lineHeight: "1.5",
                      color: "#1f2937"
                    }}
                  >
                    {order.remarks}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {order.attachments && order.attachments.length > 0 && (
                <div style={{ marginBottom: "24px", padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <h6 style={{ 
                    fontWeight: "800", 
                    color: "#1e293b", 
                    fontSize: "0.85rem", 
                    marginBottom: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}>
                    <FileText size={18} color="#2575fc" />
                    Attachments ({order.attachments.length})
                  </h6>
                  <div style={{ display: "grid", gap: "10px" }}>
                    {order.attachments.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          background: "white",
                          padding: "12px 16px",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                          width: "100%",
                          overflow: "hidden"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
                          <div style={{ padding: "8px", borderRadius: "8px", background: "#f1f5f9", color: "#2575fc", flexShrink: 0 }}>
                            <FileText size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ 
                              fontSize: "0.85rem", 
                              fontWeight: "600", 
                              color: "#1e293b", 
                              whiteSpace: "nowrap", 
                              overflow: "hidden", 
                              textOverflow: "ellipsis",
                              width: "100%"
                            }} title={file.originalName || file.fileName}>
                              {file.originalName || file.fileName}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {(file.size / 1024).toFixed(1)} KB • {formatDate(file.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadAttachment(file.fileName)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2575fc",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            transition: "all 0.2s",
                            flexShrink: 0
                          }}
                        >
                          <Download size={16} />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                gap: "16px", 
                marginBottom: "20px" 
              }}>
                <div style={{ 
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Calendar size={16} style={{ color: "#3b82f6" }} />
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Created Date</strong>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                    {formatDateTime(order.createdAt)}
                  </div>
                </div>
                
                <div style={{ 
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <Clock size={16} style={{ color: "#3b82f6" }} />
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Updated Date</strong>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                    {formatDateTime(order.updatedAt)}
                  </div>
                </div>
                
                {order.closedAt && (
                  <div style={{ 
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Closed Date</strong>
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                      {formatDateTime(order.closedAt)}
                    </div>
                  </div>
                )}
                
                {order.transporterName && (
                  <div style={{ 
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Transporter</strong>
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                      {order.transporterName}
                    </div>
                  </div>
                )}
                
                {order.docketNumber && (
                  <div style={{ 
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Docket #</strong>
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                      {order.docketNumber}
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Status</strong>
                  </div>
                  <Badge 
                    bg={
                      order.status === "Pending" ? "warning" :
                      order.status === "In Progress" ? "primary" :
                      order.status === "Dispatched" ? "info" :
                      order.status === "Delivered" ? "success" :
                      "secondary"
                    }
                    style={{
                      padding: "6px 12px",
                      fontSize: "0.9rem",
                      fontWeight: "600"
                    }}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>

              {/* Pending Parts Section */}
              {order.pendingParts && order.pendingParts.length > 0 && (
                <div style={{ 
                  marginBottom: "20px",
                  padding: "16px",
                  background: "#fef3c7",
                  borderRadius: "8px",
                  border: "1px solid #fbbf24"
                }}>
                  <h6 style={{ 
                    fontWeight: "600", 
                    color: "#92400e",
                    fontSize: "0.875rem",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <Package size={18} />
                    Pending Parts ({order.pendingParts.length})
                  </h6>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {order.pendingParts.map((part, index) => (
                      <div key={index} style={{
                        background: "white",
                        border: "1px solid #fbbf24",
                        borderRadius: "6px",
                        padding: "12px",
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1.5fr 0.75fr 1fr",
                        gap: "12px",
                        alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontWeight: "500", color: "#92400e", fontSize: "0.875rem" }}>
                            {part.partName}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Spec</div>
                          <div style={{ fontWeight: "500", color: "#1f2937" }}>{part.spec || "-"}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Qty</div>
                          <div style={{ fontWeight: "500", color: "#1f2937" }}>{part.quantity}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Status</div>
                          <Badge 
                            bg={
                              part.status === "In Stock" ? "success" :
                              part.status === "Dispatched" ? "info" :
                              part.status === "Out of Stock" ? "danger" :
                              "warning"
                            }
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: "600"
                            }}
                          >
                            {part.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* History Section */}
            {order.history && order.history.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <History size={20} style={{ color: "#6366f1" }} />
                  <h6 style={{ 
                    fontWeight: "700", 
                    color: "#1e293b",
                    margin: 0,
                    fontSize: "1rem"
                  }}>
                    History ({order.history.length})
                  </h6>
                </div>
                <Accordion alwaysOpen>
                  {order.history.slice().reverse().map((entry, idx) => (
                    <Accordion.Item eventKey={String(idx)} key={idx} style={{
                      border: "1px solid #e2e8f0",
                      marginBottom: "8px",
                      borderRadius: "8px",
                      overflow: "hidden"
                    }}>
                      <Accordion.Header style={{
                        background: "#f8fafc",
                        padding: "12px 16px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                          <div style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#6366f1",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.8rem",
                            fontWeight: "700"
                          }}>
                            {idx + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                              {formatDateTime(entry.changedAt)}
                            </div>
                          </div>
                          {entry.status && (
                            <Badge 
                              bg={
                                entry.status === "Pending" ? "warning" :
                                entry.status === "In Progress" ? "primary" :
                                entry.status === "Dispatched" ? "info" :
                                entry.status === "Delivered" ? "success" :
                                "secondary"
                              }
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                marginRight: "20px"
                              }}
                            >
                              {entry.status}
                            </Badge>
                          )}
                        </div>
                      </Accordion.Header>
                      <Accordion.Body style={{
                        padding: "16px",
                        background: "white"
                      }}>
                        {/* Always show raw remarks if available (and not a changes string) */}
                        {entry.remarks && !entry.remarks.includes(";") && (
                          <div style={{
                            marginBottom: "12px",
                            padding: "12px",
                            background: "#f8fafc",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                            color: "#374151"
                          }}>
                            {entry.remarks}
                          </div>
                        )}
                        
                        {/* Always parse and display changes from entry.remarks if available */}
                        {entry.remarks && entry.remarks.includes(";") && (
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                              {parseChanges(entry.remarks).map((change, cIdx) => (
                                <div key={cIdx} style={{
                                  background: "#f8fafc",
                                  padding: "10px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0"
                                }}>
                                  <div style={{
                                    fontSize: "0.75rem",
                                    color: "#6b7280",
                                    fontWeight: "600",
                                    marginBottom: "4px"
                                  }}>
                                    {change.label}
                                  </div>
                                  {change.type === "status" ? (
                                    <Badge 
                                      bg={
                                        change.value === "Pending" ? "warning" :
                                        change.value === "In Progress" ? "primary" :
                                        change.value === "Dispatched" ? "info" :
                                        change.value === "Delivered" ? "success" :
                                        "secondary"
                                      }
                                      style={{
                                        fontSize: "0.85rem",
                                        fontWeight: "600"
                                      }}
                                    >
                                      {change.value}
                                    </Badge>
                                  ) : (
                                    <div style={{
                                      fontSize: "0.875rem",
                                      color: "#1f2937",
                                      fontWeight: "500"
                                    }}>
                                      {change.value}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Always show transporter, transporter details, and docket if available */}
                        {(entry.transporterName || entry.docketNumber || entry.transporterDetails) && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                            {entry.transporterName && (
                              <div>
                                <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Transporter</strong>
                                <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{entry.transporterName}</div>
                              </div>
                            )}
                            {entry.docketNumber && (
                              <div>
                                <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Docket #</strong>
                                <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{entry.docketNumber}</div>
                              </div>
                            )}
                            {entry.transporterDetails && (
                              <div style={{ gridColumn: "1 / -1" }}>
                                <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Transporter Details</strong>
                                <div style={{ color: "#1f2937", fontSize: "0.875rem" }}>{entry.transporterDetails}</div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Always show updated parts if available */}
                        {entry.pendingParts && entry.pendingParts.length > 0 && (
                          <div style={{ marginTop: "12px" }}>
                            <strong style={{ color: "#6b7280", fontSize: "0.75rem", display: "block", marginBottom: "8px" }}>Updated Parts</strong>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                              {entry.pendingParts.map((p, pIdx) => (
                                <Badge 
                                  key={pIdx} 
                                  bg="secondary"
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "4px 10px"
                                  }}
                                >
                                  {p.partName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </Modal.Body>
      </div>
    </Modal>
  );
};

export default ViewIncompleteOrderModal;
