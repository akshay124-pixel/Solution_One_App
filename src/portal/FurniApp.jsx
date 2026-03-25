/**
 * FurniApp — Furni module shell for the unified portal.
 * Mirrors SOApp.jsx pattern exactly.
 * All furni components read furniUserId/furniRole from localStorage
 * (set by PortalAuthContext.syncLocalStorage) and use furniApi (axiosSetup).
 */
import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

import FurniNavbar        from "../furni/components/Navbar";
import FurniSales         from "../furni/components/Sales";
import FurniProduction    from "../furni/components/Production";
import FurniFinish        from "../furni/components/Finish";
import FurniInstallation  from "../furni/components/installation";
import FurniAccounts      from "../furni/components/Accounts";
import FurniVerification  from "../furni/components/Verification";
import FurniBill          from "../furni/components/BillGeneration";
import FurniProductionApproval from "../furni/components/ProductionApproval";
import FurniChangePassword from "../furni/Auth/ChangePassword";

// Role → default Furni route
const roleRedirect = (role) => {
  if (role === "Production")         return "/furni/production";
  if (role === "Finish")             return "/furni/finish";
  if (role === "Installation")       return "/furni/installation";
  if (role === "Accounts")           return "/furni/accounts";
  if (role === "Verification")       return "/furni/verification";
  if (role === "Bill")               return "/furni/bill";
  if (role === "ProductionApproval") return "/furni/production-approval";
  return "/furni/sales";
};

const FurniApp = () => {
  const { user, logout } = usePortalAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isChangePassword = pathname.endsWith("/change-password");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // Map portal role to Furni role string
  const FURNI_ROLE_MAP = {
    globaladmin: "GlobalAdmin",
    superadmin:  "SuperAdmin",
    admin:       "Admin",
    Admin:       "Admin",
    salesperson: "salesperson",
    Sales:       "salesperson",
  };
  const rawRole  = user?.role || localStorage.getItem("furniRole") || "";
  const userRole = FURNI_ROLE_MAP[rawRole] || rawRole;

  const hasMultiple = (user?.app_access?.length || 0) > 1;

  return (
    <>
      {/* Switch Module bar */}
      {hasMultiple && !isChangePassword && (
        <div style={{
          background: "linear-gradient(90deg,#f59e0b,#d97706)",
          color: "#fff", padding: "4px 16px",
          display: "flex", alignItems: "center", gap: "12px",
          fontSize: "13px",
        }}>
          <span style={{ opacity: 0.85 }}>🪑 Furni</span>
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
      {!isChangePassword && (
        <FurniNavbar
          isAuthenticated={true}
          onLogout={handleLogout}
          userRole={userRole}
        />
      )}
      <Routes>
        <Route path="sales"              element={<FurniSales />} />
        <Route path="production"         element={<FurniProduction />} />
        <Route path="finish"             element={<FurniFinish />} />
        <Route path="installation"       element={<FurniInstallation />} />
        <Route path="accounts"           element={<FurniAccounts />} />
        <Route path="verification"       element={<FurniVerification />} />
        <Route path="bill"               element={<FurniBill />} />
        <Route path="production-approval" element={<FurniProductionApproval />} />
        <Route path="change-password"    element={<FurniChangePassword />} />
        <Route path="*"                  element={<Navigate to={roleRedirect(userRole)} replace />} />
      </Routes>
    </>
  );
};

export default FurniApp;
