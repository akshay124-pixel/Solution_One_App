import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { Settings, X, Save, FileText } from "lucide-react";
import serviceApi from "../axiosSetup";
import engineersList from "../utils/engineersList";
import { CALL_TYPE_OPTIONS } from "../utils/callTypes";

const EditServiceLog = ({ isOpen, onClose, log, onUpdate }) => {
  const [serviceStatus, setServiceStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [serviceRequestName, setServiceRequestName] = useState("");
  const [serviceRequestMobile, setServiceRequestMobile] = useState("");
  const [serviceRequestEmail, setServiceRequestEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [warrantyStatus, setWarrantyStatus] = useState("");
  const [callType, setCallType] = useState("");
  const [issue, setIssue] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [assignedEngineers, setAssignedEngineers] = useState([]);
  const [hardwareItems, setHardwareItems] = useState([{ description: "", quantity: "", price: "" }]);
  const [serviceAttachment, setServiceAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [salespersons, setSalespersons] = useState([]);
  const [salesPerson, setSalesPerson] = useState("");
  const [address, setAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState(""); // New shipping address state
  const [replacementPartReceived, setReplacementPartReceived] = useState("No");
  const [serviceAttachments, setServiceAttachments] = useState([]); // New service files
  const [partAttachments, setPartAttachments] = useState([]); // New part files
  const [existingPartAttachments, setExistingPartAttachments] = useState([]); // Old part files from DB
  const [existingServiceAttachments, setExistingServiceAttachments] = useState([]); // Old service files from DB
  const [deletedAttachments, setDeletedAttachments] = useState([]); // FileNames to remove in backend

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
  const handleFileChange = (e, type = 'part') => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
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
      
      const validFiles = [];
      let errorMessage = "";

      files.forEach(file => {
        const fileExt = file.name.split(".").pop().toLowerCase();
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
          errorMessage = `Invalid file type for ${file.name}. Only PDF, PNG, JPG, DOCX, XLS, XLSX are allowed.`;
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
          errorMessage = `File ${file.name} is too large. Max size is 10MB.`;
          return;
        }

        // Prevent duplicate local uploads
        const currentAttachments = type === 'service' ? serviceAttachments : partAttachments;
        if (currentAttachments.some(a => a.name === file.name && a.size === file.size)) {
          return;
        }

        validFiles.push(file);
      });

      if (errorMessage) {
        setFileError(errorMessage);
        toast.error(errorMessage);
      } else {
        setFileError("");
      }

      if (validFiles.length > 0) {
        if (type === 'service') {
          setServiceAttachments(prev => [...prev, ...validFiles]);
        } else {
          setPartAttachments(prev => [...prev, ...validFiles]);
        }
      }
      
      // Reset input value to allow re-uploading same file if deleted
      e.target.value = null;
    }
  };

  const removeNewAttachment = (index, type = 'part') => {
    if (type === 'service') {
      setServiceAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setPartAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeExistingAttachment = (fileName, type = 'part') => {
    setDeletedAttachments(prev => [...prev, fileName]);
    if (type === 'service') {
      setExistingServiceAttachments(prev => prev.filter(a => a.fileName !== fileName));
    } else {
      setExistingPartAttachments(prev => prev.filter(a => a.fileName !== fileName));
    }
  };

  useEffect(() => {
    const fetchSalespersons = async () => {
      try {
        const response = await serviceApi.get("/salespersons");
        if (response.data.success) {
          setSalespersons(response.data.salespersons || []);
        }
      } catch (err) {
        console.error("Failed to load salespersons:", err);
      }
    };
    fetchSalespersons();
  }, []);

  useEffect(() => {
    if (log) {
      setServiceStatus(log.serviceStatus || "");
      setRemarks(log.remarks || "");
      setServiceRequestName(log.serviceRequestName || "");
      setServiceRequestMobile(log.serviceRequestMobile || "");
      setServiceRequestEmail(log.serviceRequestEmail || "");
      setCity(log.city || "");
      setState(log.state || "");
      setAddress(log.address || "");
      setShippingAddress(log.shippingAddress || ""); // Initialize shipping address
      setWarrantyStatus(log.warrantyStatus || "");
      setCallType(log.callType || "");
      setIssue(log.issue || "");
      setFollowUpDate(log.followUpDate ? new Date(log.followUpDate).toISOString().split('T')[0] : "");
      setAssignedEngineers(log.assignedEngineers || []);
      setHardwareItems(log.hardwareItems || [{ description: "", quantity: "", price: "" }]);
      setSalesPerson(log.orderDetails?.salesPerson || log.salesPerson || "");
      setReplacementPartReceived(log.replacementPartReceived || "No");
      setExistingPartAttachments(log.attachments || []);
      setExistingServiceAttachments(log.serviceAttachments || []);
      setPartAttachments([]);
      setServiceAttachments([]);
      setDeletedAttachments([]);
      setServiceAttachment(null); // Reset file input for new uploads
      setFileError("");
    }
  }, [log]);

  const handleUpdate = async () => {
    if (!serviceStatus) {
      toast.warning("Please select a service status");
      return;
    }

    // Workflow validation: Part Replacement Closing Rule
    if (serviceStatus === "Closed" && log?.partStatus === "In Stock") {
      if (replacementPartReceived !== "Yes") {
        toast.error("Replacement part must be received before closing this ticket.");
        return;
      }
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
      formData.append("city", city);
      formData.append("state", state);
      formData.append("address", address);
      formData.append("shippingAddress", shippingAddress); // Add shipping address to FormData
      formData.append("warrantyStatus", warrantyStatus);
      formData.append("replacementPartReceived", replacementPartReceived);
      formData.append("callType", callType);
      formData.append("issue", issue);
      formData.append("followUpDate", followUpDate ? new Date(followUpDate).toISOString() : "");
      formData.append("assignedEngineers", JSON.stringify(assignedEngineers));
      formData.append("hardwareItems", JSON.stringify(callType === "Hardware" ? hardwareItems.filter(item => item.description && item.description.trim()) : []));
      formData.append("salesPerson", salesPerson);
      formData.append("deletedAttachments", JSON.stringify(deletedAttachments));
      
      // Append new service attachments
      serviceAttachments.forEach(file => {
        formData.append("serviceAttachments", file);
      });

      // Append new part attachments
      partAttachments.forEach(file => {
        formData.append("partAttachments", file);
      });

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
    setCity(log?.city || "");
    setState(log?.state || "");
    setAddress(log?.address || "");
    setShippingAddress(log?.shippingAddress || ""); // Reset shipping address
    setWarrantyStatus(log?.warrantyStatus || "");
    setCallType(log?.callType || "");
    setIssue(log?.issue || "");
    setFollowUpDate(log?.followUpDate ? new Date(log.followUpDate).toISOString().split('T')[0] : "");
    setAssignedEngineers(log?.assignedEngineers || []);
    setHardwareItems(log?.hardwareItems || [{ description: "", quantity: "", price: "" }]);
    setSalesPerson(log?.orderDetails?.salesPerson || log?.salesPerson || "");
    setExistingPartAttachments(log?.attachments || []);
    setExistingServiceAttachments(log?.serviceAttachments || []);
    setPartAttachments([]);
    setServiceAttachments([]);
    setDeletedAttachments([]);
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
                <div style={{ color: "#1f2937", fontWeight: "500" }}>
                  {log.orderId?.startsWith('PMTM') 
                    ? (log.serviceRequestName || "-")
                    : (log.orderDetails?.customername || "-")
                  }
                </div>
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
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <Form.Group>
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

                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    Salesperson
                  </Form.Label>
                  <Form.Select
                    value={salesPerson}
                    onChange={(e) => setSalesPerson(e.target.value)}
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
                    <option value="">Select Salesperson</option>
                    {salespersons.map((sp) => (
                      <option key={sp.name} value={sp.name}>
                        👤 {sp.name} ({sp.email || "No email"})
                      </option>
                    ))}
                  </Form.Select>
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

              <Form.Group className="mb-3">
                <Form.Label style={{ 
                  fontWeight: "500", 
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "6px"
                }}>
                  Address
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address..."
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    City
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city..."
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

                <Form.Group>
                  <Form.Label style={{ 
                    fontWeight: "500", 
                    color: "#374151",
                    fontSize: "0.875rem",
                    marginBottom: "6px"
                  }}>
                    State
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enter state..."
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
                    {CALL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                    ))}
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

            {/* Replacement Part Received Dropdown - Only show if partStatus is In Stock */}
            {log?.partStatus === "In Stock" && (
              <Form.Group className="mb-4">
                <Form.Label style={{ fontWeight: "600", color: "#374151", marginBottom: "8px", display: "flex", alignItems: "center" }}>
                  <span style={{ marginRight: "8px" }}>📦</span> Replacement Part Received?
                </Form.Label>
                <Form.Select
                  value={replacementPartReceived}
                  onChange={(e) => setReplacementPartReceived(e.target.value)}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    background: "white",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Must be 'Yes' to close a ticket with In Stock replacement.
                </Form.Text>
              </Form.Group>
            )}

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
                    {CALL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Hardware Items - Only show when Call Type is "Hardware" */}
            {callType === "Hardware" && (
              <>
                <div style={{
                  background: "#fef3c7",
                  border: "1px solid #fbbf24",
                  borderRadius: "8px",
                  padding: "16px",
                  marginTop: "16px",
                  marginBottom: "24px"
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

                  {/* Shipping Address - shown only when at least one item is added */}
                  {hardwareItems.some(item => item.description && item.description.trim()) && (
                    <Form.Group style={{ marginTop: "12px" }}>
                      <Form.Label style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        📦 Shipping Address
                        <span style={{ fontSize: "0.7rem", color: "#b45309", fontWeight: "400" }}>(Where to ship the parts)</span>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Enter shipping address for hardware parts..."
                        style={{
                          fontSize: "0.875rem",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          border: "1px solid #fbbf24",
                          background: "white",
                          resize: "vertical",
                          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f59e0b";
                          e.target.style.boxShadow = "0 0 0 3px rgba(245, 158, 11, 0.15)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#fbbf24";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </Form.Group>
                  )}
                </div>

                {/* Part Related Attachments Section */}
                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "16px",
                  marginBottom: "24px"
                }}>
                  <h6 style={{ 
                    fontWeight: "600", 
                    color: "#166534",
                    fontSize: "0.875rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <Settings size={18} />
                    Part Related Attachments
                  </h6>

                  {/* Existing Attachments */}
                  {existingPartAttachments.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#166534", marginBottom: "8px" }}>
                        Current Attachments:
                      </p>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {existingPartAttachments.map((file, idx) => (
                          <div key={idx} style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "white",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #bbf7d0"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                              <div style={{ color: "#166534", flexShrink: 0 }}>
                                <Save size={16} />
                              </div>
                              <span style={{ 
                                fontSize: "0.8125rem", 
                                color: "#1f2937",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {file.originalName || file.fileName}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(file.fileName)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#166534",
                                  padding: "4px",
                                  cursor: "pointer"
                                }}
                                title="Download"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeExistingAttachment(file.fileName, 'part')}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  padding: "4px",
                                  cursor: "pointer"
                                }}
                                title="Remove"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Attachments Preview */}
                  {partAttachments.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#166534", marginBottom: "8px" }}>
                        New Uploads:
                      </p>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {partAttachments.map((file, idx) => (
                          <div key={idx} style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "#dcfce7",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #86efac"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                              <div style={{ color: "#166534", flexShrink: 0 }}>
                                <Save size={16} />
                              </div>
                              <div style={{ overflow: "hidden" }}>
                                <div style={{ 
                                  fontSize: "0.8125rem", 
                                  color: "#1f2937",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {file.name}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#166534" }}>
                                  {(file.size / 1024).toFixed(1)} KB
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeNewAttachment(idx, 'part')}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                padding: "4px",
                                cursor: "pointer",
                                flexShrink: 0
                              }}
                              title="Remove"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Dropzone Area */}
                  <div
                    style={{
                      border: "2px dashed #86efac",
                      borderRadius: "8px",
                      padding: "20px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(255, 255, 255, 0.5)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                      e.currentTarget.style.borderColor = "#22c55e";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                      e.currentTarget.style.borderColor = "#86efac";
                    }}
                    onClick={() => document.getElementById('partAttachmentInput').click()}
                  >
                    <input
                      id="partAttachmentInput"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
                      onChange={(e) => handleFileChange(e, 'part')}
                      style={{ display: "none" }}
                    />
                    <div style={{ color: "#166534", marginBottom: "8px" }}>
                      <Save size={24} style={{ margin: "0 auto" }} />
                    </div>
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", fontWeight: "600", color: "#166534" }}>
                      Click to upload part related documents
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#166534", opacity: 0.8 }}>
                      PDF, PNG, JPG, DOCX, XLSX (Max 10MB per file)
                    </p>
                  </div>
                </div>
              </>
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
            <div style={{
              background: "#f0f9ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px"
            }}>
              <h6 style={{ 
                fontWeight: "600", 
                color: "#1e40af",
                fontSize: "0.875rem",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <FileText size={18} />
                Service Call Attachments
              </h6>

              {/* Existing Service Attachments */}
              {existingServiceAttachments.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#1e40af", marginBottom: "8px" }}>
                    Current Attachments:
                  </p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {existingServiceAttachments.map((file, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "white",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #bfdbfe"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                          <div style={{ color: "#1e40af", flexShrink: 0 }}>
                            <Save size={16} />
                          </div>
                          <span style={{ 
                            fontSize: "0.8125rem", 
                            color: "#1f2937",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}>
                            {file.originalName || file.fileName}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file.fileName)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1e40af",
                              padding: "4px",
                              cursor: "pointer"
                            }}
                            title="Download"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(file.fileName, 'service')}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              padding: "4px",
                              cursor: "pointer"
                            }}
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Service Attachments Preview */}
              {serviceAttachments.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: "600", color: "#1e40af", marginBottom: "8px" }}>
                    New Uploads:
                  </p>
                  <div style={{ display: "grid", gap: "8px" }}>
                    {serviceAttachments.map((file, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "#e0f2fe",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #bae6fd"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                          <div style={{ color: "#1e40af", flexShrink: 0 }}>
                            <Save size={16} />
                          </div>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ 
                              fontSize: "0.8125rem", 
                              color: "#1f2937",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {file.name}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#1e40af" }}>
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewAttachment(idx, 'service')}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            padding: "4px",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                          title="Remove"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Dropzone Area */}
              <div
                style={{
                  border: "2px dashed #bae6fd",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "rgba(255, 255, 255, 0.5)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.5)";
                  e.currentTarget.style.borderColor = "#bae6fd";
                }}
                onClick={() => document.getElementById('serviceAttachmentInput').click()}
              >
                <input
                  id="serviceAttachmentInput"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xls"
                  onChange={(e) => handleFileChange(e, 'service')}
                  style={{ display: "none" }}
                />
                <div style={{ color: "#1e40af", marginBottom: "8px" }}>
                  <FileText size={24} style={{ margin: "0 auto" }} />
                </div>
                <p style={{ margin: "0 0 4px 0", fontSize: "0.875rem", fontWeight: "600", color: "#1e40af" }}>
                  Click to upload service call documents
                </p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#1e40af", opacity: 0.8 }}>
                  PDF, PNG, JPG, DOCX, XLSX (Max 10MB per file)
                </p>
              </div>
            </div>

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