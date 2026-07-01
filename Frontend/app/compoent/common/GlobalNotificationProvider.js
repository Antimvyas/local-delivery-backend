import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import socket, { connectSocket } from '../../socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import PrimaryButton from './PrimaryButton';
import DangerButton from './DangerButton';
import { playNotificationSound, stopNotificationSound } from '../../utils/soundService';
import { incrementOrderBadgeCount, incrementPaymentBadgeCount, initBadgeCounts } from '../../utils/notificationService';
import api from '../../utils/api';
import { showError, showSuccess } from '../../utils/toastHelper';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const GlobalNotificationProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // { user_id, role }
  console.log("[RENDER TRACE] GlobalNotificationProvider Rendered. currentUser =", currentUser);
  const [newOrder, setNewOrder] = useState(null);
  const [newPayment, setNewPayment] = useState(null);
  const [customerOrderUpdate, setCustomerOrderUpdate] = useState(null);
  const [customerPaymentUpdate, setCustomerPaymentUpdate] = useState(null);
  const [newCreditRequest, setNewCreditRequest] = useState(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerOrderModal, setShowCustomerOrderModal] = useState(false);
  const [showCustomerPaymentModal, setShowCustomerPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  const [processingOrder, setProcessingOrder] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processingCredit, setProcessingCredit] = useState(false);

  const checkUserSession = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const role = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      if (token && role && userId) {
        setCurrentUser({ user_id: userId, role });
        socket.emit('join', { room: `${role}_${userId}`, role, user_id: userId });
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      console.warn("Failed to check user session:", e);
    }
  };

  useEffect(() => {
    initBadgeCounts();
    checkUserSession();

    // Setup socket listeners
    const onConnect = async () => {
      console.log("Global Socket connected. Re-joining room...");
      const role = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      if (role && userId) {
        socket.emit('join', { room: `${role}_${userId}`, role, user_id: userId });
      }
    };

    const handleNewOrder = (data) => {
      console.log("Global Socket: new-order received:", data);
      setNewOrder(data);
      setShowOrderModal(true);
      incrementOrderBadgeCount();
      playNotificationSound();
    };

    const handlePaymentRequest = (data) => {
      console.log("Global Socket: payment-request received:", data);
      setNewPayment(data);
      setShowPaymentModal(true);
      incrementPaymentBadgeCount();
      // SILENCED: playNotificationSound();
    };

    const handleOrderUpdated = (data) => {
      console.log("Global Socket: order-updated received:", data);
      AsyncStorage.getItem('userRole').then((role) => {
        if (role === 'customer') {
          setCustomerOrderUpdate(data);
          setShowCustomerOrderModal(true);
          incrementOrderBadgeCount();
          // SILENCED: playNotificationSound();
        }
      });
    };
 
    const handlePaymentRecorded = (data) => {
      console.log("Global Socket: payment-recorded received:", data);
      AsyncStorage.getItem('userRole').then((role) => {
        if (role === 'customer') {
          setCustomerPaymentUpdate({ ...data, status: 'approved' });
          setShowCustomerPaymentModal(true);
          incrementPaymentBadgeCount();
          // SILENCED: playNotificationSound();
        }
      });
    };
 
    const handlePaymentRejected = (data) => {
      console.log("Global Socket: payment-rejected received:", data);
      AsyncStorage.getItem('userRole').then((role) => {
        if (role === 'customer') {
          setCustomerPaymentUpdate({ ...data, status: 'rejected' });
          setShowCustomerPaymentModal(true);
          incrementPaymentBadgeCount();
          // SILENCED: playNotificationSound();
        }
      });
    };

    const handleCreditRequest = (data) => {
      console.log("Global Socket: credit-request received:", data);
      setNewCreditRequest(data);
      setShowCreditModal(true);
      incrementPaymentBadgeCount();
      // SILENCED: playNotificationSound();
    };
 
    socket.on('connect', onConnect);
    socket.on('new-order', handleNewOrder);
    socket.on('payment-request', handlePaymentRequest);
    socket.on('order-updated', handleOrderUpdated);
    socket.on('payment-recorded', handlePaymentRecorded);
    socket.on('payment-rejected', handlePaymentRejected);
    socket.on('credit-request', handleCreditRequest);

    return () => {
      socket.off('connect', onConnect);
      socket.off('new-order', handleNewOrder);
      socket.off('payment-request', handlePaymentRequest);
      socket.off('order-updated', handleOrderUpdated);
      socket.off('payment-recorded', handlePaymentRecorded);
      socket.off('payment-rejected', handlePaymentRejected);
      socket.off('credit-request', handleCreditRequest);
    };
  }, []);

  const handleAcceptOrder = async () => {
    if (!newOrder || !newOrder.order_id) return;
    setProcessingOrder(true);
    try {
      const vendorId = await AsyncStorage.getItem('userId');
      socket.emit("acceptOrder", {
        order_id: newOrder.order_id,
        customer_id: newOrder.customer_id,
        vendor_id: vendorId,
      });
      showSuccess("Order accepted successfully!");
      stopNotificationSound();
      setShowOrderModal(false);
    } catch (e) {
      showError("Failed to accept order.");
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!newOrder || !newOrder.order_id) return;
    setProcessingOrder(true);
    try {
      const vendorId = await AsyncStorage.getItem('userId');
      socket.emit("rejectOrder", {
        order_id: newOrder.order_id,
        customer_id: newOrder.customer_id,
        vendor_id: vendorId,
      });
      showSuccess("Order rejected!");
      stopNotificationSound();
      setShowOrderModal(false);
    } catch (e) {
      showError("Failed to reject order.");
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!newPayment || !newPayment.customer_id) return;
    setProcessingPayment(true);
    try {
      await api.post('/receive-payment', {
        customer_id: newPayment.customer_id,
        amount_received: newPayment.amount,
        request_id: newPayment.request_id
      });
      showSuccess("Payment verified and ledger updated!");
      stopNotificationSound();
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Error verifying payment:", error);
      showError("Failed to verify payment.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!newPayment || !newPayment.customer_id) return;
    setProcessingPayment(true);
    try {
      await api.post('/reject-payment', {
        customer_id: newPayment.customer_id,
        amount: newPayment.amount,
        request_id: newPayment.request_id
      });
      showSuccess("Payment request rejected.");
      stopNotificationSound();
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      showError("Failed to reject payment.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleAcceptCredit = async () => {
    if (!newCreditRequest || !newCreditRequest.request_id) return;
    setProcessingCredit(true);
    try {
      await api.post(`/accept-udar`, { request_id: newCreditRequest.request_id });
      showSuccess("Credit request approved successfully!");
      setShowCreditModal(false);
    } catch (e) {
      showError("Failed to approve credit request.");
    } finally {
      setProcessingCredit(false);
    }
  };

  const handleRejectCredit = async () => {
    if (!newCreditRequest || !newCreditRequest.request_id) return;
    setProcessingCredit(true);
    try {
      await api.post(`/reject-udar`, { request_id: newCreditRequest.request_id });
      showSuccess("Credit request rejected.");
      setShowCreditModal(false);
    } catch (e) {
      showError("Failed to reject credit request.");
    } finally {
      setProcessingCredit(false);
    }
  };

  return (
    <NotificationContext.Provider value={{ currentUser, checkUserSession }}>
      {children}

      {/* Global New Order Alert Modal (Vendor) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOrderModal}
        onRequestClose={() => {
          stopNotificationSound();
          setShowOrderModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.alertIconCircle}>
              <Icon name="bell-ring" size={36} color={colors.warning} />
            </View>
            <Text style={styles.modalTitle}>New Order Received!</Text>
            
            <View style={styles.detailsCard}>
              <Text style={styles.detailItem}>Customer: {newOrder?.customer_name}</Text>
              <Text style={styles.detailItem}>Amount: ₹{newOrder?.total_cost}</Text>
            </View>

            <View style={styles.modalButtons}>
              <DangerButton
                title="Reject"
                onPress={handleRejectOrder}
                loading={processingOrder}
                style={styles.modalBtn}
              />
              <PrimaryButton
                title="Accept"
                onPress={handleAcceptOrder}
                loading={processingOrder}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Payment Verification Modal (Vendor) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => {
          stopNotificationSound();
          setShowPaymentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.alertIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <Icon name="cash-register" size={36} color={colors.success} />
            </View>
            <Text style={styles.modalTitle}>Payment Submitted!</Text>
            
            <View style={styles.detailsCard}>
              <Text style={styles.detailItem}>Customer: {newPayment?.customer_name}</Text>
              <Text style={styles.detailItem}>Amount: ₹{newPayment?.amount}</Text>
              <Text style={styles.detailItem}>
                Date: {newPayment?.request_time ? new Date(newPayment.request_time).toLocaleDateString() : new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.detailItem}>
                Time: {newPayment?.request_time ? new Date(newPayment.request_time).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <DangerButton
                title="Reject (NO)"
                onPress={handleRejectPayment}
                loading={processingPayment}
                style={styles.modalBtn}
              />
              <PrimaryButton
                title="Verify (YES)"
                onPress={handleVerifyPayment}
                loading={processingPayment}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Global Order Status Update Modal (Customer) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomerOrderModal}
        onRequestClose={() => {
          stopNotificationSound();
          setShowCustomerOrderModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.alertIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Icon name="information-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Order Update!</Text>
            
            <View style={styles.detailsCard}>
              <Text style={styles.detailItem}>Order ID: #{customerOrderUpdate?.order_id}</Text>
              <Text style={styles.detailItem}>Status: {customerOrderUpdate?.status?.toUpperCase()}</Text>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                stopNotificationSound();
                setShowCustomerOrderModal(false);
              }}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Global Payment Update Modal (Customer) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomerPaymentModal}
        onRequestClose={() => {
          stopNotificationSound();
          setShowCustomerPaymentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.alertIconCircle, { backgroundColor: customerPaymentUpdate?.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
              <Icon 
                name={customerPaymentUpdate?.status === 'approved' ? "checkbox-marked-circle-outline" : "close-circle-outline"} 
                size={36} 
                color={customerPaymentUpdate?.status === 'approved' ? colors.success : colors.error} 
              />
            </View>
            <Text style={styles.modalTitle}>Payment Update!</Text>
            
            <View style={styles.detailsCard}>
              <Text style={styles.detailItem}>Amount: ₹{customerPaymentUpdate?.amount}</Text>
              <Text style={styles.detailItem}>
                Status: {customerPaymentUpdate?.status === 'approved' ? 'APPROVED' : 'REJECTED'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                stopNotificationSound();
                setShowCustomerPaymentModal(false);
              }}
            >
              <Text style={styles.closeButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Global Credit Request Alert Modal (Vendor) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCreditModal}
        onRequestClose={() => {
          setShowCreditModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.alertIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Icon name="hand-coin" size={36} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>Credit (Udhar) Request Received!</Text>
            
            <View style={styles.detailsCard}>
              <Text style={styles.detailItem}>Customer: {newCreditRequest?.customer_name}</Text>
              <Text style={styles.detailItem}>Requested Limit: ₹{newCreditRequest?.credit_limit || '0.00'}</Text>
              <Text style={styles.detailItem}>
                Date: {newCreditRequest?.request_date ? new Date(newCreditRequest.request_date).toLocaleDateString() : new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.detailItem}>
                Time: {newCreditRequest?.request_date ? new Date(newCreditRequest.request_date).toLocaleTimeString() : new Date().toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <DangerButton
                title="Reject"
                onPress={handleRejectCredit}
                loading={processingCredit}
                style={styles.modalBtn}
              />
              <PrimaryButton
                title="Accept"
                onPress={handleAcceptCredit}
                loading={processingCredit}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailItem: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    marginVertical: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
  closeButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

export default GlobalNotificationProvider;
