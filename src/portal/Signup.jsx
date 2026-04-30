/**
 * Unified Portal Signup
 * Roles: CRM/DMS roles + SO roles + Furni-only roles.
 * Furni-only roles use furniOnly:true payload flag — no ugly prefixes.
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePortalAuth } from "./PortalAuthContext";
import { portalApi } from "./PortalAuthContext";

const CRM_ROLES = [
  { value: "globaladmin", label: "Global Admin (All Modules)" },
  { value: "superadmin",  label: "Superadmin" },
  { value: "admin",       label: "Admin" },
  { value: "salesperson", label: "Salesperson" },
];

// SO roles — these users also get Furni access (SO + Furni)
const SO_ROLES = [
  { value: "Watch",              label: "Watch" },
  { value: "Production",         label: "Production" },
  { value: "ProductionApproval", label: "Production Approval" },
  { value: "Installation",       label: "Installation" },
  { value: "Finish",             label: "Finish" },
  { value: "Accounts",           label: "Accounts" },
  { value: "Verification",       label: "Verification" },
  { value: "Bill",               label: "Bill" },
];

// Furni-only roles — actual Furni DB enum values (sent with furniOnly:true flag)
// SuperAdmin/Admin/Sales excluded — covered by globaladmin/admin/salesperson in CRM tab
const FURNI_ONLY_ROLES = [
  { value: "Production",         label: "Production" },
  { value: "ProductionApproval", label: "Production Approval" },
  { value: "Installation",       label: "Installation" },
  { value: "Finish",             label: "Finish" },
  { value: "Accounts",           label: "Accounts" },
  { value: "Verification",       label: "Verification" },
  { value: "Bill",               label: "Bill" },
];

const soRoleRoute = (role) => {
  if (role === "Production")         return "/so/production";
  if (role === "Finish")             return "/so/finish";
  if (role === "Installation")       return "/so/installation";
  if (role === "Accounts")           return "/so/accounts";
  if (role === "Verification")       return "/so/verification";
  if (role === "Bill")               return "/so/bill";
  if (role === "ProductionApproval") return "/so/production-approval";
  return "/so/sales";
};

const furniRoleRoute = (role) => {
  if (role === "Production")         return "/furni/production";
  if (role === "Finish")             return "/furni/finish";
  if (role === "Installation")       return "/furni/installation";
  if (role === "Accounts")           return "/furni/accounts";
  if (role === "Verification")       return "/furni/verification";
  if (role === "Bill")               return "/furni/bill";
  if (role === "ProductionApproval") return "/furni/production-approval";
  return "/furni/sales";
};

const Signup = () => {
  const navigate = useNavigate();
  const { setAuthFromToken } = usePortalAuth();

  const [activeSection, setActiveSection] = useState("crm"); // "crm" | "so" | "furni"
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "salesperson",
    dms: false,
    furniOnly: false,
    superadminModules: { crm: true, so: true, dms: true, furni: true, service: true },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "role" && value !== "salesperson" && value !== "admin" ? { dms: false } : {}),
      ...(name === "role" && value === "superadmin" ? { superadminModules: { crm: true, so: true, dms: true, furni: true, service: true } } : {}),
    }));
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    const defaults = {
      crm:   { role: "salesperson", furniOnly: false },
      so:    { role: "Watch",       furniOnly: false },
      furni: { role: "Production",   furniOnly: true  },
    };
    setFormData((prev) => ({ ...prev, ...defaults[section], dms: false }));
  };

  const handleSuperadminModuleToggle = (mod) => {
    setFormData((prev) => {
      const updated = { ...prev.superadminModules, [mod]: !prev.superadminModules[mod] };
      if (!Object.values(updated).some(Boolean)) return prev;
      return { ...prev, superadminModules: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { username, email, password, role, dms, furniOnly, superadminModules } = formData;

      if (!username || !email || !password || !role) {
        toast.warn("Please fill in all fields.", { theme: "colored", autoClose: 3000 });
        setLoading(false);
        return;
      }

      if (role === "superadmin" && !Object.values(superadminModules).some(Boolean)) {
        toast.warn("Please select at least one module for Superadmin.", { theme: "colored", autoClose: 3000 });
        setLoading(false);
        return;
      }

      const payload = { username, email, password, role, dms, furniOnly };
      if (role === "superadmin") payload.superadminModules = superadminModules;

      const res = await portalApi.post("/api/auth/signup", payload);

      if (res.data.success) {
        toast.success("Account created successfully!", { theme: "colored", autoClose: 2000 });
        setAuthFromToken(res.data.accessToken, res.data.user);

        const hint     = res.data.redirectHint;
        const userRole = res.data.user?.role;
        if (hint === "select-module")          navigate("/select-module", { replace: true });
        else if (hint === "service-dashboard") navigate("/service", { replace: true });
        else if (hint === "dms-dashboard")     navigate("/dms/dashboard", { replace: true });
        else if (hint === "furni-dashboard")   navigate(furniRoleRoute(userRole), { replace: true });
        else if (hint === "so-dashboard")      navigate(soRoleRoute(userRole), { replace: true });
        else                                   navigate("/crm/dashboard", { replace: true });
      } else {
        toast.error(res.data.message || "Signup failed.", { theme: "colored", autoClose: 3000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.", { theme: "colored", autoClose: 3000 });
    } finally {
      setLoading(false);
    }
  };

  // Which roles to show in the dropdown
  const visibleRoles = activeSection === "crm" ? CRM_ROLES
    : activeSection === "so"    ? SO_ROLES
    : FURNI_ONLY_ROLES;

  const sectionLabel = { crm: "CRM / DMS", so: "Sales Order", furni: "Furni" };

  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="form-box">
        <form className="form" onSubmit={handleSubmit}>
          <span className="title">Sign Up</span>
          <span className="subtitle">Create a free account with your email.</span>

          <div className="form-box">
            <input type="text" style={{ backgroundColor: "white" }} className="input"
              placeholder="Full Name" name="username" value={formData.username}
              onChange={handleChange} required aria-label="Full Name" />
            <input type="email" style={{ backgroundColor: "white" }} className="input"
              placeholder="Email" name="email" value={formData.email}
              onChange={handleChange} required aria-label="Email Address" />
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"}
                style={{ backgroundColor: "white", width: "110%" }} className="input"
                placeholder="Password" name="password" value={formData.password}
                onChange={handleChange} required aria-label="Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "#333", fontSize: "14px", cursor: "pointer", padding: "0", zIndex: 1 }}
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Section tabs */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              {["crm", "so", "furni"].map((s) => (
                <button key={s} type="button" onClick={() => handleSectionChange(s)}
                  style={{
                    flex: 1, padding: "7px 4px", fontSize: "12px", fontWeight: 600,
                    borderRadius: "8px", border: "none", cursor: "pointer",
                    background: activeSection === s
                      ? "linear-gradient(135deg, #2575fc, #6a11cb)"
                      : "#f1f5f9",
                    color: activeSection === s ? "#fff" : "#64748b",
                    transition: "all 0.2s",
                  }}>
                  {sectionLabel[s]}
                </button>
              ))}
            </div>

            {/* Role dropdown — filtered by active section */}
            <select name="role" style={{ backgroundColor: "white" }} value={formData.role}
              onChange={handleChange} className="input" required aria-label="Role">
              <optgroup label={`— ${sectionLabel[activeSection]} Roles —`}>
                {visibleRoles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </optgroup>
            </select>

            {/* Superadmin module selector */}
            {formData.role === "superadmin" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["crm", "so", "dms", "furni", "service"].map((mod) => (
                  <label key={mod} style={{
                    position: "relative", display: "flex", alignItems: "center",
                    padding: "10px 14px",
                    background: formData.superadminModules[mod] ? "#e0f2fe" : "#f8fafc",
                    border: `1px solid ${formData.superadminModules[mod] ? "#0ea5e9" : "#e2e8f0"}`,
                    borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                    color: "#334155", transition: "all 0.2s", userSelect: "none",
                  }}>
                    <input type="checkbox" checked={formData.superadminModules[mod]}
                      onChange={() => handleSuperadminModuleToggle(mod)}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0ea5e9", flexShrink: 0 }} />
                    <strong style={{ position: "absolute", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
                      {mod.toUpperCase()}
                    </strong>
                  </label>
                ))}
              </div>
            )}

            {/* Module selector for admin / salesperson */}
            {(formData.role === "salesperson" || formData.role === "admin") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { value: false, label: "CRM + SO + Furni" },
                  { value: true,  label: "DMS + SO + Furni" },
                ].map((opt) => (
                  <label key={String(opt.value)} style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px",
                    background: formData.dms === opt.value ? "#e0f2fe" : "#f8fafc",
                    border: `1px solid ${formData.dms === opt.value ? "#0ea5e9" : "#e2e8f0"}`,
                    borderRadius: "8px", cursor: "pointer", fontSize: "14px",
                    color: "#334155", transition: "all 0.2s", userSelect: "none",
                  }}>
                    <input type="radio" name="dms" checked={formData.dms === opt.value}
                      onChange={() => setFormData((prev) => ({ ...prev, dms: opt.value }))}
                      style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0ea5e9" }} />
                    <span>
                      <strong>{opt.label}</strong>
                      <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{opt.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={{ background: "linear-gradient(90deg, #6a11cb, #2575fc)" }}
            disabled={loading} aria-label="Sign Up">
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <div className="form-section">
          <p>Have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
