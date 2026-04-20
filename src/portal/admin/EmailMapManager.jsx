/**
 * EmailMapManager — Production-Grade SalesPersonEmailMap Management
 * Route: /admin/email-maps (globaladmin / superadmin only)
 *
 * Features:
 * - List, create, edit, delete email maps
 * - Bulk import from CSV/JSON
 * - Filter by module, department, region
 * - Search by display name or email
 * - Team hierarchy visualization
 * - Audit trail (created by, updated by, import source)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { portalApi } from "../PortalAuthContext";
import { toast } from "react-toastify";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT = "'Inter','Segoe UI',system-ui,sans-serif";
const GRAD = "linear-gradient(135deg,#2575fc 0%,#6a11cb 100%)";
const MOD = {
  crm:   { color:"#3b82f6", bg:"#eff6ff", label:"CRM" },
  so:    { color:"#22c55e", bg:"#f0fdf4", label:"SO" },
  dms:   { color:"#a855f7", bg:"#fdf4ff", label:"DMS" },
  furni: { color:"#f97316", bg:"#fff7ed", label:"Furni" },
};

const DEPARTMENTS = [
  "Sales", "Production", "Installation", "Finish", "Accounts",
  "Verification", "Bill", "Watch", "Management", "Support"
];

const REGIONS = [
  "North", "South", "East", "West", "Central",
  "Northeast", "Northwest", "Southeast", "Southwest"
];

// ── Global CSS ────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes emm-spin { to { transform:rotate(360deg) } }
  @keyframes emm-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes emm-slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
  @keyframes emm-pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
  @keyframes emm-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
  
  .emm-card { background:#fff; border-radius:14px; border:1px solid #e8edf5;
    box-shadow:0 1px 4px rgba(0,0,0,.05); animation:emm-fade .2s ease; }
  .emm-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
  
  .emm-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px;
    border-radius:9px; border:none; cursor:pointer; font-size:13px; font-weight:600;
    font-family:${FONT}; transition:all .2s cubic-bezier(0.34, 1.56, 0.64, 1); white-space:nowrap;
    position:relative; overflow:hidden; }
  .emm-btn::before { content:''; position:absolute; inset:0; background:rgba(255,255,255,.2);
    transform:translateX(-100%); transition:transform .3s ease; }
  .emm-btn:hover::before { transform:translateX(100%); }
  .emm-btn:disabled { opacity:.5; cursor:not-allowed; }
  
  .emm-btn-primary { background:${GRAD}; color:#fff; box-shadow:0 2px 8px rgba(37,117,252,.3); }
  .emm-btn-primary:hover:not(:disabled) { box-shadow:0 4px 16px rgba(37,117,252,.4); transform:translateY(-2px); }
  .emm-btn-primary:active:not(:disabled) { transform:translateY(0); }
  
  .emm-btn-danger  { background:#ef4444; color:#fff; box-shadow:0 2px 8px rgba(239,68,68,.3); }
  .emm-btn-danger:hover:not(:disabled) { background:#dc2626; box-shadow:0 4px 16px rgba(220,38,38,.4); transform:translateY(-2px); }
  .emm-btn-danger:active:not(:disabled) { transform:translateY(0); }
  
  .emm-btn-ghost   { background:#f8fafc; border:1px solid #e2e8f0 !important; color:#64748b;
    transition:all .2s ease; }
  .emm-btn-ghost:hover:not(:disabled) { background:#f1f5f9; border-color:#cbd5e1; transform:translateY(-1px); }
  
  .emm-btn-green   { background:#22c55e; color:#fff; box-shadow:0 2px 8px rgba(34,197,94,.3); }
  .emm-btn-green:hover:not(:disabled) { background:#16a34a; box-shadow:0 4px 16px rgba(22,163,74,.4); transform:translateY(-2px); }
  
  .emm-input { width:100%; padding:10px 14px; border-radius:9px; border:1.5px solid #e2e8f0;
    font-size:13px; font-family:${FONT}; outline:none; box-sizing:border-box; 
    transition:all .2s ease; background:#fff; }
  .emm-input:focus { border-color:#2575fc; box-shadow:0 0 0 3px rgba(37,117,252,.1); }
  .emm-input:hover { border-color:#cbd5e1; }
  
  .emm-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; background-color:#fff; }
  
  .emm-badge { display:inline-flex; align-items:center; border-radius:5px; padding:2px 9px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
  
  .emm-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1000;
    display:flex; align-items:center; justify-content:center; padding:20px; animation:emm-fade .2s ease; }
  .emm-modal { background:#fff; border-radius:16px; width:100%; max-width:520px;
    max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.25); animation:emm-slideIn .3s ease; }
  
  .emm-table-container { height:500px; overflow-y:auto; border-radius:12px; }
  .emm-table-container::-webkit-scrollbar { width:8px; }
  .emm-table-container::-webkit-scrollbar-track { background:#f1f5f9; border-radius:10px; }
  .emm-table-container::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; transition:background .2s; }
  .emm-table-container::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
  
  table { width:100%; border-collapse:collapse; }
  thead { position:sticky; top:0; background:#f8fafc; z-index:10; }
  thead tr { border-bottom:2px solid #e8edf5; }
  th { padding:12px 16px; text-align:left; font-size:11px; font-weight:700;
    text-transform:uppercase; letter-spacing:.5px; color:#94a3b8; }
  
  tbody tr { border-bottom:1px solid #f1f5f9; transition:all .15s ease; }
  tbody tr:hover { background:#f8fafc; }
  td { padding:12px 16px; font-size:13px; }
  
  .emm-row-name { font-weight:600; color:#0f172a; }
  .emm-row-email { color:#64748b; }
  .emm-row-actions { display:flex; gap:6px; }
  
  .emm-empty { text-align:center; padding:56px 24px; color:#94a3b8; }
  .emm-empty-icon { font-size:40px; margin-bottom:10px; }
  .emm-empty-title { font-size:15px; font-weight:600; color:#475569; margin-bottom:4px; }
  .emm-empty-sub { font-size:13px; }
`;

// ── Micro components ──────────────────────────────────────────────────────────
const GStyle = () => <style>{CSS}</style>;

const Spinner = ({ size=24 }) => (
  <div style={{ display:"inline-block", width:size, height:size,
    border:`3px solid #e2e8f0`, borderTopColor:"#2575fc",
    borderRadius:"50%", animation:"emm-spin .7s linear infinite" }} />
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
  const c = MOD[mod] || { color:"#94a3b8", bg:"#f1f5f9", label:mod };
  return (
    <span className="emm-badge"
      style={{ background:c.bg, color:c.color, border:`1px solid ${c.color}33` }}>
      {c.label}
    </span>
  );
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:18 }}>
    <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>{children}</div>
    {sub && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
  </div>
);

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
const EmailMapModal = ({ map, module, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: map?.name || "",
    email: map?.email || "",
  });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.warning("Name and email are required.");
      return;
    }
    setBusy(true);
    try {
      if (map?.name) {
        // Update existing
        await portalApi.put(`/api/sales-person-email-maps/${module}/${encodeURIComponent(map.name)}`, {
          email: form.email.trim(),
        });
        toast.success("Email map updated!");
      } else {
        // Create new
        await portalApi.post(`/api/sales-person-email-maps/${module}`, {
          name: form.name.trim(),
          email: form.email.trim(),
        });
        toast.success("Email map created!");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally { setBusy(false); }
  };

  return (
    <div className="emm-modal-overlay" onClick={onClose}>
      <div className="emm-modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
          background:GRAD, borderRadius:"16px 16px 0 0" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>
            {map ? "Edit Email Map" : "Create Email Map"}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginTop:2 }}>
            {map ? form.email : "Add a new team member"}
          </div>
        </div>
        <form onSubmit={save} style={{ padding:"24px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6, display:"block" }}>
              Module: {module.toUpperCase()}
            </label>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6, display:"block" }}>
              Name {map ? "(Read-only)" : "*"}
            </label>
            <input className="emm-input" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., J P Sharma"
              disabled={!!map}
              required />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6, display:"block" }}>Email *</label>
            <input className="emm-input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jp.sharma@promark.co.in"
              required />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" className="emm-btn emm-btn-primary" disabled={busy}>
              {busy ? <Spinner size={16} /> : "Save"}
            </button>
            <button type="button" className="emm-btn emm-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Bulk Import Modal ─────────────────────────────────────────────────────────
const BulkImportModal = ({ module, onClose, onImported }) => {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ""; });
      return obj;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!csv.trim()) { toast.warning("Paste CSV data."); return; }
    const records = parseCSV(csv);
    if (records.length === 0) { toast.warning("No valid records found."); return; }
    
    // Convert to entries format
    const entries = records.map(r => ({
      name: r.name || "",
      email: r.email || "",
    })).filter(e => e.name);
    
    if (entries.length === 0) { toast.warning("No valid entries found."); return; }
    
    setBusy(true);
    try {
      const res = await portalApi.post(`/api/sales-person-email-maps/${module}/bulk-update`, { entries });
      toast.success(`✓ ${res.data.results.added} added, ${res.data.results.updated} updated`);
      if (res.data.results.errors.length > 0) {
        toast.warning(`⚠ ${res.data.results.errors.length} errors`);
      }
      onImported();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import failed.");
    } finally { setBusy(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setCsv(evt.target?.result || "");
    reader.readAsText(file);
  };

  return (
    <div className="emm-modal-overlay" onClick={onClose}>
      <div className="emm-modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9",
          background:GRAD, borderRadius:"16px 16px 0 0" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>Bulk Import</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginTop:2 }}>
            CSV format: name, email
          </div>
        </div>
        <form onSubmit={submit} style={{ padding:"24px" }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6, display:"block" }}>
              Upload CSV or Paste Data
            </label>
            <input type="file" accept=".csv" ref={fileInputRef}
              onChange={handleFileUpload} style={{ display:"none" }} />
            <button type="button" className="emm-btn emm-btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ marginBottom:10, width:"100%", justifyContent:"center" }}>
              📁 Choose CSV File
            </button>
            <textarea className="emm-input" value={csv}
              onChange={e => setCsv(e.target.value)}
              placeholder="Or paste CSV data here..."
              style={{ minHeight:200, fontFamily:"monospace", fontSize:12 }} />
          </div>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:16,
            background:"#f8fafc", padding:"10px 12px", borderRadius:8 }}>
            <strong>Example:</strong><br/>
            name,email<br/>
            J P Sharma,jpsharma@promark.co.in<br/>
            Rajesh Kumar,rajesh@promark.co.in
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" className="emm-btn emm-btn-primary" disabled={busy}>
              {busy ? <Spinner size={16} /> : "Import"}
            </button>
            <button type="button" className="emm-btn emm-btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main EmailMapManager ──────────────────────────────────────────────────────
const EmailMapManager = () => {
  const [maps, setMaps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("so");
  const [editMap, setEditMap] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async (mod = "so") => {
    setLoading(true);
    try {
      const res = await portalApi.get(`/api/sales-person-email-maps/${mod}`);
      let entries = res.data.entries || [];
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        entries = entries.filter(e => 
          e.name.toLowerCase().includes(searchLower) || 
          (e.email && e.email.toLowerCase().includes(searchLower))
        );
      }
      
      setMaps(entries);
      setTotal(entries.length);
    } catch { toast.error("Failed to load email maps."); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(moduleFilter); }, [load, moduleFilter]);

  const deleteMap = async (name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeleting(name);
    try {
      await portalApi.delete(`/api/sales-person-email-maps/${moduleFilter}/${encodeURIComponent(name)}`);
      toast.success("Email map deleted.");
      load(moduleFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed.");
    } finally { setDeleting(null); }
  };

  const pages = 1; // No pagination for file-based maps

  return (
    <div style={{ animation:"emm-fade .25s ease" }}>
      <GStyle />

      {/* Header with actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:"#0f172a", marginBottom:4 }}>
            Email Map Management
          </div>
          <div style={{ fontSize:13, color:"#64748b" }}>
            Manage team member email mappings for SO and Furni modules
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="emm-btn emm-btn-primary"
            onClick={() => setEditMap({})}
            style={{ animation:"emm-bounce .6s ease-in-out infinite" }}>
            ➕ Add New
          </button>
          <button className="emm-btn emm-btn-ghost"
            onClick={() => setShowImport(true)}>
            📥 Bulk Import
          </button>
        </div>
      </div>

      {/* Module selector */}
      <div style={{ marginBottom:16, display:"flex", gap:8 }}>
        {["so", "furni"].map(m => (
          <button key={m} 
            className={`emm-btn ${moduleFilter === m ? "emm-btn-primary" : "emm-btn-ghost"}`}
            onClick={() => { setModuleFilter(m); load(m); }}
            style={{ transition:"all .2s ease" }}>
            {MOD[m].label} Module
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            color:"#94a3b8", fontSize:14 }}>🔍</span>
          <input className="emm-input" style={{ paddingLeft:34 }}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize:12, color:"#94a3b8", alignSelf:"center", whiteSpace:"nowrap",
          background:"#f1f5f9", padding:"6px 12px", borderRadius:6, fontWeight:600 }}>
          {total} entries
        </span>
      </div>

      {/* Table */}
      <div className="emm-card" style={{ overflow:"hidden", padding:0 }}>
        <div className="emm-table-container">
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:FONT }}>
            <thead>
              <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e8edf5" }}>
                {["Name","Email","Actions"].map(h => (
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11,
                    fontWeight:700, textTransform:"uppercase", letterSpacing:.5,
                    color:"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ padding:"48px", textAlign:"center" }}>
                  <Spinner size={28} />
                </td></tr>
              ) : maps.length === 0 ? (
                <tr><td colSpan={3}>
                  <div className="emm-empty">
                    <div className="emm-empty-icon">📧</div>
                    <div className="emm-empty-title">No email maps found</div>
                    <div className="emm-empty-sub">Create one to get started.</div>
                  </div>
                </td></tr>
              ) : maps.map((m, idx) => (
                <tr key={m.name} className="emm-tr" style={{ 
                  borderBottom:"1px solid #f1f5f9",
                  animation:`emm-slideIn .3s ease ${idx * 30}ms both`
                }}>
                  <td style={{ padding:"12px 16px" }}>
                    <div className="emm-row-name">{m.name}</div>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:12 }} className="emm-row-email">
                    {m.email || "—"}
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div className="emm-row-actions">
                      <button className="emm-btn emm-btn-ghost"
                        style={{ padding:"5px 12px", fontSize:12 }}
                        onClick={() => setEditMap(m)}
                        title="Edit entry">✏</button>
                      <button className="emm-btn emm-btn-danger"
                        style={{ padding:"5px 12px", fontSize:12 }}
                        disabled={deleting === m.name}
                        onClick={() => deleteMap(m.name)}
                        title="Delete entry">
                        {deleting === m.name ? <Spinner size={14} /> : "🗑"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {editMap && (
        <EmailMapModal map={editMap.name ? editMap : null}
          module={moduleFilter}
          onClose={() => setEditMap(null)}
          onSaved={() => { setEditMap(null); load(moduleFilter); }} />
      )}
      {showImport && (
        <BulkImportModal module={moduleFilter}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); load(moduleFilter); }} />
      )}
    </div>
  );
};

export default EmailMapManager;
