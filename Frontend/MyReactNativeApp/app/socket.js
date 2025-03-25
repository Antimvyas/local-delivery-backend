import io from "socket.io-client";

const SOCKET_URL = "http://192.168.0.111:3000"; // Change to your backend IP
const socket = io(SOCKET_URL, { transports: ["websocket"] });

socket.on("updateOrdersList", (orders) => {
  console.log("📜 Updated Order List:", orders);
  // Update UI with new orders
});

export default socket;
