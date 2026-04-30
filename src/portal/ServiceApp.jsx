import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

import ServiceDashboard from "../service/components/ServiceDashboard";
import ServiceNavbar from "../service/components/Navbar";

const ServiceApp = () => {
  const { user, logout } = usePortalAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Show switch bar for multi-module users
  const hasMultiple = (user?.app_access?.length || 0) > 1;

  return (
    <>
      {/* Switch Module bar — shown for any user with access to multiple modules */}
      {hasMultiple && (
        <div
          style={{
            background: "linear-gradient(135deg, #11998e, #1fa57d)",
            color: "#fff",
            padding: "4px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "13px",
          }}
        >
          <span style={{ opacity: 0.85 }}>🔧 Service Dashboard</span>
          <button
            onClick={() => navigate("/select-module")}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "5px",
              color: "#fff",
              padding: "2px 12px",
              cursor: "pointer",
              fontSize: "12px",
            }}
            aria-label="Switch module"
          >
            ⇄ Switch Workspace
          </button>
        </div>
      )}
      <ServiceNavbar isAuthenticated={true} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<ServiceDashboard />} />
        <Route path="*" element={<Navigate to="/service" replace />} />
      </Routes>
    </>
  );
};

export default ServiceApp;
