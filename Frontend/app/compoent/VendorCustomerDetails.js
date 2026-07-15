import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import api from "../utils/api";
import VendorNavigation from "./VendorNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AppCalendar from "./common/AppCalendar";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import socket from "../socket";

export default function VendorCustomerDetails({ route }) {
  const { customer_id, vendor_id } = route.params || {};
  const [customerName, setCustomerName] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});

  // Date selection states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [cashReceived, setCashReceived] = useState("");

  const fetchTransactions = useCallback(() => {
    if (!customer_id) {
      showError("Customer ID is missing");
      return;
    }

    api.get(`/customer-transactions/${customer_id}`, {
      params: { vendor_id }
    })
      .then((res) => {
        setCustomerName(res.data.customer_name);
        setTotalSummary(res.data.totalSummary || {});
        setAllTransactions(res.data.transactions || []);
      })
      .catch((err) => {
        console.error("❌ Error fetching transactions:", err);
        showError("Failed to load customer transactions.");
      });
  }, [customer_id, vendor_id]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!vendor_id) return;
    socket.emit("join", { room: `vendor_${vendor_id}`, role: "vendor", user_id: vendor_id });

    const handlePaymentRecord = () => {
      fetchTransactions();
    };

    socket.on("payment-received", handlePaymentRecord);

    return () => {
      socket.off("payment-received", handlePaymentRecord);
    };
  }, [vendor_id]);

  useEffect(() => {
    filterTransactions(allTransactions, startDate, endDate);
  }, [startDate, endDate, allTransactions]);

  // ✅ Correct Filtering Based on Date Range
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

  // ✅ Function to Parse Date Correctly (Fix Format Issues)
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

  // ✅ Group Transactions by Order ID / Payment Receipt ID
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
      grouped[key].total_credit += item.credit_value_vendor || 0;
      grouped[key].total_debit += item.debit_value_vendor || 0;
      grouped[key].balance_due += item.balance_due || 0;
    });

    setGroupedTransactions(grouped);
  };

  const [submitting, setSubmitting] = useState(false);

  // ✅ Receive Direct Payment Function
  const handleReceivePayment = async () => {
    const amount = parseFloat(cashReceived || 0);
    if (isNaN(amount) || amount <= 0) {
      showError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      console.log('daejade');
      
      const response = await api.post(`/vendor/receive-payment`, {
        customer_id,
        vendor_id,
        amount
      });
      console.log('respinse of payemnt',response);
      
      if (response.data.success) {
        showSuccess(`Successfully received ₹${amount} from ${customerName}`, "Payment Recorded");
        setCashReceived("");
        fetchTransactions(); // Refresh transaction details
      } else {
        showError(response.data.message || "Failed to record payment.");
      }
    } catch (error) {
      console.error("❌ Error recording payment:", error);
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };
  const formatMoney = (value) => {
    return `₹${Number(value || 0).toFixed(2)}`;
  };
  return (
    <View style={styles.container}>
      <Text style={styles.header}>{customerName}'s Credit Transactions</Text>

      {/* ✅ Date Range Filter */}
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

      {/* ✅ Transactions List */}
      <FlatList
        data={Object.keys(groupedTransactions)}
        keyExtractor={(orderId) => orderId}
        renderItem={({ item: orderId }) => {
          const order = groupedTransactions[orderId];
          const formattedDate = parseDate(order.order_date_time);
          const isPayment = orderId.startsWith("payment_");
          return (
            <View style={styles.card}>
              <Text style={styles.orderHeader}>{isPayment ? "💳 Payment Receipt" : `📦 Order ID: ${orderId}`}</Text>
              <Text style={styles.orderDate}>
                Date: {formattedDate ? formattedDate.toLocaleDateString() : "Invalid Date"} | Time:{" "}
                {formattedDate ? formattedDate.toLocaleTimeString() : "Invalid Time"}
              </Text>

              {isPayment ? (
                <Text style={styles.foodItem}>Direct Credit Repayment</Text>
              ) : (
                order.items.map((foodItem, index) => (
                  <Text key={index} style={styles.foodItem}>
                    {foodItem.food_name} (x{foodItem.quantity}) - ₹{foodItem.cost}
                  </Text>
                ))
              )}

              <View style={styles.cardContent}>
                <View style={styles.column}>
                  {isPayment ? (
                    <Text style={styles.credit}>Amount Paid: ₹{order.total_credit}</Text>
                  ) : (
                    <>
                      <Text style={styles.summaryText}>Total: ₹{order.total_cost}</Text>
                      <Text style={styles.credit}>You Received: ₹{order.total_credit}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ✅ Grand Total */}
      <View style={styles.Grand}>
        <Text style={styles.summaryTitle}>Account Summary</Text>

        <Text style={styles.text3}>
          Total Credit Sales: {formatMoney(totalSummary.total_debit)}
        </Text>

        <Text style={styles.text2}>
          Total Payments Received: {formatMoney(totalSummary.total_credit)}
        </Text>

        <Text style={styles.text4}>
          Outstanding Balance: {formatMoney(totalSummary.total_balance_due)}
        </Text>
      </View>

      {/* ✅ Receive Payment */}
      <TextInput
        style={styles.input}
        placeholder="Enter cash received"
        keyboardType="numeric"
        value={cashReceived}
        onChangeText={setCashReceived}
      />
      <TouchableOpacity style={[styles.button, submitting && { backgroundColor: '#888' }]} onPress={handleReceivePayment} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Receive Payment</Text>
        )}
      </TouchableOpacity>

      {/* <VendorNavigation vendor_id={vendor_id}/> */}
    </View>
  );
}

// ✅ Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  // scrollView: { flex: 1, marginBottom: 150 },
  header: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#4A4A4A" },

  card: {
    width: "90%",
    // backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    alignSelf: "center",
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    // shadowColor: "#000",
    // shadowOpacity: 0.1,
    // shadowRadius: 5,
    // elevation: 3,
  },

  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  column: {
    width: "48%",
  },

  orderHeader: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 5 },
  orderDate: { fontSize: 12, color: "#666", marginBottom: 10 },
  foodItem: { fontSize: 14, color: "#444" },

  summaryText: { fontSize: 14, fontWeight: "bold", marginTop: 5 },
  credit: { fontSize: 14, color: "green" },
  debit: { fontSize: 14, color: "red" },
  pending: { fontSize: 14, fontWeight: "bold", color: "#D32F2F" },

  Grand: {
    width: "90%",
    height: 130,
    borderTopWidth: 2,

    borderTopColor: "#CACACA",
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginRight: 20,
    marginVertical: 15,
    alignItems: "center",

    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  summaryTitle: {
    fontWeight: "bold",
    color: "#4A4A4A",
    fontSize: 18,
    top: -10
  },
  text1: {
    color: "#4A4A4A",
    fontWeight: "bold",
    left: -72,


  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    width: "90%",
    alignSelf: "center",
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


  text4: {
    color: "#4A4A4A",
    fontWeight: "bold",
    left: -45,


  },
  input: {
    // borderWidth:2,
    width: "40%",
    borderColor: "#CACACA",
    backgroundColor: "#CACACA",
    borderRadius: 20,
    left: 10,
    top: 8,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  button: {

    // borderWidth:2,
    width: "50%",
    height: "5%",
    top: -25,

    left: 160,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    backgroundColor: "gray",
    alignItems: "center",
    borderRadius: 10
  }
  ,
  buttonText: {
    fontSize: 20,
    fontWeight: "bold"
  },
  bottomSection: {
    // borderWidth:3,

    top: -40
  }
});

// export default VendorCustomerDetails;
