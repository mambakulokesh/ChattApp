import { io } from "socket.io-client";

export const socket = io("http://38.77.155.139:8000/", {
  reconnection: true,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: false,
});

