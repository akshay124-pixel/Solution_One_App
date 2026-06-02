import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

export function PasswordReminderModal() {
  const { passwordStatus } = usePortalAuth();
  const [showModal, setShowModal] = useState(false);
  const [remindLater, setRemindLater] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!passwordStatus || remindLater) {
      return;
    }

    if (passwordStatus.warningLevel >= 1 && passwordStatus.warningLevel <= 3) {
      const lastDismissed = localStorage.getItem("passwordReminderLastDismissed");
      if (lastDismissed) {
        const lastDismissedDate = new Date(lastDismissed);
        const now = new Date();
        const hoursSinceDismissal = (now - lastDismissedDate) / (1000 * 60 * 60);
        if (hoursSinceDismissal < 24) {
          return;
        }
      }

      const timer = setTimeout(() => setShowModal(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [passwordStatus, remindLater]);

  if (!passwordStatus || !showModal) {
    return null;
  }

  const getModalTitle = () => {
    switch (passwordStatus.warningLevel) {
      case 1:
        return "Security Recommendation";
      case 2:
        return "Password Expiring Soon";
      case 3:
        return "Password Expires Tomorrow";
      default:
        return "Password Reminder";
    }
  };

  const getModalMessage = () => {
    switch (passwordStatus.warningLevel) {
      case 1:
        return `Your password will expire in ${passwordStatus.daysUntilExpiry} days.`;
      case 2:
        return `Your password will expire in ${passwordStatus.daysUntilExpiry} days.`;
      case 3:
        return `Your password expires tomorrow!`;
      default:
        return "Please update your password soon.";
    }
  };

  const getChangePasswordRoute = () => {
    const path = location.pathname;
    if (path.startsWith("/crm")) return "/crm/change-password";
    if (path.startsWith("/so")) return "/so/change-password";
    if (path.startsWith("/dms")) return "/dms/change-password";
    if (path.startsWith("/furni")) return "/furni/change-password";
    if (path.startsWith("/service")) return "/service/change-password";
    return "/crm/change-password"; // default to CRM if unknown
  };

  const handleDismiss = () => {
    localStorage.setItem("passwordReminderLastDismissed", new Date().toISOString());
    setShowModal(false);
    setRemindLater(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "480px",
          width: "90%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          animation: "fadeIn 0.3s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🔒
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: "#333" }}>
              {getModalTitle()}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: "16px",
            color: "#555",
            marginBottom: "24px",
            lineHeight: "1.6",
          }}
        >
          {getModalMessage()} For better account security, please update your password.
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          {passwordStatus.warningLevel < 3 && (
            <button
              onClick={handleDismiss}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: "white",
                color: "#666",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "white")}
            >
              Remind Me Later
            </button>
          )}
          <button
            onClick={() => {
              setShowModal(false);
              navigate(getChangePasswordRoute());
            }}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #2575fc, #6a11cb)",
              color: "white",
              fontWeight: "600",
              cursor: "pointer",
              transition: "transform 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {passwordStatus.warningLevel >= 3 ? "Update Password Now" : "Update Password"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
