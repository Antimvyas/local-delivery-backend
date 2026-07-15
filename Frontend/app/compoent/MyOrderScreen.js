import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView
} from "react-native";
import api from "../utils/api";
import MyNavigation from "./MyNavigation.js";
import socket from "../socket";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import EmptyState from "./common/EmptyState";
import StatusChip from "./common/StatusChip";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";
import { useFocusEffect } from "@react-navigation/native";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import SecondaryButton from "./common/SecondaryButton";

const MyOrdersScreen = ({ route, navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const customer_id = route.params?.customer_id;

  // Review states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const { resetOrderBadgeCount } = require('../utils/notificationService');
      resetOrderBadgeCount();
      if (customer_id) {
        fetchOrders();
      }
    }, [customer_id])
  );

  useEffect(() => {
    if (!customer_id) return;

    // Join room-based socket
    socket.emit('join', { room: `customer_${customer_id}`, role: 'customer', user_id: customer_id });

    const handleOrderUpdate = (data) => {
      console.log("🔄 Order Status Updated:", data);
      setOrderUpdates((prevUpdates) => [...prevUpdates, data]);
      fadeIn();
      fetchOrders();
      setTimeout(() => fadeOut(), 5000);

      // Auto trigger review modal when order changes to delivered
      if (data.status === "delivered") {
        setReviewOrderId(data.order_id);
        setReviewRating(5);
        setReviewText("");
        setDeliverySuccess(true);
        setShowReviewModal(true);
      }
    };

    socket.on('order-updated', handleOrderUpdate);

    return () => {
      socket.off('order-updated', handleOrderUpdate);
    };
  }, [customer_id]);

  const fetchOrders = async () => {
    try {
      const response = await api.get(
        `/customer/orders/new`,
        { params: { customer_id } }
      );
      const groupedOrders = groupOrdersById(response.data || []);
      setOrders(groupedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  const groupOrdersById = (ordersList) => {
    const grouped = ordersList.reduce((acc, order) => {
      const { order_id, total_cost, shop_name, food_name, quantity, order_status, has_review } = order;
      if (!acc[order_id]) {
        acc[order_id] = { order_id, total_cost, shop_name, items: [], order_status, has_review: !!has_review };
      }
      acc[order_id].items.push({ food_name, quantity });
      return acc;
    }, {});
    return Object.values(grouped).reverse(); // Show newest first
  };

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setOrderUpdates([]));
  };

  const handleOpenReview = (orderId) => {
    setReviewOrderId(orderId);
    setReviewRating(5);
    setReviewText("");
    setDeliverySuccess(true);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      await api.post(`/reviews`, {
        order_id: reviewOrderId,
        rating: reviewRating,
        review_text: reviewText,
        delivered_successfully: deliverySuccess
      });
      showSuccess("Thank you for your feedback!", "Review Submitted");
      setShowReviewModal(false);
      fetchOrders(); // Reload orders to hide the "Write Review" button
    } catch (e) {
      console.error(e);
      showError("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Orders</Text>

      {orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="Select some delicious food and place your first order!"
          iconName="receipt-text-minus-outline"
          actionTitle="Go to Home Dashboard"
          onActionPress={() => navigation.navigate("CustomerDashboard", { customer_id })}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderTitle}>Order #{item.order_id}</Text>
                <StatusChip status={item.order_status} />
              </View>

              <View style={styles.shopSection}>
                <Icon name="storefront-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.shopName}>{item.shop_name}</Text>
              </View>

              <View style={styles.itemsBlock}>
                {item.items.map((foodItem, index) => (
                  <Text key={index} style={styles.foodText}>
                    • {foodItem.food_name} (x{foodItem.quantity})
                  </Text>
                ))}
              </View>

              <View style={[styles.cardFooter, { borderBottomWidth: (item.order_status === "delivered" && !item.has_review) ? 1 : 0, borderBottomColor: colors.border, paddingBottom: 8 }]}>
                <Text style={styles.totalLabel}>Total cost:</Text>
                <Text style={styles.totalValue}>₹{item.total_cost}</Text>
              </View>

              {item.order_status === "delivered" && !item.has_review && (
                <View style={styles.reviewPromptContainer}>
                  <TouchableOpacity 
                    style={styles.reviewButton} 
                    onPress={() => handleOpenReview(item.order_id)}
                  >
                    <Icon name="star-outline" size={16} color={colors.primary} />
                    <Text style={styles.reviewButtonText}>Write a Review</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Floating Order Status Updates Notification */}
      {orderUpdates.length > 0 && (
        <Animated.View style={[styles.floatingModal, { opacity: fadeAnim }]}>
          <View style={styles.modalInfo}>
            <View style={styles.modalHeaderRow}>
              <Icon name="bell-badge" size={20} color={colors.primary} />
              <Text style={styles.modalTitle}>Order Update Received!</Text>
            </View>
            {orderUpdates.map((update, index) => (
              <Text key={index} style={styles.modalText}>
                Order #{update.order_id} status changed to **{update.status}**
              </Text>
            ))}
          </View>
          <TouchableOpacity onPress={fadeOut} style={styles.closeBtn}>
            <Icon name="close" size={20} color={colors.error} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <Modal transparent animationType="fade" visible={showReviewModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.reviewModalContent}>
              <Text style={styles.reviewTitle}>Rate Order #{reviewOrderId}</Text>
              
              <Text style={styles.reviewSubtitle}>Was the delivery successful?</Text>
              <View style={styles.deliveryStatusRow}>
                <TouchableOpacity 
                  style={[styles.deliveryStatusBtn, deliverySuccess && styles.successSelected]}
                  onPress={() => setDeliverySuccess(true)}
                >
                  <Icon name="check-bold" size={16} color={deliverySuccess ? colors.white : colors.success} />
                  <Text style={[styles.deliveryStatusBtnText, deliverySuccess && styles.whiteText]}>Successful</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deliveryStatusBtn, !deliverySuccess && styles.errorSelected]}
                  onPress={() => setDeliverySuccess(false)}
                >
                  <Icon name="close-thick" size={16} color={!deliverySuccess ? colors.white : colors.error} />
                  <Text style={[styles.deliveryStatusBtnText, !deliverySuccess && styles.whiteText]}>Failed</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewSubtitle}>How would you rate the food / delivery?</Text>
              <View style={styles.starRatingRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setReviewRating(star)}
                    style={styles.starBtn}
                  >
                    <Icon 
                      name={star <= reviewRating ? "star" : "star-outline"} 
                      size={32} 
                      color={colors.primary} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <AppInput
                label="Comments (Optional):"
                placeholder="Write a comment about food quality or speed..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalButtons}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => setShowReviewModal(false)}
                  style={styles.modalBtn}
                />
                <PrimaryButton
                  title="Submit Review"
                  onPress={handleSubmitReview}
                  loading={submittingReview}
                  style={styles.modalBtn}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      <MyNavigation customer_id={customer_id} />
    </View>
  );
};

export default MyOrdersScreen;

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
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  orderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  shopSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  shopName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  itemsBlock: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  foodText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    marginVertical: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  reviewPromptContainer: {
    marginTop: 8,
    alignItems: 'center'
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.03)'
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary
  },
  floatingModal: {
    position: "absolute",
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  modalInfo: {
    flex: 1,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: "bold",
    color: colors.primary,
  },
  modalText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewModalContent: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    borderRadius: 18,
    width: "85%",
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center'
  },
  reviewTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center'
  },
  reviewSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start'
  },
  deliveryStatusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md
  },
  deliveryStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card
  },
  successSelected: {
    borderColor: colors.success,
    backgroundColor: colors.success
  },
  errorSelected: {
    borderColor: colors.error,
    backgroundColor: colors.error
  },
  deliveryStatusBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary
  },
  whiteText: {
    color: colors.white
  },
  starRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    marginBottom: spacing.md
  },
  starBtn: {
    padding: spacing.xs
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.md
  },
  modalBtn: {
    flex: 1,
    minHeight: 40,
    height: 40,
    paddingVertical: 0
  }
});
