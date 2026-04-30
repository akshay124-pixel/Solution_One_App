import React, { useState } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { Phone, User, MessageSquare, Calendar, Send, X } from "lucide-react";
import serviceApi from "../axiosSetup";

const CallLogModal = ({ isOpen, onClose, order, onSuccess }) => {
  const [callStatus, setCallStatus] = useState("");
  const [serviceRequestName, setServiceRequestName] = useState("");
  const [serviceRequestMobile, setServiceRequestMobile] = useState("");
  const [serviceRequestEmail, setServiceRequestEmail] = useState("");
  const [warrantyStatus, setWarrantyStatus] = useState("");
  const [issue, setIssue] = useState("");
  const [remarks, setRemarks] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [serviceAttachment, setServiceAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!callStatus) {
      toast.warning("Please select call status");
      return;
    }

    if (callStatus === "Service Request" && (!issue || !followUpDate)) {
      toast.warning("Issue and Follow-up Date are required for Service Request");
      return;
    }

    if (callStatus === "Service Request" && !warrantyStatus) {
      toast.warning("Please select warranty status");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("orderId", order.orderId);
      formData.append("callStatus", callStatus);
      formData.append("serviceRequestName", serviceRequestName);
      formData.append("serviceRequestMobile", serviceRequestMobile);
      formData.append("serviceRequestEmail", serviceRequestEmail);
      formData.append("warrantyStatus", warrantyStatus);
      formData.append("issue", issue);
      formData.append("remarks", remarks);
      formData.append("followUpDate", followUpDate);
      
      if (serviceAttachment) {
        formData.append("serviceAttachment", serviceAttachment);
      }

      const response = await serviceApi.post("/call-logs", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Reset form
        setCallStatus("");
        setServiceRequestName("");
        setServiceRequestMobile("");
        setServiceRequestEmail("");
        setWarrantyStatus("");
        setIssue("");
        setRemarks("");
        setFollowUpDate("");
        setServiceAttachment(null);
        setFileError("");
        onSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create call log"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCallStatus("");
    setServiceRequestName("");
    setServiceRequestMobile("");
    setServiceRequestEmail("");
    setWarrantyStatus("");
    setIssue("");
    setRemarks("");
    setFollowUpDate("");
    setServiceAttachment(null);
    setFileError("");
    onClose();
  };

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
          boxShadow: "0 20px 60px rgba(99, 102, 241, 0.3)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
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
              <Phone size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                Service Call Log - {order?.orderId}
              </Modal.Title>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                Record customer service interaction
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
          style={{ 
            padding: "24px",
            background: "white",
          }}
        >
          {order && (
            <Alert 
              style={{ 
                marginBottom: "24px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                padding: "16px"
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={16} style={{ color: "#0369a1" }} />
                  <div>
                    <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Customer:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.customername || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={16} style={{ color: "#0369a1" }} />
                  <div>
                    <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Contact Person:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.name || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Phone size={16} style={{ color: "#0369a1" }} />
                  <div>
                    <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Contact No:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500" }}>{order.contactNo || "-"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "start", gap: "8px", gridColumn: "1 / -1" }}>
                  <MessageSquare size={16} style={{ color: "#0369a1", marginTop: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#0369a1", fontSize: "0.875rem" }}>Shipping Address:</strong>
                    <div style={{ color: "#1f2937", fontWeight: "500", lineHeight: "1.5" }}>
                      {order.shippingAddress || order.city || "-"}
                      {order.state && `, ${order.state}`}
                      {order.pinCode && ` - ${order.pinCode}`}
                    </div>
                  </div>
                </div>
              </div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ 
                fontWeight: "500", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "6px"
              }}>
                Call Status <span style={{ color: "#ef4444" }}>*</span>
              </Form.Label>
              <Form.Select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                required
                style={{
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  padding: "10px 12px",
                  fontSize: "0.875rem",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  background: "white",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">Select Status</option>
                <option value="Site Survey">🔍 Site Survey</option>
                <option value="Installation">🔧 Installation</option>
                <option value="Inspection">✅ Inspection</option>
                <option value="Service Request">📝 Service Request</option>
              </Form.Select>
            </Form.Group>

            {/* Service Request Fields - Only show when Service Request is selected */}
            {callStatus === "Service Request" && (
              <div style={{ 
                marginBottom: "20px",
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
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                      e.target.style.borderColor = "#6366f1";
                      e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
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
                  {serviceRequestMobile && serviceRequestMobile.length < 10 && (
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
                      e.target.style.borderColor = "#6366f1";
                      e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
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
                    Warranty Status <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Select
                    value={warrantyStatus}
                    onChange={(e) => setWarrantyStatus(e.target.value)}
                    required
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      background: "white",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#6366f1";
                      e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
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
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={{ 
                  fontWeight: "500", 
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px"
                }}>
                  Issue Description <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="Describe the customer's issue in detail..."
                  required
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
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
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
                  Follow-up Date <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#6366f1";
                    e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </Form.Group>
            </div>
            )}

            <Form.Group className="mb-4">
              <Form.Label style={{ 
                fontWeight: "500", 
                color: "#374151",
                fontSize: "0.875rem",
                marginBottom: "6px"
              }}>
                Additional Remarks
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Any additional notes or observations..."
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
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
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
                📎 Service Attachment (Optional)
              </Form.Label>
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
                  htmlFor="serviceAttachment"
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
                      color: "#6366f1",
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
                      : "Upload Document (PDF, PNG, JPG, DOCX, XLS, XLSX)"}
                  </span>
                </label>
                <input
                  id="serviceAttachment"
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
                      document.getElementById("serviceAttachment").value = null;
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
                Optional: Upload supporting documents, images, or reports (Max 10MB)
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
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? "#9ca3af" : "#6366f1",
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
                    e.target.style.backgroundColor = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = "#6366f1";
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Submit Call Log
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
        `}
      </style>
    </Modal>
  );
};

export default CallLogModal;