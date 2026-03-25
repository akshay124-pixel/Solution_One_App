import React, { useState, useEffect } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import furniApi from "../axiosSetup";
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
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (entryToEdit) {
      setFormData({
        sostatus: entryToEdit.sostatus || "",
        remarksByProduction: entryToEdit.remarksByProduction || "",
        deliveryDate: entryToEdit.deliveryDate
          ? new Date(entryToEdit.deliveryDate).toISOString().slice(0, 10)
          : "",
      });
      setErrors({});
    }
  }, [entryToEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const validStatuses = ["Pending for Approval", "Accounts Approved", "Approved"];
    if (!formData.sostatus || !validStatuses.includes(formData.sostatus)) {
      newErrors.sostatus = "Please select a valid approval status";
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
      const response = await furniApi.put(`/api/edit/${entryToEdit._id}`, formData);
      console.log("Updated order:", response.data.data);
      onEntryUpdated(response.data.data);
      onClose();
    } catch (error) {
      console.error("Error updating production approval order:", error);

      let userMessage = "Something went wrong while updating the order.";
      if (!error.response) {
        userMessage = "Please check your internet connection and try again.";
      } else if (error.response.status === 400) {
        userMessage = error.response.data?.message || "Invalid data provided. Please check your inputs.";
      } else if (error.response.status === 401) {
        userMessage = "You are not authorized. Please log in again.";
      } else if (error.response.status === 404) {
        userMessage = "Order not found. It may have been removed.";
      } else if (error.response.status >= 500) {
        userMessage = "Server is currently unavailable. Please try again later.";
      }

      toast.error(userMessage, { position: "top-right", autoClose: 5000 });
    }
  };

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
            <Form.Label style={{ fontWeight: "500", color: "#1f2937", fontSize: "1.1rem" }}>
              Approval Status <span style={{ color: "#dc3545" }}>*</span>
            </Form.Label>
            <Form.Select
              name="sostatus"
              value={formData.sostatus}
              onChange={handleChange}
              required
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: errors.sostatus ? "2px solid #dc3545" : "1px solid #d1d5db",
                background: "white",
                fontSize: "1rem",
                transition: "border-color 0.3s ease",
              }}
              aria-label="Select approval status"
            >
              <option value="">Select Status</option>
              <option value="Pending for Approval">Pending for Approval</option>
              <option value="Approved">Approved</option>
            </Form.Select>
            {errors.sostatus && (
              <Form.Text style={{ color: "#dc3545", fontSize: "0.875rem" }}>
                {errors.sostatus}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label style={{ fontWeight: "500", color: "#1f2937", fontSize: "1.1rem" }}>
              Planned Delivery Date
            </Form.Label>
            <Form.Control
              type="date"
              name="deliveryDate"
              value={formData.deliveryDate}
              onChange={handleChange}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "white",
                fontSize: "1rem",
                transition: "border-color 0.3s ease",
              }}
              aria-label="Planned delivery date"
            />
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
