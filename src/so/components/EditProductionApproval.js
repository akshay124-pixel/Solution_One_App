import React, { useState, useEffect } from "react";
import { getDirtyValues } from "../utils/formUtils"; // Import Diff Utility
import { Modal, Form, Button } from "react-bootstrap";
import soApi from "../../so/axiosSetup";
import { toast } from "react-toastify";

const EditProductionApproval = ({
  isOpen,
  onClose,
  onEntryUpdated,
  entryToEdit,
}) => {
  const [formData, setFormData] = useState({
    sostatus: "",
    remarksByProduction: "",
    deliveryDate: "",
    stockStatus: "In Stock",
  });
  const [originalFormData, setOriginalFormData] = useState({}); // Capture original
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (entryToEdit) {
      const initialData = {
        sostatus: entryToEdit.sostatus || "",
        remarksByProduction: entryToEdit.remarksByProduction || "",
        deliveryDate: entryToEdit.deliveryDate
          ? new Date(entryToEdit.deliveryDate).toISOString().slice(0, 10)
          : "",
        stockStatus: entryToEdit.stockStatus || "In Stock",
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
      setErrors({});
    }
  }, [entryToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // ✅ NEW LOGIC
      if (name === "stockStatus" && value === "Not in Stock") {
        newFormData.sostatus = "Accounts Approved"; // auto shift
        newFormData.deliveryDate = ""; // clear date
      }
      if (name === "sostatus" && value === "Approved" && !formData.deliveryDate) {
        toast.info("Please select Delivery Date to approve the order");
      }

      return newFormData;
    });
    // Clear error for the field being edited
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const validStatuses = [
      "Pending for Approval",
      "Accounts Approved",
      "Approved",
    ];

    if (!formData.sostatus || !validStatuses.includes(formData.sostatus)) {
      newErrors.sostatus = "Please select a valid approval status";
    }

    if (
      formData.stockStatus !== "Not in Stock" &&
      formData.sostatus === "Pending for Approval"
    ) {
      newErrors.sostatus =
        "Pending for Approval is only allowed when stock status is Not in Stock";
    }

    // ✅ NEW: Delivery Date required when Approved
    if (formData.sostatus === "Approved" && !formData.deliveryDate) {
      newErrors.deliveryDate = "Delivery Date is required when status is Approved";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const dirtyValues = getDirtyValues(originalFormData, formData);
      if (Object.keys(dirtyValues).length === 0) {
        toast.info("No changes to save.");
        onClose();
        return;
      }

      const response = await soApi.patch(
        `/api/edit/${entryToEdit._id}`,
        dirtyValues
      );
      onEntryUpdated(response.data.data);
      toast.success("Order Approved successfully.");
      onClose();
    } catch (error) {
      console.error("Error updating verification order:", error);

      let userFriendlyMessage = "Something went wrong. Please try again later.";

      if (error.response) {
        if (error.response.status === 400) {
          userFriendlyMessage =
            "Invalid data provided. Please check and try again.";
        } else if (error.response.status === 401) {
          userFriendlyMessage =
            "Your session has expired. Please log in again.";
        } else if (error.response.status === 404) {
          userFriendlyMessage = "Order not found. It may have been deleted.";
        } else if (error.response.status === 500) {
          userFriendlyMessage = "Server error. Please contact support.";
        }
      } else if (error.request) {
        userFriendlyMessage =
          "No response from server. Please check your internet connection.";
      }

      toast.error(userFriendlyMessage, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const isNotInStock = formData.stockStatus === "Not in Stock";

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      size="mt"
      centered
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <Modal.Header
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "white",
          padding: "20px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        <Modal.Title style={{ fontWeight: "600", fontSize: "1.5rem" }}>
          Edit Production Approval
        </Modal.Title>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: "1.5rem",
            position: "absolute",
            right: "20px",
            top: "20px",
            cursor: "pointer",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => (e.target.style.transform = "scale(1.2)")}
          onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
          aria-label="Close modal"
        >
          ×
        </button>
      </Modal.Header>
      <Modal.Body style={{ padding: "30px", background: "#f9fafb" }}>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-4">
            <Form.Label
              style={{
                fontWeight: "500",
                color: "#1f2937",
                fontSize: "1.1rem",
              }}
            >
              Approval Status <span style={{ color: "#dc3545" }}>*</span>
            </Form.Label>
            <Form.Select
              name="sostatus"
              value={formData.sostatus}
              onChange={handleChange}
              required
              disabled={isNotInStock}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: errors.sostatus
                  ? "2px solid #dc3545"
                  : "1px solid #d1d5db",
                background: isNotInStock ? "#e9ecef" : "white",
                fontSize: "1rem",
                transition: "border-color 0.3s ease",
              }}
              aria-label="Select approval status"
            >
              <option value="">Select Status</option>
              <option value="Pending for Approval">Pending for Approval</option>
              <option value="Accounts Approved">Accounts Approved</option>
              <option value="Approved">Approved</option>
            </Form.Select>
            {errors.sostatus && (
              <Form.Text style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                {errors.sostatus}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label
              style={{
                fontWeight: "500",
                color: "#1f2937",
                fontSize: "1.1rem",
              }}
            >
              Planned Delivery Date
              {formData.sostatus === "Approved" && (
                <span style={{ color: "#dc3545" }}> *</span>
              )}
            </Form.Label>

            <Form.Control
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleChange}
              disabled={isNotInStock}
              required={formData.sostatus === "Approved"}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: errors.deliveryDate
                  ? "2px solid #dc3545"
                  : "1px solid #d1d5db",
                background: isNotInStock ? "#e9ecef" : "white",
                fontSize: "1rem",
                transition: "border-color 0.3s ease",
              }}
              aria-label="Planned delivery date"
            />

            {errors.deliveryDate && (
              <Form.Text style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                {errors.deliveryDate}
              </Form.Text>
            )}
          </Form.Group>


          <Form.Group className="mb-4">
            <Form.Label
              style={{
                fontWeight: "500",
                color: "#1f2937",
                fontSize: "1.1rem",
              }}
            >
              Stock Status
            </Form.Label>
            <Form.Select
              name="stockStatus"
              value={formData.stockStatus}
              onChange={handleChange}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                fontSize: "1rem",
                transition: "border-color 0.3s ease",
              }}
              aria-label="Select stock status"
            >
              <option value="In Stock">In Stock</option>
              <option value="Not in Stock">Not in Stock</option>
              <option value="Partial Stock">Partial Stock</option>
            </Form.Select>
          </Form.Group>

          <div className="d-flex justify-content-end gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: "500",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "white",
                border: "none",
                fontWeight: "500",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
              aria-label="Save changes"
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditProductionApproval;
