import React from "react";
import { Navigate } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

/**
 * ProtectedRoute
 *
 * Props (all optional, combine as needed):
 *   requireMultiAccess — true: user must have 2+ entries in app_access (Module Selector)
 *   requireBothAccess  — legacy alias for requireMultiAccess
 *   appAccess          — "crm" | "so" | "dms": user must have this entry in app_access
 *   roles              — string[]: user role must be in this list
 */
const ProtectedRoute = ({ requireMultiAccess, requireBothAccess, appAccess, roles, children }) => {
  const { isAuthenticated, loading, user } = usePortalAuth();

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-wave">
          <div className="loading-bar" />
          <div className="loading-bar" />
          <div className="loading-bar" />
          <div className="loading-bar" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Must have access to 2+ modules (Module Selector)
  if (requireMultiAccess || requireBothAccess) {
    const access = user?.app_access || [];
    if (access.length < 2) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Must have a specific module in app_access
  if (appAccess && !user?.app_access?.includes(appAccess)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Must be one of the listed roles
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
