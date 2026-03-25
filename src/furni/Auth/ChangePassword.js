/**
 * Furni ChangePassword — unified portal version.
 * Uses /api/auth/change-password (unified endpoint) via portalApi.
 * No localStorage token reads — portal manages auth.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { portalApi } from "../../portal/PortalAuthContext";

function ChangePassword() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [passwordStrengthColor, setPasswordStrengthColor] = useState("");
  const navigate = useNavigate();

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "newPassword") {
      const s = checkPasswordStrength(value);
      setPasswordStrength(s.text);
      setPasswordStrengthColor(s.color);
    }
  };

  const checkPasswordStrength = (password) => {
    if (!password) return { text: "", color: "" };
    const score = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[@$!%*?&]/.test(password),
      password.length >= 8,
    ].filter(Boolean).length;
    if (score < 3) return { text: "Weak",   color: "#ff4444" };
    if (score < 5) return { text: "Medium", color: "#ffaa00" };
    return { text: "Strong", color: "#00aa00" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmNewPassword } = formData;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("Please fill in all fields.", { theme: "colored", autoClose: 3000 });
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("New password must be at least 8 characters with uppercase, lowercase, number, and special character.", { theme: "colored", autoClose: 3000 });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New password and confirmation do not match.", { theme: "colored", autoClose: 3000 });
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password.", { theme: "colored", autoClose: 3000 });
      return;
    }

    setLoading(true);
    try {
      const response = await portalApi.post("/api/auth/change-password", { currentPassword, newPassword });
      if (response.status === 200) {
        toast.success("Password changed successfully! Please log in again.", { theme: "colored", autoClose: 3000 });
        setFormData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Current password is incorrect.", { theme: "colored", autoClose: 3000 });
      } else {
        toast.error(error.response?.data?.message || "Failed to change password.", { theme: "colored", autoClose: 3000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <div className="form-box" style={{ width: "500px" }}>
        <form className="form" onSubmit={handleSubmit}>
          <h2 className="title">Change Password</h2>
          <p className="subtitle">Update your account password.</p>
          <div className="form-inputs">
            {[
              { name: "currentPassword", label: "Current Password", show: showCurrentPassword, toggle: () => setShowCurrentPassword(!showCurrentPassword) },
              { name: "newPassword",     label: "New Password",     show: showNewPassword,     toggle: () => setShowNewPassword(!showNewPassword) },
              { name: "confirmNewPassword", label: "Confirm New Password", show: showConfirmPassword, toggle: () => setShowConfirmPassword(!showConfirmPassword) },
            ].map(({ name, label, show, toggle }) => (
              <div key={name} style={{ position: "relative" }}>
                <input
                  className="input"
                  style={{ backgroundColor: "white" }}
                  type={show ? "text" : "password"}
                  name={name}
                  placeholder={label}
                  value={formData[name]}
                  onChange={handleInput}
                  required
                  aria-label={label}
                />
                <button type="button" onClick={toggle} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#333", fontSize: "14px", cursor: "pointer", padding: 0, zIndex: 1 }} aria-label={show ? `Hide ${label}` : `Show ${label}`}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            ))}
            {formData.newPassword && (
              <div style={{ marginTop: "5px", fontSize: "12px", color: passwordStrengthColor, fontWeight: "bold" }}>
                Password Strength: {passwordStrength}
              </div>
            )}
          </div>
          <button type="submit" className="button1" disabled={loading} aria-label="Change Password">
            {loading ? <Spinner animation="border" size="sm" /> : "Change Password"}
          </button>
        </form>
        <div className="form-section">
          <p>Return to <Link to="/furni/sales">Furni</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
