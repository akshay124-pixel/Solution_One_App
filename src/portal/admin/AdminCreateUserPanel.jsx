/**
 * AdminCreateUserPanel — User creation for Admin role
 * Route: /admin-portal  (admin only)
 *
 * Allows Admin to create salesperson and admin users with module assignment.
 * Module selection is scoped to the logged-in admin's own app_access.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { portalApi, usePortalAuth } from "../PortalAuthContext";
import { toast } from "react-toastify";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT = "'Inter','Segoe UI',system-ui,sans-serif";
const GRAD = "linear-gradient(135deg,#2575fc 0%,#6a11cb 100%)";
const MOD  = {
  crm:     { color:"#3b82f6", bg:"#eff6ff", label:"CRM" },
  so:      { color:"#22c55e", bg:"#f0fdf4", label:"SO" },
  dms:     { color:"#a855f7", bg:"#fdf4ff", label:"DMS" },
  furni:   { color:"#f97316", bg:"#fff7ed", label:"Furni" },
  service: { color:"#06b6d4", bg:"#ecfeff", label:"Service" },
};

const ROLE_OPTIONS = [
  { value:"admin",       label:"Admin" },
  { value:"salesperson", label:"Salesperson" },
];

// ── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes acp-spin { to { transform:rotate(360deg) } }
  @keyframes acp-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .acp-card { background:#fff; border-radius:14px; border:1px solid #e8edf5;
    box-shadow:0 1px 4px rgba(0,0,0,.05); animation:acp-fade .2s ease; }
  .acp-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px;
    border-radius:9px; border:none; cursor:pointer; font-size:13px; font-weight:600;
    font-family:${FONT}; transition:all .15s; white-space:nowrap; }
  .acp-btn:disabled { opacity:.5; cursor:not-allowed; }
  .acp-btn-primary { background:${GRAD}; color:#fff; box-shadow:0 2px 8px rgba(37,117,252,.3); }
  .acp-btn-primary:hover:not(:disabled) { box-shadow:0 4px 16px rgba(37,117,252,.4); transform:translateY(-1px); }
  .acp-btn-ghost { background:#f8fafc; border:1px solid #e2e8f0 !important; color:#64748b; }
  .acp-btn-ghost:hover:not(:disabled) { background:#f1f5f9; }
  .acp-input { width:100%; padding:10px 14px; border-radius:9px; border:1.5px solid #e2e8f0;
    font-size:13px; font-family:${FONT}; outline:none; box-sizing:border-box; transition:border-color .15s; }
  .acp-input:focus { border-color:#2575fc; box-shadow:0 0 0 3px rgba(37,117,252,.1); }
  .acp-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; background-color:#fff; }
  .acp-checkbox { width:16px; height:16px; accent-color:#2575fc; cursor:pointer; }
`;

const GStyle = () => <style>{CSS}</style>;

const Spinner = ({ size=24 }) => (
  <div style={{ display:"inline-block", width:size, height:size,
    border:`3px solid #e2e8f0`, borderTopColor:"#2575fc",
    borderRadius:"50%", animation:"acp-spin .7s linear infinite" }} />
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{children}</div>
    {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
  </div>
);

const AdminCreateUserPanel = () => {
  const navigate = useNavigate();
  const { user } = usePortalAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "salesperson",
    adminModules: {},
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Determine which modules the logged-in admin has access to.
  // Only these modules can be assigned to new users.
  const availableModules = user?.app_access || [];

  // Initialize adminModules with all available modules selected by default.
  React.useEffect(() => {
    if (availableModules.length > 0 && Object.keys(form.adminModules).length === 0) {
      const initial = {};
      availableModules.forEach(mod => { initial[mod] = true; });
      setForm(f => ({ ...f, adminModules: initial }));
    }
  }, [availableModules, form.adminModules]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (mod) => setForm(f => ({
    ...f,
    adminModules: { ...f.adminModules, [mod]: !f.adminModules[mod] }
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { username, email, password, role, adminModules } = form;

      if (!username || !email || !password || !role) {
        toast.warn("Please fill in all fields.", { theme: "colored", autoClose: 3000 });
        setBusy(false);
        return;
      }

      // Require at least one module selected.
      const hasAtLeastOne = Object.values(adminModules).some(Boolean);
      if (!hasAtLeastOne) {
        toast.warn("Please select at least one module.", { theme: "colored", autoClose: 3000 });
        setBusy(false);
        return;
      }

      const payload = { username, email, password, role, adminModules };
      await portalApi.post("/api/admin/users", payload);

      toast.success(`User ${email} created successfully!`, { theme: "colored", autoClose: 2000 });
      
      // Reset form
      const initial = {};
      availableModules.forEach(mod => { initial[mod] = true; });
      setForm({
        username: "",
        email: "",
        password: "",
        role: "salesperson",
        adminModules: initial,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "User creation failed.", { theme: "colored", autoClose: 3000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:FONT }}>
      <GStyle />

      {/* Top navbar */}
      <div style={{ background:GRAD, boxShadow:"0 2px 16px rgba(0,0,0,.18)",
        position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:800, margin:"0 auto", padding:"0 24px",
          display:"flex", alignItems:"center", gap:14, height:58 }}>
          <button className="acp-btn acp-btn-ghost"
            style={{ color:"#fff", background:"rgba(255,255,255,.15)",
              border:"1px solid rgba(255,255,255,.25)" }}
            onClick={() => navigate("/select-module")}>
            ← Back
          </button>
          <div style={{ width:1, height:24, background:"rgba(255,255,255,.2)" }} />
          <div style={{ flex:1 }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:16,
              letterSpacing:"-.3px" }}>Create User</span>
            <span style={{ color:"rgba(255,255,255,.5)", fontSize:12, marginLeft:8 }}>
              Admin Portal
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:"50%",
              background:"rgba(255,255,255,.2)", border:"2px solid rgba(255,255,255,.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontWeight:700, fontSize:13 }}>
              {(user?.username || "A")[0].toUpperCase()}
            </div>
            <div style={{ lineHeight:1.3 }}>
              <div style={{ color:"#fff", fontSize:12, fontWeight:600 }}>{user?.username}</div>
              <div style={{ color:"rgba(255,255,255,.6)", fontSize:10,
                textTransform:"uppercase", letterSpacing:.5 }}>{user?.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"28px 24px" }}>
        <div className="acp-card" style={{ padding:"24px", animation:"acp-fade .25s ease" }}>
          <SectionTitle sub="Creates admin or salesperson with module access">
            Create New User
          </SectionTitle>

          <form onSubmit={submit}>
            {/* Username & Email */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Username</div>
                <input className="acp-input" placeholder="Full name"
                  value={form.username} onChange={e => setField("username", e.target.value)} required />
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Email</div>
                <input className="acp-input" type="email" placeholder="user@example.com"
                  value={form.email} onChange={e => setField("email", e.target.value)} required />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Password</div>
              <div style={{ position:"relative" }}>
                <input className="acp-input" type={showPw ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={form.password} onChange={e => setField("password", e.target.value)} required />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", color:"#94a3b8",
                    fontSize:12, fontFamily:FONT }}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Role</div>
              <select className="acp-input acp-select" value={form.role}
                onChange={e => setField("role", e.target.value)}>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Module selector */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:10 }}>
                Module Access
              </div>
              {availableModules.length === 0 ? (
                <div style={{ padding:"12px 14px", background:"#fef2f2",
                  border:"1px solid #fecaca", borderRadius:9, color:"#991b1b",
                  fontSize:13, textAlign:"center" }}>
                  No modules available. Please contact your administrator.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {availableModules.map(mod => {
                    const config = MOD[mod] || { color:"#64748b", bg:"#f1f5f9", label:mod };
                    return (
                      <label key={mod} style={{
                        display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                        background: form.adminModules[mod] ? config.bg : "#f8fafc",
                        border: `1px solid ${form.adminModules[mod] ? config.color+"33" : "#e2e8f0"}`,
                        borderRadius:9, cursor:"pointer", transition:"all .15s", userSelect:"none"
                      }}>
                        <input type="checkbox" className="acp-checkbox"
                          checked={!!form.adminModules[mod]}
                          onChange={() => toggleModule(mod)} />
                        <span style={{ fontSize:13, fontWeight:600, color:config.color }}>
                          {config.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div style={{ fontSize:11, color:"#64748b", marginTop:8, lineHeight:1.4 }}>
                💡 You can only assign modules you have access to.
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom:20, padding:"12px 14px", background:"#f8fafc",
              borderRadius:9, border:"1px solid #e2e8f0", fontSize:12, color:"#64748b" }}>
              <strong style={{ color:"#374151" }}>Preview: </strong>
              Role <strong>{form.role}</strong>
              {" · "}
              Modules: <strong>
                {Object.entries(form.adminModules)
                  .filter(([,v]) => v)
                  .map(([k]) => MOD[k]?.label || k)
                  .join(", ") || "None"}
              </strong>
            </div>

            {/* Buttons */}
            <div style={{ display:"flex", gap:10 }}>
              <button type="submit" className="acp-btn acp-btn-primary" disabled={busy}
                style={{ flex:1, justifyContent:"center" }}>
                {busy ? <><Spinner size={16} /> Creating...</> : "Create User"}
              </button>
              <button type="button" className="acp-btn acp-btn-ghost"
                style={{ justifyContent:"center" }}
                onClick={() => navigate("/select-module")}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info card */}
        <div className="acp-card" style={{ padding:"16px 20px", marginTop:14 }}>
          <div style={{ fontSize:13, color:"#64748b", lineHeight:1.6 }}>
            <strong style={{ color:"#0f172a" }}>Admin User Creation</strong><br />
            As an admin, you can create new <strong>admin</strong> and <strong>salesperson</strong> users.
            Module assignment is limited to modules you have access to.
            Newly created users will only see and access their assigned modules.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateUserPanel;
