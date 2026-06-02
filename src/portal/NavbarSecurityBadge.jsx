import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

export function NavbarSecurityBadge() {
  const { passwordStatus } = usePortalAuth();
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  if (!passwordStatus) {
    return null;
  }

  const getBadgeColor = () => {
    switch (passwordStatus.warningLevel) {
      case 0:
        return "#10b981";
      case 1:
        return "#f59e0b";
      case 2:
        return "#f97316";
      case 3:
      case 4:
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = () => {
    switch (passwordStatus.warningLevel) {
      case 0:
        return "Password Healthy";
      case 1:
        return "Password Near Expiry";
      case 2:
        return "Password Expiring Soon";
      case 3:
      case 4:
        return "Password Critical";
      default:
        return "Unknown Status";
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowPopup(!showPopup)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(255,255,255,0.2)",
          border: "none",
          borderRadius: "24px",
          padding: "6px 12px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.3)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.2)";
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: getBadgeColor(),
            boxShadow: `0 0 12px ${getBadgeColor()}`,
          }}
        />
        <div style={{ color: "white", fontSize: "13px", fontWeight: "500" }}>
          {getStatusText()}
        </div>
      </button>

      {showPopup && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "280px",
            marginTop: "8px",
            padding: "16px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>
              Password Status
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: getBadgeColor(),
              }}
            >
              {getStatusText()}
            </div>
          </div>

          {passwordStatus.daysUntilExpiry > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                Days Remaining
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#333" }}>
                {passwordStatus.daysUntilExpiry}
              </div>
            </div>
          )}

          {passwordStatus.passwordLastChangedAt && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                Last Changed
              </div>
              <div style={{ fontSize: "14px", color: "#333" }}>
                {new Date(passwordStatus.passwordLastChangedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                navigate("/change-password");
                setShowPopup(false);
              }}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "600",
                background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                color: "white",
                cursor: "pointer",
                transition: "transform 0.2s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Change Password
            </button>
            <button
              onClick={() => setShowPopup(false)}
              style={{
                padding: "10px",
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
