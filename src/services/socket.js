import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

let socket = null;

export function connectSocket({ technicianId, role = "technician" }) {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    path: "/socket.io",
    auth: { technicianId, role },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.debug("[socket] Connected:", socket.id);
  });
  socket.on("disconnect", (reason) => {
    console.debug("[socket] Disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("[socket] Connection error:", err.message);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
