import React, { useState } from 'react';
import { StyleSheet, View, Image, ScrollView } from 'react-native';
import BASE_URL from '../config';
import api from '../utils/api';
import * as ImagePicker from 'react-native-image-picker';
import { showError, showSuccess } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import AppInput from './common/AppInput';
import AppTextarea from './common/AppTextarea';
import PrimaryButton from './common/PrimaryButton';
import SecondaryButton from './common/SecondaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from "../GlobalText.js";

const EditFood = ({ route, navigation }) => {
  const { foodItem } = route.params;
  const [foodName, setFoodName] = useState(foodItem.food_name);
  const [cost, setCost] = useState(foodItem.cost.toString());
  const [food_type, setFoodType] = useState(foodItem.food_type);
  const [food_description, setFoodDescription] = useState(foodItem.food_description);
  const [imageUri, setImageUri] = useState(foodItem.food_img ? (foodItem.food_img.startsWith('http') ? foodItem.food_img : `${BASE_URL}${foodItem.food_img}`) : null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error:', response.error);
        showError('Failed to select photo.');
      } else if (response.assets && response.assets.length > 0) {
        setSelectedImage(response.assets[0]);
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const handleUpdate = async () => {
    if (!foodName || !cost) {
      showError('Food item name and price are required.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('food_id', foodItem.food_id);
      formData.append('food_name', foodName);
      formData.append('food_type', food_type);
      formData.append('food_description', food_description);
      formData.append('cost', parseFloat(cost));

      if (selectedImage) {
        formData.append('food_img', {
          uri: selectedImage.uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || 'food_image.jpg',
        });
      }

      await api.put(`/food-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showSuccess('Food item updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating food:', error);
      showError('Failed to update food item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.header}>Edit Food Item</Text>

      <View style={styles.card}>
        <AppInput
          label="Food Name:"
          placeholder="e.g. Samosa, Burger"
          iconName="food-fork-drink"
          value={foodName}
          onChangeText={setFoodName}
        />

        <AppInput
          label="Price (₹):"
          placeholder="e.g. 50"
          iconName="currency-inr"
          keyboardType="numeric"
          value={cost}
          onChangeText={setCost}
        />

        <AppInput
          label="Category:"
          placeholder="e.g. Fast Food, Snack"
          iconName="tag-text-outline"
          value={food_type}
          onChangeText={setFoodType}
        />

        <AppTextarea
          label="Description:"
          placeholder="Update description..."
          value={food_description}
          onChangeText={setFoodDescription}
        />

        <Text style={styles.imageLabel}>Item Photo:</Text>
        <View style={styles.imageSelectorContainer}>
          <SecondaryButton
            title="Change Photo"
            onPress={pickImage}
            style={styles.pickImageBtn}
          />
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="image-outline" size={36} color={colors.textSecondary} />
            </View>
          )}
        </View>

        <PrimaryButton
          title="Update Item"
          onPress={handleUpdate}
          loading={submitting}
          style={styles.submitBtn}
        />
      </View>
    </ScrollView>
  );
};

export default EditFood;

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
