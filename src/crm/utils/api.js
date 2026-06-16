import axios from "axios";
import axiosRetry from "axios-retry";
import { toast } from "react-toastify";


// Create Axios instance
const api = axios.create({
    baseURL: process.env.REACT_APP_CRM_URL || "http://localhost:5050/api/crm",
    withCredentials: true, // Important for Cookies
    timeout: 30000, // 30 seconds - prevents infinite hangs on slow networks
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
    console.log(`[CRM API Retry] Attempt ${retryCount} for ${requestConfig.url}`);
  },
});

// Memory Storage for Access Token and Refresh Logic
let accessToken = null;

// Coordinated refresh promise to prevent duplicate attempts
let refreshPromise = null;

export const setAccessToken = (token) => {
    accessToken = token;
};

// Coordinated refresh function
export const refreshAccessToken = async () => {
    // If refresh is already in progress, return the existing promise
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = axios.post(
        `${process.env.REACT_APP_PORTAL_URL || "http://localhost:5050"}/api/auth/refresh`,
        {},
        { withCredentials: true }
    )
    .then(response => {
        if (response.data.success && response.data.accessToken) {
            setAccessToken(response.data.accessToken);
            return {
                success: true,
                accessToken: response.data.accessToken,
                user: response.data.user
            };
        }
        throw new Error('Refresh failed');
    })
    .catch(error => {
        setAccessToken(null);
        // Enhanced error information for better handling
        const isNetworkError = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error';
        const isSessionExpired = error.response?.status === 401 || error.response?.status === 403;
        const enhancedError = new Error(error.message || 'Token refresh failed');
        enhancedError.isNetworkError = isNetworkError;
        enhancedError.isSessionExpired = isSessionExpired;
        enhancedError.originalError = error;
        throw enhancedError;
    })
    .finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
};

export const getAccessToken = () => accessToken;

// Request Interceptor
api.interceptors.request.use(
    async (config) => {
        // Skip token attachment if this is a retry with token already set
        if (config._tokenAlreadySet) {
            return config;
        }
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loops and only handle 401s
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Use coordinated refresh
                const result = await refreshAccessToken();
                
                // Update header for the original request
                originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
                originalRequest._tokenAlreadySet = true;
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Token refresh error:", refreshError);

                // CRITICAL: Only logout on actual session expiry, NOT on network errors
                if (refreshError.isNetworkError) {
                    console.warn('[CRM API] Token refresh failed due to network error - NOT logging out');
                    if (!originalRequest.url.includes("/auth/refresh")) {
                        toast.error("Connection lost. Please check your internet.", {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored",
                            toastId: 'crm-network-error',
                        });
                    }
                    return Promise.reject(refreshError);
                }

                // Only logout when session is actually expired
                if (refreshError.isSessionExpired) {
                    if (!originalRequest.url.includes("/auth/refresh")) {
                        toast.error("Session expired. Please log in again.", {
                            position: "top-right",
                            autoClose: 3000,
                            theme: "colored",
                        });
                    }
                    window.dispatchEvent(new Event("auth:logout"));
                } else {
                    // Other errors (unlikely but handle gracefully)
                    toast.error("Authentication error. Please log in again.", {
                        position: "top-right",
                        autoClose: 3000,
                        theme: "colored",
                    });
                    window.dispatchEvent(new Event("auth:logout"));
                }
                
                return Promise.reject(refreshError);
            }
        }

        // Handle Network Errors
        const isNetwork = error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error';
        if (isNetwork && !originalRequest._retry) {
            toast.error("Network problem. Please check your connection.", {
                position: "top-right",
                autoClose: 3000,
                theme: "colored",
            });
        }

        return Promise.reject(error);
    }
);

export default api;
