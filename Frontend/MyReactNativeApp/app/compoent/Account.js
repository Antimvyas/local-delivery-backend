import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from "react-native";
import axios from "axios";
import API_BASE from "../config1";
import MyNavigation from "./MyNavigation";
 // Change this to your backend URL

const Account = ({route}) => {
    const { customer_id } = route.params || {}; 
  const [customer, setCustomer] = useState({
    Name: "",
    Phone: "",
    username: "",
  });


  useEffect(() => {
    console.log(customer_id);
    
    fetchCustomer();
  }, []);

  // Fetch customer data
  const fetchCustomer = async () => {
    try {
      const response = await axios.get(`${API_BASE}/update/${customer_id}`);
      setCustomer(response.data);
      console.log("response",response.data);
      
    } catch (error) {
      console.error("Error fetching customer data", error);
    }
  };

  // Handle form changes
  const handleChange = (field, value) => {
    setCustomer({ ...customer, [field]: value });

  };

  // Update customer data
  const updateCustomer = async () => {
    try {
      await axios.put(`${API_BASE}/customer/${customer_id}`, customer);
      Alert.alert("Success", "Customer updated successfully!");
    } catch (error) {
      console.error("Error updating customer", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Account Details</Text>

      <Text style={styles.label}>Name:</Text>
      <TextInput
        style={styles.input}
        value={customer.Name}
        onChangeText={(text) => handleChange("Name", text)}
      />

      <Text style={styles.label}>Phone Number:</Text>
      <TextInput
        style={styles.input}
        value={customer.Phone}
        keyboardType="phone-pad"
        onChangeText={(text) => handleChange("Phone", text)}
      />

      <Text style={styles.label}>Username:</Text>
      <TextInput
        style={styles.input}
        value={customer.username}
        onChangeText={(text) => handleChange("username", text)}
      />

      <TouchableOpacity onPress={updateCustomer} style={styles.button}>
        <Text style={styles.buttonText}>Update</Text>
      </TouchableOpacity>
      <MyNavigation customer_id={customer_id} />
    </View>
  );
};

export default Account;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    // backgroundColor: "#f5f5f5",
  },
  card: {
    width: "90%",
    height: 300,
    
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginRight:20,
    marginVertical: 15,
    alignItems: "center",
    
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    // shadowColor: "#000",
    // shadowOffset: { width: 5, height: 5 },
    // shadowOpacity: 2,
    // shadowRadius: 8,
    // elevation: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button:{
    
    // borderWidth:2,
    width:"50%",
    height:"10%",
    
    
    left:80,
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    backgroundColor:"gray",
    alignItems:"center",
    borderRadius:10
  },
  buttonText:{
    top:12,
    fontSize:20,
    fontWeight:"bold"
  },
});
