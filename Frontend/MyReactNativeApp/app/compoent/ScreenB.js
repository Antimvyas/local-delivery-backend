
import { View, TextInput, Button, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import axios from 'axios';
import API_BASE from "../config1.js";
import { useEffect, useState } from 'react';
import { Geolocation } from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

export default function VendorSignup({ navigation, route }) {
  const [Shop_name, setShopName] = useState('');
  const [shop_address, setAddress] = useState('');
  const [liveLocation, setLiveLocation] = useState("");
  const [vendorServiceRadius, setVendorServiceRadius] = useState(10);


  const username = route.params?.username || '';

  // ✅ Default Timings
  const [timings, setTimings] = useState([
    { day: 'Monday', open: '', close: '' },
    { day: 'Tuesday', open: '', close: '' },
    { day: 'Wednesday', open: '', close: '' },
    { day: 'Thursday', open: '', close: '' },
    { day: 'Friday', open: '', close: '' },
    { day: 'Saturday', open: '', close: '' },
    { day: 'Sunday', open: '', close: '' },
  ]);

  // ✅ Update Open/Close Time
  const handleTimingChange = (index, field, value) => {
    const updatedTimings = [...timings];
    updatedTimings[index][field] = value;
    setTimings(updatedTimings);
  };

  // ✅ Handle vendor signup
  const handleSignup = async () => {
    if (!Shop_name || !shop_address || !username) {
      alert('Please fill out all fields');
      return;
    }

    try {
      console.log("Submitting:", { Shop_name, shop_address, username, timings });

      const response = await axios.post(`${API_BASE}/add-vendor`, {
        Shop_name,
        shop_address,
        username,
        open_close_timings: JSON.stringify(timings),
      });

      console.log("Server Response:", response.data);

      if (response.data && response.data.vendor_id) {
        alert(`Vendor registered! Vendor ID: ${response.data.vendor_id}`);
        navigation.navigate('VendorDashboard', { vendor_id: response.data.vendor_id });
      } else {
        throw new Error('Vendor ID not received');
      }
    } catch (error) {
      console.error("Error registering vendor:", error);
      alert('Failed to register vendor.');
    }
  };

   // ✅ Fetch shop details
  // ✅ Live Location Tracking
      useEffect(() => {
        let watchId = null;
      
        const requestLocationPermission = async () => {
          try {
            if (Platform.OS === 'android') {
              const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                  title: 'Location Permission',
                  message: 'This app needs location access to track your shop location.',
                  buttonNeutral: 'Ask Me Later',
                  buttonNegative: 'Cancel',
                  buttonPositive: 'OK',
                }
              );
      
              if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Location permission denied');
                return;
              }
            }
      
            // ✅ Get current location once (prevents crashes on startup)
            Geolocation.getCurrentPosition(
              (position) => {
                setLiveLocation(position.coords);
              },
              (error) => {
                console.error("Initial Location Error:", error.message);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
      
            // ✅ Start watching the user's location continuously
            watchId = Geolocation.watchPosition(
              (position) => {
                setLiveLocation(position.coords);
              },
              (error) => {
                console.error("Live Location Error:", error.message);
              },
              {
                enableHighAccuracy: true,
                distanceFilter: 10, // Update only if moved 10 meters
                interval: 10000, // Every 10 seconds
                fastestInterval: 5000,
              }
            );
          } catch (err) {
            console.warn("Permission request error:", err);
          }
        };
      
        requestLocationPermission();
      
        // ✅ Cleanup to prevent crashes when component unmounts
        return () => {
          if (watchId !== null) {
            Geolocation.clearWatch(watchId);
          }
        };
      }, []);

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


      <Text style={styles.sectionTitle}>Opening Hours</Text>

      {/* ✅ Display Timings in List Format */}
      {timings.map((item, index) => (
        <View key={index} style={styles.timeRow}>
          <Text style={styles.dayText}>{item.day}</Text>
          <TextInput
            placeholder="09:00"
            style={styles.timeInput}
            value={item.open}
            onChangeText={(value) => handleTimingChange(index, 'open', value)}
          />
          <Text style={styles.toText}>to</Text>
          <TextInput
            placeholder="18:00"
            style={styles.timeInput}
            value={item.close}
            onChangeText={(value) => handleTimingChange(index, 'close', value)}
          />
          <TouchableOpacity>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Button title="Register" onPress={handleSignup} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  dayText: { fontSize: 16, width: 90, fontWeight: '500' },
  timeInput: { borderWidth: 1, padding: 8, width: 70, textAlign: 'center', borderRadius: 5, backgroundColor: '#fff' },
  toText: { fontSize: 16, fontWeight: '500' },
  editIcon: { fontSize: 18, color: 'gray', paddingLeft: 10 },
});

