import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BASE_URL from "../config.js";
import API_BASE from "../config1.js"
import Menu from './Menu.js';
// const API_BASE = 'http://192.168.1.19:3000/api/v1';

const ViewMenu = ({ route }) => {
  const vendor_id = route.params?.vendor_id;
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Function to fetch food items
  const fetchFoodItems = async () => {
    if (!vendor_id) {
      Alert.alert('Error', 'Vendor ID is missing!');
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching food for vendor_id:", vendor_id);
      const response = await axios.get(`${API_BASE}/food`, { params: { vendor_id } });
      console.log("API Response:", response.data);

      if (response.data.message) {
        Alert.alert("No Items", "No food items found for this vendor.");
        setFoodItems([]);
      } else {
        setFoodItems(response.data);
        console.log(response.data);
        
      }
    } catch (error) {
      console.error("Error fetching food:", error);
      Alert.alert('Error', 'Could not fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect will run the fetch function every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFoodItems();
    }, [vendor_id])
  );

  if (loading) {
    return <ActivityIndicator size="large" color="blue" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      {foodItems.length === 0 ? (
        <Text style={styles.noItemsText}>No food items found</Text>
      ) : (
        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.food_id.toString()}
          renderItem={({ item }) => {
            const imageUrl = item.food_img.startsWith('http')
              ? item.food_img // Use full URL if already provided
              : BASE_URL + item.food_img; // Otherwise, append BASE_URL

            return (
              <View style={styles.card}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.foodImage}
                  onError={() => console.log("Image failed:", imageUrl)}
                />
                <Text style={styles.foodName}>{item.food_name}</Text>
                <Text style={styles.foodCost}>₹{item.cost}</Text>
                <Text style={styles.foodName}>{item.food_type}</Text>
                <Text style={styles.foodName}>{item.food_description}</Text>

                <View style={styles.icon}>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('EditFood', { foodItem: item })}
                  style={[styles.button, styles.editButton]}
                >
                   <Image  source={require("../android/app/src/main/assets/edit.png")}
                                       style={styles.ratingImage}
                                   />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('DeleteFood', { foodItem: item })}
                  style={[styles.button, styles.deleteButton]}
                >
                   <Image source={require("../android/app/src/main/assets/delete.png")}
                                       style={styles.ratingImage}
                                   />
                </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
      <Menu vendor_id={vendor_id}/>
    </View>
  );
};

export default ViewMenu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  noItemsText: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 20,
    color: 'gray',
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  foodImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  foodCost: {
    fontSize: 16,
    color: 'green',
    marginTop: 5,
  },
  
  // editButton: {
  //   backgroundColor: '#007bff',
  // },
  // deleteButton: {
  //   backgroundColor: '#dc3545',
  // },
  icon:{
    flex:1,
    flexDirection:"row",
    borderWidth:3,
    width:"35%",
    // height:"10%",
    top:-200,
  },
  ratingImage: {
    width: 40, // Slightly bigger size for a more noticeable 3D effect
    height: 40,
    borderRadius: 10, // Round the edges of the image
    margin: 10,  // Give space between each icon for better alignment
    transition: "transform 0.2s, box-shadow 0.2s",  // Smooth transition for hover effects
    transform: "scale(1)",  // Default scale
  },
  // Add hover effect or active effect for buttons
  ratingImageHovered: {
    transform: "scale(1.1)",  // Scale up slightly for hover effect
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.2)",  // Add more shadow on hover
  }
});

