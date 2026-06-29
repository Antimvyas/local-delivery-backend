import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import SecondaryButton from "./common/SecondaryButton";
import EmptyState from "./common/EmptyState";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";

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

  const updateQuantity = (index, amount) => {
    const updatedCart = cart.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(0, item.quantity + amount) } : item
    ).filter(item => item.quantity > 0);

    updateCart(updatedCart);
  };

  const removeItem = (index) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this item from the cart?", [
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
      showError("Please add items to your cart first.", "Cart is Empty");
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
      <Text style={styles.header}>Your Cart</Text>

      {cart.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Select some delicious food and add it to your cart!"
          iconName="cart-remove"
          actionTitle="View Menu"
          onActionPress={addItem}
        />
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.food_id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.foodName}>{item.food_name}</Text>
                  <Text style={styles.price}>₹{item.cost * item.quantity} (₹{item.cost} x {item.quantity})</Text>
                </View>
                
                <View style={styles.quantityContainer}>
                  <TouchableOpacity onPress={() => updateQuantity(index, -1)} style={styles.qtyBtn}>
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(index, 1)} style={styles.qtyBtn}>
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteBtn}>
                  <Icon name="delete" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={styles.footer}>
            <SecondaryButton 
              title="+ Add More Items" 
              onPress={addItem}
              style={styles.moreBtn}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalVal}>₹{totalCost}</Text>
            </View>

            <PrimaryButton 
              title="Proceed to Checkout" 
              onPress={proceedToOrderDetails}
              style={styles.checkoutBtn}
            />
          </View>
        </>
      )}
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardInfo: {
    flex: 1.2,
  },
  foodName: {
    fontSize: typography.fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  price: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginHorizontal: spacing.xs,
  },
  qtyBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
  },
  deleteBtn: {
    backgroundColor: colors.error,
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  footer: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  moreBtn: {
    marginBottom: spacing.md,
    minHeight: 40,
    height: 40,
    paddingVertical: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  totalVal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  checkoutBtn: {
    width: '100%',
  },
});
