import { StyleSheet, View, TouchableOpacity, ActivityIndicator,Image, Alert, LogBox } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Menu from './Menu';
import Credit from './Credit';
import Credit_account from './Credit_account';
import VendorSetting from './VendorSetting';

const VendorNavigation = (vendor_id) => {
    const navigation = useNavigation();
    // const [customerId, setCustomerId] = useState(customer_id);
    const [vendorId, setVendorId] = useState(vendor_id?.vendor_id ?? vendor_id);
    const [loading, setLoading] = useState(false);
    const[component, setcomponent]=useState(false)
    const[component1, setcomponent1]=useState(false)
    const[component2, setcomponent2]=useState(false)
  
    // ✅ Fetch customer_id & vendor_id when component mounts
    useEffect(() => {
      console.log("i",vendorId);
      
      if (!vendorId){
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
        <View style={styles.newcomponet}>
        <TouchableOpacity
          style={[styles.iconContainer,]}
          onPress={() => navigation.navigate("VendorDashboard" ,{vendor_id:vendorId})}

        >
           <Image source={require("../android/app/src/main/assets/home1.png")}
                              style={styles.img}
                          />
        </TouchableOpacity>
        </View>
       <View style={styles.newcomponet}>
       <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => navigation.navigate("Orders",{vendor_id:vendorId} )}
        >
          <Image source={require("../android/app/src/main/assets/orders.png")}
                              style={styles.img}
                          />
        </TouchableOpacity>
       </View>
  
       
        <View style={styles.newcomponet}>
        {/*  */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => navigation.navigate("View_menu",{vendor_id:vendorId})} 
          
        >
           <Image source={require("../android/app/src/main/assets/view.png")}
                              style={styles.img}
                          />
              
        </TouchableOpacity>
        
        </View>
        <View style={styles.newcomponet}>
        {/*  */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => navigation.navigate("AccountScreen",{vendor_id:vendorId})} 
          
        >
           <Image source={require("../android/app/src/main/assets/credit1.png")}
                              style={styles.img}
                          />
              
        </TouchableOpacity>
       
        </View>
        <View style={styles.newcomponet}>
        {/*  */}
        <TouchableOpacity
          style={styles.iconContainer}
          onPress={() => setcomponent2(!component2)} 
          
        >
           <Image source={require("../android/app/src/main/assets/setting.png")}
                              style={styles.img}
                          />
              
        </TouchableOpacity>
        {component2 && <VendorSetting vendor_id={vendorId}  />}
        </View>
      </View>
    );
  };
  
  export default VendorNavigation;
  
  const styles = StyleSheet.create({
    navbar: {
      flexDirection: "row",
      position: "absolute",
      bottom: -15,
      justifyContent:"space-evenly",
      width: "100%",
      height: 80,
      
      borderRadius: 20,
    //   alignItems: "center",
    //   justifyContent: "space-between",
      
      backdropFilter: "blur(10px)", // Blur effect for glass look
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
    //   padding:20,
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
      height:40,
    //   padding:20
    },
    newcomponet:{
      paddingRight:9,
    }
    
  });