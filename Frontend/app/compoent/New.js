import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import api from "../utils/api";
import MyNavigation from "./MyNavigation.js";
import Credit from "./Credit.js";
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import EmptyState from "./common/EmptyState";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";

export default function New({ route, navigation }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const customer_id = route.params?.customer_id;

  useEffect(() => {
    const { resetPaymentBadgeCount } = require('../utils/notificationService');
    resetPaymentBadgeCount();
    fetchUdarVendors();
  }, [customer_id]);

  const fetchUdarVendors = () => {
    if (customer_id) {
      setLoading(true);
      api.get(`/udar/vendors/${customer_id}`)
        .then((res) => {
          setVendors(res.data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("API Error:", err);
          showError("Failed to fetch credit vendors.");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Credit List...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Credit Account List</Text>
      
      {vendors.length === 0 ? (
        <EmptyState
          title="No Credit Accounts Found"
          description="Click the '+' button below to request new credit from a vendor."
          iconName="wallet-outline"
          actionTitle="Refresh List"
          onActionPress={fetchUdarVendors}
        />
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={(item) => item.vendor_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("MyUdarScreen", {
                  vendor_id: item.vendor_id,
                  customer_id: customer_id,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.vendorName}>{item.Shop_name}</Text>
                <Text style={styles.pendingAmount}>₹{item.balance_due || 0}</Text>
              </View>

              <View style={styles.detailsBlock}>
                <Text style={styles.vendorInfo}>
                  <Icon name="phone" size={13} color={colors.textSecondary} /> Phone: {item.Phone}
                </Text>
                <Text style={styles.vendorInfo}>
                  <Icon name="map-marker" size={13} color={colors.textSecondary} /> Address: {item.shop_address}
                </Text>
              </View>

              <View style={styles.cardActionRow}>
                <Text style={styles.actionLinkText}>View Statement</Text>
                <Icon name="chevron-right" size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Credit customer_id={customer_id}/>
      <MyNavigation customer_id={customer_id}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
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
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  listContent: {
    paddingBottom: 90,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  vendorName: {
    fontSize: typography.fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  pendingAmount: {
    fontSize: typography.fontSize.md,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  detailsBlock: {
    marginBottom: spacing.sm,
  },
  vendorInfo: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  actionLinkText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginRight: 2,
  },
});
