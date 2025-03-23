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
  const [editedTimings, setEditedTimings] = useState([]);

  useEffect(() => {
    fetchShopDetails();
  }, []);

  // ✅ Fetch shop details including timings and online status
  const fetchShopDetails = async () => {
    try {
      const res = await axios.get(`${API_BASE}/vendor-timings/${vendorId}`);
      const data = res.data;

      let timings = data.open_close_timings;
      if (typeof timings === "string") {
        try {
          // ✅ Fix JSON double-encoding issue
          timings = JSON.parse(JSON.parse(timings));
        } catch (error) {
          console.error("Error parsing timings:", error);
          timings = [];
        }
      }

      setShopTimings(timings || []);
      setEditedTimings(timings || []);
      setIsShopOnline(data.is_online);
    } catch (error) {
      console.error("Error fetching shop details:", error);
    }
  };

  // ✅ Update shop timings via API
  const updateShopTimings = async () => {
    try {
      console.log("Updating timings:", JSON.stringify(editedTimings));
      await axios.post(`${API_BASE}/update-shop-timings/${vendorId}`, {
        open_close_timings: JSON.stringify(editedTimings)
      });
      Alert.alert("Success", "Shop timings updated successfully!");
    } catch (error) {
      console.error("Error updating shop timings:", error);
      Alert.alert("Error", "Failed to update shop timings.");
    }
  };

  // ✅ Toggle shop online status
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

  // ✅ Handle time changes
  const handleTimingChange = (index, type, value) => {
    const updatedTimings = [...editedTimings];
    updatedTimings[index][type] = value;
    setEditedTimings(updatedTimings);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Shop Timings</Text>

      {/* ✅ Toggle Switch for Shop Online/Offline */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Shop Online:</Text>
        <Switch
          value={isShopOnline}
          onValueChange={toggleShopOnlineStatus}
          thumbColor={isShopOnline ? "green" : "#f4f3f4"}
          trackColor={{ false: "lightgray", true: "green" }}
        />
      </View>

      {/* ✅ Display and Edit Opening & Closing Timings */}
      <View style={styles.timingsContainer}>
        <Text style={styles.timingsHeader}>Edit Shop Timings:</Text>
        {editedTimings.length > 0 ? (
          <FlatList
            data={editedTimings}
            keyExtractor={(item) => item.day}
            renderItem={({ item, index }) => (
              <View style={styles.timingRow}>
                <Text style={styles.dayText}>{item.day}:</Text>
                <TextInput
                  style={styles.input}
                  value={item.open}
                  onChangeText={(text) => handleTimingChange(index, "open", text)}
                  placeholder="Open Time"
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                  style={styles.input}
                  value={item.close}
                  onChangeText={(text) => handleTimingChange(index, "close", text)}
                  placeholder="Close Time"
                />
              </View>
            )}
          />
        ) : (
          <Text style={styles.noTimingsText}>No timings available</Text>
        )}
      </View>

      {/* ✅ Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={updateShopTimings}>
        <Text style={styles.buttonText}>Save Timings</Text>
      </TouchableOpacity>
    </View>
  );
};

// ✅ **Styles**
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  switchContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  switchLabel: { fontSize: 18, fontWeight: "bold" },
  timingsContainer: { backgroundColor: "#f9f9f9", padding: 15, borderRadius: 10, marginBottom: 20 },
  timingsHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  timingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  dayText: { fontSize: 16, fontWeight: "bold", width: 100 },
  toText: { fontSize: 16, fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 5, width: 80, textAlign: "center" },
  noTimingsText: { fontSize: 16, color: "gray", textAlign: "center", marginTop: 10 },
  saveButton: { backgroundColor: "#FF5733", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  buttonText: { fontSize: 18, color: "#fff", fontWeight: "bold" }
});

export default ManageShop;
