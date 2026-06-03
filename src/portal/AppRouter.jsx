import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

import Login from "./Login";
import Signup from "./Signup";
import ModuleSelector from "./ModuleSelector";
import ProtectedRoute from "./ProtectedRoute";
import CRMApp from "./CRMApp";
import SOApp from "./SOApp";
import DMSApp from "./DMSApp";
import FurniApp from "./FurniApp";
import ServiceApp from "./ServiceApp";
import IdentityManager from "./admin/IdentityManager";
import AdminPanel from "./admin/AdminPanel";
import PasswordExpiredScreen from "./PasswordExpiredScreen";

const Unauthorized = () => (
  <div style={{
    height: "100vh", display: "flex", alignItems: "center",
    justifyContent: "center", flexDirection: "column", gap: "16px",
  }}>
    <h2 style={{ color: "#ef4444" }}>Access Denied</h2>
    <p style={{ color: "#64748b" }}>You don't have permission to view this page.</p>
    <a href="/login" style={{ color: "#2575fc" }}>Back to Login</a>
  </div>
);

const PasswordCheckWrapper = ({ children }) => {
  const { passwordStatus, user } = usePortalAuth();

  // Normalize role to lowercase for consistent check
  const normalizedRole = user?.role?.toLowerCase?.() || user?.role;
  
  // Exempt globaladmin and superadmin from password lifecycle requirements
  if (normalizedRole === 'globaladmin' || normalizedRole === 'superadmin') {
    return children;
  }

  // If password is expired, redirect to password expired screen
  if (passwordStatus?.isExpired || passwordStatus?.passwordForceChangeRequired) {
    return <Navigate to="/password-expired" replace />;
  }

  return children;
};

const AppRouter = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/password-expired" element={<PasswordExpiredScreen />} />

    {/*
      Module Selector — shown to anyone with app_access.length >= 2
    */}
    <Route
      path="/select-module"
      element={
        <ProtectedRoute requireMultiAccess>
          <PasswordCheckWrapper>
            <ModuleSelector />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* CRM module */}
    <Route
      path="/crm/*"
      element={
        <ProtectedRoute appAccess="crm">
          <PasswordCheckWrapper>
            <CRMApp />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* SO module */}
    <Route
      path="/so/*"
      element={
        <ProtectedRoute appAccess="so">
          <PasswordCheckWrapper>
            <SOApp />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* DMS module */}
    <Route
      path="/dms/*"
      element={
        <ProtectedRoute appAccess="dms">
          <PasswordCheckWrapper>
            <DMSApp />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* Furni module */}
    <Route
      path="/furni/*"
      element={
        <ProtectedRoute appAccess="furni">
          <PasswordCheckWrapper>
            <FurniApp />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* Service module */}
    <Route
      path="/service/*"
      element={
        <ProtectedRoute appAccess="service">
          <PasswordCheckWrapper>
            <ServiceApp />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* Admin — Identity Manager (must be BEFORE catch-all) */}
    <Route
      path="/admin/identity"
      element={
        <ProtectedRoute roles={["globaladmin"]}>
          <PasswordCheckWrapper>
            <IdentityManager />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* Admin Panel — full user management */}
    <Route
      path="/admin/*"
      element={
        <ProtectedRoute roles={["globaladmin"]}>
          <PasswordCheckWrapper>
            <AdminPanel />
          </PasswordCheckWrapper>
        </ProtectedRoute>
      }
    />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default AppRouter;
