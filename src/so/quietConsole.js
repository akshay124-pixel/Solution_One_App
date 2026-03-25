// Suppress noisy console output in production builds
if (process.env.NODE_ENV === "production") {
  try {
    // Keep console.error visible; silence others
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
  } catch (_) {
    // ignore
  }
}
