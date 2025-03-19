import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from "react-native";
import axios from "axios";
import API_BASE from "../config1.js"; 
import MyNavigation from "./MyNavigation.js";

export default function RequestUdarScreen({route}) {
  const { customer_id } = route.params || {};  

   // Debugging
  // const [customer_id,setcustomerID]=useState(customer_id)
  const [vendors, setVendors] = useState([]);
  const [udarAccounts, setUdarAccounts] = useState({});
  const [approvedAccounts, setApprovedAccounts] = useState({}); // ✅ Track approved requests

  useEffect(() => {
    console.log("🟢 Received customer_id:", customer_id);
    fetchVendors();
    checkExistingAccounts();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vendors`);
      setVendors(response.data);
    } catch (error) {
      // console.error("❌ Error fetching vendors:", error.response?.data || error.message);
    }
  };

  const checkExistingAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/customer-udar-accounts/${customer_id}`);
      const existingAccounts = {};
      const approvedRequests = {};

      response.data.forEach(acc => {
        existingAccounts[acc.vendor_id] = true;
        if (acc.status === "accepted") { // ✅ Only disable requests if approved
          approvedRequests[acc.vendor_id] = true;
        }
      });

      setUdarAccounts(existingAccounts);
      setApprovedAccounts(approvedRequests);
    } catch (error) {
      console.error("❌ Error checking existing accounts:", error.response?.data || error.message);
    }
  };

  const requestUdar = async (selectedVendorId) => {
    console.log("🟢 Sending request for customer:", customer_id, "vendor:", selectedVendorId);

    if (!customer_id) {
      Alert.alert("Error", "Customer ID is missing.");
      return;
    }

    if (udarAccounts[selectedVendorId]) {
      Alert.alert("Already Requested", "Your request is pending approval or already accepted.");
      return;
    }

    try {
      await axios.post(`${API_BASE}/request-udar`, { customer_id, vendor_id: selectedVendorId });
      Alert.alert("Request Sent", "Your Udar request has been sent to the vendor.");

      setUdarAccounts(prevState => ({ ...prevState, [selectedVendorId]: true }));
    } catch (error) {
      console.error("❌ Error sending request:", error.response?.data || error.message);
      Alert.alert("Request Failed", "Could not send request. Try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Select Vendor to Request Udar</Text>

      <FlatList
        data={vendors}
        keyExtractor={(item) => item.vendor_id.toString()}
        renderItem={({ item }) => (
          <View style={styles.vendorCard}>
            <Text style={styles.vendorName}>{item.Shop_name}</Text>

            {approvedAccounts[item.vendor_id] ? (
              <Text style={styles.alreadyAccount}>✅ Udar Approved</Text> // ✅ Show if already accepted
            ) : udarAccounts[item.vendor_id] ? (
              <Text style={styles.pendingRequest}>⏳ Request Pending</Text> // ⏳ Pending status
            ) : (
              <TouchableOpacity 
                style={styles.requestButton} 
                onPress={() => requestUdar(item.vendor_id)}
              >
                <Text style={styles.requestButtonText}>Request Udar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <MyNavigation customer_id={customer_id}/>
    </View>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  header: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#4A4A4A" },
  vendorCard: {
    // backgroundColor: "#FFCC00",
    width: "90%",
    // backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    alignSelf: "center",
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  vendorName: { fontSize: 18, fontWeight: "bold" },
  requestButton: { backgroundColor: "#28A745", padding: 10, borderRadius: 5 },
  requestButtonText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  alreadyAccount: { fontSize: 16, fontWeight: "bold", color: "#28A745" }, // ✅ Green for approved
  pendingRequest: { fontSize: 16, fontWeight: "bold", color: "#FFA500" }, // ⏳ Orange for pending
});
