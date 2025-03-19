import { StyleSheet, Text, View, Button, Alert, Image } from 'react-native';
import React, { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../config';
import API_BASE from "../config1.js"
// const API_BASE = 'http://192.168.1.19:3000/api/v1';

const DeleteFood = ({ route, navigation }) => {
  const { foodItem } = route.params; // Get food item details from navigation
  const [loading, setLoading] = useState(false);
  console.log("Received foodItem:", foodItem);

  
  // Function to delete food item
  const handleDelete = async () => {
    if (!foodItem.food_id || !foodItem.food_img) {
      Alert.alert("Error", "Food ID or Image does not exist.");
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
              const response = await axios.post(`${API_BASE}/food-delete`, {
                food_id: foodItem.food_id,
                food_img: foodItem.food_img, // Ensure file name is passed correctly
              });

              console.log('Delete Response:', response.data);
              Alert.alert('Success', 'Food item deleted successfully!');
              navigation.goBack(); // Navigate back to menu
            } catch (error) {
              console.error('Error deleting food:', error);
              Alert.alert('Error', 'Could not delete the food item');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Are you sure you want to delete this food item?</Text>
      <Image source={{ uri: `${BASE_URL}/uploads/${foodItem.food_img}` }} style={styles.image} />
      <Text style={styles.foodName}>{foodItem.food_name}</Text>
      <Text style={styles.foodCost}>₹{foodItem.cost}</Text>

      <Button title="Delete Food" onPress={handleDelete} color="red" disabled={loading} />
    </View>
  );
};

export default DeleteFood;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  foodName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  foodCost: {
    fontSize: 18,
    color: 'green',
    marginTop: 5,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 15,
  },
});
