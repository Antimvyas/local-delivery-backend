import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import API_BASE from "../config1.js";

export default function VendorSignup({ navigation, route }) {
  const [Shop_name, setShopName] = useState('');
  const [shop_address, setAddress] = useState('');

  const username = route.params?.username || '';

  // ✅ State for the selected day and its timings
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');

  // ✅ Store timings in an object
  const [openCloseTimings, setOpenCloseTimings] = useState({});

  useEffect(() => {
    console.log("Received username:", username);
  }, [username]);

  // ✅ Function to add/update the timing for the selected day
  const handleAddTiming = () => {
    if (!openTime || !closeTime) {
      Alert.alert('Error', 'Please enter both open and close timings');
      return;
    }

    setOpenCloseTimings((prev) => ({
      ...prev,
      [selectedDay]: { open: openTime, close: closeTime },
    }));

    // ✅ Reset input fields after adding
    setOpenTime('');
    setCloseTime('');
  };

  // ✅ Handle vendor signup
  const handleSignup = async () => {
    if (!Shop_name || !shop_address || !username) {
      Alert.alert('Error', 'Please fill out all fields');
      return;
    }

    try {
      console.log("Submitting:", { Shop_name, shop_address, username, openCloseTimings });
       console.log("this",JSON.stringify(openCloseTimings));
       
      const response = await axios.post(`${API_BASE}/add-vendor`, {
        Shop_name,
        shop_address,
        username,
        open_close_timings: JSON.stringify(openCloseTimings),
      });

      console.log("Server Response:", response.data);

      if (response.data && response.data.vendor_id) {
        const vendor_id = response.data.vendor_id;

        Alert.alert('Success', `Vendor registered! Vendor ID: ${vendor_id}`);
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vendor Signup</Text>
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

      {/* Day Picker */}
      <Text style={styles.label}>Select Day:</Text>
      <Picker
        selectedValue={selectedDay}
        onValueChange={(itemValue) => setSelectedDay(itemValue)}
        style={styles.picker}
      >
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
          <Picker.Item key={day} label={day} value={day} />
        ))}
      </Picker>

      {/* Open & Close Timings Input */}
      <Text style={styles.label}>Opening Time:</Text>
      <TextInput
        placeholder="e.g., 09:00 AM"
        style={styles.input}
        value={openTime}
        onChangeText={setOpenTime}
      />
      <Text style={styles.label}>Closing Time:</Text>
      <TextInput
        placeholder="e.g., 11:00 PM"
        style={styles.input}
        value={closeTime}
        onChangeText={setCloseTime}
      />

      <Button title="Add Timing" onPress={handleAddTiming} />

      {/* Display added timings */}
      <Text style={styles.label}>Added Timings:</Text>
      {Object.keys(openCloseTimings).length > 0 ? (
        Object.entries(openCloseTimings).map(([day, times]) => (
          <Text key={day} style={styles.timeText}>
            {day}: {times.open} to {times.close}
          </Text>
        ))
      ) : (
        <Text style={styles.timeText}>No timings added</Text>
      )}

      <Button title="Register" onPress={handleSignup} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  label: { fontSize: 16, marginTop: 10 },
  input: { borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5, backgroundColor: '#fff' },
  picker: { height: 50, backgroundColor: '#fff', borderRadius: 5, marginBottom: 10 },
  timeText: { fontSize: 16, marginBottom: 5, fontWeight: '500' },
});

// export default VendorSignup;
