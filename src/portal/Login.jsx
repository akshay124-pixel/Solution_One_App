/**
 * Unified Portal Login
 * UI is PIXEL-IDENTICAL to CRM/mydata/src/Auth/Login.js
 * Only the submit handler and post-login redirect logic are changed.
 */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Spinner } from "react-bootstrap";
import { usePortalAuth } from "./PortalAuthContext";

// Maps SO-only roles to their default route
const soRoleRoute = (role) => {
  if (role === "Production") return "/so/production";
  if (role === "Finish") return "/so/finish";
  if (role === "Installation") return "/so/installation";
  if (role === "Accounts") return "/so/accounts";
  if (role === "Verification") return "/so/verification";
  if (role === "Bill") return "/so/bill";
  if (role === "ProductionApproval") return "/so/production-approval";
  return "/so/sales"; // Sales, Admin, Watch
};

// Maps furni roles to their default route
const furniRoleRoute = (role) => {
  if (role === "Production") return "/furni/production";
  if (role === "Finish") return "/furni/finish";
  if (role === "Installation") return "/furni/installation";
  if (role === "Accounts") return "/furni/accounts";
  if (role === "Verification") return "/furni/verification";
  if (role === "Bill") return "/furni/bill";
  if (role === "ProductionApproval") return "/furni/production-approval";
  return "/furni/sales";
};

const Login = () => {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const { login } = usePortalAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = credentials;

    if (!email || !password) {
      toast.warning("Please enter both email and password.", {
        position: "top-right", autoClose: 3000, theme: "colored",
      });
      return;
    }

    setLocalLoading(true);
    const result = await login(email, password);
    setLocalLoading(false);

    if (result.success) {
      toast.success("Login successful!", {
        position: "top-right", autoClose: 3000, theme: "colored",
      });

      // Role-based redirect using hint from server
      // hint === "select-module" → anyone with app_access.length === 2
      // hint === "service-dashboard" → service role
      // hint === "so-dashboard"  → SO-only roles
      // hint === "crm-dashboard" → CRM-only fallback
      const hint = result.redirectHint;
      const role = result.user?.role;
      if (hint === "select-module")        navigate("/select-module", { replace: true });
      else if (hint === "service-dashboard") navigate("/service", { replace: true });
      else if (hint === "dms-dashboard")    navigate("/dms/dashboard", { replace: true });
      else if (hint === "furni-dashboard")  navigate(furniRoleRoute(role), { replace: true });
      else if (hint === "so-dashboard")     navigate(soRoleRoute(role), { replace: true });
      else navigate("/crm/dashboard", { replace: true });
    } else {
      toast.error(result.message, {
        position: "top-right", autoClose: 3000, theme: "colored",
      });
    }
  };

  return (
    <div
      className="login-container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <div className="form-box" style={{ width: "500px" }}>
        <form className="form" onSubmit={handleSubmit}>
          <h2 className="title">Login</h2>
          <p className="subtitle">Access your account.</p>

          <div className="form-inputs">
            <input
              autoComplete="off"
              style={{ backgroundColor: "white" }}
              className="input"
              type="email"
              name="email"
              placeholder="Email"
              value={credentials.email}
              onChange={handleChange}
              required
              aria-label="Email Address"
            />
            <div style={{ position: "relative" }}>
              <input
                className="input"
                style={{ backgroundColor: "white" }}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                required
                aria-label="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#333",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "0",
                  zIndex: 1,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="button1"
            disabled={localLoading}
            aria-label="Login"
          >
            {localLoading ? <Spinner animation="border" size="sm" /> : "Login"}
          </button>
        </form>

        <div className="form-section">
          <p>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
