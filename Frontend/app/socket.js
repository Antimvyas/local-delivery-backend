import io from "socket.io-client";
import { BASE_IP } from "./config1.js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, showSuccess } from './utils/toastHelper';

// Use a global reference to guarantee a strict singleton across bundle re-evaluations
if (!global.socketInstance) {
  global.socketInstance = io(BASE_IP, {
    transports: ["websocket"],
    autoConnect: false, // Wait until we have a token
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });
}

const socket = global.socketInstance;
let isDisconnected = false;
let isConnecting = false;

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
  isConnecting = false;
  // 'io server disconnect' means the server closed it, 'transport close' means network loss
  if (reason !== "io client disconnect" && !isDisconnected) {
    showError("Connection lost. Reconnecting...", "Network Warning");
    isDisconnected = true;
  }
});

socket.on("connect_error", (error) => {
  console.log("Socket connect error:", error.message);
  isConnecting = false;
  if (!isDisconnected) {
    showError("Connection lost. Reconnecting...", "Network Warning");
    isDisconnected = true;
  }
});

socket.on("connect", () => {
  console.log("Socket connected!");
  isConnecting = false;
  if (isDisconnected) {
    showSuccess("Reconnected to server!", "Connection Restored");
    isDisconnected = false;
  }
});

export const connectSocket = async () => {
  if (socket.connected || isConnecting) {
    return;
  }
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    isConnecting = true;
    socket.auth = { token };
    socket.connect();
  }
};

export const disconnectSocket = () => {
  isConnecting = false;
  socket.disconnect();
};

export default socket;


