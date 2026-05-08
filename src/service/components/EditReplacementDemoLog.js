import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import serviceApi from "../axiosSetup";

const EditReplacementDemoLog = ({ isOpen, onClose, log, onUpdate, userRole }) => {
  const [formData, setFormData] = useState({
    approvalStatus: "",
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is GlobalAdmin
  const normalizedRole = userRole?.toLowerCase() || "";
  const isGlobalAdmin = normalizedRole === "globaladmin";

  useEffect(() => {
    if (log) {
      setFormData({
        approvalStatus: log.approvalStatus || "Pending",
      });
    }
  }, [log]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await serviceApi.put(
        `/replacement-demo-logs/${log._id}`,
        formData
      );

      if (response.data.success) {
        toast.success("Log updated successfully!");
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Error updating log:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update log. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("Are you sure you want to approve this order?")) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/approve`);
      if (response.data.success) {
        toast.success("Order approved successfully!");
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      toast.error(error.response?.data?.message || "Failed to approve order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const remarks = prompt("Please enter rejection reason:");
    if (!remarks || remarks.trim() === "") {
      toast.warning("Rejection reason is required");
      return;
    }

    setActionLoading(true);
    try {
      const response = await serviceApi.post(`/replacement-demo-logs/${log._id}/reject`, { remarks });
      if (response.data.success) {
        toast.success("Order rejected successfully!");
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      toast.error(error.response?.data?.message || "Failed to reject order");
    } finally {
      setActionLoading(false);
    }
  };

  if (!log) return null;

  return (
    <Modal show={isOpen} onHide={onClose} centered backdrop="static">
      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .edit-log-modal .modal-content {
            animation: fadeIn 0.3s ease-out;
            border: none;
            border-radius: 16px;
            overflow: hidden;
          }
        `}
      </style>
      <div className="edit-log-modal">
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff",
            padding: "20px 24px",
            borderBottom: "none",
          }}
        >
          <Modal.Title
            style={{
              fontWeight: "700",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "1.3rem" }}>✏️</span>
            Edit {log.orderType} Order Log
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ padding: "30px", background: "#fff" }}>
          <Form onSubmit={handleSubmit}>
            {/* Order Information Display */}
            <div
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "8px",
                marginBottom: "24px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Order ID:
                </strong>{" "}
                <span style={{ color: "#1e293b", fontWeight: "500" }}>
                  {log.orderId || "N/A"}
                </span>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Customer:
                </strong>{" "}
                <span style={{ color: "#1e293b", fontWeight: "500" }}>
                  {log.orderDetails?.customername || "N/A"}
                </span>
              </div>
              <div>
                <strong style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Sales Person:
                </strong>{" "}
                <span style={{ color: "#1e293b", fontWeight: "500" }}>
                  {log.orderDetails?.salesPerson || "N/A"}
                </span>
              </div>
            </div>

            {/* Approval Status Field */}
            <Form.Group className="mb-3">
              <Form.Label
                style={{ fontWeight: "600", color: "#333", fontSize: "1rem" }}
              >
                Approval Status <span style={{ color: "red" }}>*</span>
              </Form.Label>
              <Form.Select
                name="approvalStatus"
                value={formData.approvalStatus}
                onChange={handleChange}
                required
                style={{
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #cbd5e1",
                  fontSize: "1rem",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 0 3px rgba(245, 158, 11, 0.1)")
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              >
                <option value="Pending">Pending</option>
                <option value="Proceed For Approval">Proceed For Approval</option>
                {/* Approved and Rejected options only for GlobalAdmin */}
                {isGlobalAdmin && (
                  <>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </>
                )}
                <option value="Closed">Closed</option>
              </Form.Select>
              <Form.Text style={{ color: "#64748b", fontSize: "0.85rem" }}>
                {formData.approvalStatus === "Proceed For Approval" && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#dbeafe",
                      borderRadius: "6px",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    ℹ️ Changing status to "Proceed For Approval" will send email
                    notifications to the salesperson and Global Admin.
                  </div>
                )}
                {formData.approvalStatus === "Approved" && isGlobalAdmin && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#dcfce7",
                      borderRadius: "6px",
                      border: "1px solid #10b981",
                    }}
                  >
                    ✅ Approving this order will enable the dispatch button in
                    OutFinishGood module.
                  </div>
                )}
                {formData.approvalStatus === "Rejected" && isGlobalAdmin && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "12px",
                      background: "#fee2e2",
                      borderRadius: "6px",
                      border: "1px solid #ef4444",
                    }}
                  >
                    ⚠️ Rejecting this order will update SO Status to "Cancelled"
                    and stop the order lifecycle.
                  </div>
                )}
              </Form.Text>
            </Form.Group>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              {/* Left side: Approve/Reject buttons (GlobalAdmin only) */}
              <div style={{ display: "flex", gap: "12px" }}>
                {isGlobalAdmin && log.approvalStatus === "Proceed For Approval" && (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={loading || actionLoading}
                      style={{
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={loading || actionLoading}
                      style={{
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        border: "none",
                        padding: "10px 20px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      ✕ Reject
                    </Button>
                  </>
                )}
              </div>

              {/* Right side: Cancel/Save buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={loading || actionLoading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    border: "none",
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || actionLoading}
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
};

export default EditReplacementDemoLog;
