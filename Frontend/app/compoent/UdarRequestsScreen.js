import React, { useEffect, useState, useCallback } from "react";
import socket from "../socket";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import api from "../utils/api";
import VendorNavigation from "./VendorNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import DangerButton from "./common/DangerButton";
import EmptyState from "./common/EmptyState";
import StatusChip from "./common/StatusChip";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppCalendar from "./common/AppCalendar";

export default function UdarRequestsScreen({ route }) {
  const vendor_id = route.params?.vendor_id;
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // Date selection states
  // const [startDate, setStartDate] = useState(new Date());
  // const [endDate, setEndDate] = useState(new Date());
  // const [calendarVisible, setCalendarVisible] = useState(false);

  // Fetch requests function
  const fetchRequests = useCallback(async () => {
    if (!vendor_id) {
      setError("Vendor ID is missing");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await api.get(`/udar-requests/${vendor_id}`);
      console.log("Vendor ID:", vendor_id);
      console.log("API Response:", JSON.stringify(response.data, null, 2));

      let requestsData = [];
      if (Array.isArray(response.data)) {
        requestsData = response.data;
      } else if (response.data?.requests && Array.isArray(response.data.requests)) {
        requestsData = response.data.requests;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      } else {
        console.warn("Unexpected response structure:", response.data);
        requestsData = [];
      }

      setAllRequests(requestsData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendor_id]);

  // Filter requests based on date range
  // useEffect(() => {
  //   if (!startDate) {
  //     setRequests(allRequests);
  //     return;
  //   }
  //   const filtered = allRequests.filter(req => {
  //     if (!req.request_date) return false;
  //     const reqDate = new Date(req.request_date);
  //     const cellDate = new Date(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate());
  //     const sDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  //     const eDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  //     return cellDate >= sDate && cellDate <= eDate;
  //   });
  //   setRequests(filtered);
  // }, [startDate, endDate, allRequests]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time socket listener for incoming credit requests
  useEffect(() => {
    if (!vendor_id) return;

    socket.emit('join', { room: `vendor_${vendor_id}`, role: 'vendor', user_id: vendor_id });

    const handleCreditRequest = (data) => {
      console.log("Socket: credit-request received in UdarRequestsScreen (refreshing):", data);
      fetchRequests();
    };

    socket.on('credit-request', handleCreditRequest);

    return () => {
      socket.off('credit-request', handleCreditRequest);
    };
  }, [vendor_id, fetchRequests]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [fetchRequests]);

  // Accept request function
  const acceptRequest = useCallback(async (request_id) => {
    if (!request_id) {
      showError("Invalid request ID");
      return;
    }

    setProcessingRequestId(request_id);
    try {
      await api.post(`/accept-udar`, { request_id });
      showSuccess("Credit account successfully created!");

      setRequests(prevRequests =>
        prevRequests.filter(req => req.request_id !== request_id)
      );
    } catch (err) {
      console.error("Error accepting request:", err);
      showError("Failed to accept credit request.");
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  // Reject request function
  const rejectRequest = useCallback(async (request_id) => {
    if (!request_id) {
      showError("Invalid request ID");
      return;
    }

    setProcessingRequestId(request_id);
    try {
      await api.post(`/reject-udar`, { request_id });
      showSuccess("Credit request has been rejected.");

      setRequests(prevRequests =>
        prevRequests.filter(req => req.request_id !== request_id)
      );
    } catch (err) {
      console.error("Error rejecting request:", err);
      showError("Failed to reject credit request.");
    } finally {
      setProcessingRequestId(null);
    }
  }, []);

  const renderRequestItem = useCallback(({ item }) => {
    const isProcessing = processingRequestId === (item.request_id || item.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.customerName}>
            {item.customer_name || item.name || "Unknown Customer"}
          </Text>
          <StatusChip status="pending" />
        </View>

        <View style={styles.detailsBlock}>
          {item.phone && (
            <Text style={styles.customerInfo}>
              <Icon name="phone" size={14} color={colors.textSecondary} /> Phone: {item.phone}
            </Text>
          )}
          <Text style={styles.customerInfo}>
            <Icon name="hand-coin-outline" size={14} color={colors.textSecondary} /> Requested Limit: <Text style={{ fontWeight: 'bold', color: colors.primary }}>₹{item.credit_limit || '0.00'}</Text>
          </Text>
          {item.request_date && (
            <Text style={styles.customerInfo}>
              <Icon name="calendar-range" size={14} color={colors.textSecondary} /> Date & Time: {new Date(item.request_date).toLocaleDateString()} | {new Date(item.request_date).toLocaleTimeString()}
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {isProcessing ? (
            <ActivityIndicator color={colors.primary} size="small" style={styles.loader} />
          ) : (
            <>
              <DangerButton
                title="Reject"
                onPress={() => rejectRequest(item.request_id || item.id)}
                disabled={processingRequestId !== null}
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="Accept"
                onPress={() => acceptRequest(item.request_id || item.id)}
                disabled={processingRequestId !== null}
                style={styles.actionBtn}
              />
            </>
          )}
        </View>
      </View>
    );
  }, [acceptRequest, rejectRequest, processingRequestId]);

  const keyExtractor = useCallback((item, index) => {
    return (item.request_id || item.id || index).toString();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <PrimaryButton title="Retry" onPress={fetchRequests} style={styles.retryButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Credit Requests</Text>

      {/* Date Range Filter Card */}
      {/* <TouchableOpacity
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
      </TouchableOpacity> */}

      {/* <AppCalendar
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
      /> */}

      {requests.length === 0 ? (
        <EmptyState
          title="No Credit Requests Found"
          description="When a customer requests credit, it will show up here."
          iconName="hand-coin-outline"
          actionTitle="Refresh"
          onActionPress={fetchRequests}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={keyExtractor}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      <VendorNavigation vendor_id={vendor_id} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
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
  retryButton: {
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingBottom: 90,
  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  selectedDatesText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginLeft: 22,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
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
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  detailsBlock: {
    marginBottom: spacing.md,
  },
  customerInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginVertical: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 38,
    height: 38,
    paddingVertical: 0,
  },
  loader: {
    flex: 1,
    paddingVertical: spacing.xs,
  },
});