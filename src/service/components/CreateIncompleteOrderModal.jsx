import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Badge } from "react-bootstrap";
import { toast } from "react-toastify";
import { FileText, X, Save, Package } from "lucide-react";
import serviceApi from "../axiosSetup";
import { getAllowedCategory } from "../../constants/roles";

const CreateIncompleteOrderModal = ({ isOpen, onClose, onSuccess, initialOrder = null, userRole }) => {
  const allowedCategory = getAllowedCategory(userRole);
  
  const [formData, setFormData] = useState({
    orderId: "",
    customerName: "",
    customerAddress: "",
    city: "",
    state: "",
    contactNumber: "",
    productCategory: allowedCategory || "av&edtech",
    pendingParts: [],
    remarks: ""
  });
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);

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
        text: 'AV & EdTech',
        icon: '📺'
      };
    }
  };

  useEffect(() => {
    if (initialOrder) {
      setFormData({
        orderId: initialOrder.orderId || "",
        customerName: initialOrder.customername || initialOrder.customerName || "",
        customerAddress: initialOrder.shippingAddress || initialOrder.address || "",
        city: initialOrder.city || "",
        state: initialOrder.state || "",
        contactNumber: initialOrder.contactNo || initialOrder.contactNumber || "",
        productCategory: allowedCategory || initialOrder.systemType || "av&edtech",
        pendingParts: [],
        remarks: ""
      });
    } else {
      resetForm();
    }
  }, [initialOrder, allowedCategory]);

  const resetForm = () => {
    setFormData({
      orderId: "",
      customerName: "",
      customerAddress: "",
      city: "",
      state: "",
      contactNumber: "",
      productCategory: allowedCategory || "av&edtech",
      pendingParts: [],
      remarks: ""
    });
    setAttachments([]);
    setFileError("");
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPendingPart = () => {
    setFormData(prev => ({
      ...prev,
      pendingParts: [...prev.pendingParts, { partName: "", spec: "", quantity: "" }]
    }));
  };

  const removePendingPart = (index) => {
    setFormData(prev => ({
      ...prev,
      pendingParts: prev.pendingParts.filter((_, i) => i !== index)
    }));
  };

  const updatePendingPart = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      pendingParts: prev.pendingParts.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
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
    const allowedExtensions = ["jpg", "jpeg", "png", "pdf", "doc", "docx", "xlsx", "xls"];

    const validFiles = [];
    let error = "";

    files.forEach((file) => {
      const fileExt = file.name.split(".").pop().toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
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
    if (!formData.customerName || !formData.contactNumber || !formData.productCategory) {
      toast.warning("Please fill all required fields");
      return;
    }
    if (formData.contactNumber.length !== 10) {
      toast.warning("Contact number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("orderId", formData.orderId || "");
      formDataToSend.append("customerName", formData.customerName);
      formDataToSend.append("customerAddress", formData.customerAddress || "");
      formDataToSend.append("city", formData.city || "");
      formDataToSend.append("state", formData.state || "");
      formDataToSend.append("contactNumber", formData.contactNumber);
      formDataToSend.append("productCategory", formData.productCategory);
      
      // Filter out parts without name
      const validParts = formData.pendingParts.filter(p => p.partName && p.partName.trim());
      formDataToSend.append("pendingParts", JSON.stringify(validParts));
      
      formDataToSend.append("remarks", formData.remarks || "");
      
      attachments.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      const response = await serviceApi.post("/incomplete-orders", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Incomplete order created successfully!");
        handleClose();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create incomplete order");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
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
              <Package size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                  {initialOrder ? "Create Incomplete Order" : "Manual Incomplete Order Request"}
                </Modal.Title>
                <Badge 
                  bg={getSystemBadge(formData.productCategory).bg}
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
                  <span>{getSystemBadge(formData.productCategory).icon}</span>
                  {getSystemBadge(formData.productCategory).text}
                </Badge>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                {initialOrder ? "Create incomplete order from existing order" : "Create incomplete order request without order"}
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
          {initialOrder && (
            <Alert 
              style={{ 
                marginBottom: "20px",
                background: "#dbeafe",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                padding: "12px 16px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "32px", 
                  height: "32px", 
                  borderRadius: "6px", 
                  background: "#3b82f6", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: "700"
                }}>
                  ℹ
                </div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1e40af", fontSize: "0.875rem" }}>
                    Creating from Existing Order
                  </div>
                  <div style={{ color: "#3b82f6", fontSize: "0.75rem", marginTop: "2px" }}>
                    Order ID: <strong>{initialOrder.orderId}</strong>
                  </div>
                </div>
              </div>
            </Alert>
          )}

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
                    Contact Number <span style={{ color: "#ef4444" }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      handleChange("contactNumber", value);
                    }}
                    placeholder="Enter 10-digit contact number"
                    maxLength={10}
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  />
                </Form.Group>

                {!allowedCategory && (
                  <Form.Group>
                    <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                      Product Category <span style={{ color: "#ef4444" }}>*</span>
                    </Form.Label>
                    <Form.Select
                      value={formData.productCategory}
                      onChange={(e) => handleChange("productCategory", e.target.value)}
                      style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                    >
                      <option value="av&edtech">📺 AV & EdTech</option>
                      <option value="furniture">🪑 Furniture</option>
                    </Form.Select>
                  </Form.Group>
                )}
                {allowedCategory && (
                  <Form.Group>
                    <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                      Product Category <span style={{ color: "#ef4444" }}>*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={allowedCategory === "furniture" ? "🪑 Furniture" : "📺 AV & EdTech"}
                      disabled
                      style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                    />
                  </Form.Group>
                )}
              </div>

              <Form.Group className="mb-0 mt-3">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Customer Address
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.customerAddress}
                  onChange={(e) => handleChange("customerAddress", e.target.value)}
                  placeholder="Enter customer address"
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem", resize: "vertical" }}
                />
              </Form.Group>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                    City
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Enter city"
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                    State
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    placeholder="Enter state"
                    style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                  />
                </Form.Group>
              </div>
            </div>

            {/* Pending Parts */}
            <div
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#fef3c7",
                borderRadius: "8px",
                border: "1px solid #fbbf24",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h6 style={{ fontWeight: "600", color: "#92400e", fontSize: "0.875rem", margin: 0 }}>
                  <span style={{ marginRight: "8px" }}><Package size={16} /></span>
                  Pending Products
                </h6>
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={addPendingPart}
                  style={{
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    padding: "6px 12px"
                  }}
                >
                  + Add Product
                </Button>
              </div>

              {formData.pendingParts.length === 0 && (
                <div style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#92400e",
                  fontSize: "0.875rem"
                }}>
                  No pending products added. Click "+ Add Product" to add parts.
                </div>
              )}
              
              {formData.pendingParts.map((part, index) => (
                <div key={index} style={{
                  background: "white",
                  border: "1px solid #fbbf24",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "8px",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1.5fr 0.75fr auto",
                  gap: "12px",
                  alignItems: "center"
                }}>
                  <Form.Group>
                    <Form.Label style={{ 
                      fontWeight: "500", 
                      color: "#92400e",
                      fontSize: "0.75rem",
                      marginBottom: "4px"
                    }}>
                      Product Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={part.partName}
                      onChange={(e) => updatePendingPart(index, "partName", e.target.value)}
                      placeholder="Enter product name..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label style={{ 
                      fontWeight: "500", 
                      color: "#92400e",
                      fontSize: "0.75rem",
                      marginBottom: "4px"
                    }}>
                      Spec
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={part.spec}
                      onChange={(e) => updatePendingPart(index, "spec", e.target.value)}
                      placeholder="Enter specification..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label style={{ 
                      fontWeight: "500", 
                      color: "#92400e",
                      fontSize: "0.75rem",
                      marginBottom: "4px"
                    }}>
                      Quantity
                    </Form.Label>
                    <Form.Control
                      type="number"
                      value={part.quantity}
                      onChange={(e) => updatePendingPart(index, "quantity", e.target.value)}
                      placeholder="Qty..."
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        padding: "8px 10px",
                        fontSize: "0.875rem",
                        background: "white",
                      }}
                    />
                  </Form.Group>
                  {formData.pendingParts.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removePendingPart(index)}
                      style={{
                        borderRadius: "6px",
                        marginTop: "20px"
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Remarks */}
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
                Remarks
              </h6>
              <Form.Group className="mb-0">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  placeholder="Enter any additional remarks..."
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem", resize: "vertical" }}
                />
              </Form.Group>
            </div>

            {/* Attachments */}
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
                📎 Attachments (Optional)
              </h6>
              <Form.Group className="mb-0">
                <Form.Label style={{ fontWeight: "500", color: "#374151", fontSize: "0.875rem" }}>
                  Upload Document/Image
                </Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                  style={{ borderRadius: "8px", padding: "10px 12px", fontSize: "0.875rem" }}
                />
                <small style={{ color: "#6b7280", fontSize: "0.75rem", display: "block", marginTop: "6px" }}>
                  Allowed: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX (Max 10MB, Max 10 files)
                </small>
                {fileError && (
                  <Alert variant="danger" style={{ marginTop: "8px", padding: "8px 12px", fontSize: "0.75rem" }}>
                    {fileError}
                  </Alert>
                )}
                {attachments.length > 0 && (
                  <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
                        <span style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
            {loading ? "Creating..." : "Create Order"}
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
};

export default CreateIncompleteOrderModal;
