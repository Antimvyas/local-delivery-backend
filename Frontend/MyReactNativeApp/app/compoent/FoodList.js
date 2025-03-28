import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, FlatList, Image, StyleSheet, Alert, TouchableOpacity, Animated } from "react-native";
import axios from "axios";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config.js";
import API_BASE from "../config1.js";
import MyNavigation from "./MyNavigation.js";

const FoodList = ({ route }) => {
  const { vendor_id, customer_id } = route.params;
  const [foodItems, setFoodItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const slideAnim = useRef(new Animated.Value(100)).current; // Starts below the screen
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      fetchFood();
      loadCart();
    }, [])
  );

  const fetchFood = async () => {
    try {
      const response = await axios.get(`${API_BASE}/food`, { params: { vendor_id } });
      const availableFood = response.data.filter((food) => food.is_available);
      setFoodItems(availableFood || []);
    } catch (error) {
      Alert.alert("Error", "Could not fetch menu items");
    }
  };

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

  const addToCart = async (item) => {
    let updatedCart = [...cart];
    const existingItem = updatedCart.find((cartItem) => cartItem.food_id === item.food_id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      updatedCart.push({ ...item, quantity: 1 });
    }

    setCart(updatedCart);
    await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
    setSelectedItem(item); // Show floating cart
    slideIn(); // Animate component
  };

  const updateQuantity = (food_id, change) => {
    let updatedCart = cart.map((item) =>
      item.food_id === food_id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
    ).filter((item) => item.quantity > 0);

    setCart(updatedCart);
    AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

    if (!updatedCart.find((item) => item.food_id === food_id)) {
      slideOut(); // Hide component when quantity is 0
      setSelectedItem(null);
    }
  };

  // Animation to slide in
  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0, // Move into view
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Animation to slide out
  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: 100, // Move out of view
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={foodItems}
        keyExtractor={(item) => item.food_id.toString()}
        renderItem={({ item }) => {
          const imageUrl = item.food_img.startsWith("http") ? item.food_img : BASE_URL + item.food_img;
          const cartItem = cart.find((cartItem) => cartItem.food_id === item.food_id);

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

      {/* Floating Cart Component with Animation */}
      {selectedItem && (
        <Animated.View style={[styles.floatingCart, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.cartText}>
            {selectedItem.food_name} - {cart.find((item) => item.food_id === selectedItem.food_id)?.quantity || 0} added
          </Text>
          <TouchableOpacity
            
            onPress={() => navigation.navigate("CartScreen", { cart, vendor_id, customer_id })}
          >
             <Image source={require("../android/app/src/main/assets/cart.png")}
                                style={styles.ratingImage}
                            />
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity style={styles.nav}>
        <MyNavigation customer_id={customer_id} vendor_id={vendor_id} />
      </TouchableOpacity>
    </View>
  );
};

export default FoodList;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  card: {
    width: "100%",
    height: 200,

    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    // marginRight:20,
    marginVertical: 15,
    alignItems: "center",

    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    // shadowColor: "#000",
    // shadowOffset: { width: 5, height: 5 },
    // shadowOpacity: 2,
    // shadowRadius: 8,
    // elevation: 10,
  },
  nav: { bottom: 0 },
  image: {
    width: 110,
    height: 110,
    borderRadius: 10,
    position: "absolute",
    top: 30,
    left: 10,
  },
  info: { width: "70%", height: 120, left: 55 },
  foodName: { fontSize: 20, fontWeight: "bold", color: "#4A4A4A", left: 25 },
  price: { fontSize: 20, color: "#666", fontWeight: "400", left: 25 },
  des: { fontSize: 15, color: "#666", fontWeight: "400", top: 10, left: 16 },
  addButton: {
    width: "25%",
    position: "absolute",
    bottom: 100,
    right: 15,
    alignItems: "center",
    backgroundColor: "#4A4A4A",
    padding: 8,
    borderRadius: 20,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "gray",
    borderRadius: 10,
    left: 110,
    top: -97,
    marginTop: 10,
  },
  quantityButton: { fontSize: 20, paddingHorizontal: 10, color: "black" },
  quantityText: { fontSize: 18, marginHorizontal: 10 },
  
  floatingCart: {
    position: "absolute",
    height:110,
    width:"90%",
    bottom: 20,
    left: 20,
    // right: 20,
    // borderWidth:3,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    boxShadow: "5px 5px 7px (93, 93, 93, 0.4)",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.3,
    // shadowRadius: 4,
    // elevation: 5,
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingImage: {
    width: 50, // Slightly bigger size for a more noticeable 3D effect
    height: 50,
    borderRadius: 10, // Round the edges of the image
    margin: 10,  // Give space between each icon for better alignment
    transition: "transform 0.2s, box-shadow 0.2s",  // Smooth transition for hover effects
    transform: "scale(1)",  // Default scale
  },
  cartText: { fontSize: 16, fontWeight: "bold" },
  cartButton: { backgroundColor: "#FFA500", padding: 10, borderRadius: 5 },
  cartButtonText: { color: "white", fontWeight: "bold" },
});
