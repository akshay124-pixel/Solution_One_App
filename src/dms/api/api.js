/**
 * DMS API — unified portal version
 * Uses the portal access token from PortalAuthContext instead of DMS localStorage auth.
 * Base URL points to /api/dms on the unified server.
 */
import axios from "axios";
import axiosRetry from "axios-retry";
import { getPortalAccessToken, setPortalAccessToken } from "../../portal/PortalAuthContext";


const BASE_URL = (process.env.REACT_APP_PORTAL_URL || "http://localhost:5050") + "/api/dms";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds - standard requests (reduced from 120s)
  headers: { "Content-Type": "application/json" },
});

// ── Axios Retry Configuration ────────────────────────────────────────────────
axiosRetry(api, {
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
    console.log(`[DMS API Retry] Attempt ${retryCount} for ${requestConfig.url}`);
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// Attach portal access token to every request
api.interceptors.request.use(async (config) => {
  // Skip token attachment if this is a retry with token already set
  if (config._tokenAlreadySet) {
    return config;
  }
  const token = getPortalAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// On 401, trigger portal token refresh via the portal's refresh endpoint
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { 
            originalRequest.headers.Authorization = `Bearer ${token}`;
            originalRequest._tokenAlreadySet = true;
            return api(originalRequest); 
          })
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        // Ask portal to refresh — uses httpOnly cookie
        const refreshRes = await axios.post(
          (process.env.REACT_APP_PORTAL_URL || "http://localhost:5050") + "/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        const newToken = refreshRes.data.accessToken;
        // Update in-memory token so all subsequent requests use the new token
        setPortalAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        originalRequest._tokenAlreadySet = true;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // CRITICAL: Only logout on actual session expiry, NOT on network errors
        const isNetworkError = refreshError.code === 'ERR_NETWORK' || refreshError.code === 'ECONNABORTED' || refreshError.message === 'Network Error';
        const isSessionExpired = refreshError.response?.status === 401 || refreshError.response?.status === 403;
        
        if (isNetworkError) {
          console.warn('[DMS API] Token refresh failed due to network error - NOT logging out');
          // Don't redirect to login on network errors
          return Promise.reject(refreshError);
        }
        
        // Only redirect to login when session is actually expired
        if (isSessionExpired) {
          window.location.href = "/login";
        } else {
          // Other errors - redirect to login
          window.location.href = "/login";
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Add network error handling
    const isNetwork = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error';
    if (isNetwork) {
      console.error('[DMS API] Network error:', error);
      // Let the error propagate for component-level handling
    }
    
    return Promise.reject(error);
  }
);

// ── Compatibility shims so DMS components that call getAuthData() / logout() still work ──

export const getAuthData = () => {
  const token = getPortalAccessToken();
  const userStr = localStorage.getItem("user");
  let user = null;
  try { user = userStr ? JSON.parse(userStr) : null; } catch (_) {}
  return { accessToken: token, refreshToken: null, user };
};

export const setAuthData = () => { /* no-op: portal manages auth */ };
export const clearAuthData = () => { /* no-op: portal manages auth */ };
export const logout = () => { window.location.href = "/login"; };
export const setNavigationFunction = () => {};
export const clearNavigationFunction = () => {};

export default api;
export { BASE_URL };
