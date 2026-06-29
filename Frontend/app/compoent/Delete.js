import React, { useState } from 'react';
import { StyleSheet, View, Alert, Image } from 'react-native';
import api from '../utils/api';
import BASE_URL from '../config';
import { showError, showSuccess } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import DangerButton from './common/DangerButton';
import SecondaryButton from './common/SecondaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from "../GlobalText.js";

const DeleteFood = ({ route, navigation }) => {
  const { foodItem } = route.params;
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!foodItem.food_id) {
      showError("Food ID was not found to delete.");
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${foodItem.food_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete(`/food-delete`, {
                data: {
                  food_id: foodItem.food_id,
                  food_img: foodItem.food_img,
                }
              });

              showSuccess('Food item successfully deleted!');
              navigation.replace('View_menu', { vendor_id: foodItem.vendor_id });
            } catch (error) {
              console.error('Error deleting food:', error);
              showError('Error deleting food item.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const imageUrl = foodItem.food_img ? (foodItem.food_img.startsWith('http') ? foodItem.food_img : BASE_URL + foodItem.food_img) : 'https://via.placeholder.com/150';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Delete Food Item</Text>

      <View style={styles.card}>
        <Icon name="alert-decagram-outline" size={48} color={colors.error} style={styles.alertIcon} />
        <Text style={styles.label}>Are you sure you want to delete this item?</Text>
        
        <Image source={{ uri: imageUrl }} style={styles.image} />
        
        <Text style={styles.foodName}>{foodItem.food_name}</Text>
        <Text style={styles.foodCost}>₹{foodItem.cost}</Text>

        <View style={styles.buttonContainer}>
          <SecondaryButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            style={styles.actionBtn}
          />
          <DangerButton 
            title="Delete" 
            onPress={handleDelete} 
            loading={loading}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </View>
  );
};

export default DeleteFood;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    justifyContent: 'center',
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  alertIcon: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  foodName: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  foodCost: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    height: 44,
    paddingVertical: 0,
  },
});
