/**
 * Service Axios Setup — dedicated instance for Service module
 * Token is read from in-memory PortalAuthContext
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
  process.env.REACT_APP_SERVICE_URL || "http://localhost:5050/api/service";

// Dedicated Service axios instance
const serviceApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 seconds - prevents infinite hangs on slow networks
});

// ── Axios Retry Configuration ────────────────────────────────────────────────
axiosRetry(serviceApi, {
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
    console.log(`[Service API Retry] Attempt ${retryCount} for ${requestConfig.url}`);
  },
});

// ── Request interceptor: attach in-memory portal token ────────────────────────
serviceApi.interceptors.request.use(
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
  } catch (_) {}

  toast.error(message);

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  } else {
    isLoggingOut = false;
  }
}

// ── Response interceptor: 401 refresh + error toasts ─────────────────────────
serviceApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const isNetwork = !!error?.code && error.code === "ERR_NETWORK";
    const originalRequest = error.config;

    // 1. Session Expired — attempt portal token refresh before forcing logout
    if (status === 401 && !originalRequest._serviceRetry) {
      originalRequest._serviceRetry = true;
      try {
        const result = await refreshPortalToken();
        setPortalAccessToken(result.accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
        originalRequest._tokenAlreadySet = true; // Prevent double token attachment
        return serviceApi(originalRequest);
      } catch (refreshError) {
        // CRITICAL: Only logout on actual session expiry, NOT on network errors
        if (refreshError.isNetworkError) {
          console.warn('[Service API] Token refresh failed due to network error - NOT logging out');
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
      displayMessage = "File too large. Please upload a smaller file.";
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

export default serviceApi;
