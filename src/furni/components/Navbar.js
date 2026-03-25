/**
 * Furni Navbar — unified portal version.
 * Adapted from Sales_Order_Furni/myapp/src/components/Navbar.js:
 *   - Removed localStorage token reads
 *   - Change Password navigates to /furni/change-password
 *   - Logout calls onLogout prop (portal handles cleanup)
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

const Navbar = ({ isAuthenticated, onLogout, userRole }) => {
  const [userName, setUserName] = useState("User");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserName(user.username || "User");
  }, [isAuthenticated]);

  const handleLogout = () => {
    onLogout();
  };

  const handleOutsideClick = useCallback(
    (e) => {
      if (isDropdownOpen && !e.target.closest(".user-profile")) {
        setDropdownOpen(false);
      }
    },
    [isDropdownOpen]
  );

  useEffect(() => {
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [handleOutsideClick]);

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .furni-navbar { animation: fadeIn 0.5s ease-out; background: linear-gradient(135deg, #2575fc, #6a11cb); display: flex; align-items: center; justify-content: space-between; padding: 1rem; width: 100%; box-sizing: border-box; }
        @media (max-width: 767px) {
          .furni-navbar { flex-direction: column; align-items: stretch; padding: 0.5rem; }
          .furni-navbar-links { flex-direction: column; width: 100%; padding: 0.5rem; margin-top: 0.25rem; gap: 0.5rem; display: ${isMenuOpen ? "flex" : "none"}; }
        }
      `}</style>
      <nav className="furni-navbar" aria-label="Furni navigation">
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src="/logo.png"
            alt="Company Logo"
            style={{ width: "110px", height: "auto", marginLeft: "20px", filter: "brightness(0) invert(1)", transition: "transform 0.3s ease" }}
            onError={(e) => (e.target.src = "https://via.placeholder.com/130x40?text=Logo")}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <h4 style={{ fontWeight: "bold", color: "white", marginLeft: "10px", marginBottom: 0 }}>( Furniture )</h4>
        </div>

        <div className="furni-navbar-links" style={{ display: "flex", gap: "1rem" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingRight: "1rem" }}>
          {isAuthenticated ? (
            <>
              <div
                className="user-profile"
                style={{ display: "flex", alignItems: "center", position: "relative", gap: "0.5rem" }}
                role="button"
                aria-label={`User profile for ${userName}`}
              >
                <img
                  src="/avtar.jpg"
                  alt={`Avatar for ${userName}`}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #fef3c7", cursor: "pointer", transition: "transform 0.3s ease" }}
                  onError={(e) => (e.target.src = "https://via.placeholder.com/40?text=User")}
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                />
                <span style={{ color: "white", fontSize: "1rem", fontWeight: "500" }}>Hello, {userName}</span>
                {isDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "220px", marginTop: "8px", overflow: "hidden", animation: "fadeIn 0.2s ease-out" }}>
                    <div
                      style={{ padding: "16px 20px", cursor: "pointer", color: "#2d3748", fontSize: "14px", fontWeight: "500", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s ease" }}
                      onClick={() => { navigate("/furni/change-password"); setDropdownOpen(false); }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#2575fc"; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.color = "#2d3748"; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l2.5 2.5L15.5 7.5m0 0l2.5-2.5" />
                      </svg>
                      Change Password
                    </div>
                    <div
                      style={{ padding: "16px 20px", cursor: "pointer", color: "#2d3748", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s ease" }}
                      onClick={() => { handleLogout(); setDropdownOpen(false); }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.color = "#2d3748"; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Logout
                    </div>
                  </div>
                )}
              </div>
              <button
                className="Btn mx-3 logout-btn"
                onClick={handleLogout}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                aria-label="Logout"
              >
                <div className="sign">
                  <svg viewBox="0 0 512 512">
                    <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                  </svg>
                </div>
                <div className="text">Logout</div>
              </button>
            </>
          ) : null}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
