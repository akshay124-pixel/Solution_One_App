import React, { useState } from "react";
import "../App.css";
import { Link } from "react-router-dom";
import soApi from "../axiosSetup";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

// SO standalone Login is no longer used — all auth goes through the unified portal.
// This component is kept for legacy route compatibility but redirects to the portal login.
function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please enter both Email and Password.", {
        position: "top-right", autoClose: 3000, theme: "colored",
      });
      return;
    }

    setLoading(true);

    try {
      // Use unified portal login endpoint
      const PORTAL_URL = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
      const response = await soApi.post(
        `${PORTAL_URL}/api/auth/login`,
        formData,
        { withCredentials: true }
      );

      if (response.data.success) {
        const { accessToken, user } = response.data;

        // Sync localStorage for SO components
        const soRoleMap = {
          globaladmin: "GlobalAdmin", superadmin: "SuperAdmin",
          admin: "Admin", salesperson: "salesperson",
        };
        const soRole = soRoleMap[user.role] || user.role;

        localStorage.setItem("token", accessToken);
        localStorage.setItem("userId", user.id);
        localStorage.setItem("role", soRole);
        localStorage.setItem("user", JSON.stringify({
          id: user.id, username: user.username, email: user.email, role: soRole,
        }));

        toast.success("Login successful! Redirecting...", {
          position: "top-right", autoClose: 3000, theme: "colored",
        });

        onLogin({ token: accessToken, userId: user.id, role: soRole });
      }
    } catch (error) {
      let errorMessage = "Login failed. Please try again.";
      if (error.response?.status === 401) errorMessage = "Invalid email or password.";
      else if (error.response?.status === 400) errorMessage = "Please provide valid email and password.";
      else if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.request) errorMessage = "Unable to connect to the server.";

      toast.error(errorMessage, { position: "top-right", autoClose: 3000, theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="form-box">
        <form className="form" onSubmit={handleSubmit}>
          <h2 className="title">Login</h2>
          <p className="subtitle">Access your account.</p>
          <div className="form-inputs">
            <input autoComplete="off" style={{ backgroundColor: "white" }} className="input"
              type="email" name="email" placeholder="Email" value={formData.email}
              onChange={handleInput} required aria-label="Email Address" />
            <div style={{ position: "relative" }}>
              <input className="input" style={{ backgroundColor: "white", paddingRight: "80px" }}
                type={showPassword ? "text" : "password"} name="password" placeholder="Password"
                value={formData.password} onChange={handleInput} required aria-label="Password" />
              <button type="button"
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "blue", cursor: "pointer" }}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button type="submit" className="button1" disabled={loading} aria-label="Login">
            {loading ? <Spinner animation="border" size="sm" /> : "Login"}
          </button>
        </form>
        <div className="form-section">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
