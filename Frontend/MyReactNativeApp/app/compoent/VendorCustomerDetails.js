import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import axios from "axios";
import API_BASE from "../config1.js";
import "../i18n.js";
import { useTranslation } from "react-i18next";

export default function VendorCustomerDetails({ route }) {
  const { customer_id } = route.params || {};
  const [customerName, setCustomerName] = useState("");
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
//  const {t}=useTranslation()
  useEffect(() => {
    if (!customer_id) {
      Alert.alert("Error", "Customer ID is missing");
      return;
    }

    axios
      .get(`${API_BASE}/customer-transactions/${customer_id}`)
      .then((res) => {
        console.log("✅ API Response:", res.data);
        setCustomerName(res.data.customer_name);
        setTotalSummary(res.data.totalSummary);
        groupByOrderId(res.data.transactions);
      })
      .catch((err) => {
        console.error("❌ Error fetching transactions:", err);
        Alert.alert("Error", "Failed to load customer transactions.");
      });

    fetchPaymentRequests();
  }, [customer_id]);

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
      grouped[item.order_id].total_credit += item.credit_value_vendor || 0;
      grouped[item.order_id].total_debit += item.debit_value_vendor || 0;
      grouped[item.order_id].balance_due += item.balance_due || 0;
    });

    setGroupedTransactions(grouped);
  };

  const fetchPaymentRequests = async () => {
    try {
      if (!customer_id) {
        console.error("❌ Customer ID is undefined!");
        return;
      }

      const res = await axios.get(`${API_BASE}/payment-requests/${customer_id}`);

      if (res.data.length > 0) {
        const latestRequest = res.data[0]; // Get the latest request
        Alert.alert("📢 New Payment Request", `Customer requested ₹${latestRequest.amount}`, [
          {
            text: "Receive Payment",
            onPress: () => processPayment(latestRequest),
          },
          { text: "Ignore", style: "cancel" },
        ]);
      }
    } catch (error) {
      console.error("❌ Error fetching payment requests:", error.response?.data || error.message);
    }
  };

  const processPayment = async (paymentRequest) => {
    if (!paymentRequest || !paymentRequest.customer_id || !paymentRequest.amount) {
      console.error("❌ Invalid paymentRequest:", paymentRequest);
      Alert.alert("Error", "Invalid payment details.");
      return;
    }

    try {
      console.log("✅ Sending Payment Request:", paymentRequest);

      const response = await axios.post(`${API_BASE}/receive-payment`, {
        customer_id: paymentRequest.customer_id,
        amount_received: paymentRequest.amount,
      });

      if (response.data.success) {
        Alert.alert("✅ Payment Received", "Balance has been updated.");
      } else {
        Alert.alert("❌ Error", response.data.message || "Failed to update balance.");
      }
    } catch (error) {
      console.error("❌ Error processing payment:", error);
      Alert.alert("Error", "Failed to connect to the server.");
    }
  };

  const receivePayment = async () => {
    if (!cashReceived || isNaN(cashReceived) || cashReceived <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid amount.");
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/receive-payment`, {
        customer_id,
        amount_received: parseFloat(cashReceived),
      });

      if (response.data.success) {
        Alert.alert("✅ Payment Received", "Balance has been updated.");
        setCashReceived("");

        axios.get(`${API_BASE}/customer-transactions/${customer_id}`).then((res) => {
          setTotalSummary(res.data.totalSummary);
          groupByOrderId(res.data.transactions);
        });
      } else {
        Alert.alert("❌ Error", response.data.message || "Failed to update balance.");
      }
    } catch (error) {
      console.error("❌ Error receiving payment:", error);
      Alert.alert("Error", "Failed to connect to the server.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{customerName}'s Udar Transactions</Text>

      <FlatList
        data={Object.keys(groupedTransactions)}
        keyExtractor={(orderId) => orderId}
        renderItem={({ item: orderId }) => {
          const order = groupedTransactions[orderId];
          return (
            <View style={styles.card}>
              <Text style={styles.orderHeader}>Order ID: {orderId}</Text>
              <Text style={styles.orderDate}>
                Date: {new Date(order.order_date_time).toLocaleDateString()} | Time:{" "}
                {new Date(order.order_date_time).toLocaleTimeString()}
              </Text>

              {order.items.map((foodItem, index) => (
                <Text key={index} style={styles.foodItem}>
                  {foodItem.food_name} (x{foodItem.quantity}) - ₹{foodItem.cost}
                </Text>
              ))}

              <View style={styles.cardContent}>
                <View style={styles.column}>
                  <Text style={styles.summaryText}>Total: ₹{order.total_cost}</Text>
                  <Text style={styles.credit}>You Received: ₹{order.total_credit}</Text>
                </View>
                <View style={styles.column}>
                  {/* <Text style={styles.debit}>You Paid: ₹{order.total_debit}</Text> */}
                  {/* <Text style={styles.pending}>You will Receive: ₹{order.balance_due}</Text> */}
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.Grand}>
        <Text style={styles.summaryTitle}>Grand Total Summary</Text>
        <Text style={styles.text3}>Grand Total: ₹{totalSummary.total_debit}</Text>
        <Text style={styles.text2}>You Received: ₹{totalSummary.total_credit}</Text>
        
        <Text style={styles.text4}>You will Receive: ₹{totalSummary.total_balance_due}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter cash received"
        keyboardType="numeric"
        value={cashReceived}
        onChangeText={setCashReceived}
      />
      <TouchableOpacity style={styles.button} onPress={receivePayment}>
        <Text style={styles.buttonText}>Receive Payment</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 10 },
  // scrollView: { flex: 1, marginBottom: 150 },
  header: { fontSize: 22, fontWeight: "bold", textAlign: "center", marginVertical: 10, color: "#FF4500" },

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

  Grand:{
    width: "90%",
    height: 130,
    borderTopWidth:2,

    borderTopColor:"#CACACA",
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginRight:20,
    marginVertical: 15,
    alignItems: "center",
    
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  summaryTitle:{
    fontWeight:"bold",
    color:"#4A4A4A",
    fontSize:18,
    top:-10
  },
  text1:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-72,
   
    
  },
  text2:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-63.5,
    
    
  },
  text3:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-70,
    
    
  },
 
  text4:{
    color:"#4A4A4A",
    fontWeight:"bold",
    left:-45,
    
    
  },
  input:{
    // borderWidth:2,
    width:"40%",
    borderColor:"#CACACA",
    backgroundColor:"#CACACA",
    borderRadius:20,
    left:10,
    top:8,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  },
  button:{
    
    // borderWidth:2,
    width:"50%",
    height:"5%",
    top:-25,
    
    left:160,
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
  
  top:-40
}
});
