import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import axios from 'axios';
import API_BASE from "../config1.js"
export default function VendorSignup({ navigation, route }) {
  const [Shop_name, setShopName] = useState('');
  const [shop_address, setAddress] = useState('');

  // ✅ Extract username from previous screen
  const username = route.params?.username || ''; // Ensure it's not undefined

  useEffect(() => {
    console.log("Received username:", username); // ✅ Debugging log
  }, [username]);

 

  // ✅ Handle vendor signup
  const handleSignup = async () => {
    if (!Shop_name || !shop_address || !username) {
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }

    try {
      console.log("Submitting:", { Shop_name, shop_address, username }); // ✅ Debugging log

      const response = await axios.post(`${API_BASE}/add-vendor`, {
        Shop_name,
        shop_address,
        username,
      });

      console.log("Server Response:", response.data); // ✅ Debugging log

      if (response.data && response.data.vendor_id) {
        const vendor_id = response.data.vendor_id; // ✅ Extract vendor_id

        Alert.alert('Success', `Vendor registered! Vendor ID: ${vendor_id}`);

        // ✅ Navigate to VendorDashboard with vendor_id
        navigation.navigate('VendorDashboard', { vendor_id });
      } else {
        throw new Error('Vendor ID not received');
      }
    } catch (error) {
      console.error("Error registering vendor:", error);
      Alert.alert('Error', 'Failed to register vendor.');
    }
  };

  return (
    <View style={styles.container}>
      <Text>Vendor Signup</Text>
      <TextInput
        placeholder="Shop Name"
        style={styles.input}
        value={Shop_name}
        onChangeText={setShopName}
      />
      <TextInput
        placeholder="Address"
        style={styles.input}
        value={shop_address}
        onChangeText={setAddress}
      />
      <Button title="Register" onPress={handleSignup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, marginBottom: 15, padding: 10 },
});
