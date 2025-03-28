import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, AppState } from "react-native";
import axios from "axios";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";
import socket from "../socket"; // WebSocket connection
// import PushNotification from "react-native-push-notification";

const MyOrdersScreen = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const customer_id = route.params?.customer_id;

  useEffect(() => {
    console.log("order", customer_id);

    if (!customer_id) {
      console.error("Customer ID missing!");
      return;
    }

    fetchOrders();

    // ✅ Listen for order updates in real-time
    socket.on(`customer-${customer_id}-order-updated`, (data) => {
      console.log("🔄 Order Status Updated:", data);

      if (data.status) {
        setOrderStatus(data.status);
        setCurrentOrder(data);
        setIsModalVisible(true);

        // ✅ Show push notification if app is in background or closed
        if (AppState.currentState !== "active") {
          showPushNotification(data.status);
        }
      }
    });

    return () => {
      socket.off(`customer-${customer_id}-order-updated`);
    };
  }, [customer_id]);

  // ✅ Fetch orders from backend
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/customer/orders?customer_id=${customer_id}`);
      const groupedOrders = groupOrdersById(response.data);
      setOrders(groupedOrders);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  // ✅ Push Notification Function
  const showPushNotification = (status) => {
    PushNotification.localNotification({
      title: "Order Update",
      message: `Your order is now ${status}`,
      playSound: true,
      soundName: "default",
    });
  };

  // ✅ Grouping orders by order_id to show in a single card
  const groupOrdersById = (orders) => {
    const grouped = orders.reduce((acc, order) => {
      const { order_id, total_cost, shop_name, food_name, quantity, order_status } = order;
      if (!acc[order_id]) {
        acc[order_id] = { order_id, total_cost, shop_name, items: [], order_status };
      }
      acc[order_id].items.push({ food_name, quantity });
      return acc;
    }, {});
    return Object.values(grouped);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#FF4500" />
      ) : orders.length === 0 ? (
        <Text style={styles.noOrders}>No orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={({ item }) => (
            <ScrollView>
              <View style={styles.card}>
                <Text style={styles.orderText}>Order ID: {item.order_id}</Text>
                <Text style={styles.orderText}>Total Cost: ₹{item.total_cost}</Text>
                <Text style={styles.orderText}>Vendor: {item.shop_name}</Text>
                <Text style={styles.orderText}>Food Items:</Text>
                {item.items.map((foodItem, index) => (
                  <Text key={index} style={styles.orderText}>
                    {foodItem.food_name} (x{foodItem.quantity})
                  </Text>
                ))}
                <Text style={[styles.status, styles[item.order_status.toLowerCase()]]}>
                  Status: {item.order_status}
                </Text>
              </View>
            </ScrollView>
          )}
        />
      )}

      {isModalVisible && currentOrder && (
        <View style={styles.floatingModal}>
          <Text style={styles.modalText}>Order Status: {orderStatus}</Text>
          <TouchableOpacity onPress={() => setIsModalVisible(false)}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity>
        <MyNavigation customer_id={customer_id} />
      </TouchableOpacity>
    </View>
  );
};

export default MyOrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  card: {
    width: "90%",
    height: "auto",
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  orderText: { color: "#4A4A4A", fontSize: 16, marginBottom: 5, fontWeight: "bold" },
  status: { fontWeight: "bold", fontSize: 18, top: 10 },
  floatingModal: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalText: { fontSize: 16, fontWeight: "bold" },
  closeButton: { fontSize: 16, color: "blue", marginLeft: 10 },
});
