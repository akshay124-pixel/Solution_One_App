/**
 * SO Axios Setup — dedicated instance (does NOT mutate global axios).
 * Token is read from in-memory PortalAuthContext, never from localStorage.
 */
import axios from "axios";
import { toast } from "react-toastify";
import {
  refreshPortalToken,
  setPortalAccessToken,
  getPortalAccessToken,
} from "../portal/PortalAuthContext";


export const BASE_URL =
  process.env.REACT_APP_SO_URL || "http://localhost:5050/api/so";

// Dedicated SO axios instance — does NOT touch global axios.defaults
const soApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ── Request interceptor: attach in-memory portal token ────────────────────────────────────
soApi.interceptors.request.use(
  async (config) => {
    const token = getPortalAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isLoggingOut = false;

function forceLogout(message = "Session expired. Please log in again.") {
  if (isLoggingOut) return;
  isLoggingOut = true;
  try {
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("dmsUserId");
    localStorage.removeItem("dmsRole");
  } catch (_) {}

  toast.error(message);

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  } else {
    isLoggingOut = false;
  }
}

// ── Response interceptor: 401 refresh + error toasts ─────────────────────────
soApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const isNetwork = !!error?.code && error.code === "ERR_NETWORK";
    const originalRequest = error.config;

    // 1. Session Expired — attempt portal token refresh before forcing logout
    if (status === 401 && !originalRequest._soRetry) {
      originalRequest._soRetry = true;
      try {
        const result = await refreshPortalToken();
        setPortalAccessToken(result.accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
        return soApi(originalRequest);
      } catch (_) {
        forceLogout("Session expired. Please log in again.");
        return Promise.reject(error);
      }
    }

    // 2. Other Errors — show toast, do NOT redirect
    let displayMessage = "";

    if (isNetwork) {
      displayMessage = "Connection lost. Please check your internet.";
    } else if (status === 413) {
      displayMessage = "File too large. Please upload a smaller file (max 10MB).";
    } else if (status === 403) {
      displayMessage = "You do not have permission to perform this action.";
    } else if (status >= 500) {
      displayMessage = "Something went wrong on the server. Please try again.";
    }

    if (displayMessage) {
      toast.error(displayMessage);
    }

    return Promise.reject(error);
  }
);

export default soApi;
