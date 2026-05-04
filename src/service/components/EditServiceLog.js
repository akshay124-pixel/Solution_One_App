import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Settings, X, Save } from "lucide-react";
import serviceApi from "../axiosSetup";
import engineersList from "../utils/engineersList";

const EditServiceLog = ({ isOpen, onClose, log, onUpdate }) => {
  const [serviceStatus, setServiceStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [serviceRequestName, setServiceRequestName] = useState("");
  const [serviceRequestMobile, setServiceRequestMobile] = useState("");
  const [serviceRequestEmail, setServiceRequestEmail] = useState("");
  const [warrantyStatus, setWarrantyStatus] = useState("");
  const [callType, setCallType] = useState("");
  const [issue, setIssue] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [assignedEngineers, setAssignedEngineers] = useState([]);
  const [hardwareItems, setHardwareItems] = useState([{ description: "", quantity: "", price: "" }]);
  const [serviceAttachment, setServiceAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);

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

  // Helper functions for engineers
  const handleEngineerToggle = (engineerId) => {
    setAssignedEngineers(prev => {
      if (prev.includes(engineerId)) {
        return prev.filter(id => id !== engineerId);
      } else {
        return [...prev, engineerId];
      }
    });
  };

  // Helper functions for hardware items
  const addHardwareItem = () => {
    setHardwareItems(prev => [...prev, { description: "", quantity: "", price: "" }]);
  };

  const removeHardwareItem = (index) => {
    setHardwareItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateHardwareItem = (index, field, value) => {
    setHardwareItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // File upload handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpg", 
        "image/jpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel" // .xls
      ];
      const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "docx", "xlsx", "xls"];
      const fileExt = file.name.split(".").pop().toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
        setFileError(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed."
        );
        toast.error(
          "Invalid file type. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed."
        );
        e.target.value = null;
        setServiceAttachment(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError("File size must be less than 10MB");
        toast.error("File size must be less than 10MB");
        e.target.value = null;
        setServiceAttachment(null);
        return;
      }
      setServiceAttachment(file);
      setFileError("");
    } else {
      setServiceAttachment(null);
      setFileError("");
    }
  };

  useEffect(() => {
    if (log) {
      setServiceStatus(log.serviceStatus || "");
      setRemarks(log.remarks || "");
      setServiceRequestName(log.serviceRequestName || "");
      setServiceRequestMobile(log.serviceRequestMobile || "");
      setServiceRequestEmail(log.serviceRequestEmail || "");
      setWarrantyStatus(log.warrantyStatus || "");
      setCallType(log.callType || "");
      setIssue(log.issue || "");
      setFollowUpDate(log.followUpDate ? new Date(log.followUpDate).toISOString().split('T')[0] : "");
      setAssignedEngineers(log.assignedEngineers || []);
      setHardwareItems(log.hardwareItems || [{ description: "", quantity: "", price: "" }]);
      setServiceAttachment(null); // Reset file input for new uploads
      setFileError("");
    }
  }, [log]);

  const handleUpdate = async () => {
    if (!serviceStatus) {
      toast.warning("Please select a service status");
      return;
    }

    // Validate mobile number if provided
    if (serviceRequestMobile && serviceRequestMobile.length > 0 && serviceRequestMobile.length < 10) {
      toast.warning("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("serviceStatus", serviceStatus);
      formData.append("remarks", remarks);
      formData.append("serviceRequestName", serviceRequestName);
      formData.append("serviceRequestMobile", serviceRequestMobile);
      formData.append("serviceRequestEmail", serviceRequestEmail);
      formData.append("warrantyStatus", warrantyStatus);
      formData.append("callType", callType);
      formData.append("issue", issue);
      formData.append("followUpDate", followUpDate ? new Date(followUpDate).toISOString() : "");
      formData.append("assignedEngineers", JSON.stringify(assignedEngineers));
      formData.append("hardwareItems", JSON.stringify(callType === "Hardware" ? hardwareItems.filter(item => item.description && item.description.trim()) : []));
      
      if (serviceAttachment) {
        formData.append("serviceAttachment", serviceAttachment);
      }

      const response = await serviceApi.patch(`/service-logs/${log._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Service log updated successfully");
        onUpdate();
        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update service log"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setServiceStatus(log?.serviceStatus || "");
    setRemarks(log?.remarks || "");
    setServiceRequestName(log?.serviceRequestName || "");
    setServiceRequestMobile(log?.serviceRequestMobile || "");
    setServiceRequestEmail(log?.serviceRequestEmail || "");
    setWarrantyStatus(log?.warrantyStatus || "");
    setCallType(log?.callType || "");
    setIssue(log?.issue || "");
    setFollowUpDate(log?.followUpDate ? new Date(log.followUpDate).toISOString().split('T')[0] : "");
    setAssignedEngineers(log?.assignedEngineers || []);
    setHardwareItems(log?.hardwareItems || [{ description: "", quantity: "", price: "" }]);
    setServiceAttachment(null);
    setFileError("");
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
          boxShadow: "0 20px 60px rgba(245, 158, 11, 0.3)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
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
              <Settings size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                  Edit Service Log
                </Modal.Title>
                {log && (
                  <Badge 
                    bg={getSystemBadge(log.systemType || log.orderDetails?.systemType).bg}
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.7rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      borderRadius: "6px",
                      fontWeight: "600"
                    }}
                  >
                    <span>{getSystemBadge(log.systemType || log.orderDetails?.systemType).icon}</span>
                    {getSystemBadge(log.systemType || log.orderDetails?.systemType).text}
                  </Badge>
                )}
              </div>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                Update service status and remarks
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
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
                opacity: loading ? 0.5 : 1,
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = "rgba(255, 255, 255, 0.2)";
              }}
            >
              <X size={20} />
            </button>
          </div>
        </Modal.Header>
        
        <Modal.Body 
          className="edit-service-modal-body"
          style={{ 
            padding: "24px",
            background: "white",
            maxHeight: "70vh",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#f59e0b #f3f4f6"
          }}
        >
          {/* Order Information */}
          <Alert 
            style={{ 
              marginBottom: "24px",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "8px",
              padding: "16px"
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <strong style={{ color: "#92400e", fontSize: "0.875rem" }}>Order ID:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.orderId}</div>
              </div>
              <div>
                <strong style={{ color: "#92400e", fontSize: "0.875rem" }}>Customer:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500" }}>{log.orderDetails?.customername || "-"}</div>
              </div>
            </div>
          </Alert>

          <Form>
            {/* Service Request Details Section */}
            <div style={{ 
              marginBottom: "24px",
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              <h6 style={{ 
                fontWeight: "600", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "12px"
              }}>
                Service Request Details
              </h6>
              
              <Form.Group className="mb-3">
                <Form.Label style={{ 
                  fontWeight: "500", 
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px"
                }}>
                  Customer Name
                </Form.Label>
                <Form.Control
                  type="text"
                  value={serviceRequestName}
                  onChange={(e) => setServiceRequestName(e.target.value)}
                  placeholder="Enter customer name..."
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#f59e0b";
                    e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Mobile Number
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    value={serviceRequestMobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                      if (value.length <= 10) {
                        setServiceRequestMobile(value);
                      }
                    }}
                    placeholder="Enter 10 digit mobile number..."
                    maxLength={10}
                    pattern="[0-9]{10}"
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#f59e0b";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                    onKeyPress={(e) => {
                      // Only allow numbers
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                  {serviceRequestMobile && serviceRequestMobile.length < 10 && serviceRequestMobile.length > 0 && (
                    <small style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                      Mobile number must be 10 digits
                    </small>
                  )}
                </Form.Group>

                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={serviceRequestEmail}
                    onChange={(e) => setServiceRequestEmail(e.target.value)}
                    placeholder="Enter email..."
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#f59e0b";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </Form.Group>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Warranty Status
                  </Form.Label>
                  <Form.Select
                    value={warrantyStatus}
                    onChange={(e) => setWarrantyStatus(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#f59e0b";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="">Select Warranty</option>
                    <option value="In Warranty">✅ In Warranty</option>
                    <option value="Out of Warranty">❌ Out of Warranty</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Call Type
                  </Form.Label>
                  <Form.Select
                    value={callType}
                    onChange={(e) => setCallType(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#f59e0b";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="">Select Type</option>
                    <option value="Software">💻 Software</option>
                    <option value="Hardware">🔧 Hardware</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={{ 
                  fontWeight: "500", 
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px"
                }}>
                  Issue Description
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Describe the customer's issue..."
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                    resize: "vertical",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#f59e0b";
                    e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label style={{ 
                  fontWeight: "500", 
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px"
                }}>
                  Follow-up Date
                </Form.Label>
                <Form.Control
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#f59e0b";
                    e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-3">
              <Form.Label style={{ 
                fontWeight: "500", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "6px"
              }}>
                Service Status <span style={{ color: "#ef4444" }}>*</span>
              </Form.Label>
              <Form.Select
                value={serviceStatus}
                onChange={(e) => setServiceStatus(e.target.value)}
                style={{
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  padding: "10px 12px",
                  fontSize: "0.875rem",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  background: "white",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f59e0b";
                  e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </Form.Select>
            </Form.Group>

            {/* Engineers and Call Type Section - Only show when Service Status is "In Progress" */}
            {serviceStatus === "In Progress" && (
              <div style={{ 
                marginBottom: "24px",
                padding: "16px",
                background: "#f0f9ff",
                borderRadius: "8px",
                border: "1px solid #bfdbfe"
              }}>
                <h6 style={{ 
                  fontWeight: "600", 
                  color: "#1e40af",
                  fontSize: "0.875rem",
                  marginBottom: "12px"
                }}>
                  Assignment Details
                </h6>
                
                {/* Engineers Selection */}
                <Form.Group className="mb-3">
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "8px"
                  }}>
                    Assign Engineers
                  </Form.Label>
                  <div style={{
                    background: "white",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    padding: "12px",
                    maxHeight: "150px",
                    overflowY: "auto"
                  }}>
                    {engineersList.map(engineer => (
                      <label key={engineer.id} style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px",
                        marginBottom: "4px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                        background: assignedEngineers.includes(engineer.id) ? "#f0f9ff" : "transparent",
                        border: assignedEngineers.includes(engineer.id) ? "1px solid #bfdbfe" : "1px solid transparent"
                      }}
                      onMouseEnter={(e) => {
                        if (!assignedEngineers.includes(engineer.id)) {
                          e.target.style.background = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!assignedEngineers.includes(engineer.id)) {
                          e.target.style.background = "transparent";
                        }
                      }}
                      >
                        <input
                          type="checkbox"
                          checked={assignedEngineers.includes(engineer.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleEngineerToggle(engineer.id);
                          }}
                          style={{ 
                            marginRight: "8px",
                            cursor: "pointer",
                            accentColor: "#f59e0b"
                          }}
                        />
                        <div style={{ flex: 1, pointerEvents: "none" }}>
                          <div style={{ fontWeight: "500", fontSize: "0.875rem" }}>{engineer.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{engineer.specialization}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </Form.Group>

                {/* Call Type */}
                <Form.Group className="mb-3">
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Call Type
                  </Form.Label>
                  <Form.Select
                    value={callType}
                    onChange={(e) => setCallType(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#f59e0b";
                      e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="">Select Type</option>
                    <option value="Software">💻 Software</option>
                    <option value="Hardware">🔧 Hardware</option>
                  </Form.Select>
                </Form.Group>

                {/* Hardware Items - Only show when Call Type is "Hardware" */}
                {callType === "Hardware" && (
                  <div style={{
                    background: "#fef3c7",
                    border: "1px solid #fbbf24",
                    borderRadius: "8px",
                    padding: "16px",
                    marginTop: "16px"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px"
                    }}>
                      <h6 style={{ 
                        fontWeight: "600", 
                        color: "#92400e",
                        fontSize: "0.875rem",
                        margin: 0
                      }}>
                        Parts & Hardware Requirements
                      </h6>
                      <button
                        type="button"
                        onClick={addHardwareItem}
                        style={{
                          background: "#f59e0b",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          cursor: "pointer"
                        }}
                      >
                        + Add Item
                      </button>
                    </div>
                    
                    {hardwareItems.map((item, index) => (
                      <div key={index} style={{
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        padding: "12px",
                        marginBottom: "8px"
                      }}>
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "2fr 1fr 1fr auto", 
                          gap: "8px", 
                          alignItems: "end" 
                        }}>
                          <Form.Group>
                            <Form.Label style={{ fontSize: "0.75rem", fontWeight: "500", color: "#374151" }}>
                              Description
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={item.description}
                              onChange={(e) => updateHardwareItem(index, "description", e.target.value)}
                              placeholder="Item description..."
                              style={{
                                fontSize: "0.875rem",
                                padding: "8px 10px",
                                borderRadius: "4px"
                              }}
                            />
                          </Form.Group>
                          <Form.Group>
                            <Form.Label style={{ fontSize: "0.75rem", fontWeight: "500", color: "#374151" }}>
                              Quantity
                            </Form.Label>
                            <Form.Control
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateHardwareItem(index, "quantity", e.target.value)}
                              placeholder="Qty"
                              min="1"
                              style={{
                                fontSize: "0.875rem",
                                padding: "8px 10px",
                                borderRadius: "4px"
                              }}
                            />
                          </Form.Group>
                          <Form.Group>
                            <Form.Label style={{ fontSize: "0.75rem", fontWeight: "500", color: "#374151" }}>
                              Price (₹) {warrantyStatus === "In Warranty" && <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>(Optional)</span>}
                              {warrantyStatus === "Out of Warranty" && <span style={{ color: "#ef4444", fontSize: "0.7rem" }}>*</span>}
                            </Form.Label>
                            <Form.Control
                              type="number"
                              value={item.price}
                              onChange={(e) => updateHardwareItem(index, "price", e.target.value)}
                              placeholder="Enter price"
                              min="0"
                              step="0.01"
                              required={warrantyStatus === "Out of Warranty"}
                              style={{
                                fontSize: "0.875rem",
                                padding: "8px 10px",
                                borderRadius: "4px",
                                borderColor: warrantyStatus === "Out of Warranty" && !item.price ? "#fca5a5" : "#d1d5db"
                              }}
                            />
                          
                          </Form.Group>
                          {hardwareItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeHardwareItem(index)}
                              style={{
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "8px",
                                cursor: "pointer",
                                fontSize: "0.75rem"
                              }}
                              title="Remove item"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Form.Group className="mb-4">
              <Form.Label style={{ 
                fontWeight: "500", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "6px"
              }}>
                Remarks
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks about the status update..."
                style={{
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  padding: "10px 12px",
                  fontSize: "0.875rem",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  background: "white",
                  resize: "vertical",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#f59e0b";
                  e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </Form.Group>

            {/* Service Attachment Section */}
            <Form.Group className="mb-4">
              <Form.Label style={{ 
                fontWeight: "500", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "6px"
              }}>
                📎 Update Service Attachment (Optional)
              </Form.Label>
              {log?.serviceAttachment && (
                <div style={{
                  marginBottom: "12px",
                  padding: "12px",
                  background: "#f0f9ff",
                  borderRadius: "6px",
                  border: "1px solid #bfdbfe",
                  fontSize: "0.875rem"
                }}>
                  <strong style={{ color: "#1e40af" }}>Current Attachment:</strong>
                  <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#374151" }}>{log.serviceAttachment}</span>
                    <a
                      href={`/api/service/download/${encodeURIComponent(log.serviceAttachment)}`}
                      download
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontSize: "0.75rem",
                        fontWeight: "500"
                      }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: `1px solid ${serviceAttachment ? "#22c55e" : "#d1d5db"}`,
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  padding: "8px",
                  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                  width: "100%",
                  height: "48px",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <label
                  htmlFor="editServiceAttachment"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "linear-gradient(135deg, #e2e8f0, #f8fafc)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                    color: "#475569",
                    transition: "background 0.3s ease",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    height: "100%",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(135deg, #d1d5db, #e5e7eb)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(135deg, #e2e8f0, #f8fafc)")
                  }
                >
                  <svg
                    style={{
                      width: "18px",
                      height: "18px",
                      color: "#f59e0b",
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
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {serviceAttachment
                      ? serviceAttachment.name
                      : "Upload New Document (PDF, PNG, JPG, DOCX, XLS, XLSX)"}
                  </span>
                </label>
                <input
                  id="editServiceAttachment"
                  type="file"
                  name="serviceAttachment"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
                  onChange={handleFileChange}
                  style={{
                    display: "none",
                  }}
                />
                {serviceAttachment && (
                  <button
                    type="button"
                    onClick={() => {
                      setServiceAttachment(null);
                      setFileError("");
                      document.getElementById("editServiceAttachment").value = null;
                    }}
                    style={{
                      padding: "8px",
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                    title="Remove File"
                  >
                    <svg
                      style={{ width: "18px", height: "18px" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              {fileError && (
                <small
                  style={{
                    color: "#ef4444",
                    fontSize: "0.75rem",
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  {fileError}
                </small>
              )}
              <small
                style={{
                  color: "#6b7280",
                  fontSize: "0.75rem",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {log?.serviceAttachment 
                  ? "Upload a new file to replace the current attachment (Max 10MB)"
                  : "Optional: Upload supporting documents, images, or reports (Max 10MB)"
                }
              </small>
            </Form.Group>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                paddingTop: "16px",
                borderTop: "1px solid #f3f4f6"
              }}
            >
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={loading}
                style={{ 
                  borderRadius: "8px", 
                  padding: "10px 20px",
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#374151",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "white";
                  e.target.style.borderColor = "#d1d5db";
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdate}
                disabled={loading}
                style={{
                  background: loading ? "#9ca3af" : "#f59e0b",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  transition: "background-color 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = "#d97706";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = "#f59e0b";
                  }
                }}
              >
                {loading ? (
                  <>
                    <div 
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid #ffffff40",
                        borderTop: "2px solid #ffffff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }}
                    />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Update Status
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Custom scrollbar styling for edit service modal */
          .edit-service-modal-body::-webkit-scrollbar {
            width: 8px;
          }
          .edit-service-modal-body::-webkit-scrollbar-track {
            background: #f3f4f6;
            border-radius: 4px;
          }
          .edit-service-modal-body::-webkit-scrollbar-thumb {
            background: #f59e0b;
            border-radius: 4px;
          }
          .edit-service-modal-body::-webkit-scrollbar-thumb:hover {
            background: #d97706;
          }
          
          /* Smooth scrolling */
          .edit-service-modal-body {
            scroll-behavior: smooth;
          }
        `}
      </style>
    </Modal>
  );
};

export default EditServiceLog;