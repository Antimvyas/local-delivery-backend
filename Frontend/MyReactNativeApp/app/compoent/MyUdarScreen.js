import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";

export default function MyUdarScreen({ route }) {
  const { customer_id } = route.params;
  const [ShopName, setShopName] = useState("");
  const [vendor_id, setVendorId] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});
  const [paymentAmount, setPaymentAmount] = useState("");

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // ✅ Default to current month

  useEffect(() => {
    fetchUdarRecords();
  }, [selectedMonth]); // ✅ Fetch data whenever month changes

  const fetchUdarRecords = async () => {
    try {
      console.log("Fetching records for customer_id:", customer_id);
      const response = await axios.get(`${API_BASE}/customer/udar/${customer_id}`);

      setShopName(response.data.Shop_name);
      setTotalSummary(response.data.totalSummary);
      setVendorId(response.data.vendor_id);
      setAllTransactions(response.data.transactions);

      filterTransactions(response.data.transactions, selectedMonth);
    } catch (error) {
      console.error("Error fetching Udar records:", error);
    }
  };

  // ✅ Filter Transactions by Month
  const filterTransactions = (transactions, month) => {
    const filtered = transactions.filter((transaction) => {
      const transactionDate = parseDate(transaction.order_date_time);
      return transactionDate && transactionDate.getMonth() + 1 === month && transactionDate.getFullYear() === today.getFullYear();
    });

    setFilteredTransactions(filtered);
    groupByOrderId(filtered);
  };

  // ✅ Function to Parse Date Correctly
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

  // ✅ Group Transactions by Order ID
  const groupByOrderId = (transactions) => {
    const grouped = {};
    transactions.forEach((item) => {
      if (!grouped[item.order_id]) {
        grouped[item.order_id] = {
          order_date_time: item.order_date_time,
          items: [],
          total_cost: 0,
          total_credit: 0,
          total_debit: 0,
          balance_due: 0,
        };
      }
      grouped[item.order_id].items.push(item);
      grouped[item.order_id].total_cost += item.total_cost || 0;
      grouped[item.order_id].total_credit += item.credit_customer || 0;
      grouped[item.order_id].total_debit += item.debit_customer || 0;
      grouped[item.order_id].balance_due += item.balance_due || 0;
    });

    setGroupedTransactions(grouped);
  };

  // ✅ Request Payment Function
  const requestPayment = async () => {
    const amount = parseFloat(paymentAmount || 0);
    const maxAmount = totalSummary.total_balance_due || 0;

    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }

    if (amount > maxAmount) {
      Alert.alert("Payment Limit Exceeded", `You cannot pay more than ₹${maxAmount}`);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/request-payment`, {
        customer_id,
        amount,
        vendor_id
      });

      if (response.data.success) {
        Alert.alert("✅ Payment Request Sent", "The vendor has been notified.");
        setPaymentAmount("");
      } else {
        Alert.alert("❌ Error", response.data.message || "Failed to send request.");
      }
    } catch (error) {
      console.error("❌ Error requesting payment:", error);
      Alert.alert("Error", "Failed to connect to the server.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{ShopName}'s Transactions</Text>

      {/* ✅ Month Filter */}
      <View style={styles.filterContainer}>
        <Picker
          selectedValue={selectedMonth}
          onValueChange={(itemValue) => setSelectedMonth(itemValue)}
          style={styles.picker}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <Picker.Item key={i} label={new Date(today.getFullYear(), i).toLocaleString("default", { month: "long" })} value={i + 1} />
          ))}
        </Picker>
      </View>

      <ScrollView style={styles.scrollView}>
        <View>
          {Object.keys(groupedTransactions).map((orderId) => {
            const order = groupedTransactions[orderId];
            const formattedDate = parseDate(order.order_date_time);
            return (
              <View style={styles.card} key={orderId}>
                <Text style={styles.orderHeader}>Order ID: {orderId}</Text>
                <Text style={styles.orderDate}>
                  Date: {formattedDate ? formattedDate.toLocaleDateString() : "Invalid Date"} | Time:{" "}
                  {formattedDate ? formattedDate.toLocaleTimeString() : "Invalid Time"}
                </Text>

                {order.items.map((foodItem, index) => (
                  <Text key={index} style={styles.foodItem}>
                    {foodItem.food_name} (x{foodItem.quantity}) - ₹{foodItem.cost}
                  </Text>
                ))}

                <View style={styles.cardContent}>
                  <View style={styles.column}>
                    <Text style={styles.summaryText}>Total: ₹{order.total_cost}</Text>
                  </View>
                  <View style={styles.column}>
                    <Text style={styles.debit}>You Paid: ₹{order.total_debit}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ✅ Grand Total Summary */}
      <View style={styles.Grand}>
        <Text style={styles.summaryTitle}>Grand Total Summary</Text>
        <Text style={styles.text2}>Grand Total ₹{totalSummary.total_credit}</Text>
        <Text style={styles.text3}>You Paid: ₹{totalSummary.total_debit}</Text>
        <Text style={styles.text4}>You Will Pay: ₹{totalSummary.total_balance_due}</Text>
      </View>

      {/* ✅ Payment Input & Button */}
      <View style={styles.paymentContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter amount to pay"
          keyboardType="numeric"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
        />
        <TouchableOpacity style={styles.button} onPress={requestPayment}>
          <Text style={styles.buttonText}>Pay</Text>
        </TouchableOpacity>
      </View>

      {/* <MyNavigation customer_id={customer_id} /> */}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  // scrollView: { flex: 1, marginBottom: 150 },
  header: { fontSize: 18, fontWeight: "bold", marginVertical: 10, color: "#4A4A4A" },

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
  picker:{
    // borderWidth:2,\
    alignItems:"center",
    left:10,
    fontWeight:"bold"
    
  },

  orderHeader: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 5 },
  orderDate: { fontSize: 12, color: "#666", marginBottom: 10 },
  foodItem: { fontSize: 14, color: "#444" },

  summaryText: { fontSize: 14, fontWeight: "bold", marginTop: 5 },
  credit: { fontSize: 14, color: "green" },
  debit: { fontSize: 14, color: "red" },
  pending: { fontSize: 14, fontWeight: "bold", color: "#D32F2F" },

  Grand:{
    width: "90%",
    height: 130,
    borderTopWidth:2,
    // borderWidth:3,
    borderTopColor:"#CACACA",
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    // marginRight:20,
    // marginVertical: 15,
    // bottom:-10,
    alignItems: "center",
    
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  filterContainer:{
    // borderWidth:3,
    width:"40%",
    color:"#4A4A4A",
    right:-210,
    // alignItems:"center",
    height:"7%",
    borderRadius:20,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },

  summaryTitle:{
    fontWeight:"bold",
    color:"#4A4A4A",
    fontSize:18,
    top:-10
  },
  // text1:{
  //   color:"#4A4A4A",
  //   fontWeight:"bold",
  //   left:-72,
   
    
  // },
  text2:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-53.5,
    
    
  },
  text3:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-65,
    
    
  },
 
  text4:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-45,
    
    
  },
  input:{
    borderWidth:4,
    width:"50%",
    borderColor:"#CACACA",
    backgroundColor:"#CACACA",
    borderRadius:20,
    left:20,
    top:8,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  button:{
    
    // borderWidth:2,
    width:"20%",
    top:-25,
    
    left:200,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    backgroundColor:"gray",
    alignItems:"center",
    borderRadius:10
  }
,
buttonText:{
  fontSize:20,
  fontWeight:"bold"
},
bottomSection:{
  // borderWidth:3,
  top:-20
}
});