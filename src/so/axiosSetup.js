/**
 * SO Axios Setup — dedicated instance (does NOT mutate global axios).
 * Token is read from in-memory PortalAuthContext, never from localStorage.
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
  process.env.REACT_APP_SO_URL || "http://localhost:5050/api/so";

// Dedicated SO axios instance — does NOT touch global axios.defaults
const soApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 seconds - prevents infinite hangs on slow networks
});

// ── Axios Retry Configuration ────────────────────────────────────────────────
// Automatically retry failed requests due to network errors, timeouts, or 5xx errors
axiosRetry(soApi, {
  retries: 3, // Retry up to 3 times
  retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s delays
  retryCondition: (error) => {
    // Retry on network errors (no response received)
    if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
      return true;
    }
    // Retry on timeout errors
    if (error.code === 'ECONNABORTED') {
      return true;
    }
    // Retry on 5xx server errors
    if (error.response?.status >= 500 && error.response?.status <= 599) {
      return true;
    }
    // Retry on 408 Request Timeout and 429 Too Many Requests
    if (error.response?.status === 408 || error.response?.status === 429) {
      return true;
    }
    // Do NOT retry 4xx client errors (except 408, 429)
    return false;
  },
  onRetry: (retryCount, error, requestConfig) => {
    console.log(`[SO API Retry] Attempt ${retryCount} for ${requestConfig.url}`);
  },
});

// ── Request interceptor: attach in-memory portal token ────────────────────────────────────
soApi.interceptors.request.use(
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
        originalRequest._tokenAlreadySet = true;
        return soApi(originalRequest);
      } catch (refreshError) {
        // CRITICAL: Only logout on actual session expiry, NOT on network errors
        if (refreshError.isNetworkError) {
          console.warn('[SO API] Token refresh failed due to network error - NOT logging out');
          // Don't show toast here - OfflineBanner will handle it
          return Promise.reject(error);
        }
        // Only logout when session is actually expired (401/403 from refresh endpoint)
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

export default soApi;
