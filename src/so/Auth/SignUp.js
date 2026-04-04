import React, { useState } from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";
import soApi from "../axiosSetup";
import { toast } from "react-toastify";

// SO standalone Signup — redirects to unified portal signup endpoint.
function Signup() {
  const navigate = useNavigate();
  const [form, setFormData] = useState({
    username: "", email: "", password: "", role: "salesperson",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.email || !form.password || !form.role) {
      toast.error("Please fill in all required fields.", {
        position: "top-right", autoClose: 3000, theme: "colored",
      });
      return;
    }

    try {
      // Use unified portal signup endpoint
      const PORTAL_URL = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
      const response = await soApi.post(
        `${PORTAL_URL}/api/auth/signup`,
        form,
        { withCredentials: true }
      );

      if (response.data.success) {
        const { accessToken, user } = response.data;

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

        toast.success("Signup successful! Redirecting...", {
          position: "top-right", autoClose: 3000, theme: "colored",
        });

        const role = user.role;
        if (role === "Production") navigate("/production");
        else if (role === "Finish") navigate("/finish");
        else if (role === "Installation") navigate("/installation");
        else if (role === "Accounts") navigate("/accounts");
        else if (role === "Verification") navigate("/verification");
        else if (role === "Bill") navigate("/bill");
        else if (role === "ProductionApproval") navigate("/production-approval");
        else navigate("/sales");
      }
    } catch (error) {
      let errorMessage = "Signup failed. Please try again.";
      if (error.response?.status === 409) errorMessage = "Email already registered. Please log in instead.";
      else if (error.response?.status === 400) errorMessage = "Please fill all details correctly.";
      else if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.request) errorMessage = "Unable to connect to the server.";

      toast.error(errorMessage, { position: "top-right", autoClose: 3000, theme: "colored" });
    }
  };

  return (
    <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="form-box">
        <form className="form" onSubmit={handleSubmit}>
          <span className="title">Sign Up</span>
          <span className="subtitle">Create a free account with your email.</span>
          <div className="form-box">
            <input type="text" style={{ backgroundColor: "white" }} className="input"
              placeholder="Full Name" name="username" value={form.username} onChange={handleInput} required />
            <input type="email" style={{ backgroundColor: "white" }} className="input"
              placeholder="Email" name="email" value={form.email} onChange={handleInput} required />
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"}
                style={{ backgroundColor: "white", paddingRight: "80px" }} className="input"
                placeholder="Password" name="password" value={form.password} onChange={handleInput} required />
              <button type="button"
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "blue", cursor: "pointer" }}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <select name="role" style={{ backgroundColor: "white" }} value={form.role}
              onChange={handleInput} className="input" required>
              <option value="salesperson">Sales</option>
            </select>
          </div>
          <button type="submit" style={{ background: "linear-gradient(90deg, #6a11cb, #2575fc)" }}>
            Sign Up
          </button>
        </form>
        <div className="form-section">
          <p>Have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
