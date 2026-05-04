import React, { useState } from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import { FileText, X, Save } from "lucide-react";
import serviceApi from "../axiosSetup";

const ManualServiceRequestModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    contactNo: "",
    email: "",
    address: "",
    issue: "",
    warrantyStatus: "",
    callType: "",
    followUpDate: "",
  });
  const [serviceAttachment, setServiceAttachment] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setFileError("File size must be less than 10MB");
        setServiceAttachment(null);
        e.target.value = "";
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        setFileError("Only JPG, PNG, PDF, DOC, DOCX files are allowed");
        setServiceAttachment(null);
        e.target.value = "";
        return;
      }

      setFileError("");
      setServiceAttachment(file);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.customerName || !formData.contactNo || !formData.issue || !formData.warrantyStatus || !formData.followUpDate) {
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
      formDataToSend.append("issue", formData.issue);
      formDataToSend.append("warrantyStatus", formData.warrantyStatus);
      formDataToSend.append("callType", formData.callType);
      formDataToSend.append("followUpDate", formData.followUpDate);
      
      if (serviceAttachment) {
        formDataToSend.append("serviceAttachment", serviceAttachment);
      }

      const response = await serviceApi.post("/manual-service-request", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Manual service request created successfully");
        handleClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create service request");
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
      issue: "",
      warrantyStatus: "",
      callType: "",
      followUpDate: "",
    });
    setServiceAttachment(null);
    setFileError("");
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" centered backdrop="static">
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
          <div style={{ display: "flex", alignItems: "center", gap: "14px", width: "100%" }}>
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
              <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                Manual Service Request
              </Modal.Title>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
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
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          <Alert variant="info" style={{ marginBottom: "20px" }}>
            <strong>Note:</strong> This form is for creating service requests without an existing order. All fields marked with * are required.
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
              <h6 style={{ fontWeight: "600", color: "#374151", fontSize: "0.875rem", marginBottom: "12px" }}>
                Customer Details
              </h6>

              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Customer Name <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Enter customer name"
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                />
              </Form.Group>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
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
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  />
                  {formData.contactNo && formData.contactNo.length < 10 && (
                    <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>
                      Mobile number must be 10 digits
                    </small>
                  )}
                </Form.Group>

                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                    Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter email"
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  />
                </Form.Group>
              </div>

              <Form.Group className="mb-0 mt-3">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Address
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter customer address"
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem", resize: "vertical" }}
                />
              </Form.Group>
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
              <h6 style={{ fontWeight: "600", color: "#374151", fontSize: "0.875rem", marginBottom: "12px" }}>
                Service Details
              </h6>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                    Warranty Status <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Select
                    value={formData.warrantyStatus}
                    onChange={(e) => handleChange("warrantyStatus", e.target.value)}
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  >
                    <option value="">Select Warranty</option>
                    <option value="In Warranty">✅ In Warranty</option>
                    <option value="Out of Warranty">❌ Out of Warranty</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                    Call Type
                  </Form.Label>
                  <Form.Select
                    value={formData.callType}
                    onChange={(e) => handleChange("callType", e.target.value)}
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  >
                    <option value="">Select Type</option>
                    <option value="Software">💻 Software</option>
                    <option value="Hardware">🔧 Hardware</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Issue Description <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.issue}
                  onChange={(e) => handleChange("issue", e.target.value)}
                  placeholder="Describe the issue in detail..."
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem", resize: "vertical" }}
                />
              </Form.Group>

              <Form.Group className="mb-0">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Follow-up Date <span style={{ color: "#ef4444" }}>*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => handleChange("followUpDate", e.target.value)}
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                />
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
              <h6 style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem", marginBottom: "12px" }}>
                📎 Service Attachment (Optional)
              </h6>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Upload Document/Image
                </Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                />
                <small style={{ color: "#6b7280", fontSize: "0.75rem", display: "block", marginTop: "6px" }}>
                  Allowed: JPG, PNG, PDF, DOC, DOCX (Max 10MB)
                </small>
                {fileError && (
                  <Alert variant="danger" style={{ marginTop: "8px", padding: "8px 12px", fontSize: "0.75rem" }}>
                    {fileError}
                  </Alert>
                )}
                {serviceAttachment && !fileError && (
                  <Alert variant="success" style={{ marginTop: "8px", padding: "8px 12px", fontSize: "0.75rem" }}>
                    ✅ File selected: {serviceAttachment.name}
                  </Alert>
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
