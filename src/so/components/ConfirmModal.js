import React, { useEffect, useRef, useCallback } from "react";

function ConfirmModal({ isOpen, onConfirm, onCancel, message }) {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Memoized keydown handler for performance
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && !e.target.closest("button:disabled")) {
        onConfirm();
      }
    },
    [onCancel, onConfirm]
  );

  // Focus management and keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e) => {
      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleTabKey);
    cancelButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleTabKey);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(71, 85, 105, 0.9))",
          backdropFilter: "blur(8px)",
          zIndex: 1001,
          opacity: 0,
          animation: "fadeIn 0.3s ease-out forwards",
          willChange: "opacity",
          cursor: "pointer",
        }}
        role="presentation"
        aria-label="Close modal by clicking outside"
      ></div>

      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) scale(0.97)",
          background: "linear-gradient(145deg, #ffffff, #f8fafc)",
          padding: "1.75rem",
          borderRadius: "1.25rem",
          boxShadow:
            "0 15px 40px rgba(0, 0, 0, 0.25), 0 5px 15px rgba(0, 0, 0, 0.15), inset 0 0 8px rgba(255, 255, 255, 0.2)",
          zIndex: 1002,
          maxWidth: "460px",
          width: "92%",
          fontFamily: "'Poppins', sans-serif",
          opacity: 0,
          animation: "slideUpScale 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          border: "1px solid rgba(101, 86, 231, 0.2)",
          willChange: "transform, opacity",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            transition: "color 0.2s ease, transform 0.2s ease",
            padding: "0.25rem",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#ef4444";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#64748b";
            e.currentTarget.style.transform = "scale(1)";
          }}
          aria-label="Close modal"
        >
          <svg
            style={{ width: "1.5rem", height: "1.5rem" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Warning Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <svg
            style={{
              width: "2.75rem",
              height: "2.75rem",
              color: "#f59e0b",
              filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))",
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3
          id="modal-title"
          style={{
            fontSize: "1.65rem",
            fontWeight: "600",
            background: "linear-gradient(135deg, #2575fc, #6a11cb)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.75rem",
            textAlign: "center",
            letterSpacing: "0.5px",
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
          }}
        >
          Confirm Action
        </h3>
        <p
          id="modal-description"
          style={{
            fontSize: "1.05rem",
            color: "#475569",
            marginBottom: "1.5rem",
            textAlign: "center",
            lineHeight: "1.6",
            fontWeight: "400",
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1.25rem",
          }}
        >
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            style={{
              padding: "0.75rem 1.75rem",
              background: "linear-gradient(135deg, #e2e8f0, #d1d5db)",
              color: "#475569",
              border: "1px solid rgba(100, 116, 139, 0.3)",
              borderRadius: "0.75rem",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "0.95rem",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #d1d5db, #cbd5e1)";
              e.currentTarget.style.borderColor = "#94a3b8";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #e2e8f0, #d1d5db)";
              e.currentTarget.style.borderColor = "rgba(100, 116, 139, 0.3)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            aria-label="Cancel action"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.75rem 1.75rem",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#ffffff",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "0.75rem",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "0.95rem",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #dc2626, #b91c1c)";
              e.currentTarget.style.borderColor = "#f87171";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.5)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            aria-label="Confirm discard action"
          >
            Discard
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUpScale {
          from {
            opacity: 0;
            transform: translate(-50%, -45%) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @media (max-width: 768px) {
          div[style*="maxWidth: 460px"] {
            width: 94%;
            padding: 1.5rem;
            border-radius: 1rem;
          }

          h3 {
            font-size: 1.4rem;
          }

          p {
            font-size: 0.95rem;
            margin-bottom: 1.25rem;
          }

          button {
            padding: 0.65rem 1.5rem;
            font-size: 0.9rem;
          }

          svg[style*="width: 2.75rem"] {
            width: 2.25rem;
            height: 2.25rem;
          }

          button[style*="top: 1rem"] {
            top: 0.75rem;
            right: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          div[style*="maxWidth: 460px"] {
            width: 95%;
            padding: 1.25rem;
          }

          h3 {
            font-size: 1.2rem;
          }

          p {
            font-size: 0.9rem;
            margin-bottom: 1rem;
          }

          button {
            padding: 0.6rem 1.25rem;
            font-size: 0.85rem;
          }

          svg[style*="width: 2.75rem"] {
            width: 2rem;
            height: 2rem;
          }
        }
      `}</style>
    </>
  );
}

export default ConfirmModal;