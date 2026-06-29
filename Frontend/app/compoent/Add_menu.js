import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import api from '../utils/api';
import { showError, showSuccess, showInfo } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import AppInput from './common/AppInput';
import AppTextarea from './common/AppTextarea';
import PrimaryButton from './common/PrimaryButton';
import SecondaryButton from './common/SecondaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from "../GlobalText.js";

const Add_menu = ({ navigation, route }) => {
  const [food_name, setFoodName] = useState('');
  const [cost, setFoodCost] = useState('');
  const [food_img, setFoodImage] = useState(null);
  const [food_type, setFoodType] = useState('');
  const [food_description, setFoodDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const vendor_id = route.params?.vendor_id;

  useEffect(() => {
    if (!vendor_id) {
      showError('Vendor ID is missing!');
      navigation.goBack();
    }
  }, [vendor_id]);

  const handlePickImage = () => {
    const options = { mediaType: 'photo', quality: 1 };
    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        showInfo('Photo not selected.');
      } else if (response.error) {
        showError(`Error selecting photo: ${response.error}`);
      } else if (response.assets && response.assets.length > 0) {
        setFoodImage(response.assets[0]);
      }
    });
  };

  const handleAddFood = async () => {
    if (!food_name || !cost || !vendor_id) {
      showError('Please fill in food name and price.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('food_name', food_name);
      formData.append('cost', cost);
      formData.append('vendor_id', vendor_id);
      formData.append('food_type', food_type);
      formData.append('food_description', food_description);
      
      if (food_img && food_img.uri) {
        formData.append('food_img', {
          uri: food_img.uri,
          name: food_img.fileName || `food_${Date.now()}.jpg`,
          type: food_img.type || 'image/jpeg',
        });
      }

      await api.post(`/food-set`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccess('Food item added successfully!');
      
      // Clear inputs
      setFoodName('');
      setFoodCost('');
      setFoodImage(null);
      setFoodDescription('');
      setFoodType('');

      navigation.goBack();
    } catch (error) {
      console.error('Error adding food item:', error);
      showError('Failed to add food item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Add New Food Item</Text>

      <View style={styles.card}>
        <AppInput
          label="Food Name:"
          placeholder="e.g. Samosa, Burger"
          iconName="food-fork-drink"
          value={food_name}
          onChangeText={setFoodName}
        />

        <AppInput
          label="Price (₹):"
          placeholder="e.g. 50"
          iconName="currency-inr"
          keyboardType="numeric"
          value={cost}
          onChangeText={setFoodCost}
        />

        <AppInput
          label="Category:"
          placeholder="e.g. Fast Food, Sweet, Snack"
          iconName="tag-text-outline"
          value={food_type}
          onChangeText={setFoodType}
        />

        <AppTextarea
          label="Description:"
          placeholder="Enter item details (e.g. Spicy & crispy)"
          value={food_description}
          onChangeText={setFoodDescription}
        />

        <Text style={styles.imageLabel}>Item Photo (Optional):</Text>
        <View style={styles.imageSelectorContainer}>
          <SecondaryButton
            title={food_img ? "Change Photo" : "Choose Photo"}
            onPress={handlePickImage}
            style={styles.pickImageBtn}
          />
          {food_img ? (
            <Image source={{ uri: food_img.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={36} color={colors.textSecondary} />
            </View>
          )}
        </View>

        <PrimaryButton
          title="Add Item"
          onPress={handleAddFood}
          loading={submitting}
          style={styles.submitBtn}
        />
      </View>
    </ScrollView>
  );
};

export default Add_menu;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    justifyContent: 'center',
  },
  header: {
    fontSize: typography.fontSize.lg,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  imageLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  imageSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickImageBtn: {
    minHeight: 36,
    height: 36,
    paddingVertical: 0,
    borderRadius: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
