import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Sales from "./components/Sales";
import Production from "./components/Production";
import Finish from "./components/Finish";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import Navbar from "./components/Navbar";
import Installation from "./components/installation";
import Accounts from "./components/Accounts";
import Verification from "./components/Verification";
import Bill from "./components/BillGeneration";
import ProductionApproval from "./components/ProductionApproval";
import ChangePassword from "./Auth/ChangePassword";

const ConditionalNavbar = ({ isAuthenticated, onLogout, userRole }) => {
  const location = useLocation();
  const isAuthPage = ["/login", "/signup", "/change-password"].includes(
    location.pathname
  );

  return !isAuthPage && isAuthenticated ? (
    <Navbar
      isAuthenticated={isAuthenticated}
      onLogout={onLogout}
      userRole={userRole}
    />
  ) : null;
};

const PrivateRoute = ({ element, isAuthenticated, allowedRoles }) => {
  const userRole = localStorage.getItem("role");
  return isAuthenticated &&
    (!allowedRoles || allowedRoles.includes(userRole)) ? (
    element
  ) : (
    <Navigate to="/login" replace />
  );
};

const roleRedirect = (role) => {
  if (role === "Production") return "/production";
  if (role === "Finish") return "/finish";
  if (role === "Installation") return "/installation";
  if (role === "Accounts") return "/accounts";
  if (role === "Verification") return "/verification";
  if (role === "Bill") return "/bill";
  if (role === "ProductionApproval") return "/production-approval";
  if (role === "salesperson" || role === "Admin" || role === "SuperAdmin" || role === "Watch")
    return "/sales";
  return "/login";
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const navigate = useNavigate();
  const location = useLocation();

  // Validate token on app load — uses unified portal refresh endpoint
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Decode token locally to check expiry (server already verified it on issue)
          const base64Payload = token.split(".")[1];
          const payload = JSON.parse(atob(base64Payload));
          if (!payload || payload.exp * 1000 <= Date.now()) {
            throw new Error("Token expired");
          }
        } catch (err) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          localStorage.removeItem("role");
          setIsAuthenticated(false);
          navigate("/login");
        }
      }
    };
    validateToken();
  }, [navigate]);

  // After login, redirect user according to their role
  const handleLogin = ({ token, userId, role, email }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", userId);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("role", role);
    setIsAuthenticated(true);
    // Redirect on login for optimal UX
    navigate(roleRedirect(role), { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    setIsAuthenticated(false);
    navigate("/login");
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Do not redirect if on any of these pages
    if (
      location.pathname === "/change-password" ||
      location.pathname === "/login" ||
      location.pathname === "/signup"
    ) {
      return;
    }

    // If not on above path, always correct route based on role
    const role = localStorage.getItem("role");
    navigate(roleRedirect(role), { replace: true });
  }, [isAuthenticated, navigate, location.pathname]);

  return (
    <>
      <ConditionalNavbar
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        userRole={localStorage.getItem("role")}
      />
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/change-password"
          element={
            <PrivateRoute
              element={<ChangePassword />}
              isAuthenticated={isAuthenticated}
            />
          }
        />
        <Route
          path="/sales"
          element={
            <PrivateRoute
              element={<Sales />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["salesperson", "Admin", "SuperAdmin", "Watch"]}
            />
          }
        />
        <Route
          path="/production"
          element={
            <PrivateRoute
              element={<Production />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Production"]}
            />
          }
        />
        <Route
          path="/finish"
          element={
            <PrivateRoute
              element={<Finish />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Finish"]}
            />
          }
        />
        <Route
          path="/installation"
          element={
            <PrivateRoute
              element={<Installation />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Installation"]}
            />
          }
        />
        <Route
          path="/accounts"
          element={
            <PrivateRoute
              element={<Accounts />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Accounts"]}
            />
          }
        />
        <Route
          path="/verification"
          element={
            <PrivateRoute
              element={<Verification />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Verification"]}
            />
          }
        />
        <Route
          path="/bill"
          element={
            <PrivateRoute
              element={<Bill />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["Bill"]}
            />
          }
        />
        <Route
          path="/production-approval"
          element={
            <PrivateRoute
              element={<ProductionApproval />}
              isAuthenticated={isAuthenticated}
              allowedRoles={["ProductionApproval"]}
            />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate
                to={roleRedirect(localStorage.getItem("role"))}
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
