import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Switch, StyleSheet, LogBox } from "react-native";
import axios from "axios";
import API_BASE from "../config1";

const SetFood = ({route}) => {
  const [foods, setFoods] = useState([]);
  const vendorId = route.params?.vendor_id;  // Replace with actual vendor ID
   


 
  useEffect(() => {
    console.log("new",vendorId);
    
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const res = await axios.get(`${API_BASE}/offline/${vendorId}`);
      console.log("my data",res.data);
      
        setFoods(res.data)
    } catch (error) {
      console.error("Error fetching foods:", error);
    }
  };

//   const toggleFoodAvailability = async (foodId, currentStatus) => {
//     try {
//       await axios.post(`${API_BASE}/toggle-food`, {
//         foodId,
//         isAvailable: !currentStatus,
//       });
//       fetchFoods(); // Refresh food list
//     } catch (error) {
//       console.error("Error updating food status:", error);
//     }
//   };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Food Availability</Text>
      <FlatList
        data={foods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.foodItem}>
            <Text style={styles.foodName}>{item.food_name} - ${item.cost}</Text>
            <Switch
              value={item.is_available}
              onValueChange={() => toggleFoodAvailability(item.id, item.is_available)}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  foodName: {
    fontSize: 18,
  },
});

export default SetFood;
