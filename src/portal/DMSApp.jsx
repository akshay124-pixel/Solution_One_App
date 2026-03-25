import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

import DMSNavbar from "../dms/components/Navbar";
import DMSDashBoard from "../dms/components/DashBoard";
import DMSChangePassword from "../dms/Auth/ChangePassword";
import CallAnalyticsDashboard from "../dms/components/Analytics/CallAnalyticsDashboard";
import SmartfloUserMapping from "../dms/components/Smartflo/SmartfloUserMapping";
import ScheduledCallsManager from "../dms/components/Dialer/ScheduledCallsManager";
import CallHistoryPage from "../dms/components/CallHistory/CallHistoryPage";

const DMSApp = () => {
  const { user, logout } = usePortalAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isChangePassword = pathname.endsWith("/change-password");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Users with access to multiple modules get a Switch Module bar
  const hasMultiple = user?.app_access?.length > 1;

  return (
    <>
      {hasMultiple && !isChangePassword && (
        <div style={{
          background: "linear-gradient(90deg,#0ea5e9,#6366f1)",
          color: "#fff", padding: "4px 16px",
          display: "flex", alignItems: "center", gap: "12px",
          fontSize: "13px",
        }}>
          <span style={{ opacity: 0.85 }}>📞 DMS</span>
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
      )}
      {!isChangePassword && <DMSNavbar />}
      <Routes>
        <Route path="dashboard" element={<DMSDashBoard />} />
        <Route path="change-password" element={<DMSChangePassword setIsAuthenticated={() => {}} />} />
        <Route path="analytics/calls" element={<CallAnalyticsDashboard />} />
        <Route path="admin/smartflo-mapping" element={<SmartfloUserMapping />} />
        <Route path="scheduled-calls" element={<ScheduledCallsManager />} />
        <Route path="call-history" element={<CallHistoryPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </>
  );
};

export default DMSApp;
