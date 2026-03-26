import { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../api/api";
import QuotationMailModal from "./QuotationMailModal";

// Common styles matching project
const buttonStyle = {
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  padding: "12px 24px",
  fontSize: "16px",
  fontWeight: "600",
  minWidth: "180px",
};

function MailOptionsModal({ isOpen, onClose, entryId, entryData }) {
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [sendingGreet, setSendingGreet] = useState(false);

  // Handle Greet Mail - Reuse existing function
  const handleGreetMail = async () => {
    setSendingGreet(true);
    try {
      const response = await api.post("/api/send-email", { entryId });
      toast.success(response.data.message || "Greeting email sent successfully!");
      onClose();
    } catch (error) {
      console.error("Error sending greeting email:", error.message);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send greeting email. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setSendingGreet(false);
    }
  };

  // Handle Quotation Mail - Open quotation modal
  const handleQuotationMail = () => {
    setShowQuotationModal(true);
  };

  const handleQuotationModalClose = () => {
    setShowQuotationModal(false);
    onClose();
  };

  return (
    <>
      {/* Main Mail Options Modal */}
      <Modal
        show={isOpen}
        onHide={onClose}
        centered
        backdrop="static"
        keyboard={false}
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
            <span role="img" aria-label="mail-icon" style={{ fontSize: "1.5rem" }}>
              📧
            </span>
            Select Mail Type
          </Modal.Title>
        </Modal.Header>

        <Modal.Body
          style={{
            padding: "2rem",
            background: "#f9fafb",
          }}
        >
          <p
            style={{
              fontSize: "1rem",
              color: "#6b7280",
              marginBottom: "2rem",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            Choose the type of email you want to send:
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            {/* Greet Mail Button */}
            <Button
              onClick={handleGreetMail}
              disabled={sendingGreet}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "white",
                fontSize: "1.1rem",
                fontWeight: 600,
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                if (!sendingGreet) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 16px rgba(16, 185, 129, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
              }}
            >
              {sendingGreet ? (
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
                  <span role="img" aria-label="greet" style={{ fontSize: "1.3rem" }}>
                    👋
                  </span>
                  <span>Greet Mail</span>
                </>
              )}
            </Button>

            {/* Quotation Mail Button */}
            <Button
              onClick={handleQuotationMail}
              disabled={sendingGreet}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                border: "none",
                color: "white",
                fontSize: "1.1rem",
                fontWeight: 600,
                padding: "1rem 1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
              }}
              onMouseEnter={(e) => {
                if (!sendingGreet) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = "0 8px 16px rgba(106, 17, 203, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
              }}
            >
              <span role="img" aria-label="quotation" style={{ fontSize: "1.3rem" }}>
                💼
              </span>
              <span>Quotation Mail</span>
            </Button>
          </div>
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
            disabled={sendingGreet}
            style={{
              ...buttonStyle,
              background: "#6c757d",
              border: "none",
              minWidth: "120px",
              fontWeight: 600,
              padding: "0.625rem 1.5rem",
            }}
            onMouseEnter={(e) => {
              if (!sendingGreet) {
                e.target.style.background = "#5a6268";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#6c757d";
            }}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Quotation Mail Modal */}
      <QuotationMailModal
        isOpen={showQuotationModal}
        onClose={handleQuotationModalClose}
        entryId={entryId}
        entryData={entryData}
      />
    </>
  );
}

export default MailOptionsModal;
