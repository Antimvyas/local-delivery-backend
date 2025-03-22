import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert
} from "react-native";
import axios from "axios";
import API_BASE from "../config1";

const ManageShop = ({ route }) => {
  const vendorId = route.params?.vendor_id;
  const [shopTimings, setShopTimings] = useState({});
  const [isShopOnline, setIsShopOnline] = useState(false);
  const [editedTimings, setEditedTimings] = useState({});

  useEffect(() => {
    fetchShopDetails();
    
  }, []);

  // Fetch shop details including timings and online status
  const fetchShopDetails = async () => {
    try {
      const res = await axios.get(`${API_BASE}/vendor-timings/${vendorId}`);
      const data = res.data;

      let timings = data.open_close_timings;
      if (typeof timings === "string") {
        try {
          // It seems the timings are JSON-encoded twice.
          timings = JSON.parse(timings);
          timings = JSON.parse(timings);
        } catch (error) {
          console.error("Error parsing timings:", error);
          timings = {};
        }
      }

      setShopTimings(timings || {});
      setEditedTimings(timings || {});
      setIsShopOnline(data.is_online);
    } catch (error) {
      console.error("Error fetching shop details:", error);
    }
  };

  // Update shop timings via API
  const updateShopTimings = async () => {
    try {
      console.log("time", JSON.stringify(editedTimings));
      await axios.post(`${API_BASE}/update-shop-timings/${vendorId}`, {
        open_close_timings: JSON.stringify(editedTimings)
      });
      Alert.alert("Success", "Shop timings updated successfully!");
    } catch (error) {
      console.error("Error updating shop timings:", error);
      Alert.alert("Error", "Failed to update shop timings.");
    }
  };

  // Manual toggle for shop online status
  const toggleShopOnlineStatus = async () => {
    try {
      const newStatus = !isShopOnline;
      await axios.post(`${API_BASE}/update-shop-online-status/${vendorId}`, {
        isOnline: newStatus
      });
      setIsShopOnline(newStatus);
    } catch (error) {
      console.error("Error updating shop online status:", error);
    }
  };

  // Handle changes in timing values from TextInputs
  const handleTimingChange = (day, type, value) => {
    setEditedTimings((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value
      }
    }));
  };

  // Auto-update shop status based on current time and day’s timings
  const convertTo24Hour = (time) => {
    if (!time) return null;
  
    const [hourMinute, period] = time.split(" ");
    let [hours, minutes] = hourMinute.split(":").map(Number);
  
    if (period.toLowerCase() === "PM" && hours !== 12) {
      hours += 12;
    } else if (period.toLowerCase() === "AM" && hours === 12) {
      hours = 0;
    }
  
    return hours * 60 + minutes; // Convert to total minutes
  };
  
  const autoUpdateStatus = () => {
    if (!Object.keys(shopTimings).length) return;
  
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];
    const currentDay = dayNames[now.getDay()];
  
    const todaysTiming = shopTimings[currentDay];
    if (todaysTiming && todaysTiming.open && todaysTiming.close) {
      const openMinutes = convertTo24Hour(todaysTiming.open);
      const closeMinutes = convertTo24Hour(todaysTiming.close);
  
      if (openMinutes !== null && closeMinutes !== null) {
        const computedStatus =
          currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  
        if (computedStatus !== isShopOnline) {
          axios
            .post(`${API_BASE}/update-shop-online-status/${vendorId}`, {
              isOnline: computedStatus
            })
            .then((response) => {
              setIsShopOnline(computedStatus);
              setShopStatusMessage(response.data.message); // ✅ Store response message
            })
            .catch((error) => {
              console.error("Error auto updating shop online status:", error);
              setShopStatusMessage("Failed to update shop status.");
            });
        }
      }
    }
  };
  
  

  // Set up an interval to check the auto status every minute
  useEffect(() => {
    autoUpdateStatus();
  }, [shopTimings, isShopOnline]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Shop Timings</Text>

      {/* ✅ Toggle Switch for Shop Online/Offline with conditional color */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Shop Online:</Text>
        <Switch
          value={isShopOnline}
          onValueChange={toggleShopOnlineStatus}
          thumbColor={isShopOnline ? "green" : "#f4f3f4"}
          trackColor={{ false: "lightgray", true: "green" }}
        />
      </View>

      {/* ✅ Editable Opening & Closing Timings */}
      <View style={styles.timingsContainer}>
        <Text style={styles.timingsHeader}>Edit Shop Timings:</Text>
        <FlatList
          data={Object.entries(editedTimings)}
          keyExtractor={(item) => item[0]}
          renderItem={({ item }) => (
            <View style={styles.timingRow}>
              <Text style={styles.dayText}>{item[0]}:</Text>
              <TextInput
                style={styles.input}
                value={item[1]?.open}
                onChangeText={(text) => handleTimingChange(item[0], "open", text)}
                placeholder="Open Time"
              />
              <TextInput
                style={styles.input}
                value={item[1]?.close}
                onChangeText={(text) =>
                  handleTimingChange(item[0], "close", text)
                }
                placeholder="Close Time"
              />
            </View>
          )}
        />
      </View>

      {/* ✅ Save Changes Button */}
      <TouchableOpacity style={styles.saveButton} onPress={updateShopTimings}>
        <Text style={styles.buttonText}>Save Timings</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center"
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  switchLabel: { fontSize: 18, fontWeight: "bold" },
  timingsContainer: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  timingsHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5
  },
  timingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  dayText: { fontSize: 16, fontWeight: "bold", width: 100 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 5,
    borderRadius: 5,
    width: 80,
    textAlign: "center",
    marginLeft: 5
  },
  saveButton: {
    backgroundColor: "#FF5733",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10
  },
  buttonText: { fontSize: 18, color: "#fff", fontWeight: "bold" }
});

export default ManageShop;
