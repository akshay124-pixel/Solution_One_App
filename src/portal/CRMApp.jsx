import React from "react";
import { AuthProvider } from "../crm/context/AuthContext";
import { setAccessToken as setCRMAccessToken } from "../crm/utils/api";
import { getPortalAccessToken, usePortalAuth } from "./PortalAuthContext";
import CRMNavbar from "../crm/components/Navbar";
import CRMDashBoard from "../crm/components/DashBoard";
import CRMChangePassword from "../crm/Auth/ChangePassword";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

// Thin bar shown only when user has access to both modules
const SwitchModuleBar = () => {
  const { user } = usePortalAuth();
  const navigate = useNavigate();
  const hasBoth = user?.app_access?.includes("crm") && user?.app_access?.includes("so");
  if (!hasBoth) return null;
  return (
    <div style={{
      background: "linear-gradient(90deg,#6a11cb,#2575fc)",
      color: "#fff", padding: "4px 16px",
      display: "flex", alignItems: "center", gap: "12px",
      fontSize: "13px",
    }}>
      <span style={{ opacity: 0.85 }}>📋 CRM</span>
      <button
        onClick={() => navigate("/select-module")}
        style={{
          marginLeft: "auto", background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.4)", borderRadius: "5px",
          color: "#fff", padding: "2px 12px", cursor: "pointer", fontSize: "12px",
        }}
        aria-label="Switch module"
      >
        ⇄ Switch Workspace
      </button>
    </div>
  );
};

const CRMAppInner = () => {
  const { pathname } = useLocation();
  const isChangePassword = pathname.endsWith("/change-password");

  return (
    <>
      {!isChangePassword && <SwitchModuleBar />}
      {!isChangePassword && <CRMNavbar />}
      <Routes>
        <Route path="dashboard" element={<CRMDashBoard />} />
        <Route path="change-password" element={<CRMChangePassword />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </>
  );
};

const CRMApp = () => {
  // Synchronously pre-seed CRM token BEFORE AuthProvider mounts.
  const portalToken = getPortalAccessToken();
  if (portalToken) {
    setCRMAccessToken(portalToken);
  }

  return (
    <AuthProvider>
      <CRMAppInner />
    </AuthProvider>
  );
};

export default CRMApp;
