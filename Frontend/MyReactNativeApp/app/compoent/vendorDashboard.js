import React, { useState, useEffect } from "react";
import {
  View, Text,  TouchableOpacity,  Alert,  StyleSheet,  FlatList,  ActivityIndicator,
  PermissionsAndroid,  Platform,} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Geolocation from "react-native-geolocation-service";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from "react-native-maps";
import API_BASE from "../config1";
import VendorNavigation from "./VendorNavigation";
export default function VendorDashboard({ route }) {
  const navigation = useNavigation();
  const vendor_id = route.params?.vendor_id?.vendor_id ?? route.params?.vendor_id;
  const [location, setLocation] = useState(null);
  const [radius, setRadius] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState('');
  const [openCloseTimings, setOpenCloseTimings] = useState([]);
  const [isOnline, setIsOnline] = useState(false);


  const [errorMessage, setErrorMessage] = useState(null); // ✅ Shows error on screen

  useEffect(() => {
    requestLocationPermission();
    fetchShopDetails();
  }, []);

  // ✅ Request Location Permission
  const requestLocationPermission = async () => {
    try {
      let result;
      if (Platform.OS === "android") {
        result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          // getLocation();
        } else {
          setErrorMessage("Permission Denied: Please allow location access.");
        }
      } else {
        result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (result === RESULTS.GRANTED) {
          // getLocation();
        } else {
          setErrorMessage("Permission Denied: Please allow location access.");
        }
      }
    } catch (error) {
      setErrorMessage(`Permission Error: ${error.message}`);
    }
  };

  // ✅ Get Location Function
  const getLocation = () => {
    setLoading(true);
    try {
      Geolocation.getCurrentPosition(
        (position) => {
          if (!position || !position.coords) {
            setErrorMessage("Location data is missing.");
            return;
          }
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          setLoading(false);
        },
        (error) => {
          setErrorMessage(`Geolocation error: ${error.message}`);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      setErrorMessage(`Unexpected Error: ${error.message}`);
      setLoading(false);
    }
  };

  const fetchShopDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendor-details?vendor_id=${vendor_id}`);
      const data = await response.json();
      console.log("Fetched Data:", data);

      if (data) {
        setShopName(data.Shop_name || "Unknown Shop");
        setIsOnline(data.is_online || false);

        // ✅ Properly parse open_close_timings
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
      
      {/* ✅ Show Error on Screen */}
      {/* {errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )} */}

      {/* ✅ Show loading spinner until location is available */}
      {/* {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : location ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={location}
            onRegionChangeComplete={(newRegion) => setLocation(newRegion)}
          >
            <Marker coordinate={location} title="Your Shop Location" />
            <Circle
              center={location}
              radius={radius}
              strokeColor="blue"
              fillColor="rgba(0, 0, 255, 0.3)"
            />
          </MapView> */}

          {/* <View style={styles.radiusContainer}>
            <Text style={styles.radiusText}>
              Current Radius: {radius.toFixed(0)} meters
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.errorText}>Location not available.</Text>
      )} */}

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
                 {`${item.day}: ${item.open.trim() || "Closed"} ${item.close ? `- ${item.close.trim()}` : ""}`}
             </Text>

            )}
          />
        ) : (
          <Text style={styles.timingText}>No timings available</Text>
        )}
      </View>



      {/* ✅ Buttons */}
      {/* <TouchableOpacity style={styles.button} onPress={getLocation}>
        <Text style={styles.buttonText}>Refresh Location</Text>
      </TouchableOpacity> */}

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("PendingOrder")}
      >
        <Text style={styles.buttonText}>Pending Orders</Text>
      </TouchableOpacity>

      {/* <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Orders")}
      >
        <Text style={styles.buttonText}>Orders</Text>
      </TouchableOpacity> */}
    </View>

    <VendorNavigation vendor_id={vendor_id}/>
    </View>
  );
}

// ✅ Styles (same as before)

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
  // container: { flex: 1, alignItems: "center", padding: 20 },
  // header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  mapContainer: { width: "100%", height: 250, borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  map: { width: "100%", height: "100%" },
  radiusContainer: { marginTop: 10, alignItems: "center" },
  radiusText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  // button: { backgroundColor: "#FF5733", padding: 14, borderRadius: 10, width: "80%", alignItems: "center", marginTop: 10 },
  buttonText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  errorBox: { backgroundColor: "red", padding: 10, borderRadius: 5, marginTop: 10 },
  errorText: { color: "white", fontSize: 16, textAlign: "center" },
});

// export default VendorDashboard;
