/**
 * CSRF Token Service
 * Centralized CSRF token management for all modules
 * Handles fetching, storing, and providing CSRF tokens to API calls
 *
 * NOTE: CSRF fetch failures are non-fatal — login and API calls proceed
 * without the token if the endpoint is unreachable or redirected.
 * The backend must also treat a missing CSRF header as acceptable when
 * the request is authenticated via httpOnly cookie + Bearer token.
 */

let csrfToken = null;
let csrfTokenPromise = null;

// Build the CSRF endpoint URL once
const getCSRFUrl = () => {
  const base = process.env.REACT_APP_PORTAL_URL || "";
  return `${base}/api/auth/csrf-token`;
};

/**
 * Fetch CSRF token from backend.
 * Returns the token string on success, or null on any failure (non-fatal).
 */
export const fetchCSRFToken = async () => {
  // Return cached promise if already in-flight
  if (csrfTokenPromise) return csrfTokenPromise;

  // Return cached token if already fetched
  if (csrfToken) return csrfToken;

  csrfTokenPromise = (async () => {
    try {
      const csrfUrl = getCSRFUrl();

      const response = await fetch(csrfUrl, {
        method: "GET",
        credentials: "include",
        redirect: "follow", // follow redirects normally
        headers: { "Accept": "application/json" },
      });

      // Non-2xx — log and return null (non-fatal)
      if (!response.ok) {
        console.warn(`CSRF token fetch returned ${response.status} — proceeding without CSRF token.`);
        return null;
      }

      const data = await response.json();
      if (!data.csrfToken) {
        console.warn("CSRF response missing csrfToken field — proceeding without CSRF token.");
        return null;
      }

      csrfToken = data.csrfToken;
      return csrfToken;
    } catch (error) {
      // Network error, CORS, redirect to unreachable host, etc.
      // Log once and continue — do NOT block login.
      console.warn("CSRF token fetch failed (non-fatal):", error.message);
      return null;
    } finally {
      // Always clear the in-flight promise so next call retries fresh
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
};

/**
 * Get current CSRF token (synchronous).
 * Returns null if token hasn't been fetched yet.
 */
export const getCSRFToken = () => csrfToken;

/**
 * Set CSRF token manually (for testing or manual override).
 */
export const setCSRFToken = (token) => {
  csrfToken = token;
};

/**
 * Clear CSRF token (on logout).
 */
export const clearCSRFToken = () => {
  csrfToken = null;
  csrfTokenPromise = null;
};

/**
 * Ensure CSRF token is available.
 * Tries up to `retries` times, but always returns null instead of throwing
 * so callers are never blocked by a CSRF fetch failure.
 */
export const ensureCSRFToken = async (retries = 3) => {
  if (csrfToken) return csrfToken;

  for (let i = 0; i < retries; i++) {
    const token = await fetchCSRFToken();
    if (token) return token;

    // Small backoff before retry (skip on last attempt)
    if (i < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)));
    }
  }

  // Return null — callers must handle missing CSRF gracefully
  return null;
};
