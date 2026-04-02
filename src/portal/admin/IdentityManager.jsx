/**
 * IdentityManager — Premium Admin Panel
 * Route: /admin/identity  (globaladmin / superadmin only)
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { portalApi, usePortalAuth } from "../PortalAuthContext";
import { toast } from "react-toastify";

// ── Tokens ────────────────────────────────────────────────────────────────────
const FONT = "'Inter','Segoe UI',system-ui,sans-serif";
const GRAD = "linear-gradient(135deg,#2575fc 0%,#6a11cb 100%)";
const MOD  = {
  crm:   { bg:"#eff6ff", border:"#93c5fd", text:"#1d4ed8", glow:"rgba(59,130,246,.18)", label:"CRM",   icon:"👥" },
  so:    { bg:"#f0fdf4", border:"#86efac", text:"#15803d", glow:"rgba(34,197,94,.18)",  label:"SO",    icon:"📦" },
  dms:   { bg:"#fdf4ff", border:"#d8b4fe", text:"#7e22ce", glow:"rgba(168,85,247,.18)", label:"DMS",   icon:"📞" },
  furni: { bg:"#fff7ed", border:"#fdba74", text:"#c2410c", glow:"rgba(249,115,22,.18)", label:"Furni", icon:"🪑" },
};

// ── Global styles injected once ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes im-spin { to { transform: rotate(360deg) } }
  @keyframes im-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
  @keyframes im-pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  .im-card { background:#fff; border-radius:14px; border:1px solid #e8edf5;
    box-shadow:0 1px 4px rgba(0,0,0,.05); margin-bottom:14px;
    animation: im-fade .2s ease; }
  .im-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.08); }
  .im-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px;
    border-radius:9px; border:none; cursor:pointer; font-size:13px; font-weight:600;
    font-family:${FONT}; transition:all .15s; white-space:nowrap; }
  .im-btn:disabled { opacity:.55; cursor:not-allowed; }
  .im-btn-primary { background:${GRAD}; color:#fff; box-shadow:0 2px 8px rgba(37,117,252,.3); }
  .im-btn-primary:hover:not(:disabled) { box-shadow:0 4px 16px rgba(37,117,252,.4); transform:translateY(-1px); }
  .im-btn-green  { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; box-shadow:0 2px 8px rgba(34,197,94,.3); }
  .im-btn-green:hover:not(:disabled)  { box-shadow:0 4px 16px rgba(34,197,94,.4); transform:translateY(-1px); }
  .im-btn-red    { background:#fff; border:1.5px solid #fca5a5 !important; color:#dc2626; }
  .im-btn-red:hover:not(:disabled)    { background:#fef2f2; }
  .im-btn-ghost  { background:#f8fafc; border:1px solid #e2e8f0 !important; color:#64748b; }
  .im-btn-ghost:hover:not(:disabled)  { background:#f1f5f9; }
  .im-input { width:100%; padding:10px 14px; border-radius:9px; border:1.5px solid #e2e8f0;
    font-size:13px; font-family:${FONT}; outline:none; box-sizing:border-box;
    transition:border-color .15s; background:#fff; }
  .im-input:focus { border-color:#2575fc; box-shadow:0 0 0 3px rgba(37,117,252,.1); }
  .im-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center; padding-right:32px; }
  .im-tab { padding:10px 18px; border:none; background:none; cursor:pointer;
    font-size:13px; font-family:${FONT}; font-weight:500; color:#64748b;
    border-bottom:2.5px solid transparent; margin-bottom:-2px; transition:all .15s;
    display:flex; align-items:center; gap:7px; white-space:nowrap; }
  .im-tab.active { color:#2575fc; font-weight:700; border-bottom-color:#2575fc; }
  .im-tab:hover:not(.active) { color:#334155; background:rgba(0,0,0,.03); border-radius:8px 8px 0 0; }
  .im-badge { display:inline-flex; align-items:center; gap:4px; border-radius:5px;
    padding:2px 9px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
  .im-chip-missing { background:#fef2f2; border:1px solid #fca5a5; color:#dc2626;
    border-radius:5px; padding:2px 9px; font-size:11px; font-weight:700; text-transform:uppercase; }
  .im-mono { font-family:'SF Mono','Fira Code',monospace; font-size:10px; color:#94a3b8;
    word-break:break-all; line-height:1.5; }
  .im-filter-pill { padding:4px 13px; border-radius:20px; border:1.5px solid #e2e8f0;
    background:#fff; color:#64748b; font-size:12px; font-weight:600; cursor:pointer;
    transition:all .15s; font-family:${FONT}; }
  .im-filter-pill.active { background:#2575fc; border-color:#2575fc; color:#fff; }
  .im-filter-pill:hover:not(.active) { border-color:#94a3b8; }
  .im-row-hover:hover { background:#f8fafc; }
  .im-link-btn { background:none; border:none; cursor:pointer; font-size:11px;
    color:#dc2626; font-family:${FONT}; padding:0; text-decoration:underline; }
  .im-link-btn:hover { color:#b91c1c; }
`;

// ── Micro components ──────────────────────────────────────────────────────────
const GStyle = () => <style>{GLOBAL_CSS}</style>;

const Badge = ({ mod }) => {
  const c = MOD[mod] || { bg:"#f1f5f9", border:"#e2e8f0", text:"#475569", icon:"", label: mod };
  return (
    <span className="im-badge" style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text }}>
      {c.icon} {c.label}
    </span>
  );
};

const ConfBar = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? "#22c55e" : pct >= 75 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:7, background:"#f1f5f9", borderRadius:4, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color,
          borderRadius:4, transition:"width .4s ease" }} />
      </div>
      <span style={{ fontSize:12, color, fontWeight:800, minWidth:34 }}>{pct}%</span>
    </div>
  );
};

const Spinner = ({ size=28 }) => (
  <div style={{ textAlign:"center", padding:"64px 0" }}>
    <div style={{ display:"inline-block", width:size, height:size,
      border:`3px solid #e2e8f0`, borderTopColor:"#2575fc",
      borderRadius:"50%", animation:"im-spin .7s linear infinite" }} />
  </div>
);

const Empty = ({ icon="✓", title, sub }) => (
  <div style={{ textAlign:"center", padding:"64px 24px", color:"#94a3b8" }}>
    <div style={{ fontSize:44, marginBottom:12 }}>{icon}</div>
    <div style={{ fontSize:15, fontWeight:600, color:"#475569", marginBottom:4 }}>{title}</div>
    {sub && <div style={{ fontSize:13 }}>{sub}</div>}
  </div>
);

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
        const [pRes, uRes] = await Promise.all([
          portalApi.get("/api/identity/pending"),
          portalApi.get("/api/identity/unlinked"),
        ]);
        const unlinked = uRes.data.data || [];
        const byMod = { crm:0, so:0, dms:0, furni:0 };
        unlinked.forEach(u => u.missing.forEach(m => { byMod[m] = (byMod[m]||0)+1; }));
        setStats({ pending: pRes.data.total||0, unlinked: uRes.data.total||0, byMod });
      } catch { toast.error("Failed to load stats."); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Spinner />;

  const allGood = stats.pending === 0 && stats.unlinked === 0;

  return (
    <div style={{ animation:"im-fade .25s ease" }}>
      {/* Hero stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {/* Pending */}
        <div className="im-card" style={{ padding:"24px 28px",
          background: stats.pending > 0
            ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
            : "linear-gradient(135deg,#f0fdf4,#dcfce7)",
          border: `1px solid ${stats.pending > 0 ? "#fde68a" : "#86efac"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.6, color: stats.pending > 0 ? "#92400e" : "#166534",
                marginBottom:8 }}>Pending Reviews</div>
              <div style={{ fontSize:44, fontWeight:900, lineHeight:1,
                color: stats.pending > 0 ? "#d97706" : "#16a34a" }}>{stats.pending}</div>
              <div style={{ fontSize:12, marginTop:6,
                color: stats.pending > 0 ? "#92400e" : "#166534" }}>
                {stats.pending > 0 ? "Smart matches need your decision" : "All matches reviewed ✓"}
              </div>
            </div>
            <div style={{ fontSize:36, opacity:.6 }}>{stats.pending > 0 ? "⏳" : "✅"}</div>
          </div>
          {stats.pending > 0 && (
            <button className="im-btn im-btn-primary" style={{ marginTop:16, fontSize:12 }}
              onClick={() => onTabChange(1)}>
              Review Now →
            </button>
          )}
        </div>

        {/* Unlinked */}
        <div className="im-card" style={{ padding:"24px 28px",
          background: stats.unlinked > 0
            ? "linear-gradient(135deg,#fef2f2,#fee2e2)"
            : "linear-gradient(135deg,#f0fdf4,#dcfce7)",
          border: `1px solid ${stats.unlinked > 0 ? "#fca5a5" : "#86efac"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.6, color: stats.unlinked > 0 ? "#991b1b" : "#166534",
                marginBottom:8 }}>Unlinked Users</div>
              <div style={{ fontSize:44, fontWeight:900, lineHeight:1,
                color: stats.unlinked > 0 ? "#dc2626" : "#16a34a" }}>{stats.unlinked}</div>
              <div style={{ fontSize:12, marginTop:6,
                color: stats.unlinked > 0 ? "#991b1b" : "#166534" }}>
                {stats.unlinked > 0 ? "Missing module identity links" : "All users fully linked ✓"}
              </div>
            </div>
            <div style={{ fontSize:36, opacity:.6 }}>{stats.unlinked > 0 ? "🔗" : "✅"}</div>
          </div>
          {stats.unlinked > 0 && (
            <button className="im-btn" style={{ marginTop:16, fontSize:12,
              background:"#dc2626", color:"#fff", boxShadow:"0 2px 8px rgba(220,38,38,.3)" }}
              onClick={() => onTabChange(2)}>
              Fix Unlinked →
            </button>
          )}
        </div>
      </div>

      {/* Missing by module */}
      <div className="im-card" style={{ padding:"22px 24px" }}>
        <SectionTitle sub="Number of users missing a link in each module">
          Missing Links by Module
        </SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {Object.entries(stats.byMod).map(([mod, count]) => {
            const c = MOD[mod];
            return (
              <div key={mod} style={{ background:c.bg, border:`1.5px solid ${c.border}`,
                borderRadius:12, padding:"18px 16px", textAlign:"center",
                boxShadow:`0 2px 12px ${c.glow}` }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{c.icon}</div>
                <Badge mod={mod} />
                <div style={{ fontSize:36, fontWeight:900, color:c.text,
                  marginTop:10, lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:4, fontWeight:500 }}>
                  {count === 0 ? "all linked" : "missing"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {allGood && (
        <Empty icon="🎉" title="Everything is perfectly linked!"
          sub="All users have their module identities resolved." />
      )}
    </div>
  );
};

// ── Pending Tab ───────────────────────────────────────────────────────────────
const PendingTab = () => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState({});
  const [filter, setFilter]     = useState("all");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await portalApi.get(`/api/identity/pending?page=${p}&limit=${LIMIT}`);
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || 1);
    } catch { toast.error("Failed to load pending matches."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const review = async (mapId, matchIndex, action, email, module) => {
    const key = `${mapId}-${matchIndex}`;
    setBusy(b => ({ ...b, [key]: true }));
    try {
      await portalApi.post(`/api/identity/review/${mapId}/${matchIndex}`, { action });
      const verb = action === "approve" ? "✓ Approved" : "✗ Rejected";
      toast.success(`${verb}: ${email}${action === "approve" ? ` — ${module?.toUpperCase()} linked!` : ""}`);
      setItems(prev => prev.filter(i =>
        !(i.mapId?.toString() === mapId?.toString() && i.matchIndex === matchIndex)
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed.");
    } finally {
      setBusy(b => ({ ...b, [key]: false }));
    }
  };

  const filtered = filter === "all" ? items : items.filter(i => i.module === filter);
  if (loading) return <Spinner />;
  if (!items.length) return (
    <Empty icon="✅" title="No pending matches" sub="All smart-match candidates have been reviewed." />
  );

  return (
    <div style={{ animation:"im-fade .25s ease" }}>
      {/* Filter bar */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>
          <strong style={{ color:"#0f172a" }}>{total}</strong> match{total !== 1 ? "es" : ""} pending
        </span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap" }}>
          {["all","crm","so","dms","furni"].map(f => (
            <button key={f} className={`im-filter-pill${filter===f?" active":""}`}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : <><span>{MOD[f]?.icon}</span> {f.toUpperCase()}</>}
              {f !== "all" && items.filter(i=>i.module===f).length > 0 &&
                <span style={{ marginLeft:4, background:"rgba(255,255,255,.3)",
                  borderRadius:10, padding:"0 5px", fontSize:10 }}>
                  {items.filter(i=>i.module===f).length}
                </span>
              }
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <Empty icon="🔍" title={`No ${filter.toUpperCase()} matches`} sub="Try a different filter." />
      )}

      {filtered.map((item) => {
        const key = `${item.mapId}-${item.matchIndex}`;
        const isBusy = busy[key];
        const c = MOD[item.module] || {};
        return (
          <div key={key} className="im-card" style={{ padding:"20px 24px",
            borderLeft:`4px solid ${c.border || "#e2e8f0"}` }}>
            {/* Header row */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
              <Badge mod={item.module} />
              <span style={{ fontSize:11, color:"#94a3b8" }}>Smart match candidate</span>
              <div style={{ marginLeft:"auto" }}>
                <ConfBar value={item.confidence} />
              </div>
            </div>

            {/* User comparison */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:12,
              alignItems:"center", marginBottom:16 }}>
              {/* Unified user */}
              <div style={{ background:"#f8fafc", borderRadius:10, padding:"14px 16px",
                border:"1px solid #e2e8f0" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Unified User</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#0f172a",
                  marginBottom:2 }}>{item.email}</div>
                <div className="im-mono">{item.unifiedUserId?.toString()}</div>
              </div>

              {/* Arrow */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:36, height:36, borderRadius:"50%",
                  background: c.bg, border:`2px solid ${c.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16 }}>→</div>
                <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>
                  {item.matchReason?.split(":")[0]?.replace("_"," ")}
                </div>
              </div>

              {/* Candidate */}
              <div style={{ background: c.bg, borderRadius:10, padding:"14px 16px",
                border:`1px solid ${c.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase",
                  letterSpacing:.5, color:c.text, marginBottom:6 }}>
                  {c.label} Candidate
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"#0f172a",
                  marginBottom:2 }}>{item.candidateName}</div>
                <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>
                  {item.candidateEmail}
                </div>
                <div className="im-mono">{item.candidateId?.toString()}</div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:10, paddingTop:14,
              borderTop:"1px solid #f1f5f9" }}>
              <button className="im-btn im-btn-green" disabled={isBusy}
                onClick={() => review(item.mapId, item.matchIndex, "approve", item.email, item.module)}>
                {isBusy ? <><span style={{ animation:"im-spin .7s linear infinite",
                  display:"inline-block" }}>⟳</span> Processing...</> : "✓ Approve — Same Person"}
              </button>
              <button className="im-btn im-btn-red" disabled={isBusy}
                onClick={() => review(item.mapId, item.matchIndex, "reject", item.email, item.module)}>
                {isBusy ? "..." : "✗ Reject — Different Person"}
              </button>
            </div>
          </div>
        );
      })}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:12, marginTop:20, padding:"12px 0", borderTop:"1px solid #f1f5f9" }}>
          <button className="im-btn" disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
            style={{ padding:"6px 14px", fontSize:13 }}>
            ← Previous
          </button>
          <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>
            Page <strong style={{ color:"#0f172a" }}>{page}</strong> of{" "}
            <strong style={{ color:"#0f172a" }}>{totalPages}</strong>
          </span>
          <button className="im-btn" disabled={page >= totalPages || loading}
            onClick={() => load(page + 1)}
            style={{ padding:"6px 14px", fontSize:13 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Unlinked Tab ──────────────────────────────────────────────────────────────
const UnlinkedTab = ({ onManualLink }) => {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modFilter, setModFilter] = useState("all");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async (p = 1, mod = "all") => {
    setLoading(true);
    try {
      const modParam = mod !== "all" ? `&module=${mod}` : "";
      const res = await portalApi.get(`/api/identity/unlinked?page=${p}&limit=${LIMIT}${modParam}`);
      setItems(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || 1);
    } catch { toast.error("Failed to load unlinked users."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, modFilter); }, [load, modFilter]);

  const filtered = items.filter(u => {
    const ms = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const mm = modFilter === "all" || u.missing.includes(modFilter);
    return ms && mm;
  });

  if (loading) return <Spinner />;
  if (!items.length) return (
    <Empty icon="🔗" title="All users are fully linked!" sub="No missing module connections." />
  );

  return (
    <div style={{ animation:"im-fade .25s ease" }}>
      {/* Search + filter */}
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
            color:"#94a3b8", fontSize:14 }}>🔍</span>
          <input className="im-input" style={{ paddingLeft:34 }}
            placeholder="Search by email..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="im-input im-select" style={{ width:"auto", minWidth:160 }}
          value={modFilter} onChange={e => setModFilter(e.target.value)}>
          <option value="all">All modules</option>
          {["crm","so","dms","furni"].map(m => (
            <option key={m} value={m}>Missing {MOD[m].label}</option>
          ))}
        </select>
        <span style={{ fontSize:12, color:"#94a3b8", whiteSpace:"nowrap" }}>
          {filtered.length} / {items.length} users
        </span>
      </div>

      {filtered.length === 0 && (
        <Empty icon="🔍" title="No results" sub="Try a different search or filter." />
      )}

      {/* Table header */}
      {filtered.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 120px",
          gap:12, padding:"8px 20px", marginBottom:4 }}>
          {["User","Linked","Missing","Action"].map(h => (
            <div key={h} style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8" }}>{h}</div>
          ))}
        </div>
      )}

      {filtered.map(item => (
        <div key={item.unifiedUserId?.toString()} className="im-card im-row-hover"
          style={{ padding:"14px 20px", marginBottom:8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 120px",
            gap:12, alignItems:"center" }}>
            {/* User */}
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{item.email}</div>
              <div className="im-mono" style={{ marginTop:2 }}>
                {item.unifiedUserId?.toString()}
              </div>
            </div>
            {/* Linked */}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {item.linked.length
                ? item.linked.map(m => <Badge key={m} mod={m} />)
                : <span style={{ fontSize:12, color:"#94a3b8" }}>—</span>}
            </div>
            {/* Missing */}
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {item.missing.map(m => (
                <span key={m} className="im-chip-missing">{m}</span>
              ))}
            </div>
            {/* Action */}
            <button className="im-btn im-btn-primary" style={{ fontSize:12, padding:"7px 14px" }}
              onClick={() => onManualLink(item.unifiedUserId, item.email, item.missing)}>
              Link →
            </button>
          </div>
        </div>
      ))}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          gap:12, marginTop:20, padding:"12px 0", borderTop:"1px solid #f1f5f9" }}>
          <button className="im-btn" disabled={page <= 1 || loading}
            onClick={() => load(page - 1, modFilter)}
            style={{ padding:"6px 14px", fontSize:13 }}>
            ← Previous
          </button>
          <span style={{ fontSize:13, color:"#64748b", fontWeight:500 }}>
            Page <strong style={{ color:"#0f172a" }}>{page}</strong> of{" "}
            <strong style={{ color:"#0f172a" }}>{totalPages}</strong>
            {" "}·{" "}
            <strong style={{ color:"#0f172a" }}>{total}</strong> total
          </span>
          <button className="im-btn" disabled={page >= totalPages || loading}
            onClick={() => load(page + 1, modFilter)}
            style={{ padding:"6px 14px", fontSize:13 }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Manual Link Tab ───────────────────────────────────────────────────────────
const ManualLinkTab = ({ prefill }) => {
  const [uid, setUid]         = useState(prefill?.unifiedUserId?.toString() || "");
  const [mapData, setMapData] = useState(null);
  const [lookBusy, setLookBusy] = useState(false);
  const [mod, setMod]         = useState(prefill?.missing?.[0] || "so");
  const [modId, setModId]     = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  useEffect(() => {
    if (prefill) {
      setUid(prefill.unifiedUserId?.toString() || "");
      setMod(prefill.missing?.[0] || "so");
      setMapData(null); setModId("");
    }
  }, [prefill]);

  const lookup = async () => {
    if (!uid.trim()) return;
    setLookBusy(true);
    try {
      const res = await portalApi.get(`/api/identity/map/${uid.trim()}`);
      setMapData(res.data.map);
    } catch (err) {
      toast.error(err.response?.data?.message || "User not found.");
      setMapData(null);
    } finally { setLookBusy(false); }
  };

  const doLink = async (e) => {
    e.preventDefault();
    if (!uid || !mod || !modId) { toast.warning("All fields required."); return; }
    setLinkBusy(true);
    try {
      await portalApi.post("/api/identity/link", {
        unifiedUserId: uid.trim(), module: mod, moduleUserId: modId.trim(),
      });
      toast.success(`✓ ${mod.toUpperCase()} linked successfully!`);
      setModId("");
      const res = await portalApi.get(`/api/identity/map/${uid.trim()}`);
      setMapData(res.data.map);
    } catch (err) {
      toast.error(err.response?.data?.message || "Link failed.");
    } finally { setLinkBusy(false); }
  };

  const doUnlink = async (m) => {
    if (!window.confirm(`Remove ${m.toUpperCase()} link? This cannot be undone.`)) return;
    try {
      await portalApi.post("/api/identity/unlink", { unifiedUserId: uid.trim(), module: m });
      toast.success(`${m.toUpperCase()} unlinked.`);
      const res = await portalApi.get(`/api/identity/map/${uid.trim()}`);
      setMapData(res.data.map);
    } catch (err) { toast.error(err.response?.data?.message || "Unlink failed."); }
  };

  return (
    <div style={{ animation:"im-fade .25s ease" }}>
      {/* Lookup */}
      <div className="im-card" style={{ padding:"22px 24px" }}>
        <SectionTitle sub="Enter a Unified User ID to view and manage their module links">
          Look up Identity Map
        </SectionTitle>
        <div style={{ display:"flex", gap:10 }}>
          <input className="im-input" style={{ flex:1 }}
            placeholder="Paste Unified User ObjectId..."
            value={uid} onChange={e => setUid(e.target.value)}
            onKeyDown={e => e.key === "Enter" && lookup()} />
          <button className="im-btn im-btn-primary" onClick={lookup} disabled={lookBusy}>
            {lookBusy ? "Looking up..." : "🔍 Lookup"}
          </button>
        </div>

        {mapData && (
          <div style={{ marginTop:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14,
              padding:"10px 14px", background:"#f8fafc", borderRadius:9, border:"1px solid #e2e8f0" }}>
              <div style={{ fontSize:20 }}>👤</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>{mapData.email}</div>
                <div className="im-mono">{mapData.unifiedUserId?.toString()}</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {["crm","so","dms","furni"].map(m => {
                const id = mapData[`${m}UserId`];
                const meta = mapData.linkMeta?.[m];
                const c = MOD[m];
                return (
                  <div key={m} style={{ background: id ? c.bg : "#fef2f2",
                    border:`1.5px solid ${id ? c.border : "#fca5a5"}`,
                    borderRadius:12, padding:"14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:8 }}>
                      <Badge mod={m} />
                      <span style={{ fontSize:16 }}>{id ? "✅" : "❌"}</span>
                    </div>
                    {id ? (
                      <>
                        <div className="im-mono" style={{ color:c.text, marginBottom:4 }}>
                          {id.toString()}
                        </div>
                        {meta?.method && (
                          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>
                            {meta.method} · {meta.confidence ? `${Math.round(meta.confidence*100)}%` : "manual"}
                          </div>
                        )}
                        <button className="im-link-btn" onClick={() => doUnlink(m)}>
                          ✕ Remove link
                        </button>
                      </>
                    ) : (
                      <div style={{ fontSize:12, color:"#dc2626", fontWeight:600 }}>Not linked</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Link form */}
      <div className="im-card" style={{ padding:"22px 24px" }}>
        <SectionTitle sub="Manually connect a module user account to a unified identity">
          Link Module User
        </SectionTitle>
        <form onSubmit={doLink}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Unified User ID</div>
              <input className="im-input" placeholder="ObjectId of UnifiedUser"
                value={uid} onChange={e => setUid(e.target.value)} required />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
                letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>Module</div>
              <select className="im-input im-select" value={mod}
                onChange={e => setMod(e.target.value)}>
                {["crm","so","dms","furni"].map(m => (
                  <option key={m} value={m}>{MOD[m].icon} {MOD[m].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase",
              letterSpacing:.5, color:"#94a3b8", marginBottom:6 }}>
              {MOD[mod]?.label} User ID
              <span style={{ color:"#cbd5e1", fontWeight:400, marginLeft:6, textTransform:"none" }}>
                — ObjectId from {MOD[mod]?.label} database
              </span>
            </div>
            <input className="im-input"
              placeholder={`Paste ObjectId from ${MOD[mod]?.label} users collection`}
              value={modId} onChange={e => setModId(e.target.value)} required />
          </div>
          <button type="submit" className="im-btn im-btn-primary" disabled={linkBusy}>
            {linkBusy ? "Linking..." : `🔗 Link ${MOD[mod]?.label} User`}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Help Tab ──────────────────────────────────────────────────────────────────
const HelpTab = () => (
  <div style={{ animation:"im-fade .25s ease" }}>
    <div className="im-card" style={{ padding:"22px 24px" }}>
      <SectionTitle sub="Database and collection reference for manual linking">
        Module Database Reference
      </SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[
          { mod:"crm",   db:"CRM_Data",              col:"users", note:"_id = UnifiedUser._id" },
          { mod:"so",    db:"So_Mangement",           col:"users", note:"stored as soUserId" },
          { mod:"dms",   db:"DMS_Data",               col:"users", note:"stored as dmsUserId" },
          { mod:"furni", db:"So_Mangement_Furniture", col:"users", note:"stored as furniUserId" },
        ].map(({ mod, db, col, note }) => {
          const c = MOD[mod];
          return (
            <div key={mod} style={{ background:c.bg, border:`1.5px solid ${c.border}`,
              borderRadius:12, padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <span style={{ fontSize:20 }}>{c.icon}</span>
                <Badge mod={mod} />
              </div>
              <div style={{ fontSize:12, color:"#475569", lineHeight:1.8 }}>
                <div><span style={{ color:"#94a3b8" }}>Database:</span>{" "}
                  <code style={{ color:c.text, fontWeight:600 }}>{db}</code></div>
                <div><span style={{ color:"#94a3b8" }}>Collection:</span>{" "}
                  <code style={{ color:c.text, fontWeight:600 }}>{col}</code></div>
                <div style={{ marginTop:4, fontSize:11, color:"#94a3b8" }}>{note}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="im-card" style={{ padding:"22px 24px" }}>
      <SectionTitle>How Identity Linking Works</SectionTitle>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { icon:"🤖", title:"Auto-linked (email match)", desc:"Same email found in both systems — confidence 100%, applied automatically." },
          { icon:"🔤", title:"Auto-linked (name match)", desc:"Same username found — confidence 85%+, applied automatically." },
          { icon:"⏳", title:"Pending review", desc:"Name similarity 75–84% — stored for admin review. You approve or reject." },
          { icon:"✏️", title:"Manual link", desc:"Admin explicitly links two accounts using their ObjectIds." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ display:"flex", gap:14, padding:"12px 16px",
            background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0" }}>
            <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#0f172a", marginBottom:2 }}>{title}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { label:"Overview",    icon:"📊" },
  { label:"Pending",     icon:"⏳" },
  { label:"Unlinked",    icon:"🔗" },
  { label:"Manual Link", icon:"✏️" },
  { label:"Help",        icon:"ℹ️" },
];

const IdentityManager = ({ embedded = false }) => {
  const [activeTab, setActiveTab]         = useState(0);
  const [manualPrefill, setManualPrefill] = useState(null);
  const { user } = usePortalAuth();
  const navigate = useNavigate();

  const goToManualLink = (unifiedUserId, email, missing) => {
    setManualPrefill({ unifiedUserId, email, missing });
    setActiveTab(3);
  };

  // When embedded inside AdminPanel, render only the tab content (no navbar/wrapper)
  if (embedded) {
    return (
      <div style={{ fontFamily: FONT }}>
        <GStyle />
        {/* Sub-tab bar */}
        <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"2px solid #e8edf5",
          overflowX:"auto" }}>
          {TABS.map((t, i) => (
            <button key={t.label} className={`im-tab${activeTab===i?" active":""}`}
              onClick={() => setActiveTab(i)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {activeTab === 0 && <OverviewTab onTabChange={setActiveTab} />}
        {activeTab === 1 && <PendingTab />}
        {activeTab === 2 && <UnlinkedTab onManualLink={goToManualLink} />}
        {activeTab === 3 && <ManualLinkTab prefill={manualPrefill} />}
        {activeTab === 4 && <HelpTab />}
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:FONT }}>
      <GStyle />

      {/* Top navbar */}
      <div style={{ background:GRAD, boxShadow:"0 2px 16px rgba(0,0,0,.18)",
        position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1040, margin:"0 auto", padding:"0 24px",
          display:"flex", alignItems:"center", gap:14, height:58 }}>
          <button className="im-btn im-btn-ghost" style={{ color:"#fff",
            background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.25)" }}
            onClick={() => navigate("/select-module")}>
            ← Back
          </button>
          <div style={{ width:1, height:24, background:"rgba(255,255,255,.2)" }} />
          <div style={{ flex:1 }}>
            <span style={{ color:"#fff", fontWeight:800, fontSize:16,
              letterSpacing:"-.3px" }}>Identity Manager</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:"50%",
              background:"rgba(255,255,255,.2)", border:"2px solid rgba(255,255,255,.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontWeight:700, fontSize:13 }}>
              {(user?.username || user?.email || "A")[0].toUpperCase()}
            </div>
            <div style={{ lineHeight:1.3 }}>
              <div style={{ color:"#fff", fontSize:12, fontWeight:600 }}>
                {user?.username || user?.email}
              </div>
              <div style={{ color:"rgba(255,255,255,.6)", fontSize:10,
                textTransform:"uppercase", letterSpacing:.5 }}>{user?.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#fff", borderBottom:"2px solid #e8edf5",
        boxShadow:"0 1px 4px rgba(0,0,0,.04)", position:"sticky", top:58, zIndex:100 }}>
        <div style={{ maxWidth:1040, margin:"0 auto", padding:"0 24px",
          display:"flex", gap:0, overflowX:"auto" }}>
          {TABS.map((t, i) => (
            <button key={t.label} className={`im-tab${activeTab===i?" active":""}`}
              onClick={() => setActiveTab(i)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1040, margin:"0 auto", padding:"28px 24px" }}>
        {activeTab === 0 && <OverviewTab onTabChange={setActiveTab} />}
        {activeTab === 1 && <PendingTab />}
        {activeTab === 2 && <UnlinkedTab onManualLink={goToManualLink} />}
        {activeTab === 3 && <ManualLinkTab prefill={manualPrefill} />}
        {activeTab === 4 && <HelpTab />}
      </div>
    </div>
  );
};

export default IdentityManager;
