import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "./PortalAuthContext";

const roleBadgeLabel = (role) => {
  if (role === "globaladmin") return "Global Admin";
  if (role === "superadmin") return "Super Admin";
  if (role === "admin" || role === "Admin") return "Admin";
  if (role === "salesperson" || role === "others" || role === "Sales") return "Salesperson";
  return role || "User";
};

// Role-based default routes per module
const getRoleRoute = (moduleKey, role) => {
  if (moduleKey === "furni") {
    if (role === "Production")         return "/furni/production";
    if (role === "Finish")             return "/furni/finish";
    if (role === "Installation")       return "/furni/installation";
    if (role === "Accounts")           return "/furni/accounts";
    if (role === "Verification")       return "/furni/verification";
    if (role === "Bill")               return "/furni/bill";
    if (role === "ProductionApproval") return "/furni/production-approval";
    return "/furni/sales";
  }
  if (moduleKey === "so") {
    if (role === "Production")         return "/so/production";
    if (role === "Finish")             return "/so/finish";
    if (role === "Installation")       return "/so/installation";
    if (role === "Accounts")           return "/so/accounts";
    if (role === "Verification")       return "/so/verification";
    if (role === "Bill")               return "/so/bill";
    if (role === "ProductionApproval") return "/so/production-approval";
    return "/so/sales";
  }
  return null; // use module default
};

