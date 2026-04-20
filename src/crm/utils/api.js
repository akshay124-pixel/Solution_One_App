import axios from "axios";
import { toast } from "react-toastify";
import { getCSRFToken, ensureCSRFToken } from "../../utils/csrfService";

// Create Axios instance
const api = axios.create({
    baseURL: process.env.REACT_APP_CRM_URL || "http://localhost:5050/api/crm",
    withCredentials: true, // Important for Cookies
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
        throw error;
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
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        
        // Ensure CSRF token is available for state-changing requests
        if (["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase())) {
            try {
                const csrfToken = getCSRFToken() || await ensureCSRFToken();
                if (csrfToken) {
                    config.headers["X-CSRF-Token"] = csrfToken;
                }
            } catch (err) {
                console.error("Failed to get CSRF token:", err);
            }
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
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Session expired:", refreshError);

                // Avoid toast loop on startup check or specific endpoints
                if (!originalRequest.url.includes("/auth/refresh")) {
                    toast.error("Session expired. Please log in again.", {
                        position: "top-right",
                        autoClose: 3000,
                        theme: "colored",
                    });
                }

                window.dispatchEvent(new Event("auth:logout"));
                return Promise.reject(refreshError);
            }
        }

        // Handle Network Errors
        if (error.message === "Network Error" && !originalRequest._retry) {
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
