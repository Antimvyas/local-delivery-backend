import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity 
} from "react-native";
import api from "../utils/api";
import socket from "../socket";
import VendorNavigation from "./VendorNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import EmptyState from "./common/EmptyState";
import StatusChip from "./common/StatusChip";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Orders = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active", "pending", "past"
  const vendor_id = route.params?.vendor_id;

  useEffect(() => {
    const { resetOrderBadgeCount } = require('../utils/notificationService');
    resetOrderBadgeCount();
  }, []);

  useEffect(() => {
    if (!vendor_id) return;
    
    // Join room-based socket
    socket.emit('join', { room: `vendor_${vendor_id}`, role: 'vendor', user_id: vendor_id });

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    socket.on('order-updated', handleOrderUpdate);
    socket.on('new-order', handleOrderUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
      socket.off('new-order', handleOrderUpdate);
    };
  }, [vendor_id]);

  useEffect(() => {
    if (vendor_id) {
      fetchOrders();
    }
  }, [activeTab, vendor_id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = "/vendor/accepted-orders";
      let params = { vendor_id };

      if (activeTab === "pending") {
        url = "/vendor/orders";
      } else if (activeTab === "past") {
        params.status = "delivered";
      }

      const response = await api.get(url, { params });
      setOrders(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error.response?.data || error.message);
      showError("Failed to fetch orders.");
      setLoading(false);
    }
  };

  const updateOrderStatus = async (order_id, new_status) => {
    setUpdatingStatus({ order_id, new_status });
    try {
      await api.put(`/vendor/orders/update-status`, { order_id, vendor_id, new_status });
      fetchOrders();
      showSuccess(`Order status updated to ${new_status}.`);
    } catch (error) {
      console.error("Error updating order status:", error);
      showError("Failed to update order status.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vendor Orders</Text>

      {/* Tab Selection */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "pending" && styles.activeTabButton]}
          onPress={() => setActiveTab("pending")}
        >
          <Icon name="clock-outline" size={18} color={activeTab === "pending" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>New/Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "active" && styles.activeTabButton]}
          onPress={() => setActiveTab("active")}
        >
          <Icon name="clipboard-check-outline" size={18} color={activeTab === "active" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "active" && styles.activeTabText]}>Active/Accepted</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "past" && styles.activeTabButton]}
          onPress={() => setActiveTab("past")}
        >
          <Icon name="history" size={18} color={activeTab === "past" ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "past" && styles.activeTabText]}>Delivered/Past</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : orders.length === 0 ? (
        <EmptyState
          title={activeTab === "pending" ? "No Pending Orders" : activeTab === "active" ? "No Active Orders" : "No Past Orders"}
          description="Keep your shop open to receive new orders."
          iconName="clipboard-text-outline"
          actionTitle="Refresh"
          onActionPress={fetchOrders}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>Customer: {item.customer_name}</Text>
                <StatusChip status={item.order_status} />
              </View>

              <View style={styles.detailsBlock}>
                <Text style={styles.orderText}><Icon name="map-marker-outline" size={14} color={colors.textSecondary} /> Address: {item.customers_location}</Text>
                <Text style={styles.orderText}><Icon name="phone-outline" size={14} color={colors.textSecondary} /> Phone: {item.customers_contact}</Text>
                <Text style={styles.orderText}><Icon name="wallet-outline" size={14} color={colors.textSecondary} /> Payment: {item.payment_methods}</Text>
                <Text style={styles.orderText}><Icon name="currency-inr" size={14} color={colors.textPrimary} /> Total Amount: <Text style={styles.boldText}>₹{item.total_cost}</Text></Text>
              </View>

              <View style={styles.foodItemsContainer}>
                <Text style={styles.foodTitle}>Items:</Text>
                {item.food_items && item.food_items.map((food, index) => (
                  <Text key={index} style={styles.foodText}>
                    • {food.food_name} x {food.quantity} - ₹{food.item_total}
                  </Text>
                ))}
              </View>

              {/* Status Update Buttons Grid */}
              <View style={styles.actionsGrid}>
                {activeTab === "pending" ? (
                  <>
                    <PrimaryButton 
                      title="Reject"
                      onPress={() => updateOrderStatus(item.order_id, "Rejected")}
                      loading={updatingStatus?.order_id === item.order_id && updatingStatus?.new_status === "Rejected"}
                      disabled={updatingStatus !== null}
                      style={[styles.actionBtn, { backgroundColor: colors.error }]}
                    />
                    <PrimaryButton 
                      title="Accept"
                      onPress={() => updateOrderStatus(item.order_id, "accepted")}
                      loading={updatingStatus?.order_id === item.order_id && updatingStatus?.new_status === "accepted"}
                      disabled={updatingStatus !== null}
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    />
                  </>
                ) : activeTab === "active" ? (
                  <>
                    <PrimaryButton 
                      title="Preparing"
                      onPress={() => updateOrderStatus(item.order_id, "preparing")}
                      loading={updatingStatus?.order_id === item.order_id && updatingStatus?.new_status === "preparing"}
                      disabled={updatingStatus !== null || item.order_status !== "accepted"}
                      style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }, item.order_status !== "accepted" && { opacity: 0.4 }]}
                    />
                    
                    <PrimaryButton 
                      title="Ready"
                      onPress={() => updateOrderStatus(item.order_id, "ready")}
                      loading={updatingStatus?.order_id === item.order_id && updatingStatus?.new_status === "ready"}
                      disabled={updatingStatus !== null || item.order_status !== "preparing"}
                      style={[styles.actionBtn, { backgroundColor: colors.accent }, item.order_status !== "preparing" && { opacity: 0.4 }]}
                    />

                    <PrimaryButton 
                      title="Delivered"
                      onPress={() => updateOrderStatus(item.order_id, "delivered")}
                      loading={updatingStatus?.order_id === item.order_id && updatingStatus?.new_status === "delivered"}
                      disabled={updatingStatus !== null || item.order_status !== "ready"}
                      style={[styles.actionBtn, { backgroundColor: colors.success }, item.order_status !== "ready" && { opacity: 0.4 }]}
                    />
                  </>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
      <VendorNavigation vendor_id={vendor_id}/>
    </View>
  );
};

export default Orders;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  loader: {
    marginTop: spacing.xl,
  },
  listContent: {
    paddingBottom: 90,
  },
  orderCard: {
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
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  detailsBlock: {
    marginBottom: spacing.sm,
  },
  orderText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  boldText: {
    fontWeight: typography.fontWeight.bold,
  },
  foodItemsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  foodTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  foodText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginVertical: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    minHeight: 36,
    height: 36,
    paddingVertical: 0,
    borderRadius: 8,
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
});
