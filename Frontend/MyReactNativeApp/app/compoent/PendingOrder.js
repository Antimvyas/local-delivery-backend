import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, AppState
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import axios from "axios";
import socket from "../socket"; // WebSocket connection
import Sound from "react-native-sound"; 
import BackgroundTimer from "react-native-background-timer"; 
import API_BASE from "../config1.js";
import EventEmitter from "events";
 // Event emitter for cross-screen updates

const eventEmitter = new EventEmitter();

const PendingOrder = ({ navigation, route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const vendor_id = route.params?.vendor_id;
  const appState = useRef(AppState.currentState);
  let notificationSound = useRef(null);

  useEffect(() => {
    if (!vendor_id) {
      Alert.alert("Error", "Vendor ID not found!", [{ text: "Go Back", onPress: () => navigation.goBack() }]);
      return;
    }

    fetchOrders();
    checkStoredOrders(); 

    socket.emit("registerVendor", vendor_id);

    socket.on("newOrderNotification", async (data) => {
      console.log("🔔 New Order Received:", data);
      playNotificationSound();
      await AsyncStorage.setItem("newOrder", JSON.stringify(data)); 
      // console.log("datta",await AsyncStorage.setItem("newOrder", JSON.stringify(data)) );
      
      console.log("l",data);
      
      setNewOrder(data);
      setIsModalVisible(true);
      
      eventEmitter.emit("SHOW_MODAL", data); // ✅ Send event to show modal on any screen
    });

    socket.on("orderAutoRejected", (data) => {
      console.log("🚫 Order Auto-Rejected:", data);
      fetchOrders();
      Alert.alert("Order Rejected", "This order was automatically rejected after 5 minutes.");
    });

    BackgroundTimer.runBackgroundTimer(() => {
      if (!socket.connected) {
        socket.connect();
        socket.emit("registerVendor", vendor_id);
      }
    }, 10000); 

    const handleAppStateChange = async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        console.log("🔄 App moved to Foreground");
        checkStoredOrders(); 
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    
    const modalListener = eventEmitter.addListener("SHOW_MODAL", (order) => {
      console.log("🔔 Show modal event received", order);
      setNewOrder(order);
      setIsModalVisible(true);
      playNotificationSound();
    });
    
    // ✅ Fix: Use removeAllListeners instead of .remove()
    return () => {
      socket.off("newOrderNotification");
      socket.off("orderAutoRejected");
      BackgroundTimer.stopBackgroundTimer();
      subscription.remove();
      eventEmitter.removeAllListeners("SHOW_MODAL"); // ✅ Fixes the issue
    };
    
  }, [vendor_id]);

  const checkStoredOrders = async () => {
    const storedOrder = await AsyncStorage.getItem("newOrder");
    if (storedOrder) {
      const order = JSON.parse(storedOrder);
      setNewOrder(order);
      setIsModalVisible(true);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vendor/orders`, { params: { vendor_id } });
      setOrders(response.data);
      console.log("da",setOrders(response.data));
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    notificationSound.current = new Sound("notify.mp3", Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log("❌ Sound load error:", error);
        return;
      }
      notificationSound.current.play();
    });
  };

  const stopNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.stop(() => {
        console.log("🔇 Notification sound stopped");
      });
      notificationSound.current.release();
      notificationSound.current = null;
    }
  };

  const handleAcceptOrder = async () => {
    if (!newOrder || !newOrder.order_id) {
      console.log("❌ Error: Missing order_id");
      return;
    }
  
    socket.emit("acceptOrder", { 
      order_id: newOrder.order_id, 
      customer_id: newOrder.customer_id,
      vendor_id: vendor_id // Ensure vendor_id is sent
    });
  
    Alert.alert("Order Accepted", "You have accepted the order.");
    stopNotificationSound();
    setIsModalVisible(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders();
  };
  

  const handleRejectOrder = async () => {
    if (!newOrder) return;
    
    socket.emit("rejectOrder", { order_id: newOrder.order_id, customer_id: newOrder.customer_id });
    Alert.alert("Order Rejected", "You have rejected the order.");
    stopNotificationSound();
    setIsModalVisible(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders();
  };
  console.log("f",orders);
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Orders</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5733" />
      ) : orders.length === 0 ? (
        <Text style={styles.noOrdersText}>No pending orders.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <Text style={styles.orderText}>Customer: {item.customer_name}</Text>
              <Text style={styles.orderText}>Total: ₹{item.total_cost}</Text>
              <Text style={styles.orderText}>Status: {item.order_status}</Text>
            </View>
          )}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>New Order Received</Text>
            <Text>Customer: {newOrder?.customer_name}</Text>
            <Text>Total: ₹{newOrder?.total_cost}</Text>

            <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptOrder}>
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rejectButton} onPress={handleRejectOrder}>
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PendingOrder;







// ✅ Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#FF5733" },
  noOrdersText: { textAlign: "center", fontSize: 16, marginTop: 20, color: "#666" },
  orderCard: { backgroundColor: "#FFD700", padding: 15, borderRadius: 10, marginVertical: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center", width: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  acceptButton: { backgroundColor: "green", padding: 10, marginTop: 10, borderRadius: 5, width: "80%", alignItems: "center" },
  rejectButton: { backgroundColor: "red", padding: 10, marginTop: 5, borderRadius: 5, width: "80%", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
