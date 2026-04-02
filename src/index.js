import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import reportWebVitals from "./crm/reportWebVitals";

// ── Sentry initialization ─────────────────────────────────────────────────────
// Only initializes when REACT_APP_SENTRY_DSN is set in .env
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn:              process.env.REACT_APP_SENTRY_DSN,
    environment:      process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    // Ignore common non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
  });
}

// ── Sentry fallback UI shown when the ErrorBoundary catches an error ──────────
const SentryFallback = ({ error, resetError }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100vh", padding: "2rem",
    fontFamily: "system-ui, sans-serif", textAlign: "center",
  }}>
    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
    <h2 style={{ color: "#1e293b", marginBottom: "0.5rem" }}>Something went wrong</h2>
    <p style={{ color: "#64748b", marginBottom: "1.5rem", maxWidth: 400 }}>
      An unexpected error occurred. Our team has been notified automatically.
    </p>
    <button
      onClick={resetError}
      style={{
        background: "#3b82f6", color: "#fff", border: "none",
        borderRadius: 8, padding: "10px 24px", fontSize: 14,
        cursor: "pointer", fontWeight: 600,
      }}
    >
      Try Again
    </button>
    {process.env.NODE_ENV !== "production" && (
      <pre style={{
        marginTop: "1.5rem", padding: "1rem", background: "#f1f5f9",
        borderRadius: 8, fontSize: 12, color: "#ef4444",
        maxWidth: 600, overflow: "auto", textAlign: "left",
      }}>
        {error?.message}
      </pre>
    )}
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={SentryFallback} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
