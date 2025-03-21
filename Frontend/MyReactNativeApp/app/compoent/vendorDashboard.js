import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import API_BASE from "../config1.js"
import VendorNavigation from './VendorNavigation.js';
export default function VendorDashboard({ route }) {
  const navigation = useNavigation();
  const vendor_id = route.params?.vendor_id?.vendor_id ?? route.params?.vendor_id;


  useEffect(() => {
    console.log("v1",vendor_id);
    
    if (!vendor_id) {
      Alert.alert('Error', 'Vendor ID not found!', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    }
  }, [vendor_id]);

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>Vendor Dashboard</Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Add_menu", { vendor_id })}>
        <Text style={styles.buttonText}>Add Menu</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("View_menu", { vendor_id })}>
        <Text style={styles.buttonText}>View & Edit Menu</Text>
      </TouchableOpacity> */}

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("PendingOrder", { vendor_id })}>
        <Text style={styles.buttonText}>Pending Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Orders", { vendor_id })}>
        <Text style={styles.buttonText}>Orders</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("UdarRequestsScreen", { vendor_id })}>
        <Text style={styles.buttonText}>View Udar Requests</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("AccountScreen", { vendor_id })}>
        <Text style={styles.buttonText}>View Udar Customers</Text>
      </TouchableOpacity> */}
      <VendorNavigation vendor_id={vendor_id}/>
      
    </View>
  );
}

// ✅ **Reddish-Orange Theme Styles**
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: "#FFF3E0", // Light cream-orange background
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF4500",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#FF5733", // Reddish-Orange
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 8,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Elevation for Android shadow
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});


