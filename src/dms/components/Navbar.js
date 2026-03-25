import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";
import { Button } from "react-bootstrap";
import { getAuthData, logout as apiLogout } from "../api/api";
import { usePortalAuth } from "../../portal/PortalAuthContext";

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user: portalUser, logout: portalLogout } = usePortalAuth();

  useEffect(() => {
    // Prefer portal user (in-memory), fall back to getAuthData shim
    if (portalUser) {
      setIsAuthenticated(true);
      setUserName(portalUser.username || "User");
      setUserRole(portalUser.role || "");
    } else {
      const { accessToken, user } = getAuthData();
      setIsAuthenticated(!!accessToken);
      setUserName(user?.username || "User");
      setUserRole(user?.role || "");
    }
  }, [portalUser]);

  const handleLogout = async () => {
    await portalLogout();
    navigate("/login", { replace: true });
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isDropdownOpen && !e.target.closest(".user-profile")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [isDropdownOpen]);

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    // Only show Dashboard link in navbar
    return (
     
     <></>
    );
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img
          src="/logo.png"
          alt="Logo"
          className="logo-image"
          style={{
            width: "110px",
            height: "auto",
            marginLeft: "50px",
          }}
        />
      </div>

      <div className="navbar-links">{renderNavLinks()}</div>

      <div className="navbar-user">
        {isAuthenticated ? (
          <>
            <div
              className="user-profile"
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                gap: "0.5rem",
              }}
              role="button"
              aria-label={`User profile for ${userName}`}
              onClick={() => setDropdownOpen(!isDropdownOpen)}
            >
              <img
                src="/avtar.jpg"
                alt={`Avatar for ${userName}`}
                className="user-avatar"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid #90cdf4",
                  transition: "transform 0.3s ease, border-color 0.3s ease",
                  cursor: "pointer",
                }}
                onError={(e) =>
                  (e.target.src = "https://via.placeholder.com/40?text=User")
                }
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.borderColor = "#90cdf4";
                }}
              />
              <span
                style={{
                  color: "white",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
              >
                Hello, {userName}!
              </span>
              {isDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left:"1px",
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                    zIndex: 1000,
                    minWidth: "220px",
                    marginTop: "8px",
                    overflow: "hidden",
                    animation: "fadeIn 0.2s ease-out",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",

                      cursor: "pointer",
                      color: "#2d3748",
                      fontSize: "14px",
                      fontWeight: "500",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                      navigate("/dms/change-password");
                      setDropdownOpen(false);
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.color = "#2563eb";
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2d3748";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l2.5 2.5L15.5 7.5m0 0l2.5-2.5"></path>
                    </svg>
                    Change Password
                  </div>
                  <div
                    style={{
                      padding: "16px 20px",
                      cursor: "pointer",
                      color: "#2d3748",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#fef2f2";
                      e.currentTarget.style.color = "#dc2626";
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#2d3748";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </div>
                </div>
              )}
            </div>

            <button className="Btn mx-3" onClick={handleLogout}>
              <div className="sign">
                <svg viewBox="0 0 512 512">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                </svg>
              </div>
              <div className="text">Logout</div>
            </button>
          </>
        ) : (
          <>
            <Button
              as={Link}
              to="/login"
              variant="outline-light"
              className="mx-2"
              style={{
                borderRadius: "20px",
                padding: "5px 15px",
                fontWeight: "bold",
                minWidth: "100px",
                height: "38px",
              }}
            >
              Login
            </Button>
            <Button
              as={Link}
              to="/signup"
              variant="outline-warning"
              style={{
                borderRadius: "20px",
                padding: "5px 15px",
                fontWeight: "bold",
                minWidth: "100px",
                height: "38px",
              }}
            >
              Sign Up
            </Button>
          </>
        )}
      </div>
      <style>
        {`
          .user-profile {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 768px) {
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 180px;
      position: relative;
      right: 48px;
      left: -30px;
      margin-top: 7px;
      margin-bottom: 0;
    }
      .Btn {
              position: relative;
              left: 37px;
              top: 5px;
              padding: 5px 10px;
              font-size: 0.9rem;
            }
              .logo-image{
              width: 110px;
  height: auto;
  margin-left: 50px;
  margin-right: 50px;
  margin-bottom: 8px;
}}
        `}
      </style>
    </nav>
  );
};

export default Navbar;
