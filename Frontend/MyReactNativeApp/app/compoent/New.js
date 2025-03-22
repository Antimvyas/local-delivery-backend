import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import axios from "axios";
import API_BASE from "../config1.js";
import MyNavigation from "./MyNavigation.js";
import  Text from"../GlobalText.js"
import "../i18n.js"; // Import translations
import Credit from "./Credit.js";
// import { useTranslation } from "react-i18next";

export default function New({ route, navigation }) {
  // const { t } = useTranslation();
  const [vendors, setVendors] = useState([]);
  
  // Ensure route.params is defined
  const customer_id = route.params?.customer_id;
  
  console.log("Customer ID:", customer_id); // Debugging

  useEffect(() => {
    if (customer_id) {
      axios.get(`${API_BASE}/udar/vendors/${customer_id}`)
        .then((res) => {
          console.log("API Response:", res.data);
          setVendors(res.data);
        })
        .catch((err) => console.error("API Error:", err));
    }
    
  }, [customer_id]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vendor List</Text>
      {vendors.length === 0 ? (
        <Text style={styles.noVendors}>No Vendors Found</Text>
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.vendor_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("MyUdarScreen", {
                  vendor_id: item.vendor_id,
                  customer_id: customer_id, // Pass both vendor_id and customer_id
                })
              }
            >
              <View>
                <Text style={styles.vendorName}>Shop Name:{item.Shop_name}</Text>
                <Text style={styles.vendorPhone}>Phone: {item.Phone}</Text>
                <Text style={styles.vendorAddress}>Address: {item.shop_address}</Text>
                <Text style={styles.pendingAmount}>Amount: ₹{item.balance_due}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Credit    customer_id={customer_id}/>
      <MyNavigation customer_id={customer_id}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "#FFF3E0",
    padding: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4A4A4A",
    textAlign: "center",
    marginBottom: 15,
  },
  noVendors: {
    textAlign: "center",
    fontSize: 16,
    color: "#E64A19",
    marginTop: 20,
  },
  card: {
    width: "90%",
    height: 150,
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 5,
  },
  vendorPhone: {
    fontSize: 16,
    color: "#4A4A4A",
    marginBottom: 5,
  },
  vendorAddress: {
    fontSize: 16,
    color: "#4A4A4A",
    marginBottom: 5,
  },
  pendingAmount: {
    fontSize: 18,
    color: "#D84315",
    fontWeight: "bold",
  },
});
