import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import api from "../utils/api";
import MyNavigation from "./MyNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";
import AppCalendar from "./common/AppCalendar";
import socket from "../socket";

export default function MyUdarScreen({ route }) {
  const { customer_id, vendor_id: routeVendorId } = route.params || {};
  const [ShopName, setShopName] = useState("");
  const [vendorId, setVendorId] = useState(routeVendorId || "");
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Date selection states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);

  useEffect(() => {
    fetchUdarRecords();
  }, []);

  useEffect(() => {
    if (!customer_id) return;
    socket.emit("join", { room: `customer_${customer_id}`, role: "customer", user_id: customer_id });

    const handlePaymentUpdate = () => {
      fetchUdarRecords();
    };

    socket.on("payment-recorded", handlePaymentUpdate);
    socket.on("payment-rejected", handlePaymentUpdate);

    return () => {
      socket.off("payment-recorded", handlePaymentUpdate);
      socket.off("payment-rejected", handlePaymentUpdate);
    };
  }, [customer_id]);

  useEffect(() => {
    filterTransactions(allTransactions, startDate, endDate);
  }, [startDate, endDate, allTransactions]);

  const fetchUdarRecords = async () => {
    try {
      const response = await api.get(`/customer/udar/${customer_id}`, {
        params: { vendor_id: vendorId }
      });

      setShopName(response.data.Shop_name || "");
      setTotalSummary(response.data.totalSummary || {});
      setVendorId(response.data.vendor_id || routeVendorId || "");
      setAllTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Error fetching Udar records:", error);
      showError("Failed to load credit records.");
    }
  };

  const filterTransactions = (transactions, start, end) => {
    if (!start) {
      setFilteredTransactions(transactions);
      groupByOrderId(transactions);
      return;
    }
    
    const filtered = transactions.filter((transaction) => {
      const transactionDate = parseDate(transaction.order_date_time);
      if (!transactionDate) return false;
      
      const txDate = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
      const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      return txDate >= sDate && txDate <= eDate;
    });

    setFilteredTransactions(filtered);
    groupByOrderId(filtered);
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    let parsedDate = new Date(dateString);
    if (isNaN(parsedDate)) {
      const parts = dateString.split(/[- :T]/);
      if (parts.length >= 3) {
        parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return parsedDate;
  };

  const groupByOrderId = (transactions) => {
    const grouped = {};
    transactions.forEach((item) => {
      const key = item.order_id ? item.order_id.toString() : `payment_${item.account_id || Math.random()}`;
      if (!grouped[key]) {
        grouped[key] = {
          order_id: item.order_id,
          order_date_time: item.order_date_time,
          items: [],
          total_cost: 0,
          total_credit: 0,
          total_debit: 0,
          balance_due: 0,
        };
      }
      grouped[key].items.push(item);
      grouped[key].total_cost += item.total_cost || 0;
      grouped[key].total_credit += item.credit_customer || 0;
      grouped[key].total_debit += item.debit_customer || 0;
      grouped[key].balance_due += item.balance_due || 0;
    });

    setGroupedTransactions(grouped);
  };

  const requestPayment = async () => {
    const amount = parseFloat(paymentAmount || 0);
    const maxAmount = totalSummary.total_balance_due || 0;

    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid amount.");
      return;
    }

    if (amount > maxAmount) {
      showError(`You cannot pay more than the outstanding balance of ₹${maxAmount}`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/request-payment`, {
        customer_id,
        amount,
        vendor_id: vendorId
      });

      if (response.data.success) {
        showSuccess("Shopkeeper has been notified of your payment.", "Payment Submitted");
        setPaymentAmount("");
      } else {
        showError(response.data.message || "Failed to submit request.");
      }
    } catch (error) {
      console.error("❌ Error requesting payment:", error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{ShopName} - Credit Account Ledger</Text>

      {/* Date Range Filter Card */}
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.transactionsBlock}>
          {Object.keys(groupedTransactions).map((orderId) => {
            const order = groupedTransactions[orderId];
            const formattedDate = parseDate(order.order_date_time);
            const isPayment = orderId.startsWith("payment_");
            return (
              <View style={styles.card} key={orderId}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderHeader}>{isPayment ? "💳 Payment Receipt" : `Order ID: #${orderId}`}</Text>
                  <Icon 
                    name={isPayment ? "cash-check" : "receipt"} 
                    size={18} 
                    color={isPayment ? colors.success : colors.primary} 
                  />
                </View>
                <Text style={styles.orderDate}>
                  📅 {formattedDate ? formattedDate.toLocaleDateString() : "Invalid Date"} | ⏰{" "}
                  {formattedDate ? formattedDate.toLocaleTimeString() : "Invalid Time"}
                </Text>

                <View style={styles.itemsBlock}>
                  {isPayment ? (
                    <Text style={styles.foodItem}>• Direct repayment on outstanding balance</Text>
                  ) : (
                    order.items.map((foodItem, index) => (
                      <Text key={index} style={styles.foodItem}>
                        • {foodItem.food_name} (x{foodItem.quantity}) - ₹{foodItem.cost}
                      </Text>
                    ))
                  )}
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.column}>
                    {isPayment ? (
                      <Text style={[styles.summaryText, { color: colors.success }]}>Repaid Amount: ₹{order.total_debit}</Text>
                    ) : (
                      <>
                        <Text style={styles.summaryText}>Total Cost: ₹{order.total_cost}</Text>
                        <Text style={styles.debit}>Borrowed: ₹{order.total_credit}</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Grand Total Summary Card */}
      <View style={styles.Grand}>
        <Text style={styles.summaryTitle}>Credit Account Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Credit:</Text>
          <Text style={styles.summaryVal}>₹{totalSummary.total_credit || 0}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Paid:</Text>
          <Text style={styles.summaryValSuccess}>₹{totalSummary.total_debit || 0}</Text>
        </View>
        <View style={[styles.summaryRow, styles.borderTop]}>
          <Text style={styles.summaryLabelBold}>Balance Due:</Text>
          <Text style={styles.summaryValError}>₹{totalSummary.total_balance_due || 0}</Text>
        </View>
      </View>

      {/* Payment Input & Button */}
      <View style={styles.paymentContainer}>
        <AppInput
          placeholder="Enter Amount (₹)"
          keyboardType="numeric"
          iconName="currency-inr"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          containerStyle={styles.paymentInput}
        />
        <PrimaryButton 
          title="Send Payment" 
          onPress={requestPayment} 
          loading={loading}
          style={styles.paymentBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: spacing.md 
  },
  header: { 
    fontSize: typography.fontSize.md, 
    fontWeight: "bold", 
    marginVertical: spacing.sm, 
    color: colors.textPrimary,
    textAlign: 'center',
  },
  scrollView: { 
    flex: 1, 
  },
  transactionsBlock: {
    paddingBottom: spacing.md,
  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
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
    marginVertical: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderHeader: { 
    fontSize: typography.fontSize.sm, 
    fontWeight: "bold", 
    color: colors.textPrimary 
  },
  orderDate: { 
    fontSize: 11, 
    color: colors.textSecondary, 
    marginBottom: spacing.sm 
  },
  itemsBlock: {
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  foodItem: { 
    fontSize: typography.fontSize.xs, 
    color: colors.textPrimary,
    marginVertical: 1,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  column: {
    flex: 1,
  },
  summaryText: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  debit: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'right',
  },
  Grand: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  summaryLabelBold: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  summaryVal: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  summaryValSuccess: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
  summaryValError: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  paymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  paymentInput: {
    flex: 1.2,
    marginBottom: 0,
  },
  paymentBtn: {
    flex: 1,
    minHeight: 48,
    height: 48,
    paddingVertical: 0,
  },
});