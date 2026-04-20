/**
 * CSRF Token Service
 * Centralized CSRF token management for all modules
 * Handles fetching, storing, and providing CSRF tokens to API calls
 */

let csrfToken = null;
let csrfTokenPromise = null;

/**
 * Fetch CSRF token from backend
 * Uses caching to avoid multiple requests
 */
export const fetchCSRFToken = async () => {
  // If already fetching, return existing promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // If already have token, return it
  if (csrfToken) {
    return csrfToken;
  }

  csrfTokenPromise = (async () => {
    try {
      // Use REACT_APP_PORTAL_URL — must be set in production (e.g. https://srv988392.hstgr.cloud).
      // Fallback to empty string so the URL is always relative-safe; never use localhost in production.
      const portalBase =
        process.env.REACT_APP_PORTAL_URL ||
        (typeof window !== "undefined"
          ? window.location.origin  // relative fallback: same origin as the app
          : "");

      const csrfUrl = `${portalBase}/api/auth/csrf-token`;

      const response = await fetch(csrfUrl, {
        method: "GET",
        credentials: "include",
        // "manual" prevents fetch from silently following a 301/302 redirect to
        // a different origin (e.g. localhost:5050) which would cause a CORS failure.
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // A redirect (opaqueredirect type) means the server is misconfigured —
      // surface a clear error instead of a confusing CORS failure.
      if (response.type === "opaqueredirect") {
        throw new Error(
          `CSRF endpoint returned a redirect. Check that ${csrfUrl} is served directly and not redirected by nginx/proxy.`
        );
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      if (!data.csrfToken) {
        throw new Error("No CSRF token in response");
      }
      
      csrfToken = data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.error("Error fetching CSRF token:", error);
      csrfTokenPromise = null;
      throw error;
    }
  })();

  return csrfTokenPromise;
};

/**
 * Get current CSRF token (synchronous)
 * Returns null if token hasn't been fetched yet
 */
export const getCSRFToken = () => {
  return csrfToken;
};

/**
 * Set CSRF token manually (for testing or manual override)
 */
export const setCSRFToken = (token) => {
  csrfToken = token;
};

/**
 * Clear CSRF token (on logout)
 */
export const clearCSRFToken = () => {
  csrfToken = null;
  csrfTokenPromise = null;
};

/**
 * Ensure CSRF token is available
 * Fetches if not already cached
 * Retries up to 3 times on failure
 */
export const ensureCSRFToken = async (retries = 3) => {
  if (csrfToken) {
    return csrfToken;
  }

  for (let i = 0; i < retries; i++) {
    try {
      await fetchCSRFToken();
      if (csrfToken) {
        return csrfToken;
      }
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }

  throw new Error("Failed to fetch CSRF token after retries");
};
