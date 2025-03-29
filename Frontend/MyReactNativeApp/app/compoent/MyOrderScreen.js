import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  AppState,
  Animated,
} from "react-native";
import axios from "axios";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";
import socket from "../socket";

const MyOrdersScreen = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState([]); // ✅ Store multiple status updates
  const fadeAnim = useRef(new Animated.Value(0)).current; // ✅ Animation Reference
  const customer_id = route.params?.customer_id;

  useEffect(() => {
    if (!customer_id) {
      console.error("Customer ID missing!");
      return;
    }

    fetchOrders();

    // ✅ Listen for real-time order updates
    socket.on(`customer-${customer_id}-order-updated`, (data) => {
      console.log("🔄 Order Status Updated:", data);

      // ✅ Update orders list in real-time
      // setOrders((prevOrders) =>
      //   prevOrders.map((order) =>
      //     order.order_id === data.order_id
      //       ? { ...order, order_status: data.status }
      //       : order
      //   )
      // );

      // ✅ Append update to floating modal
      setOrderUpdates((prevUpdates) => [...prevUpdates, data]);
      fadeIn();

      setTimeout(() => fadeOut(), 4000); // ✅ Auto-hide after 4 seconds
    });

    return () => {
      socket.off(`customer-${customer_id}-order-updated`);
    };
  }, [customer_id]);

  // ✅ Fetch orders from backend
  const fetchOrders = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/customer/orders/new?customer_id=${customer_id}`
      );
      const groupedOrders = groupOrdersById(response.data);
      setOrders(groupedOrders);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setLoading(false);
    }
  };

  // ✅ Group orders by order_id
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

  // ✅ Fade in animation
  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  // ✅ Fade out animation
  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setOrderUpdates([])); // Clear updates after fade-out
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
                <Text
                  style={[
                    styles.status,
                    styles[item.order_status.toLowerCase()],
                  ]}
                >
                  Status: {item.order_status}
                </Text>
              </View>
            </ScrollView>
          )}
        />
      )}

      {/* ✅ Floating Order Status Updates */}
      {orderUpdates.length > 0 && (
        <Animated.View style={[styles.floatingModal, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.modalTitle}>Order Updates:</Text>
            {orderUpdates.map((update, index) => (
              <Text key={index} style={styles.modalText}>
                Order #{update.order_id} is now **{update.status}**
              </Text>
            ))}
          </View>
          <TouchableOpacity onPress={fadeOut}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  modalText: { fontSize: 16, fontWeight: "bold", color: "blue" },
  closeButton: { fontSize: 16, color: "red", marginLeft: 10 },
});
