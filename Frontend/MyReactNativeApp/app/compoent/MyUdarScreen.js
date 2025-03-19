import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet, ScrollView } from "react-native";
import axios from "axios";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";

export default function MyUdarScreen({ route }) {
  const { customer_id } = route.params;
  const [ShopName, setShopName] = useState("");
  const[vendor_id,setvendorId]=useState("");
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    fetchUdarRecords();
  }, []);

  const fetchUdarRecords = async () => {
    try {
      const response = await axios.get(`${API_BASE}/customer/udar/${customer_id}`);
      setShopName(response.data.Shop_name);
      
      setTotalSummary(response.data.totalSummary);
      groupByOrderId(response.data.transactions);
      setvendorId(response.data.vendor_id);
      // console.log(      
        // "id",vendor_id      );
      
    } catch (error) {
      console.error("Error fetching Udar records:", error);
    }
  };

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

  const requestPayment = async () => {
    const amount = parseFloat(paymentAmount || 0);
    const maxAmount = totalSummary.total_balance_due || 0; // Pending amount
  
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

      <ScrollView style={styles.scrollView}>
        <View>
          {Object.keys(groupedTransactions).map((orderId) => {
            const order = groupedTransactions[orderId];
            return (
              <View style={styles.card} key={orderId}>
                <Text style={styles.orderHeader}>Order ID: {orderId}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.order_date_time).toLocaleDateString()} | {new Date(order.order_date_time).toLocaleTimeString()}
                </Text>

                {/* Two-Column Layout for Order Details */}
                {order.items.map((foodItem, index) => (
                  <Text key={index} style={styles.foodItem}>
                    {foodItem.food_name} (x{foodItem.quantity}) - ₹{foodItem.cost}
                  </Text>
                ))}
                <View style={styles.cardContent}>
                  {/* Left Column */}
                  <View style={styles.column}>
                    <Text style={styles.summaryText}>Total: ₹{order.total_cost}</Text>
                    {/* <Text style={styles.credit}>You Received: ₹{order.total_credit}</Text> */}
                  </View>

                  {/* Right Column */}
                  <View style={styles.column}>
                    <Text style={styles.debit}>You Paid: ₹{order.total_debit}</Text>
                    {/* <Text style={styles.pending}>You will Pay: ₹{order.balance_due}</Text> */}
                  </View>
                </View>

                {/* Food Items List */}
               
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Grand Total Summary & Payment Section */}
      <View style={styles.bottomSection}>
        <View style={styles.Grand}>
          <Text style={styles.summaryTitle}>Grand Total Summary</Text>
          {/* <Text style={styles.text1}>Total Cost: ₹{totalSummary.total_cost}</Text> */}
          <Text style={styles.text2}>Grand Total  ₹{totalSummary.total_credit}</Text>
          <Text style={styles.text3}> You Paid:     ₹{totalSummary.total_debit}</Text>
          <Text style={styles.text4}>You Will Pay:    ₹{totalSummary.total_balance_due}</Text>
        </View>

        {/* Payment Input & Button */}
        <View style={styles.paymentContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter amount to pay"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          <TouchableOpacity style={styles.button} onPress={requestPayment}>
            <Text style={styles.buttonText}>Paid</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity>
        <MyNavigation />
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
    // borderWidth:2,
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
  top:-40
}
});