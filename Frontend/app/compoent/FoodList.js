import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, FlatList, Image, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from "react-native";
import api from "../utils/api";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config.js";
import MyNavigation from "./MyNavigation.js";
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import PrimaryButton from "./common/PrimaryButton";
import EmptyState from "./common/EmptyState";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Text from "../GlobalText";

const FoodList = ({ route }) => {
  const { vendor_id, customer_id } = route.params;
  const [foodItems, setFoodItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const slideAnim = useRef(new Animated.Value(100)).current; // Starts below the screen
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchFood();
      loadCart();
    }, [])
  );

  const fetchFood = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/food`, { params: { vendor_id } });
      const availableFood = response.data.filter((food) => food.is_available);
      setFoodItems(availableFood || []);
    } catch (error) {
      showError("Failed to load menu items.");
    } finally {
      setLoading(false);
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
    setSelectedItem(item);
    slideIn();
  };

  const updateQuantity = (food_id, change) => {
    let updatedCart = cart.map((item) =>
      item.food_id === food_id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
    ).filter((item) => item.quantity > 0);

    setCart(updatedCart);
    AsyncStorage.setItem("cart", JSON.stringify(updatedCart));

    if (!updatedCart.find((item) => item.food_id === food_id)) {
      slideOut();
      setSelectedItem(null);
    }
  };

  const slideIn = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = () => {
    Animated.timing(slideAnim, {
      toValue: 150,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {foodItems.length === 0 ? (
        <EmptyState
          title="Menu is Empty"
          description="The shopkeeper has not added any food items yet."
          iconName="food-off-outline"
          actionTitle="Refresh"
          onActionPress={fetchFood}
        />
      ) : (
        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.food_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const imageUrl = item.food_img ? (item.food_img.startsWith("http") ? item.food_img : BASE_URL + item.food_img) : 'https://via.placeholder.com/150';
            const cartItem = cart.find((cartItem) => cartItem.food_id === item.food_id);

            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                  <View style={styles.info}>
                    <Text style={styles.foodName}>{item.food_name}</Text>
                    <Text style={styles.price}>₹{item.cost}</Text>
                    <Text style={styles.des} numberOfLines={2}>{item.food_description || "Tasty local food"}</Text>
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  {!cartItem ? (
                    <PrimaryButton
                      title="Add"
                      onPress={() => addToCart(item)}
                      style={styles.addButton}
                      textStyle={styles.addButtonText}
                    />
                  ) : (
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity onPress={() => updateQuantity(item.food_id, -1)} style={styles.qtyBtn}>
                        <Icon name="minus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{cartItem.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.food_id, 1)} style={styles.qtyBtn}>
                        <Icon name="plus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Floating Cart Component with Animation */}
      {selectedItem && (
        <Animated.View style={[styles.floatingCart, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.floatingCartContent}>
            <View style={styles.cartInfoBox}>
              <Icon name="cart-outline" size={24} color={colors.white} />
              <Text style={styles.cartText}>
                {cart.reduce((sum, i) => sum + i.quantity, 0)} Items added
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("CartScreen", { cart, vendor_id, customer_id })}
              style={styles.viewCartBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.viewCartText}>View Cart</Text>
              <Icon name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <MyNavigation customer_id={customer_id} vendor_id={vendor_id} />
    </View>
  );
};

export default FoodList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 160, // extra padding for floating cart and bottom tab
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  info: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  foodName: {
    fontSize: typography.fontSize.md,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  price: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  des: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  addButton: {
    minHeight: 34,
    height: 34,
    paddingVertical: 0,
    borderRadius: 8,
    width: 100,
  },
  addButtonText: {
    fontSize: typography.fontSize.xs,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 58, 170, 0.05)',
  },
  qtyBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  floatingCart: {
    position: "absolute",
    bottom: 75,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  floatingCartContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 44,
  },
  cartInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  viewCartText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
