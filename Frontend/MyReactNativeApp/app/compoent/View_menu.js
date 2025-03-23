import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Switch } from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BASE_URL from "../config.js";
import API_BASE from "../config1.js";
import Menu from './Menu.js';
import VendorNavigation from './VendorNavigation.js';

const ViewMenu = ({ route }) => {
  const vendor_id = route.params?.vendor_id;
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Fetch food items
  const fetchFoodItems = async () => {
    if (!vendor_id) {
      Alert.alert('Error', 'Vendor ID is missing!');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/food`, { params: { vendor_id } });
      if (response.data.message) {
        setFoodItems([]);
      } else {
        setFoodItems(response.data);
      }
    } catch (error) {
      console.error("Error fetching food:", error);
    } finally {
      setLoading(false);
    }
  };

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
        <View style={styles.noItemsContainer}>
          <Text style={styles.noItemsText}>No food items found</Text>
        </View>
      ) : (
        <FlatList
          data={foodItems}
          keyExtractor={(item) => item.food_id.toString()}
          renderItem={({ item }) => {
            const imageUrl = item.food_img.startsWith('http') ? item.food_img : BASE_URL + item.food_img;
            return (
              <View style={[styles.card, !item.is_available && styles.cardBlur]}>
                <Image source={{ uri: imageUrl }} style={styles.foodImage} />
                <Text style={styles.foodName}>{item.food_name}</Text>
                <Text style={styles.foodCost}>₹{item.cost}</Text>
                <Text style={styles.foodName}>{item.food_type}</Text>
                <Text style={styles.foodName}>{item.food_description}</Text>

                <View style={styles.toggle}>
                  <Switch value={item.is_available} />
                </View>

                <View style={styles.iconContainer}>
                  <TouchableOpacity onPress={() => navigation.navigate('EditFood', { foodItem: item })} style={styles.button}>
                    <Image source={require("../android/app/src/main/assets/edit.png")} style={styles.iconImage} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('DeleteFood', { foodItem: item })} style={styles.button}>
                    <Image source={require("../android/app/src/main/assets/delete.png")} style={styles.iconImage} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ✅ Keep Menu & VendorNavigation Fixed at Bottom */}
      <View style={styles.bottomContainer}>
        <Menu vendor_id={vendor_id}  />
          <Text></Text>
        <VendorNavigation vendor_id={vendor_id} />
      </View>
    </View>
  );
};

export default ViewMenu;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  noItemsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  noItemsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "gray",
  },

  card: {
    width: "90%",
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    alignItems: "center",
    backgroundColor: "#fff",
    elevation: 5,
  },

  cardBlur: {
    opacity: 0.5,
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

  toggle: {
    flexDirection: "row",
    top: 10,
    left: 10,
    position: "absolute",
  },

  iconContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 10,
    right: 5,
  },

  iconImage: {
    width: 40,
    height: 40,
    marginHorizontal: 5,
  },

  /* ✅ Fix Menu & Navigation Position */
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
  },
});
