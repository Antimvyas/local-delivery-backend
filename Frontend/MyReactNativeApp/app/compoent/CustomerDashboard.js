import React, { useEffect, useState, useRef } from "react";
import { 
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated, TextInput 
} from "react-native";
import axios from "axios";
import BASE_URL from "../config";
import API_BASE from "../config1.js";
import MyNavigation from "./MyNavigation.js";
import "../i18n.js"


const CustomerDashboard = ({ navigation, route }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const customer_id = route.params?.customer_id;
  const [imageIndexes, setImageIndexes] = useState({}); // To track image index for each vendor
  // const { t } = useTranslation();
  useEffect(() => {
    if (!customer_id) {
      Alert.alert("Error", "Customer ID not found!", [{ text: "Go Back", onPress: () => navigation.goBack() }]);
      return;
    }
    fetchVendors();
  }, [customer_id]);

  const fetchVendors = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vendors`);
      setVendors(response.data);
      setLoading(false);
      console.log(response.data);
      
      // Initialize image index tracking for each vendor
      const initialIndexes = {};
      response.data.forEach(vendor => {
        initialIndexes[vendor.vendor_id] = 0;
      });
      setImageIndexes(initialIndexes);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setLoading(false);
    }
  };

  // ✅ Cycle through images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes(prevIndexes => {
        const newIndexes = { ...prevIndexes };
        vendors.forEach(vendor => {
          if (vendor.food_images) {
            const imagesArray = vendor.food_images.split(", ");
            newIndexes[vendor.vendor_id] = (newIndexes[vendor.vendor_id] + 1) % imagesArray.length;
          }
        });
        return newIndexes;
      });
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [vendors]);

  const filteredVendors = vendors.filter((vendor) =>
    (vendor.Shop_name && vendor.Shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.food_types && vendor.food_types.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  

  return (
    <View style={styles.container}>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
      <Image source={require("../android/app/src/main/assets/search.png")} style={styles.ratingImage} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vendor or food.."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {/* <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => navigation.navigate("SettingsScreen")}
      >
       <Image source={require("../android/app/src/main/assets/search.png")} style={styles.ratingImage} />
      </TouchableOpacity> */}
      {loading ? (
        <ActivityIndicator size="large" color="#FF5733" />
      ) : (
      <FlatList
          data={filteredVendors}
            keyExtractor={(item) => item.vendor_id.toString()}
    renderItem={({ item }) => {
      const imagesArray = item.food_images ? item.food_images.split(", ") : [];
      const currentImage = imagesArray[imageIndexes[item.vendor_id]] || "";

      return (
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate("FoodList", { vendor_id: item.vendor_id, customer_id })}
        >
          {/* 🏪 Vendor Info */}
          <View style={styles.info}>
            <Text style={styles.shopName}>{item.Shop_name}</Text>
            <Text style={styles.address}>{item.shop_address}</Text>

            {/* 🍽️ Food Types */}
            <Text style={styles.foodTypes}>🍽️ {item.food_types || "No Types"}</Text>

            {/* ✅ Show Open/Closed Status Based on is_online */}
            <Text style={[styles.status, item.is_online ? styles.open : styles.closed]}>
              {item.is_online ? "🟢 Open" : "🔴 Closed"}
            </Text>
          </View>

          {/* 🍔 Rotating Food Image */}
          {currentImage ? (
            <Image source={{ uri: `${BASE_URL}${currentImage}` }} style={styles.image} />
          ) : (
            <Text style={styles.noImageText}>No Image Available</Text>
          )}
        </TouchableOpacity>
      );
    }}
  />
      )}

      <MyNavigation customer_id={customer_id}/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  map: {
    width: "100%",
    height: 200,
    marginBottom: 10,
    top:100,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    top:10,
    elevation: 3,
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  status: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 5,
  },
  
  open: {
    color: "green",
  },
  
  closed: {
    color: "red",
  },
  

  card: {
    width: "90%",
    height: 180,
    
    alignSelf: "center",
    borderRadius: 10,
    padding: 20,
    marginRight:20,
    marginVertical: 15,
    alignItems: "center",
    
    boxShadow: "5px 5px 7px rgba(93, 93, 93, 0.4)",
    
  },

  ratingImage: {
    width: 20,
    height: 20,
  },

  ratingContainer: {
    position: "absolute",
    top: 5,
    right: 10,
  },

  image: {
    width: 130,
    height: 170,
    borderRadius: 15,
    // borderWidth: 3,
    boxShadow: "5px 5px  7px rgba(93, 93, 93, 0.59)",
    // borderColor: "#fff",
    position: "absolute",
    top: 5,
    left: 7,
    
  },
  info: {
    width: "60%",
    height: "60%",
    left: 75,
  },

  shopName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A4A4A",
    textAlign: "left",
    left: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  address: {
    fontSize: 16,
    width:"97%",
    color: "#666",
    textAlign: "left",
    
    marginLeft: 90,
    left: -90,
  },
});

export default CustomerDashboard;
