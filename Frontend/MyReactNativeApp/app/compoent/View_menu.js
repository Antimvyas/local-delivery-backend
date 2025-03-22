import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,Switch } from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BASE_URL from "../config.js";
import API_BASE from "../config1.js"
import Menu from './Menu.js';
import VendorNavigation from './VendorNavigation.js';
// const API_BASE = 'http://192.168.1.19:3000/api/v1';

const ViewMenu = ({ route }) => {
  const vendor_id = route.params?.vendor_id;
  const [foodItems, setFoodItems] = useState([]);
  const [foodId,setfoodId]=useState();
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
        
        // console.log("foodid",response.data.food_id);
        
        console.log(response.data);
        
      }
    } catch (error) {
      // console.error("Error fetching food:", error);
      // Alert.alert('Error', 'Could not fetch menu items');
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect will run the fetch function every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchFoodItems();
      toggleFoodAvailability();
    }, [vendor_id])
  );
   

  const toggleFoodAvailability = async (foodId, currentStatus) => {
    if (!foodId) {
      console.error("Error: foodId is undefined!");
      return;
    }
  
    try {
      // console.log("Toggling food availability for ID:", foodId);
  
      const response = await axios.post(`${API_BASE}/toggle-food`, {
        foodId, // Ensure this is sent correctly
        isAvailable: !currentStatus,
      });
  
      console.log("Response from server:", response.data);
  
      // Update state immediately
      setFoodItems((prevItems) =>
        prevItems.map((item) =>
          item.food_id === foodId ? { ...item, is_available: !currentStatus } : item
        )
      );
    } catch (error) {
      console.error("Error updating food status:", error.response ? error.response.data : error);
      Alert.alert("Error", "Failed to update food status.");
    }
  };
  
  
  

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
              ? item.food_img
              : BASE_URL + item.food_img;
          
            return (
              <View style={[styles.card, !item.is_available && styles.cardBlur]}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.foodImage}
                  onError={() => console.log("Image failed:", imageUrl)}
                />
                <Text style={styles.foodName}>{item.food_name}</Text>
                <Text style={styles.foodCost}>₹{item.cost}</Text>
                <Text style={styles.foodName}>{item.food_type}</Text>
                <Text style={styles.foodName}>{item.food_description}</Text>
          
                {/* Toggle Button */}
                <View style={styles.toggle}> 
                <Switch  value={item.is_available}  onValueChange={() => {console.log("Switch Toggled for Food ID:", item.food_id);
                           toggleFoodAvailability(item.food_id, item.is_available); }}
                       trackColor={{ false: "#ccc", true: "green" }} /> 

                </View>
          
                {/* Edit & Delete Buttons (Fixed Position) */}
                <View style={styles.iconContainer}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('EditFood', { foodItem: item })}
                    style={[styles.button, styles.editButton]}
                  >
                    <Image source={require("../android/app/src/main/assets/edit.png")} style={styles.iconImage} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DeleteFood', { foodItem: item })}
                    style={[styles.button, styles.deleteButton]}
                  >
                    <Image source={require("../android/app/src/main/assets/delete.png")} style={styles.iconImage} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          
        />
      )}
      
      <Menu vendor_id={vendor_id} style={[styles.position="absolute"]}/>
      <VendorNavigation vendor_id={vendor_id} style={[styles.position="absolute"]}/>
     
    </View>
  );
};

export default ViewMenu;

const styles = StyleSheet.create({
  card: {
    width: "90%",
    maxHeight: 350,
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    alignItems: "center",
    backgroundColor: "#fff",
    elevation: 5, // Shadow effect
  },

  // Style for Blur Effect
  cardBlur: {
    opacity: 0.5, // Reduce visibility when unavailable
  },

  foodImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
  },

  foodName: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },

  foodCost: {
    fontSize: 16,
    color: "green",
    marginTop: 5,
  },
toggle:{
  // borderWidth:3,
  flexDirection:"row",
  top:10,
  left:10,
  position:"absolute"
},
  // Fixed Positioning for Edit & Delete Icons
  iconContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 10, // Keep at the top
    right: 5
    , // Align to the right
  },

  iconImage: {
    width: 40,
    height: 40,
    marginHorizontal: 5, // Space between icons
  },
  // menu:{
  //   flexDirection:"row",
  //   // borderWidth:3,
  //   justifyContent:"space-evenly",
  //   // position:"absolute",
  //   // height:"50%",
  //   left:10,
  //   alignItems:"center",
     
  //   bottom:8
  // }
});


