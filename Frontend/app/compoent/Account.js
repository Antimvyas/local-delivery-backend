import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../utils/api";
import MyNavigation from "./MyNavigation";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNotification } from "./common/GlobalNotificationProvider";
import Text from "../GlobalText";
// import Geolocation from '@react-native-community/geolocation';
import Geolocation from 'react-native-geolocation-service';

const Account = ({ route, navigation }) => {
  const { customer_id } = route.params || {};
  const { checkUserSession } = useNotification() || {};
  const [customer, setCustomer] = useState({
    Name: "",
    Phone: "",
    username: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // null if adding
  const [addrType, setAddrType] = useState("home");
  const [addrLat, setAddrLat] = useState("");
  const [addrLon, setAddrLon] = useState("");
  const [addrFormatted, setAddrFormatted] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [houseNo, setHouseNo] = useState("");
  const [building, setBuilding] = useState("");
  const [landmark, setLandmark] = useState("");
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    fetchCustomer();
    fetchAddresses();
  }, []);

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/update/${customer_id}`);
      setCustomer(response.data);
    } catch (error) {
      console.error("Error fetching customer data", error);
      showError("Failed to load account details.");
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customer/addresses');
      setAddresses(response.data);
    } catch (error) {
      console.error("Error fetching customer addresses", error);
      showError("Failed to load saved addresses.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setCustomer({ ...customer, [field]: value });
  };

  const updateCustomer = async () => {
    setSubmitting(true);

    try {
      const response = await api.put(`/customer/${customer_id}`, customer);

      console.log("Profile Update Success:", response.data);

      showSuccess("Profile updated successfully!");

    } catch (error) {

      console.log("========== PROFILE UPDATE ERROR ==========");
      console.log("Status:", error.response?.status);
      console.log("Response:", error.response?.data);
      console.log("Message:", error.message);
      console.log("=========================================");

      showError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update profile."
      );

    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (e) {
      console.warn("Logout request failed:", e);
    } finally {
      const { disconnectSocket } = require('../socket');
      disconnectSocket();
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userRole']);
      if (checkUserSession) {
        await checkUserSession();
      }
      showSuccess("Logged out successfully!");
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to set your address coordinates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleGetGPSLocation = async () => {
    setAddressLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showError("Location permission denied.");
        setAddressLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setAddrLat(latitude.toString());
          setAddrLon(longitude.toString());

          try {
            // Reverse Geocode
            const geocodeResponse = await api.post('/location/reverse-geocode', {
              latitude,
              longitude
            });
            const addrStr = geocodeResponse.data.formatted_address || "";
            console.log("ADDRESS:", addrStr);
            console.log("GPS:", latitude, longitude);
            console.log("Address:", addrStr);
            setAddrFormatted(addrStr);

            // Parse geocoded address parts
            let s = "";
            let c = "";
            let st = "";

            const parts = addrStr.split(',').map(item => item.trim());
            for (const part of parts) {
              if (/sector\s*\d+/i.test(part) || /pocket\s*[a-z0-9]/i.test(part)) s = part;
              else if (/hisar/i.test(part) || /gurugram/i.test(part) || /delhi/i.test(part)) c = part;
              else if (/haryana/i.test(part) || /punjab/i.test(part) || /delhi/i.test(part)) st = part;
            }

            if (!s) {
              const m = addrStr.match(/Sector\s*\d+/i);
              if (m) s = m[0];
            }
            if (!c) {
              if (addrStr.toLowerCase().includes("hisar")) c = "Hisar";
              else if (addrStr.toLowerCase().includes("gurugram")) c = "Gurugram";
            }
            if (!st) {
              if (addrStr.toLowerCase().includes("haryana")) st = "Haryana";
            }
            if (!s && parts.length > 0) s = parts[0];
            if (!c && parts.length > 1) c = parts[1];
            if (!st && parts.length > 2) st = parts[2];
            setArea(s);
            setCity(c);
            setState(st);

            showSuccess("GPS coordinates and address fetched successfully!");
          } catch (err) {
            console.error("Geocoding error", err);
            showError("Failed to resolve address description.");
          } finally {
            setAddressLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error", error);
          setAddressLoading(false);
          if (error.code === 1) {
            showError("Location permission denied.");
          } else if (error.code === 2) {
            showError("GPS disabled or location unavailable. Please verify device settings.");
          } else if (error.code === 3) {
            showError("Location request timed out.");
          } else {
            showError("Unable to fetch location. Please check GPS.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
          showLocationDialog: true
        }
      );
    } catch (err) {
      console.error(err);
      showError("Unexpected error fetching location.");
      setAddressLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddrType("home");
    setAddrLat("");
    setAddrLon("");
    setAddrFormatted("");
    setHouseNo("");
    setBuilding("");
    setFloor("");
    setLandmark("");
    setArea("");
    setCity("");
    setState("");
    setAddrIsDefault(false);
    setShowManualCoords(false);
    setAddressModalVisible(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddressId(addr.address_id);
    setAddrType(addr.address_type);
    setAddrLat(addr.latitude.toString());
    setAddrLon(addr.longitude.toString());
    setAddrFormatted(addr.formatted_address || "");
    setAddrIsDefault(addr.is_default === 1);
    setShowManualCoords(false);

    let struct = null;
    if (addr.structured_address) {
      try {
        struct = typeof addr.structured_address === 'string' ? JSON.parse(addr.structured_address) : addr.structured_address;
      } catch (e) {
        console.warn("Failed to parse structured address json", e);
      }
    }

    if (struct) {
      setHouseNo(struct.house_no || "");
      setBuilding(struct.building_name || "");
      setFloor(struct.floor || "");
      setLandmark(struct.landmark || "");
      setArea(struct.area || "");
      setCity(struct.city || "");
      setState(struct.state || "");
    } else {
      setHouseNo(addr.house_no || "");
      setBuilding(addr.building_name || "");
      setFloor(addr.floor || "");
      setLandmark(addr.landmark || "");
      setArea(addr.area || "");
      setCity(addr.city || "");
      setState(addr.state || "");
    }
    setAddressModalVisible(true);
  };

  const handleDeleteAddress = async (addressId) => {
    Alert.alert(
      "Delete Address",
      "Are you sure you want to delete this address?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.delete(`/customer/addresses/${addressId}`);
              if (res.data && res.data.success) {
                showSuccess("Address deleted successfully!");
                await fetchAddresses();
              }
            } catch (err) {
              console.error("Delete address error", err);
              showError("Failed to delete address.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (addressId) => {
    try {
      setLoading(true);
      const res = await api.put(`/customer/addresses/${addressId}/default`);
      if (res.data && res.data.success) {
        showSuccess("Default address updated!");
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Set default address error", err);
      showError("Failed to update default address.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addrType || !addrLat || !addrLon) {
      showError("Please specify a location on the map/GPS.");
      return;
    }

    const latVal = parseFloat(addrLat);
    const lonVal = parseFloat(addrLon);

    if (isNaN(latVal) || isNaN(lonVal)) {
      showError("Latitude and Longitude must be valid numbers.");
      return;
    }

    if (!houseNo.trim() || !area.trim() || !city.trim() || !state.trim()) {
      showError("House No, Area/Sector, City, and State are required.");
      return;
    }

    const parts = [];
    if (houseNo.trim()) parts.push(houseNo.trim());
    if (building.trim()) parts.push(building.trim());
    if (floor.trim()) parts.push(`${floor.trim()} Floor`);
    if (landmark.trim()) parts.push(`Near ${landmark.trim()}`);
    if (area.trim()) parts.push(area.trim());
    if (city.trim()) parts.push(city.trim());
    if (state.trim()) parts.push(state.trim());
    const finalAddress = parts.join(", ");

    setAddressSubmitting(true);
    try {
      const payload = {
        address_type: addrType,
        latitude: latVal,
        longitude: lonVal,
        formatted_address: finalAddress,
        is_default: addrIsDefault,
        house_no: houseNo.trim(),
        building_name: building.trim(),
        floor: floor.trim(),
        landmark: landmark.trim(),
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        structured_address: JSON.stringify({
          house_no: houseNo.trim(),
          building_name: building.trim(),
          floor: floor.trim(),
          landmark: landmark.trim(),
          area: area.trim(),
          city: city.trim(),
          state: state.trim()
        })
      };

      let res;
      if (editingAddressId) {
        res = await api.put(`/customer/addresses/${editingAddressId}`, payload);
      } else {
        res = await api.post('/customer/addresses', payload);
      }

      if (res.data && res.data.success) {
        showSuccess(editingAddressId ? "Address updated successfully!" : "Address saved successfully!");
        setAddressModalVisible(false);
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Save address error", err);
      showError("Failed to save address details.");
    } finally {
      setAddressSubmitting(false);
    }
  };

  if (loading && addresses.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Icon name="account" size={64} color={colors.primary} />
          </View>
          <Text style={styles.avatarName}>{customer.Name || "Customer"}</Text>
          <Text style={styles.avatarPhone}>📞 {customer.Phone}</Text>
        </View>

        {/* Editable Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Edit Profile Information</Text>

          <AppInput
            label="Customer Name:"
            placeholder="Enter your name"
            iconName="account-edit"
            value={customer.Name}
            onChangeText={(text) => handleChange("Name", text)}
          />

          <AppInput
            label="Phone Number:"
            placeholder="Enter your phone number"
            iconName="phone"
            keyboardType="phone-pad"
            value={customer.Phone}
            onChangeText={(text) => handleChange("Phone", text)}
          />

          <AppInput
            label="Username (for Login):"
            placeholder="Enter username"
            iconName="at"
            value={customer.username}
            onChangeText={(text) => handleChange("username", text)}
          />

          <View style={styles.profileActionRow}>
            <PrimaryButton
              title="Update Profile"
              onPress={updateCustomer}
              loading={submitting}
              style={[styles.updateBtn, { flex: 1, marginTop: 0 }]}
            />
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Icon name="logout" size={20} color={colors.error} />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Addresses Card */}
        <View style={styles.card}>
          <View style={styles.addressSectionHeader}>
            <Text style={styles.cardHeaderTitle}>Saved Addresses</Text>
            <TouchableOpacity style={styles.addAddressLink} onPress={handleOpenAddModal}>
              <Icon name="plus" size={16} color={colors.primary} />
              <Text style={styles.addAddressLinkText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <Text style={styles.noAddressesText}>No saved addresses. Add one to order!</Text>
          ) : (
            addresses.map((addr) => {
              let typeIcon = "map-marker";
              if (addr.address_type === "home") typeIcon = "home";
              else if (addr.address_type === "work") typeIcon = "briefcase";
              else if (addr.address_type === "current") typeIcon = "crosshairs-gps";

              return (
                <View key={addr.address_id} style={styles.addressCard}>
                  <View style={styles.addressMain}>
                    <Icon name={typeIcon} size={22} color={colors.primary} style={{ marginTop: 2 }} />
                    <View style={styles.addressDetails}>
                      <View style={styles.addressTypeRow}>
                        <Text style={styles.addressTypeText}>{addr.address_type.toUpperCase()}</Text>
                        {addr.is_default === 1 && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressLabel}>{addr.formatted_address}</Text>
                    </View>
                  </View>

                  <View style={styles.addressActions}>
                    {addr.is_default === 0 && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleSetDefault(addr.address_id)}
                      >
                        <Icon name="check" size={18} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEditModal(addr)}
                    >
                      <Icon name="pencil" size={18} color={colors.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteAddress(addr.address_id)}
                    >
                      <Icon name="delete" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={addressModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddressId ? "Edit Saved Address" : "Add New Address"}
              </Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Type Select buttons */}
              <Text style={styles.label}>Address Type:</Text>
              <View style={styles.typeSelectorRow}>
                {["home", "work", "other"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, addrType === type && styles.typeBtnActive]}
                    onPress={() => setAddrType(type)}
                  >
                    <Text style={[styles.typeBtnText, addrType === type && styles.typeBtnTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Get GPS Autofill button */}
              <TouchableOpacity
                style={styles.gpsAutofillBtn}
                onPress={handleGetGPSLocation}
                disabled={addressLoading}
              >
                {addressLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="crosshairs-gps" size={18} color={colors.primary} />
                )}
                <Text style={styles.gpsAutofillText}>
                  {addressLoading ? "Locating..." : "Autofill via Current Location"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkboxRow, { marginBottom: 15 }]}
                onPress={() => setShowManualCoords(!showManualCoords)}
              >
                <Icon
                  name={showManualCoords ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.checkboxLabel}>Enter coordinates manually</Text>
              </TouchableOpacity>

              {showManualCoords && (
                <>
                  <AppInput
                    label="Latitude:"
                    placeholder="e.g. 29.1492"
                    keyboardType="numeric"
                    value={addrLat}
                    onChangeText={setAddrLat}
                  />

                  <AppInput
                    label="Longitude:"
                    placeholder="e.g. 75.7217"
                    keyboardType="numeric"
                    value={addrLon}
                    onChangeText={setAddrLon}
                  />
                </>
              )}

              <AppInput
                label="House Number: *"
                placeholder="e.g. House No. 123"
                value={houseNo}
                onChangeText={setHouseNo}
              />

              <AppInput
                label="Building / Apartment Name:"
                placeholder="e.g. Sunrise Apartments"
                value={building}
                onChangeText={setBuilding}
              />

              <AppInput
                label="Floor (Optional):"
                placeholder="e.g. 1st or Ground"
                value={floor}
                onChangeText={setFloor}
              />

              <AppInput
                label="Landmark Near Address:"
                placeholder="e.g. Near HDFC Bank"
                value={landmark}
                onChangeText={setLandmark}
              />

              <AppInput
                label="Area / Sector: *"
                placeholder="e.g. Sector 15"
                value={area}
                onChangeText={setArea}
              />

              <AppInput
                label="City: *"
                placeholder="e.g. Hisar"
                value={city}
                onChangeText={setCity}
              />

              <AppInput
                label="State: *"
                placeholder="e.g. Haryana"
                value={state}
                onChangeText={setState}
              />

              {addrFormatted.trim() !== "" && (
                <>
                  <Text style={[styles.checkboxLabel, { marginTop: 10, fontWeight: 'bold' }]}>
                    Geocoded Address Description:
                  </Text>
                  <Text style={[styles.checkboxLabel, { marginBottom: 15, color: colors.textSecondary }]}>
                    {addrFormatted}
                  </Text>
                </>
              )}

              {/* Default checkbox alternative */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAddrIsDefault(!addrIsDefault)}
              >
                <Icon
                  name={addrIsDefault ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.checkboxLabel}>Set as Default Delivery Address</Text>
              </TouchableOpacity>

              <PrimaryButton
                title={editingAddressId ? "Update Address" : "Save Address"}
                onPress={handleSaveAddress}
                loading={addressSubmitting}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MyNavigation customer_id={customer_id} />
    </View>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 90,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(30, 58, 170, 0.1)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  avatarPhone: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeaderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  profileActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  updateBtn: {
    marginTop: 0,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.white,
    gap: 4,
  },
  logoutBtnText: {
    color: colors.error,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  addressSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addAddressLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addAddressLinkText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  noAddressesText: {
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: spacing.md,
  },
  addressCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  addressMain: {
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
  },
  addressDetails: {
    flex: 1,
  },
  addressTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  addressTypeText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  defaultBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  addressLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  coordinatesText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  addressActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: spacing.xs,
  },
  actionBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalBox: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  modalScroll: {
    paddingBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(30, 58, 170, 0.08)",
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.primary,
  },
  gpsAutofillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    gap: 6,
    marginBottom: spacing.md,
  },
  gpsAutofillText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: spacing.md,
  },
  checkboxLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
});
