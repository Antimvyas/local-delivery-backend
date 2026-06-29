import io from "socket.io-client";
import { BASE_IP } from "./config1.js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, showSuccess } from './utils/toastHelper';

const socket = io(BASE_IP, {
  transports: ["websocket"],
  autoConnect: false, // Wait until we have a token
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});

let isDisconnected = false;

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
  // 'io server disconnect' means the server closed it, 'transport close' means network loss
  if (reason !== "io client disconnect" && !isDisconnected) {
    showError("Connection lost. Reconnecting...", "Network Warning");
    isDisconnected = true;
  }
});

socket.on("connect_error", (error) => {
  console.log("Socket connect error:", error.message);
  if (!isDisconnected) {
    showError("Connection lost. Reconnecting...", "Network Warning");
    isDisconnected = true;
  }
});

socket.on("connect", () => {
  console.log("Socket connected!");
  if (isDisconnected) {
    showSuccess("Reconnected to server!", "Connection Restored");
    isDisconnected = false;
  }
});

export const connectSocket = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;

