import { StyleSheet, View, TouchableOpacity, ActivityIndicator,Image, Alert, LogBox } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import API_BASE from '../config1.js'; // Ensure this is correct
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Import Icons
import Credit from './Credit.js';

const MyNavigation = ({customer_id,vendor_id}) => {
  const navigation = useNavigation();
  const [customerId, setCustomerId] = useState(customer_id);
  const [vendorId, setVendorId] = useState(vendor_id);
  const [loading, setLoading] = useState(false);
  const[component, setcomponent]=useState(false)

  // ✅ Fetch customer_id & vendor_id when component mounts
  useEffect(() => {
    console.log("my i",customerId);
    
    if (!customerId){
      // Alert.alert("not customer id ")
    }else{
      setLoading(false)
    }
    
    
  }, []);


  if (loading) {
    return <ActivityIndicator size="large" color="#007bff" />;
  }

  return (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => navigation.navigate("CustomerDashboard", { customer_id: customerId, vendor_id: vendorId })}
      >
         <Image source={require("../android/app/src/main/assets/home1.png")}
                            style={styles.img}
                        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => navigation.navigate("MyOrdersScreen", { customer_id: customerId, vendor_id: vendorId })}
      >
        <Image source={require("../android/app/src/main/assets/orderss.png")}
                            style={styles.img}
                        />
      </TouchableOpacity>
      <View>
      {/*  */}
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => navigation.navigate("New",{customer_id:customerId})} 
        
      >
         <Image source={require("../android/app/src/main/assets/credit1.png")}
                            style={styles.img}
                        />
            
      </TouchableOpacity>
      {/* {component && <Credit customer_id={customerId} vendor_id={vendorId} />} */}
      </View>
      <TouchableOpacity style={styles.iconContainer} onPress={() => navigation.navigate("Account", { customer_id: customerId, vendor_id: vendorId })}>
      <Image source={require("../android/app/src/main/assets/account.png")}
                            style={styles.img}
                        />
      </TouchableOpacity>
    </View>
  );
};

export default MyNavigation;

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    position: "absolute",
    bottom: -15,
    // borderWidth:3,
    left: "5%",
    width: "90%",
    height: 80,
    // backgroundColor: "rgba(255, 255, 255, 0.2)", // Glass effect
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "space-around",
    // shadowColor: "#000",
    // shadowOpacity: 0.2,
    // shadowOffset: { width: 0, height: 10 },
    // shadowRadius: 20,
    // elevation: 8, // Elevation for Android shadow
    backdropFilter: "blur(10px)", // Blur effect for glass look
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    // borderWidth:3,
    backgroundColor: "rgba(255, 255, 255, 0.3)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
    // shadowColor: "#000",
    // shadowOpacity: 0.3,
    // shadowOffset: { width: 0, height: 5 },
    // shadowRadius: 10,
     
  },
  img:{
    width:40,
    height:40

  },
  newcomponet:{
    height:"80px"
  }
  
});