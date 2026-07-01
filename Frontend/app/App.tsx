import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import HomeScreen from './compoent/Home.js';
import VendorScreen from './compoent/ScreenB.js';
import VendorDashboard from './compoent/vendorDashboard.js';
import Add_menu from './compoent/Add_menu.js';
import Orders from './compoent/Orders.js';
import View_menu from './compoent/View_menu.js';
import Login from './compoent/Login.js';
import Welcome from './compoent/Welcome.js';
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, Alert, StyleSheet, Image } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { connectSocket } from './socket.js';
import EditFood from './compoent/Edit.js';
import DeleteFood from './compoent/Delete.js';
import CustomerDashboard from './compoent/CustomerDashboard.js';
import FoodList from './compoent/FoodList.js';
import CartScreen from './compoent/CartScreen.js';
import OrderDetailsScreen from './compoent/OrderDetailsScreen.js';
import PendingOrder from './compoent/PendingOrder.js';
import UdarRequestsScreen from './compoent/UdarRequestsScreen.js';
import AccountScreen from './compoent/AccountScreen.js';
import VendorCustomerDetails from './compoent/VendorCustomerDetails.js';
import MyNavigation from './compoent/MyNavigation.js';
import MyOrdersScreen from './compoent/MyOrderScreen.js';
import MyUdarScreen from './compoent/MyUdarScreen.js';
import RequestUdarScreen from './compoent/RequestUdarScreen.js';
import Credit from './compoent/Credit.js';
import New from './compoent/New.js';
import Account from './compoent/Account.js';
import SettingsScreen from './compoent/SettingsScreen.js';
import ManageShop from './compoent/ManageShop.js';
import Toast from 'react-native-toast-message';
import CustomerOtpAuth from './compoent/CustomerOtpAuth.js';

import { registerFcmTokenWithServer, displayLocalNotification, handleNotificationNavigation } from './utils/notificationHelper';
import GlobalNotificationProvider from './compoent/common/GlobalNotificationProvider';
import { navigationRef } from './utils/navigation';

const Stack = createNativeStackNavigator();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Welcome");

  console.log("[RENDER TRACE] App Component Rendered. isLoading =", isLoading, "initialRoute =", initialRoute);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const role = await AsyncStorage.getItem('userRole');
        const userId = await AsyncStorage.getItem('userId');

        if (token && role && userId) {
          try {
            const decoded = jwtDecode(token);
            if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
              await connectSocket();
              setInitialRoute(role === 'vendor' ? 'VendorDashboard' : 'CustomerDashboard');
            } else {
              console.log("Session expired. Clearing storage...");
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole', 'userId']);
              setInitialRoute("Welcome");
            }
          } catch (e) {
            console.log("Invalid token format. Clearing storage...");
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole', 'userId']);
            setInitialRoute("Welcome");
          }
        } else {
          setInitialRoute("Welcome");
        }
      } catch (err) {
        console.error("Failed to fetch token from storage");
        setInitialRoute("Welcome");
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);



  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={{ marginTop: 10, color: '#FF4500' }}>Loading session...</Text>
      </View>
    );
  }

  return (
    <GlobalNotificationProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={HomeScreen} options={{ title: 'Sign Up' }} />
          <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
          <Stack.Screen name="VendorScreen" component={VendorScreen}  />
          <Stack.Screen name="VendorDashboard" component={VendorDashboard} />
          <Stack.Screen name="Add_menu" component={Add_menu} />
          <Stack.Screen name="Orders" component={Orders}/>
          <Stack.Screen name="View_menu" component={View_menu}/>
          <Stack.Screen name="Login" component={Login}/>
          <Stack.Screen name="EditFood" component={EditFood}/>
          <Stack.Screen name="DeleteFood" component={DeleteFood}/>
          <Stack.Screen name="FoodList" component={FoodList}/>
          <Stack.Screen name='CartScreen' component={CartScreen}/>
          <Stack.Screen name='OrderDetailsScreen' component={OrderDetailsScreen}/>
          <Stack.Screen name='PendingOrder' component={PendingOrder}/>
          <Stack.Screen name='UdarRequestsScreen' component={UdarRequestsScreen}/>
          <Stack.Screen name='AccountScreen' component={AccountScreen}/>
          {/* <Stack.Screen name='MyNavigation' component={MyNavigation}/> */}
          <Stack.Screen name='MyOrdersScreen' component={MyOrdersScreen}/>
          <Stack.Screen name='MyUdarScreen' component={MyUdarScreen} />
           
          <Stack.Screen name='RequestUdarScreen' component={RequestUdarScreen}/>
          {/* <Stack.Screen name='Credit' component={Credit}/> */}
          <Stack.Screen name='New' component={New}/>
          <Stack.Screen name='VendorCustomerDetails' component={VendorCustomerDetails}/>
          <Stack.Screen name="Account" component={Account}/>
          <Stack.Screen name='SettingsScreen' component={SettingsScreen} />
          <Stack.Screen name="ManageShop" component={ManageShop}/>
          <Stack.Screen name="CustomerOtpAuth" component={CustomerOtpAuth} options={{ title: 'Customer Sign In' }} />
          
          

        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </GlobalNotificationProvider>
  );

};
export default App;


