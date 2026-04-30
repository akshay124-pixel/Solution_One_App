import React, { useState } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import { Trash2, AlertTriangle, X } from "lucide-react";

const DeleteServiceLogModal = ({ isOpen, onClose, onDelete, log }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const handleDelete = async () => {
    if (confirmationText !== "DELETE") {
      return;
    }

    setIsLoading(true);
    try {
      await onDelete(log);
      handleClose();
    } catch (error) {
      console.error("Error deleting service log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  if (!log) return null;

  return (
    <Modal 
      show={isOpen} 
      onHide={handleClose} 
      size="md" 
      centered
      backdrop="static"
    >
      <div
        style={{
          borderRadius: "1px",
          overflow: "hidden",
          border: "none",
          boxShadow: "0 20px 60px rgba(239, 68, 68, 0.2)",
        }}
      >
        <Modal.Header
          style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            color: "white",
            borderBottom: "none",
            padding: "20px 24px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
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
              <Trash2 size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <Modal.Title style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "white" }}>
                Confirm Deletion
              </Modal.Title>
              <p style={{ margin: "4px 0 0 0", color: "rgba(255, 255, 255, 0.9)", fontSize: "0.9rem", fontWeight: "400" }}>
                This action cannot be undone
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
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
                opacity: isLoading ? 0.5 : 1,
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.target.style.background = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.target.style.background = "rgba(255, 255, 255, 0.2)";
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
          {/* Warning Alert */}
          <Alert 
            style={{ 
              marginBottom: "24px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertTriangle size={20} style={{ color: "#dc2626" }} />
              <div>
                <h6 style={{ 
                  fontWeight: "600", 
                  marginBottom: "4px", 
                  color: "#dc2626",
                  fontSize: "0.875rem"
                }}>
                  Warning: Permanent Deletion
                </h6>
                <p style={{ 
                  margin: 0, 
                  color: "#7f1d1d", 
                  fontSize: "0.875rem",
                  lineHeight: "1.4"
                }}>
                  This will permanently delete the service log and all associated data.
                </p>
              </div>
            </div>
          </Alert>

          {/* Service Log Details */}
          <div style={{ 
            marginBottom: "24px",
            padding: "16px",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0"
          }}>
            <h6 style={{ 
              fontWeight: "600", 
              marginBottom: "12px", 
              color: "#374151",
              fontSize: "0.875rem"
            }}>
              Service Log Details:
            </h6>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Order ID:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500", fontSize: "0.875rem" }}>
                  {log.orderId}
                </div>
              </div>
              <div>
                <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Customer:</strong>
                <div style={{ color: "#1f2937", fontWeight: "500", fontSize: "0.875rem" }}>
                  {log.orderDetails?.customername || "-"}
                </div>
              </div>
            </div>
            <div style={{ marginTop: "8px" }}>
              <strong style={{ color: "#6b7280", fontSize: "0.75rem" }}>Issue:</strong>
              <div style={{ 
                color: "#1f2937", 
                fontSize: "0.875rem",
                marginTop: "2px",
                padding: "8px",
                background: "white",
                borderRadius: "4px",
                border: "1px solid #e2e8f0"
              }}>
                {log.issue}
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <Form.Label style={{ 
              fontWeight: "600", 
              color: "#374151",
              fontSize: "0.875rem",
              marginBottom: "8px",
              display: "block"
            }}>
              Type <span style={{ 
                color: "#dc2626", 
                fontWeight: "700",
                background: "#fef2f2",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "0.75rem"
              }}>DELETE</span> to confirm:
            </Form.Label>
            <Form.Control
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type DELETE to confirm"
              disabled={isLoading}
              style={{
                borderRadius: "8px",
                border: confirmationText === "DELETE" 
                  ? "2px solid #10b981" 
                  : confirmationText.length > 0 
                    ? "2px solid #ef4444" 
                    : "1px solid #d1d5db",
                padding: "10px 12px",
                fontSize: "0.875rem",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                background: "white",
              }}
              onFocus={(e) => {
                if (confirmationText !== "DELETE") {
                  e.target.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.1)";
                }
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
              }}
            />
            {confirmationText.length > 0 && confirmationText !== "DELETE" && (
              <div style={{ 
                marginTop: "6px", 
                color: "#ef4444", 
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <AlertTriangle size={12} />
                Please type exactly "DELETE" to confirm
              </div>
            )}
            {confirmationText === "DELETE" && (
              <div style={{ 
                marginTop: "6px", 
                color: "#10b981", 
                fontSize: "0.75rem",
                fontWeight: "500"
              }}>
                ✓ Confirmation text matches
              </div>
            )}
          </div>
        </Modal.Body>
        
        <Modal.Footer style={{ 
          padding: "16px 24px",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px"
        }}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            style={{ 
              borderRadius: "8px", 
              padding: "10px 20px",
              fontWeight: "500",
              fontSize: "0.875rem",
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151"
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isLoading || confirmationText !== "DELETE"}
            style={{
              background: isLoading || confirmationText !== "DELETE" 
                ? "#9ca3af" 
                : "#ef4444",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontWeight: "500",
              fontSize: "0.875rem",
              transition: "background-color 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: isLoading || confirmationText !== "DELETE" ? "not-allowed" : "pointer"
            }}
          >
            {isLoading ? (
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
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Service Log
              </>
            )}
          </Button>
        </Modal.Footer>
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

export default DeleteServiceLogModal;