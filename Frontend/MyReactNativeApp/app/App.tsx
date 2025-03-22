import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import HomeScreen from './compoent/Home.js';
import VendorScreen from './compoent/ScreenB.js';
import VendorDashboard from './compoent/vendorDashboard.js';
import Add_menu from './compoent/Add_menu.js';
import Orders from './compoent/Orders.js';
import View_menu from './compoent/View_menu.js';
import Login from './compoent/Login.js';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Image } from "react-native";
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

// import Navigation from './compoent/Navigation.js';




const Stack = createNativeStackNavigator();


const App = () => {
  return (
    <>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        
        <Stack.Screen name="Home" component={HomeScreen} />
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
        
        

      </Stack.Navigator>
    </NavigationContainer>
   
    </>
  );

};
export default App;


