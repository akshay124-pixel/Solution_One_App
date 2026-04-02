import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from "react";
import api, { setAccessToken, refreshAccessToken } from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingTimeout, setLoadingTimeout] = useState(false);

    const initialized = React.useRef(false);

    // Initial Session Check (Silent Login) - Runs ONCE
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Set timeout for loading state
        const timeoutId = setTimeout(() => {
            if (loading) {
                setLoadingTimeout(true);
                console.warn("Session check taking longer than expected");
            }
        }, 5000); // 5 second timeout

        const initSession = async () => {
            let authStatus = false;
            let userData = null;
            try {
                // If a token is already set (e.g. pre-seeded by unified portal CRMApp),
                // decode it to get user data without making a refresh call.
                const { getAccessToken } = require("../utils/api");
                const existingToken = getAccessToken();
                if (existingToken) {
                    try {
                        // Decode without verification (server already verified it)
                        const base64Payload = existingToken.split(".")[1];
                        const payload = JSON.parse(atob(base64Payload));
                        if (payload && payload.id && payload.exp * 1000 > Date.now()) {
                            // Normalize role to CRM-expected strings
                            const crmRoleMap = { Admin: "admin", SuperAdmin: "superadmin", others: "salesperson" };
                            const role = crmRoleMap[payload.role] || payload.role;
                            userData = {
                                id: payload.id,
                                _id: payload.id,
                                username: payload.username,
                                email: payload.email,
                                role,
                            };
                            authStatus = true;
                            return; // Skip refresh
                        }
                    } catch (_) {
                        // Malformed token — fall through to refresh
                    }
                }
                // Use coordinated refresh to prevent duplicate attempts
                const result = await refreshAccessToken();

                if (result.success) {
                    // Normalize role to CRM-expected strings
                    const crmRoleMap = { Admin: "admin", SuperAdmin: "superadmin", others: "salesperson" };
                    if (result.user) {
                        result.user = {
                            ...result.user,
                            role: crmRoleMap[result.user.role] || result.user.role,
                        };
                    }
                    userData = result.user;
                    authStatus = true;
                }
            } catch (error) {
                // Differentiate between error types
                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Expected — no active session
                } else if (error.message === "Network Error") {
                    console.warn("Network error during session check");
                } else {
                    console.error("Session check error:", error);
                }
            } finally {
                setUser(userData);
                setIsAuthenticated(authStatus);
                setLoading(false);
                setLoadingTimeout(false);
                clearTimeout(timeoutId);
            }
        };

        initSession();

        // Listen for axios logout event
        const handleLogoutEvent = () => {
            setIsAuthenticated(false);
            setUser(null);
            setAccessToken(null);
        };

        window.addEventListener("auth:logout", handleLogoutEvent);
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener("auth:logout", handleLogoutEvent);
        };
    }, []);

    // Memoized login to prevent re-creation
    const login = useCallback(async (email, password) => {
        try {
            const axios = require("axios");
            const response = await axios.post(
                `${process.env.REACT_APP_PORTAL_URL || "http://localhost:5050"}/api/auth/login`,
                { email, password },
                { withCredentials: true }
            );
            if (response.data.success) {
                const { accessToken, user } = response.data;
                setAccessToken(accessToken);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
        } catch (error) {
            console.error("Login failed:", error);
            return {
                success: false,
                message: error.response?.data?.message || "Login failed"
            };
        }
    }, []);

    // Memoized signup — uses unified portal endpoint
    const signup = useCallback(async (userData) => {
        try {
            const axios = require("axios");
            const response = await axios.post(
                `${process.env.REACT_APP_PORTAL_URL || "http://localhost:5050"}/api/auth/signup`,
                userData,
                { withCredentials: true }
            );
            if (response.data.success) {
                const { accessToken, user } = response.data;
                setAccessToken(accessToken);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, message: "Signup failed." };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Signup failed"
            };
        }
    }, []);

    // Memoized logout - NO window.location.href, returns callback for navigation
    const logout = useCallback(async () => {
        try {
            const axios = require("axios");
            await axios.post(
                `${process.env.REACT_APP_PORTAL_URL || "http://localhost:5050"}/api/auth/logout`,
                {},
                { withCredentials: true }
            );
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    const role = user?.role || null;
    const userId = user?._id || user?.id || null;

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(
        () => ({
            isAuthenticated,
            loading,
            loadingTimeout,
            user,
            role,
            userId,
            login,
            logout,
            signup
        }),
        [isAuthenticated, loading, loadingTimeout, user, role, userId, login, logout, signup]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
