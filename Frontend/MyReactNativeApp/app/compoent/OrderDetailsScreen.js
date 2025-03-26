import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Animated 
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import socket from "../socket"; 
import API_BASE from "../config1.js";

const OrderDetailsScreen = ({ route, navigation }) => {
  const { cart, totalCost, vendor_id, customer_id } = route.params;
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isUdarApproved, setIsUdarApproved] = useState(false);

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState(""); // "address" or "contact"
  const [newAddress, setNewAddress] = useState({ city: "", building: "", town: "", houseNo: "" });
  const [newContact, setNewContact] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0)); // Animation for modal

  useEffect(() => {
    checkUdarApproval();
    fetchCustomerDetails();
  }, []);

  const checkUdarApproval = async () => {
    try {
      const response = await axios.get(`${API_BASE}/check-udar`, { params: { customer_id, vendor_id } });
      setIsUdarApproved(response.data.isApproved);
    } catch (error) {
      console.error("Error checking Udar approval:", error.response?.data || error.message);
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/customer/${customer_id}`);
      const data = await response.json();
      if (response.ok) {
        const customerData = data.result[0];
        setCustomerAddress(customerData.customer_address);
        setCustomerContact(customerData.Phone);
      } else {
        Alert.alert("Error", "Failed to fetch customer details");
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setIsModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setIsModalVisible(false));
  };

  const saveNewDetails = () => {
    if (modalType === "address") {
      const formattedAddress = `${newAddress.city}, ${newAddress.building}, ${newAddress.town}, ${newAddress.houseNo}`;
      setCustomerAddress(formattedAddress);
    } else if (modalType === "contact") {
      setCustomerContact(newContact);
    }
    closeModal();
  };

  const handleSubmitOrder = async () => {
    if (!customerAddress || !customerContact) {
      Alert.alert("Missing Information", "Please fill all the fields.");
      return;
    }

    if (!customer_id || !vendor_id || !totalCost || !cart.length) {
      Alert.alert("Error", "Cart cannot be empty.");
      return;
    }

    if (paymentMethod === "udar" && !isUdarApproved) {
      Alert.alert("Error", "Udar is not approved by the vendor.");
      return;
    }

    const orderData = {
      customer_id,
      vendor_id,
      total_cost: totalCost,
      customers_location: customerAddress,
      customers_contact: customerContact,
      payment_methods: paymentMethod,
      items: cart,
    };

    try {
      await axios.post(`${API_BASE}/orders`, orderData);
      Alert.alert("Order Placed", "Your order has been successfully submitted!");
      
      socket.emit("placeOrder", orderData);
      await AsyncStorage.removeItem("cart");
      navigation.navigate("CustomerDashboard", { customer_id });
    } catch (error) {
      console.error("Order Submission Failed:", error);
      Alert.alert("Order Failed", "Could not place the order. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Customer Address</Text>
        <TouchableOpacity onPress={() => openModal("address")}>
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.customerDetails}>{customerAddress}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Customer Contact</Text>
        <TouchableOpacity onPress={() => openModal("contact")}>
          <Text style={styles.editIcon}>✎</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.customerDetails}>{customerContact}</Text>

      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.paymentButton, paymentMethod === "cash" && styles.selectedPayment]} onPress={() => setPaymentMethod("cash")}>
          <Text style={styles.buttonText}>Pay with Cash</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.paymentButton, paymentMethod === "credit" && styles.selectedPayment]} onPress={() => setPaymentMethod("credit")} disabled={!isUdarApproved}>
          <Text style={styles.buttonText}>
            {isUdarApproved ? "Pay with Udar" : "Udar Not Approved"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleSubmitOrder} style={styles.submitButton}>
        <Text style={styles.submitButtonText}>Submit Order</Text>
      </TouchableOpacity>

      {/* Modal */}
      {isModalVisible && (
        <Modal transparent animationType="fade">
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>{modalType === "address" ? "Edit Address" : "Edit Contact"}</Text>
              
              {modalType === "address" ? (
                <>
                  <Text>Previous Address:</Text>
                  <Text style={styles.customerDetails}>{customerAddress}</Text>
                  <TextInput placeholder="City" style={styles.input} onChangeText={(text) => setNewAddress({ ...newAddress, city: text })} />
                  <TextInput placeholder="Building Number" style={styles.input} onChangeText={(text) => setNewAddress({ ...newAddress, building: text })} />
                  
                </>
              ) : (
                 
                <TextInput placeholder="New Contact Number" style={styles.input} onChangeText={setNewContact} maxLength={10} keyboardType="numeric"/>
              )}

              <TouchableOpacity onPress={saveNewDetails} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#fff" 
  },

  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 10
  },

  label: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#333" 
  },

  editIcon: { 
    fontSize: 18, 
    color: "#007bff", 
    fontWeight: "bold" 
  },

  customerDetails: { 
    fontSize: 16, 
    color: "#555", 
    marginBottom: 10, 
    padding: 10, 
    backgroundColor: "#f8f8f8", 
    borderRadius: 5 
  },

  buttonContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginVertical: 15 
  },

  paymentButton: { 
    padding: 15, 
    borderRadius: 5, 
    backgroundColor: "#ccc", 
    flex: 1, 
    alignItems: "center", 
    marginHorizontal: 5 
  },

  selectedPayment: { 
    backgroundColor: "#28A745" 
  },

  buttonText: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#fff" 
  },

  submitButton: { 
    backgroundColor: "#28a745", 
    padding: 12, 
    borderRadius: 5, 
    alignItems: "center", 
    marginTop: 20 
  },

  submitButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },

  // Modal Styling
  modalContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0,0,0,0.5)" 
  },

  modalView: { 
    backgroundColor: "white", 
    padding: 20, 
    borderRadius: 10, 
    width: "90%", 
    elevation: 10 
  },

  modalTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    textAlign: "center", 
    marginBottom: 10 
  },

  input: { 
    borderWidth: 1, 
    borderColor: "#ddd", 
    padding: 10, 
    borderRadius: 5, 
    marginBottom: 10, 
    fontSize: 16 
  },

  saveButton: { 
    backgroundColor: "#28a745", 
    padding: 12, 
    borderRadius: 5, 
    alignItems: "center", 
    marginTop: 10 
  },

  saveButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  }
});


export default OrderDetailsScreen;
