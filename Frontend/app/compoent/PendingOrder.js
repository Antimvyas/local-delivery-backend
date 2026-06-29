import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  AppState
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/api";
import socket from "../socket";
import Sound from "react-native-sound";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import DangerButton from "./common/DangerButton";
import EmptyState from "./common/EmptyState";
import StatusChip from "./common/StatusChip";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const PendingOrder = ({ navigation, route }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOrder, setNewOrder] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const vendor_id = route.params?.vendor_id;
  let notificationSound = useRef(null);

  useEffect(() => {
    if (!vendor_id) return;

    fetchOrders();

    socket.emit('join', { room: `vendor_${vendor_id}`, role: 'vendor', user_id: vendor_id });

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    const handleNewOrder = (data) => {
      console.log("Socket: new-order received in PendingOrder (refreshing orders):", data);
      fetchOrders();
    };

    socket.on('order-updated', handleOrderUpdate);
    socket.on('new-order', handleNewOrder);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
      socket.off('new-order', handleNewOrder);
    };
  }, [vendor_id]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/vendor/orders', { params: { vendor_id } });
      setOrders(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showError("Failed to fetch pending orders.");
      setLoading(false);
    }
  };

  const playNotificationSound = () => {};
  const stopNotificationSound = () => {};

  const handleAcceptOrder = async () => {
    if (!newOrder || !newOrder.order_id) {
      showError("Order ID is missing.");
      return;
    }

    setProcessing(true);
    socket.emit("acceptOrder", {
      order_id: newOrder.order_id,
      customer_id: newOrder.customer_id,
      vendor_id: vendor_id,
    });

    showSuccess("Order accepted successfully!");
    stopNotificationSound();
    setIsModalVisible(false);
    setProcessing(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders();
  };

  const handleRejectOrder = async () => {
    if (!newOrder || !newOrder.order_id) return;

    setProcessing(true);
    socket.emit("rejectOrder", {
      order_id: newOrder.order_id,
      customer_id: newOrder.customer_id,
      vendor_id: vendor_id,
    });

    showSuccess("Order rejected!");
    stopNotificationSound();
    setIsModalVisible(false);
    setProcessing(false);
    await AsyncStorage.removeItem("newOrder");
    fetchOrders();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Orders</Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Pending Orders"
          description="You will hear a notification sound when new orders arrive."
          iconName="clipboard-text-clock-outline"
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
                <StatusChip status="pending" />
              </View>
              <Text style={styles.orderText}><Icon name="currency-inr" size={14} color={colors.textPrimary} /> Total Amount: ₹{item.total_cost}</Text>
              <Text style={styles.orderText}><Icon name="map-marker-outline" size={14} color={colors.textSecondary} /> Address: {item.customers_location}</Text>
              <Text style={styles.orderText}><Icon name="phone" size={14} color={colors.textSecondary} /> Phone: {item.customers_contact}</Text>
            </View>
          )}
        />
      )}

      {/* Handled globally by GlobalNotificationProvider */}
    </View>
  );
};

export default PendingOrder;

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
    paddingBottom: spacing.lg,
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
  orderText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: 18,
    width: "85%",
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  alertIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailItem: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    marginVertical: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    minHeight: 40,
    height: 40,
    paddingVertical: 0,
  },
});
