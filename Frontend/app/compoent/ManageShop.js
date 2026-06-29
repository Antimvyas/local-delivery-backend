import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Switch,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from "react-native";
import api from "../utils/api";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

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
      const response = await api.get(`/vendor/${vendorId}`);
      const data = response.data;
      console.log("res",data);
      

      let timings = data.open_close_timings;
      if (typeof timings === "string") {
        try {
          timings = JSON.parse(timings);
          if (typeof timings === "string") {
            timings = JSON.parse(timings);
          }
        } catch (error) {
          console.error("Error parsing timings:", error);
          timings = [];
        }
      }

      if (!Array.isArray(timings) || timings.length === 0) {
        timings = [
          { day: "Monday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Tuesday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Wednesday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Thursday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Friday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Saturday", open: "09:00 AM", close: "09:00 PM" },
          { day: "Sunday", open: "Closed", close: "" }
        ];
      } else {
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        timings = days.map(d => {
          const existing = timings.find(t => t && t.day && t.day.toLowerCase() === d.toLowerCase());
          return {
            day: d,
            open: existing?.open || (d === "Sunday" ? "Closed" : "09:00 AM"),
            close: existing?.close || (d === "Sunday" ? "" : "09:00 PM")
          };
        });
      }

      setShopTimings(timings);
      setEditedTimings(timings);
      setIsShopOnline(data.is_online);
    } catch (error) {
      console.error("Error fetching shop details:", error);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  // ✅ Update shop timings via API
  const updateShopTimings = async () => {
    setSubmitting(true);
    try {
      console.log("Updating timings:", JSON.stringify(editedTimings));
      await api.put(`/vendor/${vendorId}/timings`, {
        open_close_timings: JSON.stringify(editedTimings)
      });
      showSuccess("Shop timings updated successfully!");
    } catch (error) {
      console.error("Error updating shop timings:", error);
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Toggle shop online status
  const toggleShopOnlineStatus = async () => {
    try {
      const newStatus = !isShopOnline;
      await api.put(`/vendor/${vendorId}/status`, {
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
            keyExtractor={(item, index) => item?.day || index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.timingRow}>
                <Text style={styles.dayText}>{item?.day || "Unknown"}:</Text>
                <TextInput
                  style={styles.input}
                  value={item?.open || ""}
                  onChangeText={(text) => handleTimingChange(index, "open", text)}
                  placeholder="Open Time"
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                  style={styles.input}
                  value={item?.close || ""}
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
      <TouchableOpacity style={[styles.saveButton, submitting && { backgroundColor: '#888' }]} onPress={updateShopTimings} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Save Timings</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ✅ **Styles**
const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  title: { fontSize: typography.fontSize.lg, fontWeight: "bold", marginBottom: spacing.lg, textAlign: "center", color: colors.textPrimary },
  switchContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg, backgroundColor: colors.card, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  switchLabel: { fontSize: typography.fontSize.md, fontWeight: "bold", color: colors.textPrimary },
  timingsContainer: { backgroundColor: colors.card, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, flex: 1 },
  timingsHeader: { fontSize: typography.fontSize.md, fontWeight: "bold", marginBottom: spacing.md, color: colors.textPrimary },
  timingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  dayText: { fontSize: typography.fontSize.sm, fontWeight: "bold", width: 100, color: colors.textPrimary },
  toText: { fontSize: typography.fontSize.sm, fontWeight: "500", color: colors.textSecondary },
  input: { borderWidth: 1, borderColor: colors.border, padding: spacing.sm, borderRadius: 8, width: 90, textAlign: "center", backgroundColor: colors.background, color: colors.textPrimary },
  noTimingsText: { fontSize: typography.fontSize.sm, color: colors.textSecondary, textAlign: "center", marginTop: 10 },
  saveButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { fontSize: typography.fontSize.md, color: colors.white, fontWeight: "bold" }
});

export default ManageShop;
