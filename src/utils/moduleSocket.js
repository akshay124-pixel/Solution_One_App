/**
 * Shared Socket.IO client for portal-authenticated module sockets.
 *
 * Production nginx (Hostinger) — client `path` must match location blocks exactly:
 *   crm     REACT_APP_CRM_SOCKET_PATH=/api/crm/socket.io   → Node /crm/socket.io
 *   sales   REACT_APP_SO_SOCKET_PATH=/api/so/socket.io      → Node /sales/socket.io
 *   furni   REACT_APP_FURNI_SOCKET_PATH=/api/furni/socket.io → Node /furni/socket.io
 *   service REACT_APP_SERVICE_SOCKET_PATH=/service/socket.io (no /api prefix)
 *
 * Dev (localhost:5050): use paths in myapp/.env without /api prefix.
 */
import { io } from "socket.io-client";
import { getPortalAccessToken } from "../portal/PortalAuthContext";

/** Engine.IO paths exposed to the client (nginx may prefix with /api/* in production). */
export const MODULE_SOCKET_PATHS = {
  crm: process.env.REACT_APP_CRM_SOCKET_PATH || "/crm/socket.io",
  sales: process.env.REACT_APP_SO_SOCKET_PATH || "/sales/socket.io",
  furni: process.env.REACT_APP_FURNI_SOCKET_PATH || "/furni/socket.io",
  service: process.env.REACT_APP_SERVICE_SOCKET_PATH || "/service/socket.io",
};

/** @param {"crm"|"sales"|"furni"|"service"} module */
export function getModuleSocketPath(module) {
  return MODULE_SOCKET_PATHS[module] || `/${module}/socket.io`;
}

/** Unified server origin (sockets are not under /api/* URL prefixes). */
export function getModuleSocketOrigin() {
  const portal = process.env.REACT_APP_PORTAL_URL || "http://localhost:5050";
  try {
    return new URL(portal).origin;
  } catch {
    return portal.replace(/\/api\/?.*$/, "") || window.location.origin;
  }
}

const DEFAULT_SOCKET_OPTIONS = {
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: 8,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.4,
  timeout: 20000,
  withCredentials: true,
};

/** @type {Map<string, import("socket.io-client").Socket>} */
const socketByPath = new Map();

/** @type {Map<string, number>} */
const refCountByPath = new Map();

function buildAuthPayload() {
  const token = getPortalAccessToken();
  return { token: token ? String(token) : "" };
}

/**
 * Acquire a shared socket for a path. Reference-counted; last release disconnects.
 * @param {object} options
 * @param {string} [options.path]
 * @param {"crm"|"sales"|"furni"|"service"} [options.module]
 * @param {import("socket.io-client").ManagerOptions & import("socket.io-client").SocketOptions} [options.socketOptions]
 */
export function acquireModuleSocket({ path, module, socketOptions = {} } = {}) {
  const resolvedPath = path || (module ? getModuleSocketPath(module) : null);
  if (!resolvedPath) {
    throw new Error("acquireModuleSocket requires path or module");
  }

  let socket = socketByPath.get(resolvedPath);
  if (!socket) {
    socket = io(getModuleSocketOrigin(), {
      ...DEFAULT_SOCKET_OPTIONS,
      path: resolvedPath,
      auth: buildAuthPayload(),
      ...socketOptions,
    });
    socket.io.on("reconnect_attempt", (attempt) => {
      if (attempt > 3) {
        console.warn(`[Socket] ${resolvedPath} reconnect attempt ${attempt}`);
      }
    });
    socket.on("connect_error", () => {
      socket.auth = buildAuthPayload();
    });
    socketByPath.set(resolvedPath, socket);
    refCountByPath.set(resolvedPath, 0);
  } else {
    socket.auth = buildAuthPayload();
  }

  refCountByPath.set(resolvedPath, (refCountByPath.get(resolvedPath) || 0) + 1);
  return socket;
}

/** Release a shared socket reference; disconnects when refcount hits zero. */
export function releaseModuleSocket(pathOrSocket) {
  const resolvedPath =
    typeof pathOrSocket === "string"
      ? pathOrSocket
      : socketByPath.entries().find(([, s]) => s === pathOrSocket)?.[0];
  if (!resolvedPath) return;

  const count = Math.max(0, (refCountByPath.get(resolvedPath) || 1) - 1);
  refCountByPath.set(resolvedPath, count);
  if (count > 0) return;

  const socket = socketByPath.get(resolvedPath);
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socketByPath.delete(resolvedPath);
    refCountByPath.delete(resolvedPath);
  }
}

/**
 * @param {object} options
 * @param {string} [options.path]
 * @param {"crm"|"sales"|"furni"|"service"} [options.module]
 * @param {import("socket.io-client").ManagerOptions & import("socket.io-client").SocketOptions} [options.socketOptions]
 */
export function createAuthenticatedSocket({ path, module, socketOptions = {} } = {}) {
  return acquireModuleSocket({ path, module, socketOptions });
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

/** Disconnect and remove listeners; decrements singleton refcount when path known. */
export function teardownSocket(socket, eventNames = [], path) {
  if (!socket) return;
  eventNames.forEach((ev) => socket.off(ev));
  if (path) {
    releaseModuleSocket(path);
    return;
  }
  releaseModuleSocket(socket);
}
