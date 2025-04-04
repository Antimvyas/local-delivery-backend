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
    if (!vendor_id) return;
  
    console.log(`🎧 Listening for vendor-${vendor_id}-order-updated events...`);
  
    const handleOrderUpdate = (data) => {
      console.log("🔄 Order Updated:", data);
      playNotificationSound();
      fetchOrders()
      // ✅ Remove the accepted/rejected order from pending list
      setOrders((prevOrders) => prevOrders.filter(order => order.order_id !== data.order_id));
  
      // ✅ If order was rejected, close modal
      if (data.status === "Rejected") {
        setIsModalVisible(false);
      }
    };
  
    socket.on(`vendor-${vendor_id}-order-updated`, handleOrderUpdate);
  
    return () => {
      console.log(`❌ Removing listener for vendor-${vendor_id}-order-updated`);
      socket.off(`vendor-${vendor_id}-order-updated`, handleOrderUpdate);
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
      console.log("da", setOrders(response.data));

      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  const playNotificationSound = () => {
    console.log("🔔 Playing notification sound...");
  
    notificationSound.current = new Sound("notify.mp3", Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log("❌ Sound load error:", error);
        return;
      }
      notificationSound.current.play((success) => {
        if (!success) console.log("❌ Sound playback failed");
      });
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
      Alert.alert("Error", "Order ID is missing.");
      return;
    }
  
    console.log("✅ Accepting order:", newOrder.order_id);
  
    socket.emit("acceptOrder", {
      order_id: newOrder.order_id,
      customer_id: newOrder.customer_id,
      vendor_id: vendor_id, // Send vendor_id for proper broadcasting
    });
  
    Alert.alert("Success", "Order Accepted!");
    stopNotificationSound();
    setIsModalVisible(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders(); // Refresh order list
  };
  


  const handleRejectOrder = async () => {
    if (!newOrder || !newOrder.order_id) return;
  
    console.log("❌ Rejecting order:", newOrder.order_id);
  
    socket.emit("rejectOrder", {
      order_id: newOrder.order_id,
      customer_id: newOrder.customer_id,
      vendor_id: vendor_id,
    });
  
    Alert.alert("Order Rejected", "You have rejected the order.");
    stopNotificationSound();
    setIsModalVisible(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders();
  };
  
  console.log("f", orders);

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
