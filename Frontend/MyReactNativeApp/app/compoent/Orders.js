import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert 
} from "react-native";
import axios from "axios";
import socket from "../socket"; // WebSocket connection
import BASE_URL from "../config";
import API_BASE from "../config1.js"
import VendorNavigation from "./VendorNavigation.js";
// const API_BASE = "http://192.168.1.19:3000/api/v1";

const Orders = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const vendor_id = route.params?.vendor_id;

  useEffect(() => {
    if (!vendor_id) {
      Alert.alert("Error", "Vendor ID not found!");
      return;
    }

    fetchOrders();

    // 📌 Listen for Order Updates in Real-Time
    socket.on(`vendor-${vendor_id}-order-updated`, () => fetchOrders());

    return () => {
      socket.off(`vendor-${vendor_id}-order-updated`);
    };
  }, [vendor_id]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vendor/accepted-orders`, { 
        params: { vendor_id }
      });
      setOrders(response.data);
      console.log(response.data);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch orders.");
      setLoading(false);
    }
  };

  const updateOrderStatus = async (order_id, new_status) => {
    try {
      await axios.put(`${API_BASE}/vendor/orders/update-status`, { order_id, vendor_id, new_status });
      fetchOrders();
      Alert.alert("Order Status Updated", `Order is now ${new_status}.`);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Orders</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5733" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <Text style={styles.orderText}>Customer: {item.customer_name}</Text>
              <Text style={styles.orderText}>Location: {item.customers_location}</Text>
              <Text style={styles.orderText}>Payment: {item.payment_methods}</Text>
              <Text style={styles.orderText}>Total: ₹{item.total_cost}</Text>
              <Text style={styles.orderText}>Status: {item.order_status.toUpperCase()}</Text>

              {item.food_items.map((food, index) => (
                <Text key={index} style={styles.foodText}>
                  {food.food_name} x {food.quantity} - ₹{food.item_total}
                </Text>
              ))}

              {/* Update Order Status Buttons */}
              <TouchableOpacity style={styles.updateButton} onPress={() => updateOrderStatus(item.order_id, "preparing")}>
                <Text style={styles.buttonText}>Mark as Preparing</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateButton} onPress={() => updateOrderStatus(item.order_id, "ready")}>
                <Text style={styles.buttonText}>Mark as Ready</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.updateButton} onPress={() => updateOrderStatus(item.order_id, "out for delivery")}>
                <Text style={styles.buttonText}>Mark as Out for Delivery</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <VendorNavigation vendor_id={vendor_id}/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#FF5733" },
  orderCard: { backgroundColor: "#FFD700", padding: 15, borderRadius: 10, marginVertical: 5 },
  orderText: { fontSize: 16, fontWeight: "bold" },
  foodText: { fontSize: 14, color: "#333" },
  updateButton: { backgroundColor: "blue", padding: 10, marginTop: 5 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});

export default Orders;
