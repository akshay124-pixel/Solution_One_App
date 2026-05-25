/**
 * Hybrid notification sync: realtime via Socket.IO + polling fallback when socket is down.
 * Notifications remain authoritative in the database; socket only pushes deltas.
 */
import { useEffect, useRef } from "react";

const DEFAULT_POLL_MS = 60_000;
const FAST_POLL_MS = 20_000;

/**
 * @param {object} options
 * @param {() => Promise<void>} options.fetchNotifications
 * @param {import("socket.io-client").Socket | null} [options.socket]
 * @param {number} [options.intervalMs]
 */
export function useNotificationSync({
  fetchNotifications,
  socket = null,
  intervalMs = DEFAULT_POLL_MS,
}) {
  const fetchRef = useRef(fetchNotifications);
  fetchRef.current = fetchNotifications;

  useEffect(() => {
    let timer = null;
    const poll = () => fetchRef.current().catch(() => {});

    poll();

    const schedule = (ms) => {
      if (timer) clearInterval(timer);
      timer = setInterval(poll, ms);
    };

    schedule(intervalMs);

    if (!socket) return () => clearInterval(timer);

    const onConnect = () => schedule(intervalMs);
    const onDisconnect = () => schedule(FAST_POLL_MS);
    const onConnectError = () => schedule(FAST_POLL_MS);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (!socket.connected) schedule(FAST_POLL_MS);

    return () => {
      clearInterval(timer);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [socket, intervalMs]);
}
