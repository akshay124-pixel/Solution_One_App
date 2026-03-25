import { toast } from "react-toastify";

// Prevent duplicate toasts globally by assigning a stable toastId based on message
// and skipping if a toast with the same id is already active.
(function setupToastDedupe() {
  try {
    const types = ["error", "success", "info", "warn"];
    types.forEach((t) => {
      const original = toast[t];
      toast[t] = (message, options = {}) => {
        const id = options.toastId ?? (typeof message === "string" ? message : JSON.stringify(message));
        if (id && toast.isActive(id)) return id;
        return original(message, { ...options, toastId: id });
      };
    });
  } catch (_) {
    // If react-toastify is not available yet, ignore
  }
})();
