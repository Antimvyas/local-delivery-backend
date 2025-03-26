import React, { useState, useCallback, useEffect } from "react";
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Modal } from "react-native";
import axios from "axios";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from 'react-native-linear-gradient';
import BASE_URL from "../config.js";
import API_BASE from "../config1.js"
import MyNavigation from "./MyNavigation.js";
const FoodList = ({ route }) => {
  const { vendor_id ,customer_id } = route.params;
  const [foodItems, setFoodItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const navigation = useNavigation();

  const fetchFood = async () => {
    try {
      console.log("food", customer_id);
      
      const response = await axios.get(`${API_BASE}/food`, { params: { vendor_id } });
      
      // Filter out unavailable foods
      console.log("food ",response.data);
      
      const availableFood = response.data.filter(food => food.is_available);
      
      setFoodItems(availableFood || []);
      console.log(availableFood);
    } catch (error) {
      Alert.alert("Error", "Could not fetch menu items");
    }
  };
  
  
  // Ensure useFocusEffect correctly reloads data
  useFocusEffect(
    useCallback(() => {
      fetchFood();
      loadCart();
    }, [vendor_id, customer_id])
  );
  

  const loadCart = async () => {
    try {
      const storedCart = await AsyncStorage.getItem("cart");
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.log("Error loading cart:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFood();
      loadCart();
    }, [])
  );

  const addToCart = async (item) => {
    const existingItem = cart.find((cartItem) => cartItem.food_id === item.food_id);
    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map((cartItem) =>
        cartItem.food_id === item.food_id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      );
    } else {
      updatedCart = [...cart, { ...item, quantity: 1 }];
    }
    setCart(updatedCart);
    await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
    setSelectedItem(item);
    setModalVisible(true);
  };

  const updateQuantity = (food_id, change) => {
    const updatedCart = cart.map((item) =>
      item.food_id === food_id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
    ).filter(item => item.quantity > 0);
    setCart(updatedCart);
    AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

    if (!updatedCart.find(item => item.food_id === food_id)) {
      setModalVisible(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={foodItems}
        keyExtractor={(item) => item.food_id.toString()}
        renderItem={({ item }) => {
          const imageUrl = item.food_img.startsWith("http") ? item.food_img : BASE_URL + item.food_img;
          const cartItem = cart.find(cartItem => cartItem.food_id === item.food_id);
          return (
            <View style={styles.card}>
              
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <View style={styles.info}>
                  <Text style={styles.foodName}>{item.food_name}</Text>
                  <Text style={styles.price}>₹{item.cost}</Text>
                  <Text style={styles.des}>{item.food_description}</Text>
                </View>
                {!cartItem ? (
                  <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                    <Text style={styles.button}>Add</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity onPress={() => updateQuantity(item.food_id, -1)}>
                      <Text style={styles.quantityButton}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{cartItem.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.food_id, 1)}>
                      <Text style={styles.quantityButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              
            </View>
          );
        }}
      />
      <Modal  animationType="slide" transparent={true}   visible={modalVisible}  onRequestClose={() => setModalVisible(false)}
         propagateSwipe={true}         onBackdropPress={() => setIsModalVisible(false)} // Close on tap outside

        >
            {/* Outer container with transparent background */}
        <View style={[styles.modalContainer]} pointerEvents="auto">
            {/* Modal content */}
          <View style={styles.modalView}>
            {selectedItem && (
              <Text style={styles.modalText}>
                 {selectedItem.food_name} - Quantity: {cart.find(item => item.food_id === selectedItem.food_id)?.quantity || 0}
              </Text>
            )}
            <TouchableOpacity style={styles.cartButton} onPress={() => { setModalVisible(false);
                navigation.navigate("CartScreen", { cart, vendor_id, customer_id }); }}   >
                <Text style={styles.cartButtonText}>Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={[styles.nav]}><MyNavigation customer_id={customer_id} vendor_id={vendor_id}/>
      </TouchableOpacity>
    </View>
  );
};

export default FoodList;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", },
  // cartIcon: { position: "absolute", top: 10, right: 20, zIndex: 1 },
  card: {
    width: "90%",
    height: 150,
    
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
 nav:{
  bottom:0,

 },
  image: {
    width: 110,
    height: 110,
    borderRadius: 10,
   
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    
    position: "absolute",
    top: 15,
    left: 10,
    
  },
  info:{
    // borderWidth:3,
    width:"70%",
    height:120,
    left:55
  },
  foodName: { 
    fontSize: 20,
  fontWeight: "bold",
  color: "#4A4A4A",
  // marginLeft: 90,
  textAlign: "left",
   left: 25,
  // textShadowColor: "rgba(0, 0, 0, 0.1)",
  // textShadowOffset: { width: 1, height: 1 },
  // textShadowRadius: 2,
},
  price: {  fontSize: 20,
    color: "#666",
    textAlign: "left",
    fontWeight:400,
    // marginLeft:90,
    left: 25,

},
des:{
  fontSize: 15,
  color: "#666",
  textAlign: "left",
  fontWeight:400,
  // marginLeft:90,
  top:10,
  left: 25, 
},
addButton: {
  width:"25%",
  position: "absolute",
  bottom: 70,
  right:15,
  alignItems:"center",
  boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  backgroundColor:"#4A4A4A",
  // transform: [{ translateX: -25 }],
  // backgroundColor: "#FFA500",
  padding: 8,
  borderRadius: 20,
},
quantityContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor:"gray",
  justifyContent: "center",
  fontWeight:"bold",
  borderRadius:10,
  // borderWidth:3,
  opacity:2,
  boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
  left:110,
  top:-97,
  marginTop: 10,
},
quantityButton: {
  fontSize: 20,
  paddingHorizontal: 10,
  color: "black",
},
quantityText: {
  fontSize: 18,
  marginHorizontal: 10,
},
modalContainer: {
  top:612,
  // borderWidth:3,
  maxHeight:"30%",
  // bottom:-200,
  // bottom:0,
  // justifyContent: "flex-end", // Modal will show up from the bottom
  // alignItems: "center", // Center modal horizontally
  // // backgroundColor: "rgba(0,0,0,0.5)", // Removed to avoid backdrop fade
  // zIndex: 0,
},
modalView: {
  backgroundColor: "white",
  padding: 20,
  // borderWidth:3,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  alignItems: "center",
  width: "100%", // Ensure it stretches across the width of the screen
  height: "auto",
},
modalText: {
  fontSize: 20,
  marginBottom: 20,
},
cartButton: {
  backgroundColor: "#FFA500",
  padding: 10,
  borderRadius: 5,
},
cartButtonText: {
  color: "white",
  fontWeight: "bold",
},
   button: {  fontSize:18, fontWeight:"bold",},
  // buttonText: { color: "#fff", fontWeight: "bold" },
});


