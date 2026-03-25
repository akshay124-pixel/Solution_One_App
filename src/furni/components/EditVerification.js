import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import furniApi from "../axiosSetup";
import { toast } from "react-toastify";

const EditVerification = ({ isOpen, onClose, onEntryUpdated, entryToEdit }) => {
  const [formData, setFormData] = useState({
    verificationRemarks: entryToEdit?.verificationRemarks || "",
    sostatus: entryToEdit?.sostatus || "Pending for Approval",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.verificationRemarks || formData.verificationRemarks.trim() === "") {
      newErrors.verificationRemarks = "Verification Remarks are required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await furniApi.put(`/api/edit/${entryToEdit._id}`, formData);
      onEntryUpdated(response.data.data);
      onClose();
    } catch (error) {
      console.error("Error updating verification order:", error);

      let userMessage = "Something went wrong while updating the order. Please try again.";
      if (error.response?.status === 404) {
        userMessage = "The order you are trying to update was not found.";
      } else if (error.response?.status === 400) {
        userMessage = "Some details you entered are invalid. Please check and try again.";
      } else if (error.response?.status === 401) {
        userMessage = "Your session has expired. Please log in again.";
      } else if (error.response?.status === 500) {
        userMessage = "There is a technical issue on our side. Please try again later.";
      } else if (error.message?.includes("Network Error")) {
        userMessage = "Unable to connect to the server. Please check your internet connection.";
      }

      toast.error(userMessage, { position: "top-right", autoClose: 5000 });
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered backdrop="static">
      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(135deg, #2575fc, #6a11cb)",
          color: "#fff",
          padding: "20px",
          borderBottom: "none",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
        }}
      >
        <Modal.Title
          style={{
            fontWeight: "700",
            fontSize: "1.8rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ marginRight: "10px", fontSize: "1.5rem" }}>✅</span>
          Update Verification Order
        </Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          padding: "30px",
          background: "#fff",
          borderRadius: "0 0 15px 15px",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(10px)",
          animation: "fadeIn 0.5s ease-in-out",
        }}
      >
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "600", color: "#333" }}>
              Approval Status
            </Form.Label>
            <Form.Select
              name="sostatus"
              value={formData.sostatus}
              onChange={handleChange}
              style={{
                borderRadius: "10px",
                padding: "12px",
                border: "1px solid #ced4da",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            >
              <option value="Pending for Approval">Pending for Approval</option>
              <option value="Accounts Approved">Accounts Approved</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: "600", color: "#333" }}>
              Verification Remarks <span style={{ color: "red" }}>*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="verificationRemarks"
              value={formData.verificationRemarks}
              onChange={handleChange}
              placeholder="Enter verification remarks"
              style={{
                borderRadius: "10px",
                padding: "12px",
                border: errors.verificationRemarks ? "1px solid red" : "1px solid #ced4da",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 10px rgba(37, 117, 252, 0.5)")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            {errors.verificationRemarks && (
              <Form.Text style={{ color: "red", fontSize: "0.875rem" }}>
                {errors.verificationRemarks}
              </Form.Text>
            )}
          </Form.Group>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "15px" }}>
            <Button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #6c757d, #5a6268)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "20px",
                color: "#fff",
                fontWeight: "600",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "20px",
                color: "#fff",
                fontWeight: "600",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditVerification;
