import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator, Modal, TextInput, TouchableOpacity } from "react-native";
import api from "../utils/api"; 
import MyNavigation from "./MyNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import EmptyState from "./common/EmptyState";
import StatusChip from "./common/StatusChip";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";

export default function RequestUdarScreen({ route }) {
  const { customer_id } = route.params || {};  

  const [vendors, setVendors] = useState([]);
  const [udarAccounts, setUdarAccounts] = useState({});
  const [approvedAccounts, setApprovedAccounts] = useState({});
  const [requestingVendorId, setRequestingVendorId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Credit Limit Modal states
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [creditLimit, setCreditLimit] = useState("5000");
  const [targetVendorId, setTargetVendorId] = useState(null);

  useEffect(() => {
    fetchVendors();
    checkExistingAccounts();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get(`/vendors`);
      setVendors(response.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAccounts = async () => {
    try {
      const response = await api.get(`/customer-udar-accounts/${customer_id}`);
      const existingAccounts = {};
      const approvedRequests = {};

      const accountsList = response.data.accounts || [];
      accountsList.forEach(acc => {
        existingAccounts[acc.vendor_id] = true;
        if (acc.status === "accepted") {
          approvedRequests[acc.vendor_id] = true;
        }
      });

      setUdarAccounts(existingAccounts);
      setApprovedAccounts(approvedRequests);
    } catch (error) {
      console.error("Error checking existing accounts:", error);
    }
  };

  const handleOpenLimitModal = (selectedVendorId) => {
    setTargetVendorId(selectedVendorId);
    setCreditLimit("5000");
    setShowLimitModal(true);
  };

  const requestUdar = async (selectedVendorId, limitVal) => {
    if (!customer_id) {
      showError("Customer ID is missing.");
      return;
    }

    if (udarAccounts[selectedVendorId]) {
      showError("Your request is already pending or accepted.");
      return;
    }

    setRequestingVendorId(selectedVendorId);
    try {
      await api.post(`/request-udar`, { 
        customer_id, 
        vendor_id: selectedVendorId,
        credit_limit: parseFloat(limitVal) || 0.00
      });
      showSuccess("Credit request successfully sent to the shopkeeper.", "Request Sent");
      setUdarAccounts(prevState => ({ ...prevState, [selectedVendorId]: true }));
      setShowLimitModal(false);
    } catch (error) {
      console.error("Error sending request:", error);
      showError("Failed to send credit request.");
    } finally {
      setRequestingVendorId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading shop list...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Request Credit</Text>

      {vendors.length === 0 ? (
        <EmptyState
          title="No Shops Found"
          description="No active vendors found to request credit from."
          iconName="storefront-outline"
          actionTitle="Refresh"
          onActionPress={fetchVendors}
        />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.vendor_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.vendorCard}>
              <View style={styles.cardInfo}>
                <Text style={styles.vendorName}>{item.Shop_name}</Text>
                <Text style={styles.vendorAddress}>
                  <Icon name="map-marker-outline" size={13} color={colors.textSecondary} /> {item.shop_address}
                </Text>
              </View>

              <View style={styles.cardAction}>
                {approvedAccounts[item.vendor_id] ? (
                  <StatusChip status="accepted" style={styles.statusChip} />
                ) : udarAccounts[item.vendor_id] ? (
                  <StatusChip status="pending" style={styles.statusChip} />
                ) : (
                  <PrimaryButton 
                    title="Request Credit" 
                    onPress={() => handleOpenLimitModal(item.vendor_id)}
                    loading={requestingVendorId === item.vendor_id}
                    disabled={requestingVendorId !== null}
                    style={styles.requestButton}
                    textStyle={styles.requestButtonText}
                  />
                )}
              </View>
            </View>
          )}
        />
      )}
      <MyNavigation customer_id={customer_id}/>

      {/* Limit Input Modal */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Credit Account</Text>
            <Text style={styles.modalSubtitle}>Specify your desired credit limit (₹):</Text>

            <AppInput
              label="Requested Limit (₹):"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={creditLimit}
              onChangeText={setCreditLimit}
            />

            <View style={styles.modalButtons}>
              <SecondaryButton
                title="Cancel"
                onPress={() => setShowLimitModal(false)}
                style={styles.modalBtn}
              />
              <PrimaryButton
                title="Submit Request"
                onPress={() => requestUdar(targetVendorId, creditLimit)}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: spacing.md 
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  header: { 
    fontSize: typography.fontSize.lg, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginVertical: spacing.md, 
    color: colors.textPrimary 
  },
  listContent: {
    paddingBottom: 90,
  },
  vendorCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardInfo: {
    flex: 1.2,
  },
  cardAction: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  vendorName: { 
    fontSize: typography.fontSize.md, 
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  vendorAddress: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  requestButton: { 
    minHeight: 38,
    height: 38,
    paddingVertical: 0,
    borderRadius: 8,
    width: '100%',
  },
  requestButtonText: {
    fontSize: typography.fontSize.xs,
  },
  statusChip: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    minHeight: 40,
    height: 40,
    paddingVertical: 0,
  },
});