const modules = [
  {
    key: "crm",
    route: "/crm/dashboard",
    label: "CRM",
    sub: "Customer Relationship Management",
    icon: (
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="url(#cg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="url(#cg)" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="url(#cg)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6a11cb"/><stop offset="1" stopColor="#2575fc"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "linear-gradient(135deg,#6a11cb,#2575fc)",
    glow: "rgba(106,17,203,0.22)",
    tag: "People & Leads",
  },  {
    key: "dms",
    route: "/dms/dashboard",
    label: "DMS",
    sub: "Dialer & Lead Management",
    icon: (
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="url(#dg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="dg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0ea5e9"/><stop offset="1" stopColor="#6366f1"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "linear-gradient(135deg,#0ea5e9,#6366f1)",
    glow: "rgba(14,165,233,0.22)",
    tag: "Calls & Dialer",
  },
  {
    key: "so",
    route: "/so/sales",
    label: "Sales IT",
    sub: "Order Management & Fulfillment",
    icon: (
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="3" y1="6" x2="21" y2="6" stroke="url(#sg)" strokeWidth="2"/>
        <path d="M16 10a4 4 0 0 1-8 0" stroke="url(#sg)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f093fb"/><stop offset="1" stopColor="#f5576c"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "linear-gradient(135deg,#f093fb,#f5576c)",
    glow: "rgba(245,87,108,0.22)",
    tag: "IT Orders",
  },
  {
    key: "furni",
    route: "/furni/sales",
    label: "Sales Furni",
    sub: "Furniture Sales Order Management",
    icon: (
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
        <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 18v2M18 18v2" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="fg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b"/><stop offset="1" stopColor="#d97706"/>
          </linearGradient>
        </defs>
      </svg>
    ),
    accent: "linear-gradient(135deg,#f59e0b,#d97706)",
    glow: "rgba(245,158,11,0.22)",
    tag: "Furniture Orders",
  },
];

const ModuleSelector = () => {
  const navigate = useNavigate();
  const { user, logout } = usePortalAuth();
  const [hovered, setHovered] = useState(null);

  // Only show cards the user actually has access to
  const accessibleModules = modules.filter((m) => user?.app_access?.includes(m.key));

  const handleNavigate = (mod) => {
    const roleRoute = getRoleRoute(mod.key, user?.role);
    navigate(roleRoute || mod.route);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f7fa",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Top bar — matches app navbar color */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", gap: "8px",
        background: "linear-gradient(135deg,#2575fc,#6a11cb)",
        boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
        position: "sticky", top: 0, zIndex: 100,
        flexWrap: "nowrap", minWidth: 0,
      }}>
        {/* Logo on left */}
        <img
          src="/logo.png"
          alt="Logo"
          style={{ height: "38px", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.95, flexShrink: 0 }}
        />

        {/* Right side group */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>

          {/* Role badge — hide on very small screens */}
          <span style={{
            background: "rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: "20px",
            padding: "3px 10px", fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.5px", textTransform: "uppercase",
            border: "1px solid rgba(255,255,255,0.3)",
            whiteSpace: "nowrap",
            display: "var(--badge-display, inline-block)",
          }}>
            {roleBadgeLabel(user?.role)}
          </span>

          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "12px",
              border: "2px solid rgba(255,255,255,0.5)",
              flexShrink: 0,
            }}>
              {(user?.username || "U")[0].toUpperCase()}
            </div>
            <span style={{
              color: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "90px",
            }}>
              {user?.username}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "5px 12px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "8px", color: "#fff",
              cursor: "pointer", fontSize: "11px", fontWeight: 500,
              transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          [style*="--badge-display"] { display: none !important; }
        }
      `}</style>

      {/* Main */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        overflowY: "auto",
      }}>
        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "52px" }}>
          <h1 style={{
            margin: "0 0 12px",
            fontSize: "clamp(24px,4vw,38px)",
            fontWeight: 800,
            background: "linear-gradient(135deg,#2575fc,#6a11cb)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-1px", lineHeight: 1.1,
          }}>
            Choose Your Workplace
          </h1>
          <p style={{ color: "#888", fontSize: "15px", margin: 0 }}>
            Select the workspace where you want to continue your work
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: "28px", flexWrap: "wrap", justifyContent: "center" }}>
          {accessibleModules.map((mod) => {
            const isHov = hovered === mod.key;
            return (
              <div
                key={mod.key}
                onClick={() => handleNavigate(mod)}
                onMouseEnter={() => setHovered(mod.key)}
                onMouseLeave={() => setHovered(null)}
                onKeyDown={(e) => e.key === "Enter" && handleNavigate(mod)}
                role="button"
                tabIndex={0}
                aria-label={`Open ${mod.label} module`}
                style={{
                  width: "280px",
                  background: isHov ? "#fff" : "#fff",
                  border: isHov
                    ? "1.5px solid #2575fc"
                    : "1.5px solid #e8eaf0",
                  borderRadius: "20px",
                  padding: "36px 28px 32px",
                  cursor: "pointer",
                  textAlign: "center",
                  boxShadow: isHov
                    ? `0 20px 60px ${mod.glow}, 0 4px 24px rgba(0,0,0,0.08)`
                    : "0 2px 12px rgba(0,0,0,0.07)",
                  transform: isHov ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
                  transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Gradient top bar */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: "3px", background: mod.accent,
                  borderRadius: "20px 20px 0 0",
                  opacity: isHov ? 1 : 0.5,
                  transition: "opacity 0.3s",
                }}/>

                {/* Icon circle */}
                <div style={{
                  width: "72px", height: "72px", borderRadius: "18px",
                  background: isHov ? `linear-gradient(135deg,${mod.glow},rgba(255,255,255,0))` : "#f5f7fa",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: isHov ? `0 8px 24px ${mod.glow}` : "none",
                  transition: "all 0.3s",
                  border: `1.5px solid ${isHov ? "rgba(106,17,203,0.15)" : "#eee"}`,
                }}>
                  {mod.icon}
                </div>

                {/* Tag */}
                <div style={{
                  display: "inline-block",
                  background: "#f0f4ff",
                  border: "1px solid #dde4ff",
                  borderRadius: "20px", padding: "3px 12px",
                  fontSize: "10px", fontWeight: 600,
                  color: "#6a11cb",
                  letterSpacing: "0.5px", textTransform: "uppercase",
                  marginBottom: "12px",
                }}>
                  {mod.tag}
                </div>

                <h3 style={{
                  margin: "0 0 8px", fontSize: "22px", fontWeight: 700,
                  color: "#1a1a2e", letterSpacing: "-0.3px",
                }}>
                  {mod.label}
                </h3>
                <p style={{
                  margin: "0 0 24px", color: "#888",
                  fontSize: "13px", lineHeight: 1.5,
                }}>
                  {mod.sub}
                </p>

                {/* CTA */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: isHov ? mod.accent : "#f5f7fa",
                  border: `1.5px solid ${isHov ? "transparent" : "#e0e0e0"}`,
                  borderRadius: "10px", padding: "9px 20px",
                  color: isHov ? "#fff" : "#555", fontSize: "13px", fontWeight: 600,
                  transition: "all 0.3s",
                  boxShadow: isHov ? `0 4px 16px ${mod.glow}` : "none",
                }}>
                  Open {mod.label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isHov ? "#fff" : "#555"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <p style={{
          marginTop: "48px", color: "#bbb",
          fontSize: "12px", textAlign: "center",
        }}>
          You can switch Workspace anytime from the top navigation bar
        </p>
      </div>
    </div>
  );
};

export default ModuleSelector;
