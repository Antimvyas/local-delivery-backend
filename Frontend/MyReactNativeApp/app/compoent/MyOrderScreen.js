import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity ,ScrollView} from "react-native";
import axios from "axios";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";

// const API_BASE = "http://192.168.1.19:3000/api/v1";

const MyOrdersScreen = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const customer_id = route.params?.customer_id;

  useEffect(() => {
    console.log("order",customer_id);
    
    if (!customer_id) {
      console.error("Customer ID missing!");
      return;
    }
    fetchOrders();
  }, [customer_id]);

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

  // Grouping orders by order_id to show in a single card
  const groupOrdersById = (orders) => {
    const grouped = orders.reduce((acc, order) => {
      const { order_id, total_cost, shop_name, food_name, quantity, order_status } = order;
      if (!acc[order_id]) {
        acc[order_id] = { order_id, total_cost, shop_name, items: [], order_status };
      }
      acc[order_id].items.push({ food_name, quantity });
      return acc;
    }, {});
    return Object.values(grouped); // Return grouped orders as an array
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
              <Text style={styles.orderText}>Total Cost: ${item.total_cost}</Text>
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

      <TouchableOpacity >
        <MyNavigation customer_id={customer_id} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  
  // header: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#FF4500" },
  // noOrders: { textAlign: "center", fontSize: 16, color: "#888", marginTop: 20 },

  card: {
    width: "90%",
    height: 230,
    
    alignSelf: "center",
    borderRadius: 10,
    // borderWidth:3,
    padding: 20,
    marginRight:20,
    marginVertical: 15,
    // alignItems: "center",
    
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    // shadowColor: "#000",
    // shadowOffset: { width: 5, height: 5 },
    // shadowOpacity: 2,
    // shadowRadius: 8,
    // elevation: 10,
  },

  orderText: { color: "#4A4A4A", fontSize: 16, marginBottom: 5,
    top:-10,
    fontWeight:"bold"

   },

  /* Status Colors */
   status: { fontWeight: "bold", fontSize: 18, 
    top:10,
     position:'static'
    },
  // pending: { color: "#FFA500" }, // Orange
  // confirmed: { color: "#28A745" }, // Green
  // cancelled: { color: "#DC3545" }, // Red
});

export default MyOrdersScreen;
