import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity ,ScrollView,Image, ToastAndroid, Alert} from "react-native";
import axios from "axios";
import MyNavigation from "./MyNavigation.js";
import API_BASE from "../config1.js";


const VendorSetting = (vendor_id) => {
 const navigation = useNavigation();
      //   const [customerId, setCustomerId] = useState(customer_id);
        const [vendorId, setVendorId] = useState(vendor_id);
        const [loading, setLoading] = useState(true);
        // Safe access to route.params
        
        
       
      useEffect(() => {
        console.log("hello ve",vendorId);
        if(!vendorId){
          Alert.alert("missing")
      //     // ToastAndroid.show("missing")
        }else{
      setLoading(false);
        }
        // const fetchIds = async () => {
        //   try {
        //     const response = await axios.get(`${API_BASE}/get-customer-vendor`);
        //     const { customer_id, vendor_id } = response.data; // Ensure your API returns these fields
        //     console.log(response.data);
        //     console.log(customer_id);
            
        //     setCustomerId(customer_id);
        //     setVendorId(vendor_id);
        //   } catch (error) {
        //     console.error("Error fetching IDs:", error);
        //   } finally {
        //     setLoading(false);
        //   }
        // };
    
        // fetchIds();
      }, []);
      // console.log("id",vendorId);
      return (
        
          <View style={styles.container}>
              {/* TouchableOpacity for navigating to "MyUdarScreen" */}
              <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.navigate("SetFood", {vendor_id:vendorId})}
              >
                  <Text>Mange food</Text>
              </TouchableOpacity>
  
              {/* TouchableOpacity for navigating to "RequestUdarScreen" */}
              <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.navigate("AccountScreen",{vendor_id:vendorId})}
              >
                  <Image
                      source={require("../android/app/src/main/assets/credit1.png")}
                      style={styles.ratingImage}
                  />
              </TouchableOpacity>
          </View>
      );
  };
  
  export default VendorSetting;
  
  const styles = StyleSheet.create({
    container: {
      display: "flex",
      flexDirection: "column",
      position: "absolute",
      bottom:70,
      right:5,
      // borderWidth:3,
      height:"170%",
      width: "110%",
     //  backgroundColor: "#fff",
      // alignItems: "center",
      // justifyContent: "space-between",
      paddingVertical: 10,
      paddingLeft: 5,
      paddingRight:10,
      boxShadow: "4px 4px 4px 6px rgba(0, 0, 0, 0.1)",  // Adding a subtle shadow
      borderRadius: 20, // Rounded corners for 3D feel
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
  