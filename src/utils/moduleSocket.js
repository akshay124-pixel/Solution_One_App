/**
 * Shared Socket.IO client factory for portal-authenticated module sockets.
 * All module sockets run on the unified server origin with JWT in handshake.auth.
 */
import { io } from "socket.io-client";
import { getPortalAccessToken } from "../portal/PortalAuthContext";

/** Unified server origin (sockets are not mounted under /api/* prefixes). */
export function getModuleSocketOrigin() {
  const portal = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
  try {
    return new URL(portal).origin;
  } catch {
    return portal.replace(/\/api\/?.*$/, "") || window.location.origin;
  }
}

/**
 * @param {object} options
 * @param {string} options.path - e.g. "/sales/socket.io"
 * @param {import("socket.io-client").ManagerOptions & import("socket.io-client").SocketOptions} [options.socketOptions]
 */
export function createAuthenticatedSocket({ path, socketOptions = {} }) {
  const token = getPortalAccessToken();
  return io(getModuleSocketOrigin(), {
    path,
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
    ...socketOptions,
  });
}

/** Register connect handler that emits module "join" payload once connected. */
export function bindJoinOnConnect(socket, getJoinPayload) {
  const onConnect = () => {
    const payload = getJoinPayload();
    if (payload?.userId) {
      socket.emit("join", payload);
    }
  };
  socket.on("connect", onConnect);
  return () => socket.off("connect", onConnect);
}

/** Disconnect and remove all listeners for a socket instance. */
export function teardownSocket(socket, eventNames = []) {
  if (!socket) return;
  eventNames.forEach((ev) => socket.off(ev));
  socket.removeAllListeners();
  socket.disconnect();
}
