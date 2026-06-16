/**
 * Furni Axios Setup — dedicated instance (does NOT mutate global axios).
 * Token is read from in-memory PortalAuthContext, never from localStorage.
 * Mirrors the SO axiosSetup pattern exactly.
 */
import axios from "axios";
import axiosRetry from "axios-retry";
import { toast } from "react-toastify";
import {
  refreshPortalToken,
  setPortalAccessToken,
  getPortalAccessToken,
} from "../portal/PortalAuthContext";


export const BASE_URL =
  process.env.REACT_APP_FURNI_URL || "http://localhost:5050/api/furni";

// Dedicated Furni axios instance — does NOT touch global axios.defaults
const furniApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 seconds - prevents infinite hangs on slow networks
});

// ── Axios Retry Configuration ────────────────────────────────────────────────
axiosRetry(furniApi, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
      return true;
    }
    if (error.code === 'ECONNABORTED') {
      return true;
    }
    if (error.response?.status >= 500 && error.response?.status <= 599) {
      return true;
    }
    if (error.response?.status === 408 || error.response?.status === 429) {
      return true;
    }
    return false;
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`[Furni API Retry] Attempt ${retryCount} for ${requestConfig.url}`);
  },
});

// ── Request interceptor: attach in-memory portal token ────────────────────────────────────
furniApi.interceptors.request.use(
  async (config) => {
    // Skip token attachment if this is a retry with token already set
    if (config._tokenAlreadySet) {
      return config;
    }
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
    localStorage.removeItem("furniUserId");
    localStorage.removeItem("furniRole");
  } catch (_) {}

  toast.error(message);

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  } else {
    isLoggingOut = false;
  }
}

// ── Response interceptor: 401 refresh + error toasts ─────────────────────────
furniApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const isNetwork = !!error?.code && error.code === "ERR_NETWORK";
    const originalRequest = error.config;

    // 1. Session Expired — attempt portal token refresh before forcing logout
    if (status === 401 && !originalRequest._furniRetry) {
      originalRequest._furniRetry = true;
      try {
        const result = await refreshPortalToken();
        setPortalAccessToken(result.accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
        originalRequest._tokenAlreadySet = true;
        return furniApi(originalRequest);
      } catch (refreshError) {
        // CRITICAL: Only logout on actual session expiry, NOT on network errors
        if (refreshError.isNetworkError) {
          console.warn('[Furni API] Token refresh failed due to network error - NOT logging out');
          // Don't show toast here - OfflineBanner will handle it
          return Promise.reject(error);
        }
        if (refreshError.isSessionExpired) {
          forceLogout("Session expired. Please log in again.");
        } else {
          forceLogout("Authentication error. Please log in again.");
        }
        return Promise.reject(error);
      }
    }

    // 2. Other Errors — show toast, do NOT redirect
    let displayMessage = "";

    if (isNetwork) {
      // Don't show toast for network errors - OfflineBanner will handle it
      displayMessage = "";
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

export default furniApi;
