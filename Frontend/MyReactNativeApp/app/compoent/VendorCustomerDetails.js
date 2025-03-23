import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, StyleSheet } from "react-native";
import axios from "axios";
import API_BASE from "../config1.js";
import { Picker } from "@react-native-picker/picker";
import VendorNavigation from "./VendorNavigation.js";

export default function VendorCustomerDetails({ route }) {
  const { customer_id } = route.params || {};
  const [customerName, setCustomerName] = useState("");
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [totalSummary, setTotalSummary] = useState({});
  
  const today = new Date(); // Get current date
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // ✅ Default to current month
  const [cashReceived, setCashReceived] = useState("");

  useEffect(() => {
    if (!customer_id) {
      Alert.alert("Error", "Customer ID is missing");
      return;
    }

    axios.get(`${API_BASE}/customer-transactions/${customer_id}`)
      .then((res) => {
        setCustomerName(res.data.customer_name);
        setTotalSummary(res.data.totalSummary);
        setAllTransactions(res.data.transactions);
        filterTransactions(res.data.transactions, selectedMonth);
      })
      .catch((err) => {
        console.error("❌ Error fetching transactions:", err);
        Alert.alert("Error", "Failed to load customer transactions.");
      });
  }, [customer_id, selectedMonth]);

  // ✅ Correct Filtering Based on Selected Month
  const filterTransactions = (transactions, month) => {
    const filtered = transactions.filter((transaction) => {
      const transactionDate = parseDate(transaction.order_date_time);
      return transactionDate && (transactionDate.getMonth() + 1 === month) && (transactionDate.getFullYear() === today.getFullYear());
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
      grouped[item.order_id].total_credit += item.credit_value_vendor || 0;
      grouped[item.order_id].total_debit += item.debit_value_vendor || 0;
      grouped[item.order_id].balance_due += item.balance_due || 0;
    });

    setGroupedTransactions(grouped);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{customerName}'s Udar Transactions</Text>

      {/* ✅ Month Filter */}
      <View style={styles.filterContainer}>
        {/* <Text style={styles.filterLabel}>Filter by Month:</Text> */}
        <Picker
          selectedValue={selectedMonth}
          onValueChange={(itemValue) => setSelectedMonth(itemValue)}
          style={styles.picker}        >
          {Array.from({ length: 12 }, (_, i) => (
            <Picker.Item key={i} label={new Date(today.getFullYear(), i).toLocaleString("default", { month: "long" })} value={i + 1} />
          ))}
        </Picker>
      </View>

      {/* ✅ Transactions List */}
      <FlatList
        data={Object.keys(groupedTransactions)}
        keyExtractor={(orderId) => orderId}
        renderItem={({ item: orderId }) => {
          const order = groupedTransactions[orderId];
          const formattedDate = parseDate(order.order_date_time);
          return (
            <View style={styles.card}>
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
                  <Text style={styles.credit}>You Received: ₹{order.total_credit}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ✅ Grand Total */}
      <View style={styles.Grand}>
        <Text style={styles.summaryTitle}>Grand Total Summary</Text>
        <Text style={styles.text3}>Grand Total: ₹{totalSummary.total_debit}</Text>
        <Text style={styles.text2}>You Received: ₹{totalSummary.total_credit}</Text>
        <Text style={styles.text4}>You will Receive: ₹{totalSummary.total_balance_due}</Text>
      </View>

      {/* ✅ Receive Payment */}
      <TextInput
        style={styles.input}
        placeholder="Enter cash received"
        keyboardType="numeric"
        value={cashReceived}
        onChangeText={setCashReceived}
      />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Receive Payment</Text>
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
  picker:{
    // borderWidth:2,\
    alignItems:"center",
    left:10,
    fontWeight:"bold"
    
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

// export default VendorCustomerDetails;
