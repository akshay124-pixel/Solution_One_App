import React, { useState, useEffect } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { FileText, X, Save } from "lucide-react";
import serviceApi from "../axiosSetup";
import { CALL_TYPE_OPTIONS } from "../utils/callTypes";
import { statesAndCities, STATE_LIST } from "../utils/options";

const ManualServiceRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    contactNo: "",
    email: "",
    address: "",
    city: "",
    state: "",
    issue: "",
    warrantyStatus: "",
    callType: "",
    systemType: "av&edtech",
    followUpDate: "",
    salesPerson: "",
    vendor: "",
  });
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [salespersons, setSalespersons] = useState([]);

 const vendors = [
    { name: "Promark" },
    { name: "DLS" },
    { name: "TrueView" },
    { name: "Newline" },
    { name: "RINL"}
  ];

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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const allowedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "pdf",
      "doc",
      "docx",
      "xlsx",
      "xls",
    ];

    const validFiles = [];
    let error = "";

    files.forEach((file) => {
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExt)
      ) {
        error = `Invalid file type: ${file.name}`;
      } else if (file.size > 10 * 1024 * 1024) {
        error = `File too large: ${file.name} (Max 10MB)`;
      } else {
        validFiles.push(file);
      }
    });

    if (error) {
      setFileError(error);
      toast.error(error);
    } else {
      setFileError("");
      setAttachments((prev) => [...prev, ...validFiles].slice(0, 10));
    }
    e.target.value = null;
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (
      !formData.customerName ||
      !formData.contactNo ||
      !formData.issue ||
      !formData.warrantyStatus ||
      !formData.followUpDate
    ) {
      toast.warning("Please fill all required fields");
      return;
    }

    // Validate mobile number
    if (formData.contactNo.length !== 10) {
      toast.warning("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("serviceRequestName", formData.customerName);
      formDataToSend.append("serviceRequestMobile", formData.contactNo);
      formDataToSend.append("serviceRequestEmail", formData.email);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("city", formData.city);
      formDataToSend.append("state", formData.state);
      formDataToSend.append("issue", formData.issue);
      formDataToSend.append("warrantyStatus", formData.warrantyStatus);
      formDataToSend.append("callType", formData.callType);
      formDataToSend.append("systemType", formData.systemType);
      formDataToSend.append("followUpDate", formData.followUpDate);
      formDataToSend.append("salesPerson", formData.salesPerson);
      formDataToSend.append("vendor", formData.vendor);
      attachments.forEach((file) => {
        formDataToSend.append("serviceAttachments", file);
      });

      const response = await serviceApi.post(
        "/manual-service-request",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      if (response.data.success) {
        toast.success("Manual service request created successfully");
        handleClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create service request",
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customerName: "",
      contactNo: "",
      email: "",
      address: "",
      city: "",
      state: "",
      issue: "",
      warrantyStatus: "",
      callType: "",
      systemType: "av&edtech",
      followUpDate: "",
      salesPerson: "",
      vendor: "",
    });
    setAttachments([]);
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
          boxShadow: "0 20px 60px rgba(16, 185, 129, 0.3)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "white",
            borderBottom: "none",
            padding: "24px 28px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(10px)",
              }}
            >
              <FileText size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <Modal.Title
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "white",
                }}
              >
                Manual Service Request
              </Modal.Title>
              <p
                style={{
                  margin: "4px 0 0 0",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.9rem",
                  fontWeight: "400",
                }}
              >
                Create service request without order
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
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!loading)
                  e.target.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                if (!loading)
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
            background: "white",
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <Alert variant="info" style={{ marginBottom: "20px" }}>
            <strong>Note:</strong> This form is for creating service requests
            without an existing order. All fields marked with * are required.
          </Alert>

          <Form>
            {/* Customer Details */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                Customer Details
              </h6>

              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  Customer Name <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Enter customer name"
                  style={{
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                  }}
                />
              </Form.Group>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Mobile Number <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    value={formData.contactNo}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 10) {
                        handleChange("contactNo", value);
                      }
                    }}
                    placeholder="Enter 10 digit mobile"
                    maxLength={10}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  />
                  {formData.contactNo && formData.contactNo.length < 10 && (
                    <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>
                      Mobile number must be 10 digits
                    </small>
                  )}
                </Form.Group>

                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter email"
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  />
                </Form.Group>
              </div>

              <Form.Group className="mb-0 mt-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  Address
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter customer address"
                  style={{
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    resize: "vertical",
                  }}
                />
              </Form.Group>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginTop: "12px",
                }}
              >
                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    State
                  </Form.Label>
                  <Form.Select
                    value={formData.state}
                    onChange={(e) => {
                      handleChange("state", e.target.value);
                      handleChange("city", "");
                    }}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Select State</option>
                    {STATE_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    City
                  </Form.Label>
                  <Form.Select
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    disabled={!formData.state}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                      background: !formData.state ? "#f3f4f6" : "white",
                    }}
                  >
                    <option value="">
                      {formData.state ? "Select City" : "Select state first"}
                    </option>
                    {formData.state &&
                      (statesAndCities[formData.state] || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {/* Service Details */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                Service Details
              </h6>

              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  System <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Select
                  value={formData.systemType}
                  onChange={(e) => handleChange("systemType", e.target.value)}
                  style={{
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="av&edtech">📺 AV & EdTech</option>
                  <option value="furniture">🪑 Furniture</option>
                </Form.Select>
              </Form.Group>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Warranty Status <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Select
                    value={formData.warrantyStatus}
                    onChange={(e) =>
                      handleChange("warrantyStatus", e.target.value)
                    }
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Select Warranty</option>
                    <option value="In Warranty">✅ In Warranty</option>
                    <option value="Out of Warranty">❌ Out of Warranty</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Call Type
                  </Form.Label>
                  <Form.Select
                    value={formData.callType}
                    onChange={(e) => handleChange("callType", e.target.value)}
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Select Type</option>
                    {CALL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  Issue Description <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.issue}
                  onChange={(e) => handleChange("issue", e.target.value)}
                  placeholder="Describe the issue in detail..."
                  style={{
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    resize: "vertical",
                  }}
                />
              </Form.Group>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <Form.Group className="mb-0">
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Follow-up Date <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) =>
                      handleChange("followUpDate", e.target.value)
                    }
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-0">
                  <Form.Label
                    style={{
                      fontWeight: "500",
                      color: "#374151",
                      fontSize: "0.875rem",
                    }}
                  >
                    Salesperson
                  </Form.Label>
                  <Form.Select
                    value={formData.salesPerson}
                    onChange={(e) =>
                      handleChange("salesPerson", e.target.value)
                    }
                    style={{
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "0.875rem",
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
            </div>

            {/* Additional Fields */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                Additional Details (Optional)
              </h6>
              <Form.Group className="mb-3">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  Vendor
                </Form.Label>
                <select
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                    background: "white",
                    color: formData.vendor ? "#1f2937" : "#6b7280",
                    outline: "none",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    paddingRight: "36px",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#10b981";
                    e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.name} value={vendor.name}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </Form.Group>
            </div>

            {/* Service Attachment */}
            <div
              style={{
                marginBottom: "0",
                padding: "16px",
                background: "#f0f9ff",
                borderRadius: "8px",
                border: "1px solid #bfdbfe",
              }}
            >
              <h6
                style={{
                  fontWeight: "600",
                  color: "#1e40af",
                  fontSize: "0.875rem",
                  marginBottom: "12px",
                }}
              >
                📎 Service Attachment (Optional)
              </h6>
              <Form.Group className="mb-0">
                <Form.Label
                  style={{
                    fontWeight: "500",
                    color: "#374151",
                    fontSize: "0.875rem",
                  }}
                >
                  Upload Document/Image
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  style={{
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "0.875rem",
                  }}
                />
                <small
                  style={{
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    display: "block",
                    marginTop: "6px",
                  }}
                >
                  Allowed: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (Max 10MB, Max 10
                  files)
                </small>
                {fileError && (
                  <Alert
                    variant="danger"
                    style={{
                      marginTop: "8px",
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {fileError}
                  </Alert>
                )}
                {attachments.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          background: "#ecfdf5",
                          border: "1px solid #10b981",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.75rem",
                          color: "#065f46",
                        }}
                      >
                        <span
                          style={{
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "0",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "16px 24px",
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
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              borderRadius: "8px",
              padding: "10px 24px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Save size={18} />
            {loading ? "Creating..." : "Create Service Request"}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

export default ManualServiceRequestModal;
