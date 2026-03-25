import React from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

import SONavbar from "../so/components/Navbar";
import SOSales from "../so/components/Sales";
import SOProduction from "../so/components/Production";
import SOFinish from "../so/components/Finish";
import SOInstallation from "../so/components/installation";
import SOAccounts from "../so/components/Accounts";
import SOVerification from "../so/components/Verification";
import SOBill from "../so/components/BillGeneration";
import SOProductionApproval from "../so/components/ProductionApproval";
import SOChangePassword from "../so/Auth/ChangePassword";

// Role → default SO route
const roleRedirect = (role) => {
  if (role === "Production") return "/so/production";
  if (role === "Finish") return "/so/finish";
  if (role === "Installation") return "/so/installation";
  if (role === "Accounts") return "/so/accounts";
  if (role === "Verification") return "/so/verification";
  if (role === "Bill") return "/so/bill";
  if (role === "ProductionApproval") return "/so/production-approval";
  return "/so/sales";
};

const SOApp = () => {
  const { user, logout } = usePortalAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isChangePassword = pathname.endsWith("/change-password");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // user?.role is the JWT role (CRM strings: "superadmin", "admin", "others")
  // SO components read localStorage "role" which syncLocalStorage already mapped.
  // For props passed directly (SONavbar, roleRedirect), use the mapped SO role.
  const SO_ROLE_MAP = { globaladmin: "GlobalAdmin", superadmin: "SuperAdmin", admin: "Admin", Admin: "Admin", others: "salesperson", Sales: "salesperson" };
  const rawRole = user?.role || localStorage.getItem("role") || "";
  const userRole = SO_ROLE_MAP[rawRole] || rawRole;
  // SO operational roles only work in SO — never show the switch bar even though
  // they technically have so+furni access (furni is a backend concern, not a UI workspace).
  const SO_OPERATIONAL = ["Production","Installation","Finish","Accounts","Verification","Bill","ProductionApproval","Watch"];
  // Show switch bar only for multi-module users who are NOT SO-only operational roles
  const hasMultiple = (user?.app_access?.length || 0) > 1 && !SO_OPERATIONAL.includes(rawRole);

  return (
    <>
      {/* Switch Module bar — shown for any user with access to multiple modules */}
      {hasMultiple && !isChangePassword && (
        <div style={{
          background: "linear-gradient(135deg,#f093fb,#f5576c)",
          color: "#fff", padding: "4px 16px",
          display: "flex", alignItems: "center", gap: "12px",
          fontSize: "13px",
        }}>
          <span style={{ opacity: 0.85 }}>📦 Sales Order</span>
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
        <SONavbar
          isAuthenticated={true}
          onLogout={handleLogout}
          userRole={userRole}
        />
      )}
      <Routes>
        <Route path="sales" element={<SOSales />} />
        <Route path="production" element={<SOProduction />} />
        <Route path="finish" element={<SOFinish />} />
        <Route path="installation" element={<SOInstallation />} />
        <Route path="accounts" element={<SOAccounts />} />
        <Route path="verification" element={<SOVerification />} />
        <Route path="bill" element={<SOBill />} />
        <Route path="production-approval" element={<SOProductionApproval />} />
        <Route path="change-password" element={<SOChangePassword />} />
        <Route path="*" element={<Navigate to={roleRedirect(userRole)} replace />} />
      </Routes>
    </>
  );
};

export default SOApp;
