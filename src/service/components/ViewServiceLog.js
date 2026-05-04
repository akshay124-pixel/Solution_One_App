import { useEffect } from "react";
import { Modal, Badge, Alert, Accordion, Button } from "react-bootstrap";
import { User, Calendar, Clock, History, X, Eye, FileText } from "lucide-react";
import engineersList from "../utils/engineersList";

const ViewServiceLog = ({ isOpen, onClose, log }) => {
  useEffect(() => {
    // Component is now read-only, no state management needed
  }, [log]);

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

  const getSystemBadge = (systemType) => {
    if (systemType === 'furniture') {
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
      Open: "linear-gradient(135deg, #dc3545, #c82333)",
      "In Progress": "linear-gradient(135deg, #ffc107, #e0a800)",
      Resolved: "linear-gradient(135deg, #17a2b8, #138496)",
      Closed: "linear-gradient(135deg, #28a745, #1e7e34)",
    };
    return gradientMap[status] || "linear-gradient(135deg, #6c757d, #545b62)";
  };

  const handleClose = () => {
    onClose();
  };

  if (!log) return null;

  return (
    <Modal 
      show={isOpen} 
      onHide={handleClose} 
      size="lg" 
      centered
      backdrop="static"
    >
      <div
        style={{
          borderRadius: "1px",
          overflow: "hidden",
          border: "none",
          boxShadow: "0 20px 60px rgba(37, 117, 252, 0.3)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            color: "white",
            borderBottom: "none",
            padding: "24px 28px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
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
                Service Log Details
              </Modal.Title>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                View service status and history
              </p>
            </div>
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
                e.target.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
              <X size={20} />
            </button>
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
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Complaint No:</strong>
                <div style={{ 
                  color: "#dc2626", 
                  fontWeight: "700", 
                  fontSize: "1.1rem",
                  marginTop: "4px"
                }}>
                  {log.complaintNumber || "-"}
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>System:</strong>
                <div style={{ marginTop: "4px" }}>
                  <Badge 
                    bg={getSystemBadge(log.systemType || log.orderDetails?.systemType).bg}
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
                    <span>{getSystemBadge(log.systemType || log.orderDetails?.systemType).icon}</span>
                    {getSystemBadge(log.systemType || log.orderDetails?.systemType).text}
                  </Badge>
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Order ID:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.orderId}</div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Customer:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {log.orderId?.startsWith('PMTM') 
                    ? (log.serviceRequestName || "-")
                    : (log.orderDetails?.customername || "-")
                  }
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Contact Person:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {log.orderId?.startsWith('PMTM') 
                    ? (log.serviceRequestName || "-")
                    : (log.orderDetails?.name || "-")
                  }
                </div>
              </div>
              <div>
                <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Contact No:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {log.orderId?.startsWith('PMTM') 
                    ? (log.serviceRequestMobile || "-")
                    : (log.orderDetails?.contactNo || "-")
                  }
                </div>
              </div>
              {log.orderDetails?.salesPerson && (
                <div>
                  <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Salesperson:</strong>
                  <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.orderDetails.salesPerson}</div>
                </div>
              )}
            </div>
          </Alert>

          {/* Service Request Details */}
          {(log.serviceRequestName || log.serviceRequestMobile || log.serviceRequestEmail) && (
            <Alert 
              style={{ 
                marginBottom: "24px",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "8px",
                padding: "16px"
              }}
            >
              <h6 style={{ 
                fontWeight: "600", 
                marginBottom: "12px", 
                color: "#92400e",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "1rem"
              }}>
                <User size={18} />
                Service Request Details
              </h6>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {log.serviceRequestName && (
                  <div>
                    <strong style={{ color: "#92400e", fontSize: "0.875rem" }}>Customer Name:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.serviceRequestName}</div>
                  </div>
                )}
                {log.serviceRequestMobile && (
                  <div>
                    <strong style={{ color: "#92400e", fontSize: "0.875rem" }}>Mobile Number:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.serviceRequestMobile}</div>
                  </div>
                )}
                {log.serviceRequestEmail && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <strong style={{ color: "#92400e", fontSize: "0.875rem" }}>Email:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.serviceRequestEmail}</div>
                  </div>
                )}
              </div>
            </Alert>
          )}

          {/* Service Log Details */}
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
                Service Details
              </h6>
              
              <div style={{ 
                marginBottom: "20px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
              }}>
                <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Issue Description:</strong>
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
                  {log.issue}
                </div>
              </div>

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
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Follow-up Date:</strong>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                    {formatDate(log.followUpDate)}
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
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Created Date:</strong>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                    {formatDateTime(log.createdAt)}
                  </div>
                </div>
                
                {log.warrantyStatus && (
                  <div style={{ 
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Warranty Status:</strong>
                    </div>
                    <Badge 
                      bg={log.warrantyStatus === "In Warranty" ? "success" : "danger"}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "500"
                      }}
                    >
                      {log.warrantyStatus}
                    </Badge>
                  </div>
                )}
                
                {log.callType && (
                  <div style={{ 
                    padding: "16px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Call Type:</strong>
                    </div>
                    <Badge 
                      bg={log.callType === "Software" ? "info" : "warning"}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "500"
                      }}
                    >
                      {log.callType === "Software" ? "💻 Software" : "🔧 Hardware"}
                    </Badge>
                  </div>
                )}
                
                <div style={{ 
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <User size={16} style={{ color: "#3b82f6" }} />
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Created By:</strong>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                    {log.createdBy?.username || "-"}
                  </div>
                </div>
                
                <div style={{ 
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Email Sent:</strong>
                  </div>
                  <Badge 
                    bg={log.emailSent ? "success" : "secondary"}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "500"
                    }}
                  >
                    {log.emailSent ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              {/* Assigned Engineers Section */}
              {log.assignedEngineers && log.assignedEngineers.length > 0 && (
                <div style={{ 
                  marginBottom: "20px",
                  padding: "16px",
                  background: "#f0f9ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe"
                }}>
                  <h6 style={{ 
                    fontWeight: "600", 
                    color: "#1e40af",
                    fontSize: "0.875rem",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    👨‍💻 Assigned Engineers
                  </h6>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {log.assignedEngineers.map((engineerId, index) => {
                      const engineer = engineersList.find(e => e.id === engineerId);
                      return engineer ? (
                        <div key={index} style={{
                          background: "white",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          fontSize: "0.875rem"
                        }}>
                          <div style={{ fontWeight: "500", color: "#1e40af" }}>{engineer.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{engineer.specialization}</div>
                          {engineer.mobile && (
                            <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "2px" }}>
                              📞 {engineer.mobile}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Hardware Items Section */}
              {log.hardwareItems && log.hardwareItems.length > 0 && (
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
                    🔧 Parts & Hardware Requirements
                  </h6>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {log.hardwareItems.map((item, index) => (
                      <div key={index} style={{
                        background: "white",
                        border: "1px solid #fbbf24",
                        borderRadius: "6px",
                        padding: "12px",
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr",
                        gap: "12px",
                        alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontWeight: "500", color: "#92400e", fontSize: "0.875rem" }}>
                            {item.description}
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Quantity</div>
                          <div style={{ fontWeight: "500", color: "#1f2937" }}>{item.quantity}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Price</div>
                          <div style={{ fontWeight: "500", color: "#1f2937" }}>₹{item.price || "0"}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{
                      background: "white",
                      border: "2px solid #fbbf24",
                      borderRadius: "6px",
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#92400e"
                    }}>
                      Total: ₹{log.hardwareItems.reduce((total, item) => total + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* No Charges Tag - Show when: Software call OR Hardware with no parts OR In Warranty with no parts */}
              {(log.callType === "Software" || 
                (log.callType === "Hardware" && (!log.hardwareItems || log.hardwareItems.length === 0)) ||
                (log.warrantyStatus === "In Warranty" && (!log.hardwareItems || log.hardwareItems.length === 0))) && (
                <div style={{ 
                  marginBottom: "20px",
                  padding: "16px",
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #86efac"
                }}>
                  <div style={{
                    background: "white",
                    border: "2px solid #10b981",
                    borderRadius: "6px",
                    padding: "12px",
                    textAlign: "center",
                    fontWeight: "600",
                    color: "#059669"
                  }}>
                    ✅ Parts covered under warranty - No charges
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div style={{ 
                padding: "20px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                textAlign: "center",
                marginBottom: "24px"
              }}>
                <h6 style={{ 
                  fontWeight: "600", 
                  marginBottom: "12px", 
                  color: "#374151",
                  fontSize: "0.875rem"
                }}>
                  Current Status
                </h6>
                <Badge 
                  style={{
                    background: getStatusGradient(log.serviceStatus),
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "500"
                  }}
                >
                  {log.serviceStatus}
                </Badge>
              </div>

              {/* Current Remarks */}
              {log.remarks && (
                <div style={{ 
                  marginBottom: "24px",
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0"
                }}>
                  <strong style={{ color: "#374151", fontSize: "0.875rem" }}>Current Remarks:</strong>
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
                    {log.remarks}
                  </div>
                </div>
              )}

              {/* Service Attachment */}
              {log.serviceAttachment && (
                <div style={{ 
                  marginBottom: "24px",
                  padding: "16px",
                  background: "#f0f9ff",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe"
                }}>
                  <strong style={{ color: "#1e40af", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    📎 Service Attachment
                  </strong>
                  <div
                    style={{
                      background: "white",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid #bfdbfe",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    <svg
                      style={{
                        width: "20px",
                        height: "20px",
                        color: "#3b82f6",
                        flexShrink: 0,
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "#1f2937" }}>
                        {log.serviceAttachment}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        Click to download attachment
                      </div>
                    </div>
                    <a
                      href={`/api/service/download/${encodeURIComponent(log.serviceAttachment)}`}
                      download
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #3b82f6, #1e40af)",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "linear-gradient(135deg, #1e40af, #1e3a8a)";
                        e.target.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "linear-gradient(135deg, #3b82f6, #1e40af)";
                        e.target.style.transform = "translateY(0)";
                      }}
                    >
                      <svg
                        style={{ width: "14px", height: "14px" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status History */}
          {log.statusHistory && log.statusHistory.length > 0 && (
            <div>
              <Accordion defaultActiveKey="0">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <History size={18} style={{ color: "#3b82f6" }} />
                      <strong style={{ color: "#374151", fontSize: "0.875rem" }}>
                        Status History ({log.statusHistory.length} updates)
                      </strong>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body style={{ padding: "16px" }}>
                    {log.statusHistory.map((history, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "16px",
                          marginBottom: "12px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          borderLeft: `3px solid ${getStatusGradient(history.status).split(',')[0].replace('linear-gradient(135deg, ', '')}`,
                          border: "1px solid #e2e8f0"
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          marginBottom: "8px" 
                        }}>
                          <Badge 
                            style={{
                              background: getStatusGradient(history.status),
                              border: "none",
                              padding: "4px 12px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "500"
                            }}
                          >
                            {history.status}
                          </Badge>
                          <small style={{ 
                            color: "#6b7280", 
                            fontSize: "0.75rem",
                            fontWeight: "400"
                          }}>
                            {formatDateTime(history.changedAt)}
                          </small>
                        </div>
                        {history.remarks && (
                          <div style={{ 
                            fontSize: "0.875rem", 
                            color: "#1f2937",
                            marginBottom: "8px",
                            padding: "8px",
                            background: "white",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0"
                          }}>
                            <strong style={{ color: "#374151", fontSize: "0.75rem" }}>Remarks:</strong>
                            <div style={{ marginTop: "4px" }}>{history.remarks}</div>
                          </div>
                        )}
                        {history.assignedEngineers && history.assignedEngineers.length > 0 && (
                          <div style={{ 
                            marginTop: "8px",
                            padding: "8px",
                            background: "white",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0"
                          }}>
                            <strong style={{ color: "#374151", fontSize: "0.75rem", display: "block", marginBottom: "6px" }}>
                              👨‍💻 Assigned Engineers:
                            </strong>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {history.assignedEngineers.map((engineerId, engIndex) => {
                                const engineer = engineersList.find(e => e.id === engineerId);
                                return engineer ? (
                                  <div key={engIndex} style={{
                                    background: "#f0f9ff",
                                    border: "1px solid #bfdbfe",
                                    borderRadius: "4px",
                                    padding: "4px 8px",
                                    fontSize: "0.75rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "2px"
                                  }}>
                                    <div style={{ fontWeight: "500", color: "#1e40af" }}>{engineer.name}</div>
                                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{engineer.specialization}</div>
                                    {engineer.mobile && (
                                      <div style={{ fontSize: "0.7rem", color: "#059669" }}>
                                        📞 {engineer.mobile}
                                      </div>
                                    )}
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                        {history.hardwareItems && history.hardwareItems.length > 0 && (
                          <div style={{ 
                            marginTop: "8px",
                            padding: "8px",
                            background: "white",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0"
                          }}>
                            <strong style={{ color: "#374151", fontSize: "0.75rem", display: "block", marginBottom: "6px" }}>
                              🔧 Parts & Hardware:
                            </strong>
                            <div style={{ display: "grid", gap: "6px" }}>
                              {history.hardwareItems.map((item, itemIndex) => (
                                <div key={itemIndex} style={{
                                  background: "#fef3c7",
                                  border: "1px solid #fbbf24",
                                  borderRadius: "4px",
                                  padding: "6px 8px",
                                  display: "grid",
                                  gridTemplateColumns: "2fr 1fr 1fr",
                                  gap: "8px",
                                  alignItems: "center",
                                  fontSize: "0.75rem"
                                }}>
                                  <div style={{ fontWeight: "500", color: "#92400e" }}>
                                    {item.description}
                                  </div>
                                  <div style={{ textAlign: "center", color: "#1f2937" }}>
                                    Qty: {item.quantity}
                                  </div>
                                  <div style={{ textAlign: "right", fontWeight: "500", color: "#1f2937" }}>
                                    ₹{item.price || "0"}
                                  </div>
                                </div>
                              ))}
                              <div style={{
                                background: "#fef3c7",
                                border: "2px solid #fbbf24",
                                borderRadius: "4px",
                                padding: "6px 8px",
                                textAlign: "right",
                                fontWeight: "600",
                                color: "#92400e",
                                fontSize: "0.75rem"
                              }}>
                                Total: ₹{history.hardwareItems.reduce((total, item) => total + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        )}
                        {history.changedBy?.username && (
                          <div style={{ 
                            fontSize: "0.75rem", 
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "8px"
                          }}>
                            <User size={12} />
                            Updated by: <strong>{history.changedBy.username}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer style={{ 
          padding: "16px 24px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0"
        }}>
          <Button
            variant="secondary"
            onClick={handleClose}
            style={{ 
              borderRadius: "8px", 
              padding: "10px 20px",
              fontWeight: "500",
              fontSize: "0.875rem",
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151"
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

export default ViewServiceLog;