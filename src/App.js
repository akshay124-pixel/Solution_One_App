import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";

import { PortalAuthProvider } from "./portal/PortalAuthContext";
import AppRouter from "./portal/AppRouter";

// SO axios interceptors (token attachment + 401 handling for SO components)
import "./so/axiosSetup";

function App() {
  return (
    <Router>
      <PortalAuthProvider>
        <ToastContainer />
        <AppRouter />
      </PortalAuthProvider>
    </Router>
  );
}

export default App;
