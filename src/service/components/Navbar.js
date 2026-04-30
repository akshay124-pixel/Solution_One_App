import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const ServiceNavbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();

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
        
          .service-navbar .navbar-brand {
            animation: slideInLeft 0.3s ease-out;
            font-weight: bold;
            font-size: 1.5rem;
            color: white !important;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .service-navbar .nav-item {
            animation: slideInRight 0.3s ease-out;
          }
          .service-navbar .user-info {
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            margin-right: 1rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          }
          .service-navbar .logout-btn {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .service-navbar .logout-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          @media (max-width: 767px) {
            .service-navbar .navbar-brand {
              font-size: 1.2rem;
            }
            .service-navbar .user-info {
              font-size: 0.8rem;
              padding: 0.3rem 0.8rem;
              margin-right: 0.5rem;
            }
            .service-navbar .logout-btn {
              padding: 0.4rem 0.8rem;
              font-size: 0.85rem;
            }
          }
        `}
      </style>
      <Navbar
        expand="lg"
        className="service-navbar"
        variant="dark"
      >
        <Container fluid>
          <Navbar.Brand
            onClick={() => navigate("/service")}
          >
            🔧 Service Dashboard
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="service-navbar-nav" />
          <Navbar.Collapse id="service-navbar-nav">
            <Nav className="ms-auto align-items-center">
              {isAuthenticated && (
                <>
                  <Nav.Item className="user-info">
                    👤 {localStorage.getItem("user")
                      ? JSON.parse(localStorage.getItem("user")).username
                      : "User"}
                  </Nav.Item>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={onLogout}
                    className="logout-btn"
                  >
                    <LogOut size={16} />
                    Logout
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
};

export default ServiceNavbar;
