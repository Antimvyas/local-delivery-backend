import React, { useState, useCallback } from 'react';
import { View, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import api from '../utils/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BASE_URL from "../config.js";
import Menu from './Menu.js';
import VendorNavigation from './VendorNavigation.js';
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import EmptyState from './common/EmptyState';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from "../GlobalText.js";

const ViewMenu = ({ route }) => {
  const vendor_id = route.params?.vendor_id;
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [togglingId, setTogglingId] = useState(null);

  // Fetch food items
  const fetchFoodItems = async () => {
    if (!vendor_id) {
      showError('Vendor ID is missing!');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/food`, { params: { vendor_id } });
      if (response.data.message) {
        setFoodItems([]);
      } else {
        setFoodItems(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching food:", error);
      showError("Failed to load menu.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (food_id, currentStatus) => {
    setTogglingId(food_id);
    try {
      const newStatus = !currentStatus;
      await api.patch(`/toggle-food/${food_id}`, { is_available: newStatus });

      setFoodItems(prevItems =>
        prevItems.map(item =>
          item.food_id === food_id ? { ...item, is_available: newStatus } : item
        )
      );
      showSuccess("Availability updated successfully!");
    } catch (error) {
      console.error("Error updating availability:", error);
      showError("Failed to update availability.");
    } finally {
      setTogglingId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFoodItems();
    }, [vendor_id])
  );

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
      <Text style={styles.header}>My Menu</Text>

      {foodItems.length === 0 ? (
        <EmptyState
          title="No Menu Items Found"
          description="Click the '+' button below to add a new food item."
          iconName="food-off-outline"
          actionTitle="Refresh"
          onActionPress={fetchFoodItems}
        />
      ) : (
        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.food_id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const imageUrl = item.food_img ? (item.food_img.startsWith('http') ? item.food_img : BASE_URL + item.food_img) : 'https://via.placeholder.com/150';
            return (
              <View style={[styles.card, !item.is_available && styles.cardBlur]}>
                {/* Image & Main details row */}
                <View style={styles.cardRow}>
                  <Image source={{ uri: imageUrl }} style={styles.foodImage} />
                  <View style={styles.info}>
                    <Text style={styles.foodName}>{item.food_name}</Text>
                    <Text style={styles.foodCost}>₹{item.cost}</Text>
                    <View style={styles.typeBadge}>
                      <Icon name="tag-outline" size={12} color={colors.textSecondary} />
                      <Text style={styles.foodType}>{item.food_type}</Text>
                    </View>
                    <Text style={styles.foodDescription} numberOfLines={2}>
                      {item.food_description || "Tasty local food item."}
                    </Text>
                  </View>
                </View>

                {/* Bottom action bar */}
                <View style={styles.actionRow}>
                  <View style={styles.switchCol}>
                    <Text style={styles.switchLabel}>Available:</Text>
                    <Switch
                      value={item.is_available}
                      onValueChange={() => toggleAvailability(item.food_id, item.is_available)}
                      trackColor={{ true: colors.success, false: colors.error }}
                      thumbColor={colors.white}
                      disabled={togglingId !== null}
                    />
                  </View>

                  <View style={styles.btnCol}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('EditFood', { foodItem: item })} 
                      style={styles.actionBtn}
                      activeOpacity={0.7}
                    >
                      <Icon name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('DeleteFood', { foodItem: item })} 
                      style={[styles.actionBtn, styles.deleteBtn]}
                      activeOpacity={0.7}
                    >
                      <Icon name="delete" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* fixed overlay buttons at bottom */}
      <View style={styles.bottomContainer}>
        <Menu vendor_id={vendor_id} />
        <VendorNavigation vendor_id={vendor_id} />
      </View>
    </View>
  );
};

export default ViewMenu;

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
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 160,
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
  cardBlur: {
    opacity: 0.65,
  },
  cardRow: {
    flexDirection: 'row',
  },
  foodImage: {
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
  foodCost: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  foodType: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  foodDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  switchCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  btnCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 58, 170, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
});
