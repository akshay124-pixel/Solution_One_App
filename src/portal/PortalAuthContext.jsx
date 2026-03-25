import React, {
  createContext, useState, useEffect,
  useContext, useMemo, useCallback, useRef,
} from "react";
import axios from "axios";

const PORTAL_URL = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";

const PortalAuthContext = createContext(null);

// In-memory access token (never in localStorage for security)
let _accessToken = null;

export const setPortalAccessToken = (token) => { _accessToken = token; };
export const getPortalAccessToken = () => _accessToken;

// Axios instance for portal-level calls
export const portalApi = axios.create({
  baseURL: PORTAL_URL,
  withCredentials: true,
});

portalApi.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

let _refreshPromise = null;

/**
 * Sync localStorage so SO components always have the correct IDs and role.
 *
 * The token contains:
 *   id    = CRM user _id  (used by CRM backend)
 *   soId  = SO user _id   (used by SO backend, may equal id for SO-only users)
 *
 * SO components read localStorage.userId for socket room joins and API calls.
 * We write soId (when present) so SO queries match SO collection _ids.
 */
function syncLocalStorage(accessToken, user) {
  // SO frontend reads "role" as "SuperAdmin"/"Admin"/"salesperson"
  // DMS frontend reads "role" as "Superadmin"/"Admin"/"Others"
  // CRM frontend reads "role" as "superadmin"/"admin"/"salesperson"
  //
  // We store the SO-style role (used by SO components) in localStorage.role,
  // AND store the DMS-style role in localStorage.dmsRole for DMS components.
  //
  const soRoleMap = {
    globaladmin: "GlobalAdmin",
    superadmin:  "SuperAdmin",
    admin:       "Admin",
    salesperson: "salesperson",
    others:      "salesperson", // legacy alias
    Sales:       "salesperson",
  };
  const dmsRoleMap = {
    globaladmin: "Globaladmin",
    superadmin:  "Superadmin",
    admin:       "Admin",
    salesperson: "salesperson", // DMS salesperson (dms=true)
    dms_user:    "salesperson", // legacy alias
    others:      "salesperson", // legacy alias
  };
  const soRole  = soRoleMap[user.role]  || user.role;
  const dmsRole = dmsRoleMap[user.role] || user.role;
  // Furni role map: globaladmin/superadmin → "SuperAdmin", admin → "Admin", salesperson → "salesperson"
  // SO-style roles (Production, Installation, etc.) pass through as-is
  const furniRoleMap = {
    globaladmin: "GlobalAdmin",
    superadmin:  "SuperAdmin",
    admin:       "Admin",
    salesperson: "salesperson",
    others:      "salesperson",
    Admin:       "Admin",
    Sales:       "salesperson",
  };
  const furniRole = furniRoleMap[user.role] || user.role;
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    const soUserId    = payload.soId    || payload.id;
    const dmsUserId   = payload.dmsId   || payload.id;
    const furniUserId = payload.furniId || payload.id;

    // NOTE: access token intentionally NOT stored in localStorage (XSS risk).
    // SO axios reads the token via getPortalAccessToken() instead.
    localStorage.setItem("userId",      soUserId);
    localStorage.setItem("dmsUserId",   dmsUserId);
    localStorage.setItem("furniUserId", furniUserId);
    localStorage.setItem("role",        soRole);
    localStorage.setItem("dmsRole",     dmsRole);
    localStorage.setItem("furniRole",   furniRole);
    localStorage.setItem("user", JSON.stringify({
      id:          soUserId,
      dmsId:       dmsUserId,
      furniId:     furniUserId,
      username:    user.username,
      email:       user.email,
      role:        soRole,
      dmsRole:     dmsRole,
      furniRole:   furniRole,
    }));
  } catch (_) {
    // NOTE: access token intentionally NOT stored in localStorage (XSS risk).
    localStorage.setItem("userId",      user.id || user._id);
    localStorage.setItem("dmsUserId",   user.id || user._id);
    localStorage.setItem("furniUserId", user.id || user._id);
    localStorage.setItem("role",        soRole);
    localStorage.setItem("dmsRole",     dmsRole);
    localStorage.setItem("furniRole",   furniRole);
    localStorage.setItem("user", JSON.stringify({
      id:        user.id || user._id,
      username:  user.username,
      email:     user.email,
      role:      soRole,
      dmsRole:   dmsRole,
      furniRole: furniRole,
    }));
  }
}

export const refreshPortalToken = async () => {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = axios
    .post(`${PORTAL_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then((res) => {
      if (res.data.success && res.data.accessToken) {
        setPortalAccessToken(res.data.accessToken);
        // Keep localStorage in sync so SO components always have a fresh token
        if (res.data.user) {
          syncLocalStorage(res.data.accessToken, res.data.user);
        }
        return { success: true, accessToken: res.data.accessToken, user: res.data.user };
      }
      throw new Error("Refresh failed");
    })
    .catch((err) => { setPortalAccessToken(null); throw err; })
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
};

// Auto-refresh on 401 — but NOT for auth endpoints (login/logout/refresh)
portalApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    const isAuthEndpoint = orig?.url?.includes("/api/auth/");
    if (error.response?.status === 401 && !orig._retry && !isAuthEndpoint) {
      orig._retry = true;
      try {
        const result = await refreshPortalToken();
        orig.headers.Authorization = `Bearer ${result.accessToken}`;
        return portalApi(orig);
      } catch (_) {
        setPortalAccessToken(null);
        window.dispatchEvent(new Event("portal:logout"));
      }
    }
    return Promise.reject(error);
  }
);

export const PortalAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initSession = async () => {
      try {
        const result = await refreshPortalToken();
        if (result.success) {
          setUser(result.user);
          setIsAuthenticated(true);
        }
      } catch (_) {
        // No active session — expected on first visit
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const handleLogout = () => {
      setPortalAccessToken(null);
      setIsAuthenticated(false);
      setUser(null);
    };
    window.addEventListener("portal:logout", handleLogout);
    return () => window.removeEventListener("portal:logout", handleLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await portalApi.post("/api/auth/login", { email, password });
      if (res.data.success) {
        setPortalAccessToken(res.data.accessToken);
        setUser(res.data.user);
        setIsAuthenticated(true);
        setLoading(false);
        syncLocalStorage(res.data.accessToken, res.data.user);
        return { success: true, redirectHint: res.data.redirectHint, user: res.data.user };
      }
      return { success: false, message: "Login failed." };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Login failed.",
      };
    }
  }, []);

  // Used by Signup to set auth state directly from signup response
  // without making a second login API call
  const setAuthFromToken = useCallback((accessToken, userData) => {
    setPortalAccessToken(accessToken);
    setUser(userData);
    setIsAuthenticated(true);
    setLoading(false);
    syncLocalStorage(accessToken, userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await portalApi.post("/api/auth/logout");
    } catch (_) {}
    setPortalAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("dmsUserId");
    localStorage.removeItem("dmsRole");
    localStorage.removeItem("furniUserId");
    localStorage.removeItem("furniRole");
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, loading, user, login, logout, setAuthFromToken }),
    [isAuthenticated, loading, user, login, logout, setAuthFromToken]
  );

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => useContext(PortalAuthContext);
