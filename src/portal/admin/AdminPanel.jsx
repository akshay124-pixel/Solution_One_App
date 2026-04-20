/**
 * AdminPanel — Full User Management Dashboard
 * Route: /admin  (globaladmin / superadmin only)
 *
 * Tabs: Overview · Users · Create User · Identity Manager
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { portalApi, usePortalAuth } from "../PortalAuthContext";
import { toast } from "react-toastify";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT = "'Inter','Segoe UI',system-ui,sans-serif";
const GRAD = "linear-gradient(135deg,#2575fc 0%,#6a11cb 100%)";
const MOD  = {
  crm:   { color:"#3b82f6", bg:"#eff6ff", label:"CRM" },
  so:    { color:"#22c55e", bg:"#f0fdf4", label:"SO" },
  dms:   { color:"#a855f7", bg:"#fdf4ff", label:"DMS" },
  furni: { color:"#f97316", bg:"#fff7ed", label:"Furni" },
};

const ROLE_OPTIONS = [
  { value:"globaladmin",       label:"Global Admin",         group:"Global" },
  { value:"superadmin",        label:"Superadmin",           group:"Global" },
  { value:"admin",             label:"Admin",                group:"Global" },
  { value:"salesperson",       label:"Salesperson",          group:"Global" },
  { value:"Production",        label:"Production",           group:"Operational" },
  { value:"ProductionApproval",label:"Production Approval",  group:"Operational" },
  { value:"Installation",      label:"Installation",         group:"Operational" },
  { value:"Finish",            label:"Finish",               group:"Operational" },
  { value:"Accounts",          label:"Accounts",             group:"Operational" },
  { value:"Verification",      label:"Verification",         group:"Operational" },
  { value:"Bill",              label:"Bill",                 group:"Operational" },
  { value:"Watch",             label:"Watch",                group:"Operational" },
];

const MODULE_COMBOS = [
  "crm","so","dms","furni",
  "crm+so","crm+dms","so+dms","crm+furni","so+furni","dms+furni",
  "crm+so+dms","crm+so+furni","so+dms+furni","crm+dms+furni","crm+so+dms+furni",
];

// ── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes ap-spin { to { transform:rotate(360deg) } }
  @keyframes ap-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .ap-card { background:#fff; border-radius:14px; border:1px solid #e8edf5;
    box-shadow:0 1px 4px rgba(0,0,0,.05); animation:ap-fade .2s ease; }
  .ap-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
  .ap-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px;
    border-radius:9px; border:none; cursor:pointer; font-size:13px; font-weight:600;
    font-family:${FONT}; transition:all .15s; white-space:nowrap; }
  .ap-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ap-btn-primary { background:${GRAD}; color:#fff; box-shadow:0 2px 8px rgba(37,117,252,.3); }
  .ap-btn-primary:hover:not(:disabled) { box-shadow:0 4px 16px rgba(37,117,252,.4); transform:translateY(-1px); }
  .ap-btn-danger  { background:#ef4444; color:#fff; }
  .ap-btn-danger:hover:not(:disabled)  { background:#dc2626; }
  .ap-btn-ghost   { background:#f8fafc; border:1px solid #e2e8f0 !important; color:#64748b; }
  .ap-btn-ghost:hover:not(:disabled)   { background:#f1f5f9; }
  .ap-btn-green   { background:#22c55e; color:#fff; }
  .ap-btn-green:hover:not(:disabled)   { background:#16a34a; }
  .ap-input { width:100%; padding:10px 14px; border-radius:9px; border:1.5px solid #e2e8f0;
    font-size:13px; font-family:${FONT}; outline:none; box-sizing:border-box; transition:border-color .15s; }
  .ap-input:focus { border-color:#2575fc; box-shadow:0 0 0 3px rgba(37,117,252,.1); }
  .ap-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; background-color:#fff; }
  .ap-tab { padding:10px 18px; border:none; background:none; cursor:pointer; font-size:13px;
    font-family:${FONT}; font-weight:500; color:#64748b; border-bottom:2.5px solid transparent;
    margin-bottom:-2px; transition:all .15s; white-space:nowrap; }
  .ap-tab.active { color:#2575fc; font-weight:700; border-bottom-color:#2575fc; }
  .ap-tab:hover:not(.active) { color:#334155; }
  .ap-tr:hover { background:#f8fafc; }
  .ap-badge { display:inline-flex; align-items:center; border-radius:5px; padding:2px 9px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
  .ap-checkbox { width:16px; height:16px; accent-color:#2575fc; cursor:pointer; }
  .ap-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000;
    display:flex; align-items:center; justify-content:center; padding:20px; }
  .ap-modal { background:#fff; border-radius:16px; width:100%; max-width:520px;
    max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); animation:ap-fade .2s ease; }
`;

// ── Shared micro-components ───────────────────────────────────────────────────
const GStyle = () => <style>{CSS}</style>;

const Spinner = ({ size=24 }) => (
  <div style={{ display:"inline-block", width:size, height:size,
    border:`3px solid #e2e8f0`, borderTopColor:"#2575fc",
    borderRadius:"50%", animation:"ap-spin .7s linear infinite" }} />
);

const PageSpinner = () => (
  <div style={{ textAlign:"center", padding:"64px 0" }}><Spinner size={32} /></div>
);

const Empty = ({ icon, title, sub }) => (
  <div style={{ textAlign:"center", padding:"56px 24px", color:"#94a3b8" }}>
    <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
    <div style={{ fontSize:15, fontWeight:600, color:"#475569", marginBottom:4 }}>{title}</div>
    {sub && <div style={{ fontSize:13 }}>{sub}</div>}
  </div>
);

const ModBadge = ({ mod }) => {
  const parts = (mod || "").split("+");
  return (
    <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
      {parts.map(m => {
        const c = MOD[m] || { color:"#94a3b8", bg:"#f1f5f9", label:m };
        return (
          <span key={m} className="ap-badge"
            style={{ background:c.bg, color:c.color, border:`1px solid ${c.color}33` }}>
            {c.label}
          </span>
        );
      })}
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const color = role === "globaladmin" ? "#7c3aed"
    : role === "superadmin" ? "#2575fc"
    : role === "admin" ? "#0891b2"
    : role === "salesperson" ? "#16a34a"
    : "#64748b";
  // Shorten long operational role names for display
  const label = role === "ProductionApproval" ? "Prod.Approval"
    : role === "productionapproval" ? "Prod.Approval"
    : role;
  return (
    <span className="ap-badge"
      style={{ background:`${color}15`, color, border:`1px solid ${color}33`,
        maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis",
        whiteSpace:"nowrap", display:"inline-block" }}>
      {label}
    </span>
  );
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{children}</div>
    {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
  </div>
);

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ onTabChange }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await portalApi.get("/api/admin/stats");
        setStats(res.data);
      } catch { toast.error("Failed to load stats."); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <PageSpinner />;
  if (!stats)  return null;

  const maxCount = Math.max(...(stats.byRole || []).map(r => r.count), 1);

  return (
    <div style={{ animation:"ap-fade .25s ease" }}>
      {/* Hero stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:16 }}>
        <div className="ap-card" style={{ padding:"24px 28px",
          background:"linear-gradient(135deg,#eff6ff,#dbeafe)", border:"1px solid #93c5fd" }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:.6, color:"#1d4ed8", marginBottom:8 }}>Total Users</div>
          <div style={{ fontSize:48, fontWeight:900, color:"#1d4ed8", lineHeight:1 }}>{stats.total}</div>
          <div style={{ fontSize:12, color:"#3b82f6", marginTop:6 }}>Across all modules</div>
        </div>
        <div className="ap-card" style={{ padding:"24px 28px",
          background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", border:"1px solid #86efac" }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:.6, color:"#15803d", marginBottom:8 }}>Unique Roles</div>
          <div style={{ fontSize:48, fontWeight:900, color:"#15803d", lineHeight:1 }}>
            {stats.byRole?.length || 0}
          </div>
          <div style={{ fontSize:12, color:"#22c55e", marginTop:6 }}>Role types in use</div>
        </div>
        <div className="ap-card" style={{ padding:"24px 28px",
          background:"linear-gradient(135deg,#fdf4ff,#f3e8ff)", border:"1px solid #d8b4fe" }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
            letterSpacing:.6, color:"#7e22ce", marginBottom:8 }}>Module Combos</div>
          <div style={{ fontSize:48, fontWeight:900, color:"#7e22ce", lineHeight:1 }}>
            {stats.byModule?.length || 0}
          </div>
          <div style={{ fontSize:12, color:"#a855f7", marginTop:6 }}>Active module combinations</div>
        </div>
      </div>

      {/* Role breakdown — fixed layout so badges never truncate */}
      <div className="ap-card" style={{ padding:"22px 24px", marginBottom:14 }}>
        <SectionTitle sub="Number of users per role">Users by Role</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {(stats.byRole || []).map(({ _id: role, count }) => (
            <div key={role} style={{ display:"grid",
              gridTemplateColumns:"160px 1fr 36px", alignItems:"center", gap:12 }}>
              {/* Badge — fixed width, no truncation */}
              <div style={{ overflow:"hidden" }}>
                <RoleBadge role={role} />
              </div>
              {/* Bar */}
              <div style={{ height:8, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
                <div style={{
                  width:`${Math.round((count / maxCount) * 100)}%`,
                  height:"100%", background:GRAD, borderRadius:4, transition:"width .4s"
                }} />
              </div>
              {/* Count */}
              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a",
                textAlign:"right" }}>{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module breakdown */}
      <div className="ap-card" style={{ padding:"22px 24px" }}>
        <SectionTitle sub="Users per module combination">Users by Module</SectionTitle>
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
          {(stats.byModule || []).map(({ _id: mod, count }) => (
            <div key={mod} style={{ background:"#f8fafc", borderRadius:10,
              padding:"12px 14px", border:"1px solid #e2e8f0",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              gap:8 }}>
              <ModBadge mod={mod} />
              <span style={{ fontSize:18, fontWeight:800, color:"#0f172a",
                flexShrink:0 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
const EditUserModal = ({ user, onClose, onSaved }) => {
  const [form, setForm] = useState({
    username:   user.username || "",
    role:       user.role || "salesperson",
    app_module: user.app_module || "crm+so+furni",
    dms:        !!user.dms,
  });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await portalApi.put(`/api/admin/users/${user._id}`, form);
      toast.success("User updated!");
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
          background:GRAD, borderRadius:"16px 16px 0 0" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Edit User</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginTop:2 }}>{user.email}</div>
        </div>
        <form onSubmit={save} style={{ padding:"24px" }}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Username</div>
            <input className="ap-input" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Role</div>
            <select className="ap-input ap-select" value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>App Module</div>
            <select className="ap-input ap-select" value={form.app_module}
              onChange={e => setForm(f => ({ ...f, app_module: e.target.value }))}>
              {MODULE_COMBOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
            <input type="checkbox" className="ap-checkbox" id="dms-flag"
              checked={form.dms} onChange={e => setForm(f => ({ ...f, dms: e.target.checked }))} />
            <label htmlFor="dms-flag" style={{ fontSize:13, color:"#374151", cursor:"pointer" }}>
              DMS flag — SO+DMS access instead of CRM+SO
            </label>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" className="ap-btn ap-btn-primary" disabled={busy}>
              {busy ? <Spinner size={16} /> : "Save Changes"}
            </button>
            <button type="button" className="ap-btn ap-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
const DeleteConfirmModal = ({ user, onConfirm, onClose, busy }) => (
  <div className="ap-modal-overlay" onClick={onClose}>
    <div className="ap-modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={{ padding:"20px 24px", borderBottom:"1px solid #fee2e2",
        background:"linear-gradient(135deg,#fef2f2,#fee2e2)",
        borderRadius:"16px 16px 0 0", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:"#ef4444",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18, flexShrink:0 }}>🗑</div>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"#991b1b" }}>Delete User</div>
          <div style={{ fontSize:12, color:"#dc2626", marginTop:1 }}>This action cannot be undone</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:"22px 24px" }}>
        <p style={{ fontSize:14, color:"#374151", margin:"0 0 12px", lineHeight:1.6 }}>
          You are about to permanently delete:
        </p>
        <div style={{ background:"#f8fafc", borderRadius:10, padding:"12px 16px",
          border:"1px solid #e2e8f0", marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>{user.username}</div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{user.email}</div>
          <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
            <RoleBadge role={user.role} />
            <ModBadge mod={user.app_module} />
          </div>
        </div>

        {/* Warning */}
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:9,
          padding:"10px 14px", marginBottom:20, display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:12, color:"#92400e", lineHeight:1.6 }}>
            This will delete the user from <strong>all databases</strong> —
            Auth, CRM, SO, DMS, and Furni. Their orders and entries will remain
            but will show as "Unknown User".
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button className="ap-btn ap-btn-danger" disabled={busy}
            style={{ flex:1, justifyContent:"center" }}
            onClick={onConfirm}>
            {busy ? <><Spinner size={16} /> Deleting...</> : "Yes, Delete Permanently"}
          </button>
          <button className="ap-btn ap-btn-ghost" disabled={busy}
            style={{ flex:1, justifyContent:"center" }}
            onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
);
const ResetPasswordModal = ({ user, onClose }) => {
  const [pw, setPw]     = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) { toast.warning("Min 6 characters."); return; }
    setBusy(true);
    try {
      await portalApi.post(`/api/admin/users/${user._id}/reset-password`, { newPassword: pw });
      toast.success(`Password reset for ${user.email}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
          background:"linear-gradient(135deg,#ef4444,#dc2626)", borderRadius:"16px 16px 0 0" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Reset Password</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.8)", marginTop:2 }}>{user.email}</div>
        </div>
        <form onSubmit={submit} style={{ padding:"24px" }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>New Password</div>
            <div style={{ position:"relative" }}>
              <input className="ap-input" type={show ? "text" : "password"}
                placeholder="Min 6 characters"
                value={pw} onChange={e => setPw(e.target.value)} required />
              <button type="button" onClick={() => setShow(s => !s)}
                style={{ position:"absolute", right:12, top:"50%",
                  transform:"translateY(-50%)", background:"none", border:"none",
                  cursor:"pointer", color:"#64748b", fontSize:12,
                  fontFamily:FONT, fontWeight:600, padding:"0 4px" }}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div style={{ fontSize:12, color:"#f59e0b", background:"#fffbeb",
            border:"1px solid #fde68a", borderRadius:8, padding:"10px 12px", marginBottom:16 }}>
            ⚠ This will invalidate all active sessions for this user.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" className="ap-btn ap-btn-danger" disabled={busy}>
              {busy ? <Spinner size={16} /> : "Reset Password"}
            </button>
            <button type="button" className="ap-btn ap-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Users Tab ─────────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [modFilter, setModFilter]   = useState("");
  const [editUser, setEditUser]     = useState(null);
  const [resetUser, setResetUser]   = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);  // user to confirm delete
  const [deleting, setDeleting]     = useState(false);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (search)     params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (modFilter)  params.set("module", modFilter);
      const res = await portalApi.get(`/api/admin/users?${params}`);
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch { toast.error("Failed to load users."); }
    finally { setLoading(false); }
  }, [search, roleFilter, modFilter]);

  useEffect(() => { load(1); }, [load]);

  const confirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await portalApi.delete(`/api/admin/users/${deleteUser._id}`);
      toast.success(`${deleteUser.email} deleted from all databases.`);
      setDeleteUser(null);
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally { setDeleting(false); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ animation:"ap-fade .25s ease" }}>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            color:"#94a3b8" }}>🔍</span>
          <input className="ap-input" style={{ paddingLeft:34 }}
            placeholder="Search email or username..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="ap-input ap-select" style={{ width:"auto", minWidth:150 }}
          value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="ap-input ap-select" style={{ width:"auto", minWidth:160 }}
          value={modFilter} onChange={e => setModFilter(e.target.value)}>
          <option value="">All Modules</option>
          {MODULE_COMBOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize:12, color:"#94a3b8", alignSelf:"center", whiteSpace:"nowrap" }}>
          {total} users
        </span>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ overflow:"hidden", padding:0 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e8edf5" }}>
                {["User","Role","Modules","DMS","Created","Actions"].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11,
                    fontWeight:700, textTransform:"uppercase", letterSpacing:.5,
                    color:"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding:"48px", textAlign:"center" }}>
                  <Spinner size={28} />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6}>
                  <Empty icon="👥" title="No users found" sub="Try a different search or filter." />
                </td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="ap-tr" style={{ borderBottom:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{u.username}</div>
                    <div style={{ fontSize:11, color:"#94a3b8" }}>{u.email}</div>
                  </td>
                  <td style={{ padding:"12px 16px" }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding:"12px 16px" }}><ModBadge mod={u.app_module} /></td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:12, color: u.dms ? "#7e22ce" : "#94a3b8",
                      fontWeight:600 }}>{u.dms ? "DMS" : "—"}</span>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:"#64748b", whiteSpace:"nowrap" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button className="ap-btn ap-btn-ghost"
                        style={{ padding:"5px 12px", fontSize:12 }}
                        onClick={() => setEditUser(u)}>✏ Edit</button>
                      <button className="ap-btn ap-btn-ghost"
                        style={{ padding:"5px 12px", fontSize:12, color:"#f59e0b",
                          borderColor:"#fde68a" }}
                        onClick={() => setResetUser(u)}>🔑 Reset PW</button>
                      <button className="ap-btn ap-btn-danger"
                        style={{ padding:"5px 12px", fontSize:12 }}
                        disabled={deleting}
                        onClick={() => setDeleteUser(u)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:6, padding:"16px",
            borderTop:"1px solid #f1f5f9" }}>
            <button className="ap-btn ap-btn-ghost" style={{ padding:"6px 14px" }}
              disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</button>
            <span style={{ alignSelf:"center", fontSize:13, color:"#64748b" }}>
              {page} / {pages}
            </span>
            <button className="ap-btn ap-btn-ghost" style={{ padding:"6px 14px" }}
              disabled={page >= pages} onClick={() => load(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {editUser  && <EditUserModal user={editUser}  onClose={() => setEditUser(null)}
        onSaved={() => { setEditUser(null); load(page); }} />}
      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
      {deleteUser && (
        <DeleteConfirmModal
          user={deleteUser}
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => !deleting && setDeleteUser(null)}
        />
      )}
    </div>
  );
};

// ── Create User Tab ───────────────────────────────────────────────────────────
const CreateUserTab = ({ onCreated }) => {
  const [form, setForm] = useState({
    username:"", email:"", password:"", role:"salesperson",
    dms:false, furniOnly:false,
    superadminModules:{ crm:true, so:true, dms:true, furni:true },
    activeSection:"crm",
  });
  const [busy, setBusy]   = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isSuperadmin    = form.role === "superadmin";
  const isGlobalRole    = ["globaladmin","superadmin","admin","salesperson"].includes(form.role);
  const isSORole        = ["Watch","Production","ProductionApproval","Installation",
                           "Finish","Accounts","Verification","Bill"].includes(form.role);
  const isFurniOnlyRole = form.furniOnly && isSORole;

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSAMod = (k, v) => setForm(f => ({
    ...f, superadminModules: { ...f.superadminModules, [k]: v }
  }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        username: form.username, email: form.email, password: form.password,
        role: form.role, dms: form.dms, furniOnly: form.furniOnly,
        superadminModules: form.superadminModules,
      };
      await portalApi.post("/api/admin/users", payload);
      toast.success(`User ${form.email} created!`);
      setForm({ username:"", email:"", password:"", role:"salesperson",
        dms:false, furniOnly:false,
        superadminModules:{ crm:true, so:true, dms:true, furni:true },
        activeSection:"crm" });
      onCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Creation failed.");
    } finally { setBusy(false); }
  };

  // Section tabs (mirrors Signup.jsx)
  const sections = [
    { key:"crm",   label:"CRM / Global",  roles:["globaladmin","superadmin","admin","salesperson"] },
    { key:"so",    label:"Sales Order",   roles:["Watch","Production","ProductionApproval","Installation","Finish","Accounts","Verification","Bill"] },
    { key:"furni", label:"Furni Only",    roles:["Production","ProductionApproval","Installation","Finish","Accounts","Verification","Bill"] },
  ];

  const activeRoles = sections.find(s => s.key === form.activeSection)?.roles || [];

  return (
    <div style={{ animation:"ap-fade .25s ease", maxWidth:600 }}>
      <div className="ap-card" style={{ padding:"24px" }}>
        <SectionTitle sub="Creates user in all relevant module databases">
          Create New User
        </SectionTitle>

        {/* Section selector */}
        <div style={{ display:"flex", gap:6, marginBottom:20, background:"#f8fafc",
          borderRadius:10, padding:4 }}>
          {sections.map(s => (
            <button key={s.key} type="button"
              onClick={() => {
                setField("activeSection", s.key);
                setField("role", s.roles[0]);
                setField("furniOnly", s.key === "furni");
              }}
              style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"none",
                cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:FONT,
                background: form.activeSection === s.key ? "#fff" : "transparent",
                color: form.activeSection === s.key ? "#2575fc" : "#64748b",
                boxShadow: form.activeSection === s.key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                transition:"all .15s" }}>
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Username</div>
              <input className="ap-input" placeholder="Full name"
                value={form.username} onChange={e => setField("username", e.target.value)} required />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Email</div>
              <input className="ap-input" type="email" placeholder="user@example.com"
                value={form.email} onChange={e => setField("email", e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Password</div>
            <div style={{ position:"relative" }}>
              <input className="ap-input" type={showPw ? "text" : "password"}
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

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Role</div>
            <select className="ap-input ap-select" value={form.role}
              onChange={e => setField("role", e.target.value)}>
              {activeRoles.map(r => {
                const opt = ROLE_OPTIONS.find(o => o.value === r);
                return <option key={r} value={r}>{opt?.label || r}</option>;
              })}
            </select>
          </div>

          {/* DMS flag — only for admin/salesperson */}
          {(form.role === "admin" || form.role === "salesperson") && (
            <div style={{ marginBottom:14, display:"flex", alignItems:"center", gap:10,
              padding:"12px 14px", background:"#fdf4ff", borderRadius:9,
              border:"1px solid #d8b4fe" }}>
              <input type="checkbox" className="ap-checkbox" id="create-dms"
                checked={form.dms} onChange={e => setField("dms", e.target.checked)} />
              <label htmlFor="create-dms" style={{ fontSize:13, color:"#7e22ce", cursor:"pointer" }}>
                DMS user — SO + DMS + Furni access (no CRM)
              </label>
            </div>
          )}

          {/* Superadmin module selection */}
          {isSuperadmin && (
            <div style={{ marginBottom:14, padding:"14px 16px", background:"#eff6ff",
              borderRadius:9, border:"1px solid #93c5fd" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1d4ed8", marginBottom:10 }}>
                Module Access for Superadmin
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {["crm","so","dms","furni"].map(m => (
                  <label key={m} style={{ display:"flex", alignItems:"center", gap:8,
                    cursor:"pointer", fontSize:13, color:"#374151" }}>
                    <input type="checkbox" className="ap-checkbox"
                      checked={form.superadminModules[m]}
                      onChange={e => setSAMod(m, e.target.checked)} />
                    {MOD[m]?.label || m}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div style={{ marginBottom:20, padding:"12px 14px", background:"#f8fafc",
            borderRadius:9, border:"1px solid #e2e8f0", fontSize:12, color:"#64748b" }}>
            <strong style={{ color:"#374151" }}>Preview: </strong>
            Role <strong>{form.role}</strong>
            {form.dms ? " · DMS mode" : ""}
            {isSuperadmin ? ` · modules: ${Object.entries(form.superadminModules).filter(([,v])=>v).map(([k])=>k).join("+")}` : ""}
            {form.furniOnly ? " · Furni only" : ""}
          </div>

          <button type="submit" className="ap-btn ap-btn-primary" disabled={busy}
            style={{ width:"100%", justifyContent:"center" }}>
            {busy ? <><Spinner size={16} /> Creating...</> : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main AdminPanel ───────────────────────────────────────────────────────────
const TABS = [
  { key:"overview",  label:"Overview",       icon:"📊" },
  { key:"users",     label:"Users",          icon:"👥" },
  { key:"create",    label:"Create User",    icon:"➕" },
  { key:"email-maps", label:"Email Maps",    icon:"📧" },
  { key:"identity",  label:"Identity Links", icon:"🔗" },
];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = usePortalAuth();
  const navigate  = useNavigate();

  // Lazy-load IdentityManager only when needed
  const [IdentityManager, setIM] = useState(null);
  const [EmailMapManager, setEMM] = useState(null);
  useEffect(() => {
    if (activeTab === "identity" && !IdentityManager) {
      import("./IdentityManager").then(m => setIM(() => m.default));
    }
    if (activeTab === "email-maps" && !EmailMapManager) {
      import("./EmailMapManager").then(m => setEMM(() => m.default));
    }
  }, [activeTab, IdentityManager, EmailMapManager]);

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:FONT }}>
      <GStyle />

      {/* Top navbar */}
      <div style={{ background:GRAD, boxShadow:"0 2px 16px rgba(0,0,0,.18)",
        position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px",
          display:"flex", alignItems:"center", gap:14, height:58 }}>
          <button className="ap-btn ap-btn-ghost"
            style={{ color:"#fff", background:"rgba(255,255,255,.15)",
              border:"1px solid rgba(255,255,255,.25)" }}
            onClick={() => navigate("/select-module")}>
            ← Back
          </button>
          <div style={{ width:1, height:24, background:"rgba(255,255,255,.2)" }} />
          <div style={{ flex:1 }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:16,
              letterSpacing:"-.3px" }}>Admin Panel</span>
            <span style={{ color:"rgba(255,255,255,.5)", fontSize:12, marginLeft:8 }}>
              Solution One
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

      {/* Tab bar */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8edf5",
        boxShadow:"0 1px 4px rgba(0,0,0,.04)", position:"sticky", top:58, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px",
          display:"flex", gap:0, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.key} className={`ap-tab${activeTab===t.key?" active":""}`}
              onClick={() => setActiveTab(t.key)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px" }}>
        {activeTab === "overview"  && <OverviewTab onTabChange={k => setActiveTab(k)} />}
        {activeTab === "users"     && <UsersTab />}
        {activeTab === "create"    && <CreateUserTab onCreated={() => setActiveTab("users")} />}
        {activeTab === "email-maps" && (
          EmailMapManager
            ? <EmailMapManager />
            : <PageSpinner />
        )}
        {activeTab === "identity"  && (
          IdentityManager
            ? <IdentityManager embedded />
            : <PageSpinner />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
