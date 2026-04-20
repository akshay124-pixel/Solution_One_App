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
      const response = await fetch(
        (process.env.REACT_APP_PORTAL_URL) + "/api/auth/csrf-token",
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

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
