import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Signup from "./Signup";
import ModuleSelector from "./ModuleSelector";
import ProtectedRoute from "./ProtectedRoute";
import CRMApp from "./CRMApp";
import SOApp from "./SOApp";
import DMSApp from "./DMSApp";
import FurniApp from "./FurniApp";
import IdentityManager from "./admin/IdentityManager";
import AdminPanel from "./admin/AdminPanel";

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

const AppRouter = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/*
      Module Selector — shown to anyone with app_access.length >= 2
    */}
    <Route
      path="/select-module"
      element={
        <ProtectedRoute requireMultiAccess>
          <ModuleSelector />
        </ProtectedRoute>
      }
    />

    {/* CRM module */}
    <Route
      path="/crm/*"
      element={
        <ProtectedRoute appAccess="crm">
          <CRMApp />
        </ProtectedRoute>
      }
    />

    {/* SO module */}
    <Route
      path="/so/*"
      element={
        <ProtectedRoute appAccess="so">
          <SOApp />
        </ProtectedRoute>
      }
    />

    {/* DMS module */}
    <Route
      path="/dms/*"
      element={
        <ProtectedRoute appAccess="dms">
          <DMSApp />
        </ProtectedRoute>
      }
    />

    {/* Furni module */}
    <Route
      path="/furni/*"
      element={
        <ProtectedRoute appAccess="furni">
          <FurniApp />
        </ProtectedRoute>
      }
    />

    {/* Admin — Identity Manager (must be BEFORE catch-all) */}
    <Route
      path="/admin/identity"
      element={
        <ProtectedRoute roles={["globaladmin"]}>
          <IdentityManager />
        </ProtectedRoute>
      }
    />

    {/* Admin Panel — full user management */}
    <Route
      path="/admin/*"
      element={
        <ProtectedRoute roles={["globaladmin"]}>
          <AdminPanel />
        </ProtectedRoute>
      }
    />

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default AppRouter;
