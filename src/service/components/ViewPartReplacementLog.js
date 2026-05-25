import React, { useRef } from "react";
import { Modal, Button, Badge } from "react-bootstrap";
import { X, Info, User, Package, Calendar, MessageSquare, Clipboard, Eye, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import serviceApi from "../axiosSetup";

const ViewPartReplacementLog = ({ show, onHide, log }) => {
  const modalBodyRef = useRef(null);
  if (!log) return null;

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
      element.style.background = "white"; // Ensure clean background

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

      pdf.save(`part-replacement-${log.complaintNumber}.pdf`);
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
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "Pending": "warning",
      "In Stock": "success",
      "Out of Stock": "danger",
    };
    return statusMap[status] || "secondary";
  };

  const InfoRow = ({ icon: Icon, label, value, badge, badgeColor }) => (
    <div className="col-md-6 mb-4">
      <div className="d-flex align-items-start gap-3">
        <div className="p-2 rounded-3 bg-light text-primary">
          <Icon size={18} />
        </div>
        <div style={{ overflow: "hidden" }}>
          <p className="text-muted mb-1 text-uppercase fw-bold" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>{label}</p>
          {badge ? (
            <Badge bg={badgeColor || "primary"} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "0.85rem" }}>
              {value}
            </Badge>
          ) : (
            <p className="mb-0 fw-600 text-dark" style={{ fontSize: "0.95rem", wordBreak: "break-word" }}>{value || "-"}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      size="lg" 
      backdrop="static"
      contentClassName="border-0 bg-transparent"
    >
      <div ref={modalBodyRef} style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <Modal.Header 
          style={{ 
            background: "linear-gradient(135deg, #2575fc, #6a11cb)", 
            color: "white",
            border: "none",
            padding: "20px 30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderRadius: "16px 16px 0 0"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div 
              style={{ 
                padding: "8px", 
                borderRadius: "5px", 
                backgroundColor: "rgba(255, 255, 255, 0.2)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                border: "1px solid rgba(255, 255, 255, 0.3)"
              }}
            >
              <Package size={22} color="white" />
            </div>
            <Modal.Title style={{ fontWeight: "800", margin: 0 }}>
              Part Replacement Details
            </Modal.Title>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleDownloadPDF}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 15px",
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
              onClick={onHide}
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
                transition: "all 0.2s ease"
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
        </Modal.Header>
        
        <Modal.Body style={{ padding: "32px", background: "#f8fafc" }}>
        <div className="row">
          <InfoRow icon={Clipboard} label="Complaint Number" value={log.complaintNumber} />
          <InfoRow icon={User} label="Customer Name" value={log.customerName} />
          <InfoRow icon={Package} label="Product" value={log.product} />
          <InfoRow icon={Info} label="Part Required" value={log.partName} />
          <InfoRow icon={Info} label="Hardware Status" value={log.hardwareStatus} badge badgeColor={log.hardwareStatus === "In Warranty" ? "success" : "danger"} />
          <InfoRow icon={Info} label="Procurement Status" value={log.partStatus} badge badgeColor={getStatusBadge(log.partStatus)} />
          <InfoRow icon={Calendar} label="Request Date" value={formatDate(log.createdAt)} />
        </div>

        <div className="mt-2 p-4 rounded-4 bg-white border shadow-sm">
          <div className="d-flex align-items-center gap-2 mb-3 text-danger">
            <Clipboard size={18} />
            <h6 className="mb-0 fw-800 text-uppercase" style={{ fontSize: "0.85rem", letterSpacing: "1px" }}>Issue Description (Service Log)</h6>
          </div>
          <p className="mb-3 text-muted" style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>
            {log.serviceLogId?.issue || "No issue description provided."}
          </p>

          <hr style={{ opacity: 0.1, margin: "20px 0" }} />

          <div className="d-flex align-items-center gap-2 mb-3 text-primary">
            <MessageSquare size={18} />
            <h6 className="mb-0 fw-800 text-uppercase" style={{ fontSize: "0.85rem", letterSpacing: "1px" }}>Procurement Remarks</h6>
          </div>
          <p className="mb-0 text-muted" style={{ fontSize: "0.95rem", lineHeight: "1.6", fontStyle: log.remarks ? "normal" : "italic" }}>
            {log.remarks || "No procurement remarks provided yet."}
          </p>
        </div>

        {/* Part Related Attachments */}
        {(log.serviceLogId?.attachments?.length > 0 || log.serviceLogId?.serviceAttachment) && (
          <div className="mt-4 p-4 rounded-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", boxShadow: "0 2px 4px rgba(22, 101, 52, 0.05)" }}>
            <div className="d-flex align-items-center gap-2 mb-3" style={{ color: "#166534" }}>
              <Download size={18} />
              <h6 className="mb-0 fw-800 text-uppercase" style={{ fontSize: "0.85rem", letterSpacing: "1px" }}>
                Part Related Attachments ({ 
                  (log.serviceLogId?.attachments?.length || 0) + 
                  (log.serviceLogId?.serviceAttachment && !log.serviceLogId?.attachments?.some(a => a.fileName === log.serviceLogId.serviceAttachment) ? 1 : 0) 
                })
              </h6>
            </div>
            
            <div className="row g-2">
              {/* Legacy Attachment */}
              {log.serviceLogId?.serviceAttachment && !log.serviceLogId?.attachments?.some(a => a.fileName === log.serviceLogId.serviceAttachment) && (
                <div className="col-12">
                  <div className="d-flex align-items-center justify-content-between bg-white p-2 px-3 rounded-3 border" style={{ borderColor: "#bbf7d0", width: "100%", overflow: "hidden" }}>
                    <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ flex: 1 }}>
                      <div className="p-2 rounded-2 bg-light text-muted" style={{ flexShrink: 0 }}>
                        <Download size={14} />
                      </div>
                      <div className="overflow-hidden" style={{ flex: 1 }}>
                        <p className="mb-0 fw-600 text-dark" style={{ 
                          fontSize: "0.85rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%"
                        }} title={log.serviceLogId.serviceAttachment}>
                          {log.serviceLogId.serviceAttachment}
                        </p>
                        <p className="mb-0 text-muted" style={{ fontSize: "0.7rem" }}>Service Log Attachment</p>
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-1 text-primary hover-scale"
                      onClick={() => handleDownloadAttachment(log.serviceLogId.serviceAttachment)}
                      style={{ flexShrink: 0 }}
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {/* Attachments Array */}
              {log.serviceLogId?.attachments?.map((file, idx) => (
                <div key={idx} className="col-12">
                  <div className="d-flex align-items-center justify-content-between bg-white p-2 px-3 rounded-3 border" style={{ borderColor: "#bbf7d0", width: "100%", overflow: "hidden" }}>
                    <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ flex: 1 }}>
                      <div className="p-2 rounded-2 bg-light text-muted" style={{ flexShrink: 0 }}>
                        <Download size={14} />
                      </div>
                      <div className="overflow-hidden" style={{ flex: 1 }}>
                        <p className="mb-0 fw-600 text-dark" style={{ 
                          fontSize: "0.85rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%"
                        }} title={file.originalName || file.fileName}>
                          {file.originalName || file.fileName}
                        </p>
                        <p className="mb-0 text-muted" style={{ fontSize: "0.7rem" }}>Service Log Attachment</p>
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-1 text-primary hover-scale"
                      onClick={() => handleDownloadAttachment(file.fileName)}
                      style={{ flexShrink: 0 }}
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer style={{ border: "none", padding: "20px 32px", background: "#f8fafc" }}>
        <Button 
          variant="secondary" 
          onClick={onHide}
          style={{ borderRadius: "12px", fontWeight: "700", padding: "12px 30px", border: "none", background: "#64748b" }}
        >
          Close View
        </Button>
      </Modal.Footer>
      </div>
    </Modal>
  );
};

export default ViewPartReplacementLog;
