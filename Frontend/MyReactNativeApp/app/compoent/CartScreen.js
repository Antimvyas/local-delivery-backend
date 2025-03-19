import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const CartScreen = ({ route }) => {
  const [cart, setCart] = useState([]);
  const navigation = useNavigation();
  const { vendor_id, customer_id } = route.params;

  useEffect(() => {
    loadCart();
  }, []);

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

  const updateCart = async (updatedCart) => {
    setCart(updatedCart);
    await AsyncStorage.setItem("cart", JSON.stringify(updatedCart));
  };

  const addItemToCart = async (item) => {
    const existingItemIndex = cart.findIndex((cartItem) => cartItem.food_id === item.food_id);

    let updatedCart;
    if (existingItemIndex !== -1) {
      // ✅ If item exists, increase the quantity
      updatedCart = cart.map((cartItem, index) =>
        index === existingItemIndex ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
      );
    } else {
      // ✅ If item is new, add it to the cart
      updatedCart = [...cart, { ...item, quantity: 1 }];
    }

    updateCart(updatedCart);
  };

  const updateQuantity = (index, amount) => {
    const updatedCart = cart.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item
    ).filter(item => item.quantity > 0); // Remove if quantity is 0

    updateCart(updatedCart);
  };

  const removeItem = (index) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          const updatedCart = cart.filter((_, i) => i !== index);
          updateCart(updatedCart);
        },
        style: "destructive",
      },
    ]);
  };

  const totalCost = cart.reduce((acc, item) => acc + item.cost * item.quantity, 0);

  const proceedToOrderDetails = async () => {
    if (cart.length === 0) {
      Alert.alert("Cart is Empty", "Please add items to your cart before proceeding.");
      return;
    }
    navigation.navigate("OrderDetailsScreen", {
      cart,
      totalCost,
      vendor_id,
      customer_id,
    });
  };

  const addItem = () => {
    navigation.navigate("FoodList", { customer_id, vendor_id });
  };

  return (
    <View style={styles.container}>
      {cart.length === 0 ? (
        <Text style={styles.emptyCart}>Your cart is empty.</Text>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.food_id.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.item}>
                <View style={styles.info}>
                  <Text style={styles.foodName}>{item.food_name}</Text>
                  <Text style={styles.price}>₹{item.cost * item.quantity}</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={() => updateQuantity(index, -1)} style={styles.quantityButton}>
                    <Text style={styles.quantityText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(index, 1)} style={styles.quantityButton}>
                    <Text style={styles.quantityText}>+</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteButton}>
                  <Text style={styles.deleteText}>X</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
            <Text style={styles.addItemText}>+ Add more items</Text>
          </TouchableOpacity>

          <Text style={styles.total}>Total: ₹{totalCost}</Text>

          <TouchableOpacity onPress={proceedToOrderDetails} style={styles.placeOrderButton}>
            <Text style={styles.placeOrderText}>Proceed to Order Details</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  emptyCart: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#555",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    marginVertical: 5,
    borderColor: "#ddd",
    borderWidth: 1,
    justifyContent: "space-between",
  },
  info: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  price: {
    fontSize: 14,
    color: "#666",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#ddd",
    marginHorizontal: 5,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  quantity: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  deleteButton: {
    backgroundColor: "#DC143C",
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  addItemButton: {
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "#007bff",
  },
  addItemText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  total: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    textAlign: "center",
    color: "#000",
  },
  placeOrderButton: {
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
    backgroundColor: "#28a745",
  },
  placeOrderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
