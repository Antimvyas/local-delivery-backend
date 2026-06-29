import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  FlatList
} from "react-native";
import api from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import socket from "../socket";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import SecondaryButton from "./common/SecondaryButton";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";

const OrderDetailsScreen = ({ route, navigation }) => {
  const { cart, totalCost, vendor_id, customer_id } = route.params;
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isUdarApproved, setIsUdarApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Saved Addresses state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Receiver details state
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  // Modal & Custom Search states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState(""); // "select_address" or "contact"
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  
  // Custom Address Fields
  const [houseNo, setHouseNo] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    checkUdarApproved();
    fetchCustomerDetails();
    fetchSavedAddresses();
  }, []);

  const checkUdarApproved = async () => {
    try {
      const response = await api.get(`/check-udar`, { params: { customer_id, vendor_id } });
      setIsUdarApproved(response.data.isApproved);
    } catch (error) {
      console.error("Error checking Udar approval:", error.response?.data || error.message);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      const response = await api.get(`/customer/${customer_id}`);
      const data = response.data;
      if (response.status === 200) {
        const customerData = data.result[0];
        setCustomerContact(customerData.Phone || "");
        setReceiverName(customerData.Name || "");
        setReceiverPhone(customerData.Phone || "");
        if (!customerAddress) {
          setCustomerAddress(customerData.customer_address || "Address not configured");
        }
      } else {
        showError("Failed to fetch customer details");
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const response = await api.get('/customer/addresses');
      const list = response.data || [];
      setSavedAddresses(list);
      
      const defaultAddr = list.find(a => a.is_default === 1);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.address_id);
        setCustomerAddress(defaultAddr.formatted_address);
      } else if (list.length > 0) {
        setSelectedAddressId(list[0].address_id);
        setCustomerAddress(list[0].formatted_address);
      }
    } catch (error) {
      console.error("Error fetching saved addresses:", error);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setSearchQuery("");
    setSearchResults([]);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr.address_id);
    setCustomerAddress(addr.formatted_address);
    setIsCustomAddress(false);
    closeModal();
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await api.post('/location/search', { query: searchQuery });
      setSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
      showError("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const addrStr = result.display_name || "";
    setCustomLat(result.lat);
    setCustomLon(result.lon);

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

    setArea(s);
    setCity(c);
    setState(st);
    setSearchResults([]);
  };

  const handleConfirmCustomAddress = () => {
    if (!houseNo.trim() || !area.trim() || !city.trim() || !state.trim()) {
      showError("House Number, Area, City, and State are required.");
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

    setCustomerAddress(finalAddress);
    setSelectedAddressId(null); // Custom address selected
    setIsCustomAddress(true);
    closeModal();
  };

  const handleSubmitOrder = async () => {
    if (!customerAddress || !customerContact) {
      showError("Please fill in your address details.", "Details Missing");
      return;
    }

    if (!receiverName.trim() || !receiverPhone.trim() || receiverPhone.trim().length !== 10) {
      showError("Please enter a valid receiver name and 10-digit phone number.");
      return;
    }

    if (!customer_id || !vendor_id || !totalCost || !cart.length) {
      showError("Your cart cannot be empty.");
      return;
    }

    if (paymentMethod === "credit" && !isUdarApproved) {
      showError("Credit request is not approved by the shopkeeper.");
      return;
    }

    const orderData = {
      customer_id,
      vendor_id,
      total_cost: totalCost,
      customers_location: customerAddress,
      customers_contact: customerContact,
      payment_methods: paymentMethod,
      items: cart,
      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim()
    };

    setSubmitting(true);
    try {
      const response = await api.post(`/orders`, orderData);
      showSuccess("Your order has been successfully placed!", "Order Placed");

      // Emit placeOrder socket event
      socket.emit("placeOrder", {
        ...orderData,
        order_id: response.data.order_id
      });
      
      await AsyncStorage.removeItem("cart");
      navigation.navigate("CustomerDashboard", { customer_id });
    } catch (error) {
      console.error("Order Submission Failed:", error);
      showError("Failed to complete order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Checkout Details</Text>

      {/* Receiver Details Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Receiver Details</Text>
        <AppInput
          label="Receiver Name: *"
          placeholder="Who will receive the delivery"
          value={receiverName}
          onChangeText={setReceiverName}
        />
        <AppInput
          label="Receiver Phone Number: *"
          placeholder="10-digit mobile number"
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>

      {/* Delivery Address Card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.labelRow}>
            <Icon name="map-marker" size={20} color={colors.primary} />
            <Text style={styles.label}>Delivery Location</Text>
          </View>
          <TouchableOpacity onPress={() => openModal("select_address")} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Choose / Custom</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.customerDetails}>{customerAddress}</Text>
      </View>

      {/* Payment Selection Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.paymentButtonContainer}>
          <TouchableOpacity 
            style={[
              styles.paymentButton, 
              paymentMethod === "cash" && styles.selectedPayment
            ]} 
            onPress={() => setPaymentMethod("cash")}
            activeOpacity={0.7}
          >
            <Icon 
              name="cash" 
              size={24} 
              color={paymentMethod === "cash" ? colors.white : colors.textSecondary} 
            />
            <Text style={[
              styles.paymentBtnText, 
              paymentMethod === "cash" && styles.selectedPaymentText
            ]}>Pay with Cash</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.paymentButton, 
              paymentMethod === "credit" && styles.selectedPayment,
              !isUdarApproved && styles.disabledPaymentButton
            ]} 
            onPress={() => setPaymentMethod("credit")} 
            disabled={!isUdarApproved}
            activeOpacity={0.7}
          >
            <Icon 
              name="hand-coin" 
              size={24} 
              color={paymentMethod === "credit" ? colors.white : colors.textSecondary} 
            />
            <Text style={[
              styles.paymentBtnText, 
              paymentMethod === "credit" && styles.selectedPaymentText
            ]}>
              {isUdarApproved ? "Pay with Credit" : "Credit Not Approved"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order Summary & submit */}
      <View style={[styles.summaryCard, { marginTop: spacing.md, marginBottom: 40 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalVal}>₹{totalCost}</Text>
        </View>

        <PrimaryButton 
          title="Place Order" 
          onPress={handleSubmitOrder} 
          loading={submitting}
        />
      </View>

      {/* Address Selection & Custom Modal */}
      {isModalVisible && modalType === "select_address" && (
        <Modal transparent animationType="fade" visible={isModalVisible} onRequestClose={closeModal}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Choose Delivery Location</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Icon name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, !isCustomAddress && styles.activeTabButton]}
                  onPress={() => setIsCustomAddress(false)}
                >
                  <Text style={[styles.tabText, !isCustomAddress && styles.activeTabText]}>Saved Addresses</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, isCustomAddress && styles.activeTabButton]}
                  onPress={() => setIsCustomAddress(true)}
                >
                  <Text style={[styles.tabText, isCustomAddress && styles.activeTabText]}>Custom Address</Text>
                </TouchableOpacity>
              </View>

              {!isCustomAddress ? (
                /* Saved Address List */
                <FlatList
                  data={savedAddresses}
                  keyExtractor={(item) => item.address_id.toString()}
                  style={{ width: '100%', maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[
                        styles.addressItem, 
                        selectedAddressId === item.address_id && styles.selectedAddressItem
                      ]}
                      onPress={() => handleSelectSavedAddress(item)}
                    >
                      <View style={styles.addressItemHeader}>
                        <Icon 
                          name={item.address_type === 'home' ? 'home' : item.address_type === 'work' ? 'briefcase' : 'map-marker'} 
                          size={18} 
                          color={colors.primary} 
                        />
                        <Text style={styles.addressItemType}>{item.address_type.toUpperCase()}</Text>
                        {item.is_default === 1 && <Text style={styles.defaultBadge}>DEFAULT</Text>}
                      </View>
                      <Text style={styles.addressItemText}>{item.formatted_address}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No saved addresses found. Please specify a custom address.</Text>
                  }
                />
              ) : (
                /* Custom Address Form with Independent Location Search */
                <ScrollView style={{ width: '100%', maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                  <Text style={styles.searchHeader}>Search Delivery Location</Text>
                  <View style={styles.searchRow}>
                    <AppInput
                      placeholder="Search landmark, sector or city..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      style={{ flex: 1, marginBottom: 0 }}
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={handleSearchLocation} disabled={searchLoading}>
                      {searchLoading ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Icon name="magnify" size={20} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {searchResults.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.searchResultItem}
                      onPress={() => handleSelectSearchResult(item)}
                    >
                      <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.searchResultText} numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}

                  <AppInput
                    label="House / Flat No: *"
                    placeholder="e.g. House No. 45"
                    value={houseNo}
                    onChangeText={setHouseNo}
                  />

                  <AppInput
                    label="Building / Apartment Name:"
                    placeholder="e.g. Sunrise Greens"
                    value={building}
                    onChangeText={setBuilding}
                  />

                  <AppInput
                    label="Floor (Optional):"
                    placeholder="e.g. 2nd Floor"
                    value={floor}
                    onChangeText={setFloor}
                  />

                  <AppInput
                    label="Near Landmark:"
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

                  <PrimaryButton 
                    title="Confirm Custom Location" 
                    onPress={handleConfirmCustomAddress}
                    style={{ marginTop: spacing.md }}
                  />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default OrderDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary
  },
  customerDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  paymentButtonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  paymentButton: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    flex: 1,
    alignItems: "center",
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 80,
  },
  selectedPayment: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  disabledPaymentButton: {
    opacity: 0.45,
  },
  paymentBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedPaymentText: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  totalVal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 18,
    width: "90%",
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%'
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
    width: '100%'
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  activeTabButton: {
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  addressItem: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: colors.card
  },
  selectedAddressItem: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.05)'
  },
  addressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4
  },
  addressItemType: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  defaultBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto'
  },
  addressItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md
  },
  searchHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 4
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  searchResultText: {
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1
  }
});
