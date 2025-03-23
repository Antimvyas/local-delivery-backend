import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import API_BASE from "../config1.js";
import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';

import VendorNavigation from './VendorNavigation.js';

export default function VendorDashboard({ route }) {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const vendor_id = route.params?.vendor_id?.vendor_id ?? route.params?.vendor_id;
  const [shopName, setShopName] = useState('');
  const [openCloseTimings, setOpenCloseTimings] = useState([]);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!vendor_id) {
      Alert.alert('Error', 'Vendor ID not found!', [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    fetchShopDetails();
  }, [vendor_id]);

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
                setLocation(position.coords);
              },
              (error) => {
                console.error("Initial Location Error:", error.message);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
      
            // ✅ Start watching the user's location continuously
            watchId = Geolocation.watchPosition(
              (position) => {
                setLocation(position.coords);
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
  const fetchShopDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendor-details?vendor_id=${vendor_id}`);
      const data = await response.json();
      console.log("Fetched Data:", data);

      if (data) {
        setShopName(data.Shop_name || "Unknown Shop");
        setIsOnline(data.is_online || false);

        // ✅ Properly parse `open_close_timings`
        let timings = data.open_close_timings;

        if (typeof timings === "string") {
          try {
            timings = JSON.parse(JSON.parse(timings)); // Double parse to remove extra encoding
          } catch (error) {
            console.error("Error parsing timings:", error);
            timings = [];
          }
        }

        setOpenCloseTimings(timings);
      }
    } catch (error) {
      console.error("Error fetching shop details:", error);
      Alert.alert("Error", "Failed to fetch shop details.");
    }
  };

  return (
    <View style={styles.container}>
      {/* ✅ Shop Name */}
      <View style={styles.shopInfo}>
        <Text style={styles.shopName}>{shopName}</Text>
      </View>
      

      {/* ✅ Shop Open/Closed Status */}
      <View style={styles.shopStatusContainer}>
        <Text style={[styles.shopStatus, isOnline ? styles.openText : styles.closedText]}>
          {isOnline ? "Shop is Open" : "Shop is Closed"}
        </Text>
      </View>

      {/* ✅ Display Opening & Closing Timings */}
      <View style={styles.timingsContainer}>
        <Text style={styles.timingsHeader}>Opening & Closing Timings:</Text>
        {openCloseTimings.length > ""? (
          <FlatList
            data={openCloseTimings}
            keyExtractor={(item) => item.day}
            renderItem={({ item }) => (
              <Text style={styles.timingText}>
                {item.day}: {item.open.trim() || "Closed"} {item.close ? `- ${item.close.trim()}` : ""}
              </Text>
            )}
          />
        ) : (
          <Text style={styles.timingText}>No timings available</Text>
        )}
      </View>

      {/* ✅ Buttons */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("PendingOrder", { vendor_id })}
      >
        <Text style={styles.buttonText}>Pending Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Orders", { vendor_id })}
      >
        <Text style={styles.buttonText}>Orders</Text>
      </TouchableOpacity>

      {/* ✅ Bottom Navigation */}
      <VendorNavigation vendor_id={vendor_id} />
    </View>
  );
}

// ✅ **Styles**
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: "#FFF3E0",
    padding: 20,
  },
  shopInfo: {
    alignItems: "center",
    marginBottom: 10,
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF4500",
  },
  shopStatusContainer: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    width: "90%",
    alignItems: 'center',
  },
  shopStatus: {
    fontSize: 18,
    fontWeight: "bold",
  },
  openText: {
    color: "green",
  },
  closedText: {
    color: "red",
  },
  timingsContainer: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 10,
    width: "90%",
    marginBottom: 20,
    elevation: 3,
  },
  timingsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#FF5733",
  },
  timingText: {
    fontSize: 16,
    color: "#333",
    marginVertical: 2,
  },
  button: {
    backgroundColor: "#FF5733",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 8,
    width: "80%",
    alignItems: "center",
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});

// export default VendorDashboard;
