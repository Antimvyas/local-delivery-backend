import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  ScrollView
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showError, showSuccess } from "../utils/toastHelper";
import api from "../utils/api";
import Credit_account from "./Credit_account.js";
import VendorNavigation from "./VendorNavigation.js";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import AppCalendar from "./common/AppCalendar";
import StatusChip from "./common/StatusChip";

import { useNotification } from "./common/GlobalNotificationProvider";

export default function AccountScreen({ route, navigation }) {
  const vendor_id = route.params?.vendor_id?.vendor_id ?? route.params?.vendor_id;
  const { checkUserSession } = useNotification() || {};
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vendor Profile states
  const [vendorInfo, setVendorInfo] = useState({
    Shop_name: "",
    shop_address: "",
    Phone: "",
    username: "",
    open_close_timings: [],
    shop_number: "",
    landmark: "",
    pocket: "",
    sector: "",
    city: "",
    state: "",
    latitude: null,
    longitude: null,
    structured_address: null
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // Tab & Payment states
  const [activeTab, setActiveTab] = useState("customers"); // "customers" or "payments"
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    if (activeTab === "payments") {
      const { resetPaymentBadgeCount } = require('../utils/notificationService');
      resetPaymentBadgeCount();
    }
  }, [activeTab]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!vendor_id) {
        setError("Vendor ID is missing");
        return;
      }
            
      // Fetch credit customers list
      const customerResponse = await api.get(`/vendor-dashboard/${vendor_id}`);
      const accounts = Array.isArray(customerResponse.data) ? customerResponse.data : (customerResponse.data?.accounts || []);
      setCustomers(accounts);

      // Fetch payment requests
      try {
        const paymentsResponse = await api.get(`/vendor/payment-requests/${vendor_id}`);
        setPaymentRequests(paymentsResponse.data || []);
      } catch (pErr) {
        console.warn("Failed to fetch payment requests:", pErr);
        setPaymentRequests([]);
      }

      // Fetch vendor details
      const vendorResponse = await api.get(`/vendor/${vendor_id}`);
      if (vendorResponse.data) {
        let timings = vendorResponse.data.open_close_timings || [];
        if (typeof timings === "string") {
          try {
            timings = JSON.parse(timings);
            if (typeof timings === "string") {
              timings = JSON.parse(timings);
            }
          } catch (e) {
            timings = [];
          }
        }
        setVendorInfo({
          Shop_name: vendorResponse.data.Shop_name || "",
          shop_address: vendorResponse.data.shop_address || "",
          Phone: vendorResponse.data.Phone || "",
          username: vendorResponse.data.username || "",
          open_close_timings: timings,
          shop_number: vendorResponse.data.shop_number || "",
          landmark: vendorResponse.data.landmark || "",
          pocket: vendorResponse.data.pocket || "",
          sector: vendorResponse.data.sector || "",
          city: vendorResponse.data.city || "",
          state: vendorResponse.data.state || "",
          latitude: vendorResponse.data.latitude || null,
          longitude: vendorResponse.data.longitude || null,
          structured_address: vendorResponse.data.structured_address || null
        });
      }
    } catch (err) {
      console.error("Error loading account screen data:", err);
      setError("Failed to load details. Please try again.");
      showError("Failed to load details.");
    } finally {
      setLoading(false);
    }
  }, [vendor_id]);

  useEffect(() => {
    if (activeTab === "payments") {
      filterPayments(paymentRequests, startDate, endDate);
    }
  }, [startDate, endDate, paymentRequests, activeTab]);

  const filterPayments = (payments, start, end) => {
    if (!start) {
      setFilteredPayments(payments);
      return;
    }
    const filtered = payments.filter((item) => {
      if (!item.request_time) return false;
      const itemDate = new Date(item.request_time);
      const txDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return txDate >= sDate && txDate <= eDate;
    });
    setFilteredPayments(filtered);
  };

  const handleVerifyRequest = async (request) => {
    setProcessingAction(request.request_id);
    try {
      console.log("Verifying payment request from AccountScreen:", request);
      await api.post('/receive-payment', {
        customer_id: request.customer_id,
        amount_received: request.amount,
        request_id: request.request_id
      });
      showSuccess("Payment verified successfully!");
      await fetchData();
    } catch (error) {
      console.error("Error verifying payment request:", error);
      showError("Failed to verify payment request.");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectRequest = async (request) => {
    setProcessingAction(request.request_id);
    try {
      console.log("Rejecting payment request from AccountScreen:", request);
      await api.post('/reject-payment', {
        customer_id: request.customer_id,
        amount: request.amount,
        request_id: request.request_id
      });
      showSuccess("Payment request rejected.");
      await fetchData();
    } catch (error) {
      console.error("Error rejecting payment request:", error);
      showError("Failed to reject payment request.");
    } finally {
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle vendor profile updates
  const handleUpdateProfile = async () => {
    if (!vendorInfo.Shop_name.trim() || !vendorInfo.shop_number.trim() || !vendorInfo.city.trim() || !vendorInfo.state.trim()) {
      showError("Shop Name, Shop Number, City, and State are required.");
      return;
    }

    const parts = [];
    if (vendorInfo.shop_number.trim()) parts.push(vendorInfo.shop_number.trim());
    if (vendorInfo.Shop_name.trim()) parts.push(vendorInfo.Shop_name.trim());
    if (vendorInfo.landmark.trim()) parts.push(`Near ${vendorInfo.landmark.trim()}`);
    if (vendorInfo.pocket.trim()) parts.push(vendorInfo.pocket.trim());
    if (vendorInfo.sector.trim()) parts.push(vendorInfo.sector.trim());
    if (vendorInfo.city.trim()) parts.push(vendorInfo.city.trim());
    if (vendorInfo.state.trim()) parts.push(vendorInfo.state.trim());
    const fullDisplayAddress = parts.join(", ");

    setUpdatingProfile(true);
    try {
      const payload = {
        Shop_name: vendorInfo.Shop_name,
        shop_address: fullDisplayAddress,
        username: vendorInfo.username,
        open_close_timings: vendorInfo.open_close_timings,
        shop_number: vendorInfo.shop_number,
        landmark: vendorInfo.landmark,
        pocket: vendorInfo.pocket,
        sector: vendorInfo.sector,
        city: vendorInfo.city,
        state: vendorInfo.state,
        latitude: vendorInfo.latitude,
        longitude: vendorInfo.longitude,
        structured_address: JSON.stringify({
          shop_number: vendorInfo.shop_number,
          landmark: vendorInfo.landmark,
          pocket: vendorInfo.pocket,
          sector: vendorInfo.sector,
          city: vendorInfo.city,
          state: vendorInfo.state
        })
      };

      await api.post("/add-vendor", payload);
      showSuccess("Shop profile updated successfully!");
      setShowProfileEdit(false);
      await fetchData();
    } catch (err) {
      console.error("Error updating vendor profile:", err);
      showError("Failed to update profile.");
    } finally {
      setUpdatingProfile(false);
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

  const handleTextChange = (field, value) => {
    setVendorInfo(prev => ({ ...prev, [field]: value }));
  };

  // Memoized customer item renderer
  const renderCustomerItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.customerCard} 
      onPress={() => navigation.navigate("VendorCustomerDetails", { customer_id: item.customer_id, vendor_id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{item.customer_name || item.Name}</Text>
          <Text style={styles.pendingAmount}>₹{item.total_pending_amount || item.balance_due || 0}</Text>
        </View>
        <Text style={styles.customerInfo}><Icon name="phone" size={13} color={colors.textSecondary} /> {item.Phone}</Text>
        <Text style={styles.customerInfo}><Icon name="map-marker" size={13} color={colors.textSecondary} /> {item.customer_address}</Text>
      </View>
    </TouchableOpacity>
  ), [navigation, vendor_id]);

  // Memoized payment request item renderer
  const renderPaymentRequestItem = useCallback(({ item }) => {
    const isPending = item.status === 'pending';
    const formattedDate = item.request_time ? new Date(item.request_time) : null;
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.customerPhone}>📞 {item.customer_phone}</Text>
          </View>
          <Text style={styles.paymentAmount}>₹{item.amount}</Text>
        </View>

        <View style={styles.paymentMeta}>
          <Text style={styles.paymentTime}>
            📅 {formattedDate ? formattedDate.toLocaleDateString() : "N/A"} | ⏰ {formattedDate ? formattedDate.toLocaleTimeString() : "N/A"}
          </Text>
          <StatusChip status={item.status} />
        </View>

        {isPending && (
          <View style={styles.paymentActions}>
            <TouchableOpacity 
              style={[styles.actionBtnSecondary, styles.rejectButton]} 
              onPress={() => handleRejectRequest(item)}
              disabled={processingAction !== null}
            >
              {processingAction === item.request_id ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={styles.rejectText}>Reject (NO)</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtnPrimary, styles.verifyButton]} 
              onPress={() => handleVerifyRequest(item)}
              disabled={processingAction !== null}
            >
              {processingAction === item.request_id ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.verifyText}>Verify (YES)</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [processingAction]);

  // Memoized key extractor
  const keyExtractor = useCallback((item) => {
    if (activeTab === "customers") {
      return item.customer_id?.toString() || Math.random().toString();
    } else {
      return item.request_id?.toString() || Math.random().toString();
    }
  }, [activeTab]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <PrimaryButton title="Retry" onPress={fetchData} />
      </View>
    );
  }

  // Header Component with Profile & Editable Card
  const listHeader = () => (
    <View style={styles.headerSection}>
      {/* Profile Avatar Placeholder */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Icon name="store" size={48} color={colors.primary} />
        </View>
        <Text style={styles.vendorTitle}>{vendorInfo.Shop_name}</Text>
        <Text style={styles.vendorUsername}>@{vendorInfo.username}</Text>
      </View>

      {/* Profile actions row */}
      <View style={styles.profileActionsRow}>
        <TouchableOpacity 
          style={styles.toggleProfileBtn} 
          onPress={() => setShowProfileEdit(!showProfileEdit)}
        >
          <Icon name={showProfileEdit ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
          <Text style={styles.toggleProfileText}>
            {showProfileEdit ? "Hide Edit" : "Edit Profile"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.toggleProfileBtn, styles.logoutBtn]} 
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={[styles.toggleProfileText, { color: colors.error }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editable Card */}
      {showProfileEdit && (
        <View style={styles.editableCard}>
          <Text style={styles.cardTitle}>Shop Information</Text>
          <AppInput
            label="Shop Name: *"
            placeholder="Enter shop name"
            iconName="storefront"
            value={vendorInfo.Shop_name}
            onChangeText={(val) => handleTextChange("Shop_name", val)}
          />

          <AppInput
            label="Shop Number / Flat / Floor: *"
            placeholder="e.g. Shop No. 12"
            iconName="home-outline"
            value={vendorInfo.shop_number}
            onChangeText={(val) => handleTextChange("shop_number", val)}
          />

          <AppInput
            label="Landmark Near Shop:"
            placeholder="e.g. Near Bus Stand"
            iconName="flag-outline"
            value={vendorInfo.landmark}
            onChangeText={(val) => handleTextChange("landmark", val)}
          />

          <AppInput
            label="Pocket:"
            placeholder="e.g. Pocket A"
            iconName="map-marker-outline"
            value={vendorInfo.pocket}
            onChangeText={(val) => handleTextChange("pocket", val)}
          />

          <AppInput
            label="Sector:"
            placeholder="e.g. Sector 15"
            iconName="map-marker-distance"
            value={vendorInfo.sector}
            onChangeText={(val) => handleTextChange("sector", val)}
          />

          <AppInput
            label="City: *"
            placeholder="e.g. Hisar"
            iconName="city"
            value={vendorInfo.city}
            onChangeText={(val) => handleTextChange("city", val)}
          />

          <AppInput
            label="State: *"
            placeholder="e.g. Haryana"
            iconName="map"
            value={vendorInfo.state}
            onChangeText={(val) => handleTextChange("state", val)}
          />

          <AppInput
            label="Phone Number:"
            placeholder="Enter phone number"
            iconName="phone"
            value={vendorInfo.Phone}
            editable={false} // Phone is read-only
          />

          <View style={{ marginVertical: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textSecondary }}>
              Auto-Formatted Complete Address:
            </Text>
            <Text style={{ fontSize: 12, color: colors.textPrimary, marginTop: 2 }}>
              {
                [
                  vendorInfo.shop_number, 
                  vendorInfo.Shop_name, 
                  vendorInfo.landmark ? `Near ${vendorInfo.landmark}` : "", 
                  vendorInfo.pocket, 
                  vendorInfo.sector, 
                  vendorInfo.city, 
                  vendorInfo.state
                ].filter(p => p && p.trim()).join(", ")
              }
            </Text>
          </View>

          <PrimaryButton
            title="Save Details"
            onPress={handleUpdateProfile}
            loading={updatingProfile}
            style={styles.saveBtn}
          />
        </View>
      )}

      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "customers" && styles.activeTabButton]}
          onPress={() => setActiveTab("customers")}
        >
          <Icon name="account-group" size={18} color={activeTab === "customers" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "customers" && styles.activeTabText]}>Credit Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "payments" && styles.activeTabButton]}
          onPress={() => setActiveTab("payments")}
        >
          <Icon name="cash-multiple" size={18} color={activeTab === "payments" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "payments" && styles.activeTabText]}>Payment Requests</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "payments" && (
        <TouchableOpacity 
          style={styles.filterCard}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.filterHeader}>
            <Icon name="calendar-range" size={18} color={colors.primary} />
            <Text style={styles.filterLabel}>Filter by Date Range:</Text>
          </View>
          <Text style={styles.selectedDatesText}>
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Section Divider / Title */}
      <View style={styles.sectionTitleRow}>
        <Icon name={activeTab === "customers" ? "hand-coin" : "cash-check"} size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>
          {activeTab === "customers" ? "Credit Account (Customers)" : "Customer Payment Requests"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={listHeader}
        data={activeTab === "customers" ? customers : filteredPayments}
        keyExtractor={keyExtractor}
        renderItem={activeTab === "customers" ? renderCustomerItem : renderPaymentRequestItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.noCustomers}>
              {activeTab === "customers" ? "No credit accounts found" : "No payment requests found"}
            </Text>
          </View>
        }
      />

      <AppCalendar
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
        onSelectDateRange={(start, end) => {
          if (start) {
            setStartDate(start);
            setEndDate(end || start);
          }
        }}
      />

      {activeTab === "customers" && <Credit_account vendor_id={vendor_id} />}
      <VendorNavigation vendor_id={vendor_id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 90,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    padding: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(30, 58, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vendorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  vendorUsername: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  logoutBtn: {
    borderColor: colors.error,
  },
  toggleProfileText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: 4,
  },
  editableCard: {
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
  cardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  saveBtn: {
    marginTop: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noCustomers: {
    textAlign: "center",
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  customerCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  customerInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 3,
  },
  pendingAmount: {
    fontSize: typography.fontSize.md,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginVertical: spacing.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  selectedDatesText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  paymentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  paymentTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  rejectButton: {
    backgroundColor: colors.white,
  },
  verifyButton: {
    backgroundColor: colors.primary,
  },
  rejectText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  verifyText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});