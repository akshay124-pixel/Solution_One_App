import { useState, useCallback, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/api";

// Enhanced styles matching project
const formControlStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  padding: "0.75rem",
  fontSize: "1rem",
  transition: "all 0.3s ease",
};

const buttonStyle = {
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  fontWeight: 600,
};

function QuotationMailModal({ isOpen, onClose, entryId, entryData }) {
  const initialFormData = {
    productType: "",
    specification: "",
    quantity: "",
    price: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  // Handle input changes
  const handleInput = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "quantity"
          ? value.replace(/\D/g, "")
          : name === "price"
          ? value.replace(/[^\d.]/g, "")
          : value,
    }));
  }, []);

  // Handle copy and paste
  const handleCopyPaste = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Validate form
  const validateForm = () => {
    if (!formData.productType.trim()) {
      toast.error("Please enter product type");
      return false;
    }
    if (!formData.specification.trim()) {
      toast.error("Please enter specification");
      return false;
    }
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return false;
    }
    if (!entryData?.email || !entryData.email.trim()) {
      toast.error("No email address found for this entry");
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const quotationData = {
        entryId,
        productType: formData.productType.trim(),
        specification: formData.specification.trim(),
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        customerEmail: entryData.email,
        customerName: entryData.customerName || entryData.contactName || "Valued Customer",
      };

      const response = await api.post("/api/send-quotation", quotationData);

      toast.success(response.data.message || "Quotation email sent successfully!");
      onClose();
    } catch (error) {
      console.error("Error sending quotation email:", error.message);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send quotation email. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
      style={{
        backdropFilter: "blur(5px)",
      }}
    >
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "#fff",
          padding: "1.5rem",
          borderBottom: "none",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Modal.Title
          style={{
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 700,
            fontSize: "1.75rem",
            letterSpacing: "-0.02em",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span role="img" aria-label="quotation-icon" style={{ fontSize: "1.5rem" }}>
            💼
          </span>
          Send Quotation Email
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body
          style={{
            padding: "2rem",
            background: "#f9fafb",
          }}
        >
          {/* Customer Info Display */}
          <div
            style={{
              background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
              padding: "1.25rem",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              border: "1px solid #bae6fd",
              boxShadow: "0 2px 8px rgba(37, 117, 252, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>👤</span>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#1e40af" }}>
                {entryData?.customerName || "N/A"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>📧</span>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#3b82f6" }}>
                {entryData?.email || "N/A"}
              </p>
            </div>
          </div>

          {/* Product Type */}
          <Form.Group controlId="formProductType" className="mb-4">
            <Form.Label
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "#374151",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📦</span> Product Type *
            </Form.Label>
            <Form.Control
              type="text"
              name="productType"
              value={formData.productType}
              onChange={handleInput}
              onCopy={handleCopyPaste}
              onPaste={handleCopyPaste}
              placeholder="e.g., Ed-Tech, Furniture, AV"
              disabled={loading}
              style={formControlStyle}
              maxLength={100}
              required
            />
            <Form.Text style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Enter the product category
            </Form.Text>
          </Form.Group>

          {/* Specification */}
          <Form.Group controlId="formSpecification" className="mb-4">
            <Form.Label
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "#374151",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📋</span> Specification *
            </Form.Label>
            <Form.Control
              type="text"
              name="specification"
              value={formData.specification}
              onChange={handleInput}
              onCopy={handleCopyPaste}
              onPaste={handleCopyPaste}
              placeholder="e.g., Interactive Flat Panel, Smart Board"
              disabled={loading}
              style={formControlStyle}
              maxLength={200}
              required
            />
            <Form.Text style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              Enter detailed product specification
            </Form.Text>
          </Form.Group>

          {/* Quantity */}
          <Form.Group controlId="formQuantity" className="mb-4">
            <Form.Label
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "#374151",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>🔢</span> Quantity *
            </Form.Label>
            <Form.Control
              type="text"
              name="quantity"
              value={formData.quantity}
              onChange={handleInput}
              onCopy={handleCopyPaste}
              onPaste={handleCopyPaste}
              placeholder="Enter quantity"
              disabled={loading}
              style={formControlStyle}
              maxLength={10}
              required
            />
            {formData.quantity && parseInt(formData.quantity) <= 0 && (
              <Form.Text style={{ color: "#dc2626", fontWeight: 500 }}>
                Quantity must be greater than 0
              </Form.Text>
            )}
          </Form.Group>

          {/* Price */}
          <Form.Group controlId="formPrice" className="mb-3">
            <Form.Label
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "#374151",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>💰</span> Price (₹) *
            </Form.Label>
            <Form.Control
              type="text"
              name="price"
              value={formData.price}
              onChange={handleInput}
              onCopy={handleCopyPaste}
              onPaste={handleCopyPaste}
              placeholder="Enter price in rupees"
              disabled={loading}
              style={formControlStyle}
              maxLength={15}
              required
            />
            {formData.price && parseFloat(formData.price) <= 0 && (
              <Form.Text style={{ color: "#dc2626", fontWeight: 500, display: "block" }}>
                Price must be greater than 0
              </Form.Text>
            )}
            {formData.price && formData.quantity && parseFloat(formData.price) > 0 && parseInt(formData.quantity) > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
                  borderRadius: "8px",
                  border: "1px solid #bae6fd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: "#1e40af" }}>
                    Total Amount:
                  </span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb" }}>
                    ₹{(parseFloat(formData.price) * parseInt(formData.quantity)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </Form.Group>
        </Modal.Body>

        <Modal.Footer
          style={{
            borderTop: "1px solid #e5e7eb",
            padding: "1.25rem 2rem",
            background: "#ffffff",
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "#6c757d",
              border: "none",
              padding: "0.625rem 1.5rem",
              fontSize: "1rem",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = "#5a6268";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#6c757d";
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: "linear-gradient(135deg, #6a11cb, #2575fc)",
              border: "none",
              padding: "0.625rem 1.5rem",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 16px rgba(106, 17, 203, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            }}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>📧</span>
                <span>Send Quotation</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default QuotationMailModal;
