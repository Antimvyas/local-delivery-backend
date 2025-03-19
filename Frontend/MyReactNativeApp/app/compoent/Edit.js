import { StyleSheet, Text, View, TextInput, Button, Image, Alert, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import BASE_URL from '../config';
import axios from 'axios';
import * as ImagePicker from 'react-native-image-picker';
import API_BASE from "../config1.js"


const EditFood = ({ route, navigation }) => {
  const { foodItem } = route.params; // Get item details from navigation
  const [foodName, setFoodName] = useState(foodItem.food_name);
  const [cost, setCost] = useState(foodItem.cost.toString());
  const [food_type,setFoodType]=useState(foodItem.food_type);
  const [food_description,setFoodDescription]=useState(foodItem.food_description);
  const [imageUri, setImageUri] = useState(`${BASE_URL}/uploads/${foodItem.food_img}`);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Function to pick an image from gallery
  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error:', response.error);
      } else {
        setSelectedImage(response.assets[0]);
        setImageUri(response.assets[0].uri);
      }
    });
  };

  // Function to handle food update
  const handleUpdate = async () => {
    if (!foodName || !cost) {
      Alert.alert('Error', 'Food name and cost cannot be empty');
      return;
    }

    setLoading(true);

    try {
      console.log(foodItem);
      
      const formData = new FormData();
      formData.append('food_id', foodItem.food_id);
      formData.append('food_name', foodName);
      formData.append('food_type',food_type);
      formData.append('food_description',food_description);
      formData.append('cost', parseFloat(cost));

      // If a new image is selected, add it to FormData
      if (selectedImage) {
        formData.append('food_img', {
          uri: selectedImage.uri,
          type: selectedImage.type,
          name: selectedImage.fileName || 'food_image.jpg',
        });
      }

      const response = await axios.post(`${API_BASE}/food-update`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Update Response:', response.data);
      Alert.alert('Success', 'Food item updated successfully!');
      navigation.goBack(); // Navigate back to menu
    } catch (error) {
      console.error('Error updating food:', error);
      Alert.alert('Error', 'Could not update the food item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Food Name:</Text>
      <TextInput style={styles.input} value={foodName} onChangeText={setFoodName} />

      <Text style={styles.label}>Cost (₹):</Text>
      <TextInput style={styles.input} value={cost} onChangeText={setCost} keyboardType="numeric" />
      
      <Text style={styles.label}>Food Type:</Text>
      <TextInput style={styles.input} value={food_type} onChangeText={setFoodType}  />
      
      <Text style={styles.label}>Food Description</Text>
      <TextInput style={styles.input} value={food_description} onChangeText={setFoodDescription}  />

      <Text style={styles.label}>Food Image:</Text>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        <Text style={styles.buttonText}>📷 Select Image</Text>
      </TouchableOpacity>
      <Image source={{ uri: imageUri }} style={styles.image} />

      <Button title="Update Food" onPress={handleUpdate} disabled={loading} />
    </View>
  );
};

export default EditFood;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  imagePicker: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 200,
    marginTop: 10,
    borderRadius: 8,
  },
});
