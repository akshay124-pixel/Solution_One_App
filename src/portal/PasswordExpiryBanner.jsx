import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

export function PasswordExpiryBanner() {
  const { passwordStatus } = usePortalAuth();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!passwordStatus || passwordStatus.warningLevel === 0 || dismissed) {
    return null;
  }

  const getBannerStyle = () => {
    switch (passwordStatus.warningLevel) {
      case 1:
        return {
          background: "linear-gradient(135deg, #ffd700, #ffb800)",
          color: "#333",
        };
      case 2:
        return {
          background: "linear-gradient(135deg, #ff9500, #ff6b00)",
          color: "white",
        };
      case 3:
      case 4:
        return {
          background: "linear-gradient(135deg, #dc2626, #991b1b)",
          color: "white",
        };
      default:
        return { background: "#f0f0f0", color: "#333" };
    }
  };

  const getMessage = () => {
    switch (passwordStatus.warningLevel) {
      case 1:
        return `Your password will expire in ${passwordStatus.daysUntilExpiry} days.`;
      case 2:
        return `Your password will expire in ${passwordStatus.daysUntilExpiry} days.`;
      case 3:
        return `Your password expires tomorrow!`;
      case 4:
        return `Your password has expired!`;
      default:
        return "";
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

  return (
    <div
      style={{
        width: "100%",
        padding: "16px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        ...getBannerStyle(),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            fontSize: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⚠️
        </div>
        <div>
          <div style={{ fontWeight: "600", fontSize: "16px" }}>
            {getMessage()}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.95 }}>
            For better account security, please update your password.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          onClick={() => navigate(getChangePasswordRoute())}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            background: passwordStatus.warningLevel >= 3 ? "white" : "#2563eb",
            color: passwordStatus.warningLevel >= 3 ? "#dc2626" : "white",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {passwordStatus.warningLevel >= 3 ? "Update Immediately" : "Change Password"}
        </button>
        {passwordStatus.warningLevel < 3 && (
          <button
            onClick={() => setDismissed(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "transparent",
              color: "inherit",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background 0.2s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
