import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import "../App.css";

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
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
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

  const renderNavLinks = () => {
    if (!isAuthenticated) return null;

    switch (userRole) {
      case "Production":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          >
            {/* <Link to="/production-dashboard" className="nav-link">
              Production Dashboard
            </Link> */}
          </div>
        );
      case "salesperson":
        return (
          <div
            style={{
              display: "flex",
              gap: "1rem",
              transition: "all 0.3s ease",
            }}
          >
            {/* <Link to="/sales" className="nav-link">
              Sales Dashboard
            </Link> */}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideInLeft {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideInRight {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .navbar {
            animation: fadeIn 0.5s ease-out;
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            width: 100%;
            box-sizing: border-box;
           
          }
          .menu-toggle {
            display: none;
            cursor: pointer;
            padding: 0.25rem;
          }
          .menu-toggle svg {
            width: 20px;
            height: 20px;
            fill: white;
          }
          @media (max-width: 767px) {
            .navbar {
              flex-direction: column;
              align-items: stretch;
              padding: 0.5rem;
            }
            .navbar-logo {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 0.25rem;
            }
            .navbar-logo img {
              width: 143px !important;
              height: 46px !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .menu-toggle {
              display: block;
              position: absolute;
              right: 0.5rem;
            }
            .navbar-links {
              flex-direction: column;
              width: 100%;
              padding: 0.5rem;
              margin-top: 0.25rem;
              gap: 0.5rem;
              display: ${isMenuOpen ? "flex" : "none"};
            }
            .navbar-user {
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              padding: 0.25rem 0.5rem;
              gap: 0.5rem;
              flex-wrap: nowrap;
              height: 32px;
            }
            .user-profile {
              animation: slideInLeft 0.3s ease-out;
              order: 1;
            }
            .user-avatar {
              width: 28px !important;
              height: 28px !important;
              border-width: 1px !important;
            }
            .logout-btn {
              animation: slideInRight 0.3s ease-out;
              order: 2;
              width: auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              margin: 0 !important;
              gap: 0.25rem;
              min-width: 45px;
              height: 45px !important;
              line-height: 1;
            }
            .logout-btn svg {
              width: 12px !important;
              height: 12px !important;
            }
            .navbar-user.auth-buttons {
              justify-content: center;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
            .navbar-user .btn {
              order: 3;
              width: auto !important;
              margin: 0 auto !important;
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
              min-width: 80px !important;
              height: 28px !important;
              line-height: 1;
              display: inline-flex;
              justify-content: center;
              align-items: center;
            }
          }
        `}
      </style>
      <nav className="navbar" aria-label="Main navigation">
        <div
          className="navbar-logo"
          style={{ display: "flex", alignItems: "center" }}
        >
          <img
            src="/logo.png"
            alt="Company Logo"
            className="logo-image"
            style={{
              width: "110px",
              height: "auto",
              marginLeft: "20px",
              transition: "transform 0.3s ease",
            }}
            onError={(e) =>
              (e.target.src = "https://via.placeholder.com/130x40?text=Logo")
            }
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          />
          <button
            className="menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ display: "none" }}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <svg viewBox="0 0 24 24">
              <path
                d={
                  isMenuOpen
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>{" "}
          <h4 style={{ fontWeight: "bold" }}>( IT )</h4>
        </div>

        <div
          className="navbar-links"
          style={{
            display: "flex",
            gap: "1rem",
            transition: "all 0.3s ease",
          }}
        >
          {renderNavLinks()}
        </div>

        <div
          className={`navbar-user ${isAuthenticated ? "" : "auth-buttons"}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            paddingRight: "1rem",
          }}
        >
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
                  onClick={() => setDropdownOpen(!isDropdownOpen)}
                />
                <span
                  style={{
                    color: "white",
                    fontSize: "1rem",
                    fontWeight: "500",
                  }}
                >
                  Hello, {userName}
                </span>{" "}
                {isDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: -24,
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
                        navigate("/so/change-password");
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
              <button
                className="Btn mx-3 logout-btn"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
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
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid white",
                  color: "white",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 100%)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #e2e8f0";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
                aria-label="Log in"
              >
                Login
              </Button>
              <Button
                as={Link}
                to="/signup"
                variant="outline-warning"
                className="btn"
                style={{
                  borderRadius: "20px",
                  padding: "5px 15px",
                  fontWeight: "600",
                  minWidth: "100px",
                  height: "38px",
                  border: "1px solid #ecc94b",
                  color: "#ecc94b",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)",
                  margin: "0 0.5rem",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  textAlign: "center",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.background = "#ecc94b";
                  e.currentTarget.style.color = "#2b6cb0";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, transparent 0%, rgba(236,201,75,0.2) 100%)";
                  e.currentTarget.style.color = "#ecc94b";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid #ecc94b";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => (e.currentTarget.style.outline = "none")}
                aria-label="Sign up"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
