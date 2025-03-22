import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet 
} from "react-native";
import axios from "axios";
import { io } from "socket.io-client"; // Import socket.io-client
import API_BASE from "../config1.js";
import Credit_account from "./Credit_account.js";
import VendorNavigation from "./VendorNavigation.js";

export default function AccountScreen({ route, navigation }) {
  const { vendor_id } = route.params;
  const [customers, setCustomers] = useState([]);
  const socket = io("https://your-server-url.com"); // Replace with your actual backend WebSocket URL

  useEffect(() => {
    // ✅ Fetch initial customer data
    console.log(vendor_id);
    
    axios.get(`${API_BASE}/vendor-dashboard/${vendor_id}`)
      .then(res => {
        console.log("Initial Data:", res.data);
        setCustomers(res.data);
      })
      .catch(err => console.error("Error fetching data:", err));

    // ✅ Listen for new orders or updates from WebSocket
    socket.on(`vendor-new-order-${vendor_id}`, (newCustomerData) => {
      console.log("🆕 New Data Received:", newCustomerData);
      setCustomers((prevCustomers) => [...prevCustomers, newCustomerData]); // Update the state dynamically
    });

    socket.on("updateOrdersList", (updatedOrders) => {
      console.log("🔄 Updated Orders List:", updatedOrders);
      setCustomers(updatedOrders); // Replace state with the latest data
    });

    // ✅ Cleanup: Close WebSocket connection when component unmounts
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Credit Customers</Text>
      {customers.length === 0 ? (
        <Text style={styles.noCustomers}>No Customers Found</Text>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.customer_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => navigation.navigate("VendorCustomerDetails", { customer_id: item.customer_id })}
            >
              <View style={styles.new}>
                <Text style={styles.customerName}>Name: {item.Name}</Text>
                <Text style={styles.customerName}>Phone: {item.Phone}</Text>
                <Text style={styles.pendingAmount}>Address: {item.customer_address}</Text>
                <Text style={styles.pendingAmount}>Amount: ₹{item.total_pending_amount}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Credit_account vendor_id={vendor_id}/>
      <VendorNavigation vendor_id={vendor_id}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D84315",
    textAlign: "center",
    marginBottom: 15,
  },
  noCustomers: {
    textAlign: "center",
    fontSize: 16,
    color: "#E64A19",
    marginTop: 20,
  },
  card: {
    width: "90%",
    height: 180,
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    alignItems: "center",
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  customerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 5,
  },
  pendingAmount: {
    fontSize: 18,
    color: "#4A4A4A",
    fontWeight: "bold",
  },
});
