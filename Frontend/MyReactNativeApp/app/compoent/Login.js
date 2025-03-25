import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet,ToastAndroid } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import axios from 'axios';
import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import API_BASE from "../config1"
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const navigation = useNavigation(); 

  const handleLogin = async () => {
    if (!username || !password || !selectedOption) {
      ToastAndroid.showWithGravity(
        'Please fill all fields',
        ToastAndroid.SHORT,
        ToastAndroid.CENTER
      );
      return;
    }
  
    try {
      console.log(`http://192.168.1.22:3000/api/v1/login`)
      // const response = await axios.post(`${API_BASE}/login`, {
        const response = await axios.post(`http://192.168.1.22:3000/api/v1/login`, {
        username,
        password,
        role: selectedOption, 
      });
  
      console.log('Login Response:', response);
      setPassword("");
      setUsername('');
      setSelectedOption(null);
  
      if (response.data.success) {
        if (selectedOption === 'customer') {
          navigation.navigate('CustomerDashboard', { customer_id: response.data.customer_id });
        } else if (selectedOption === 'vendor') {
          navigation.navigate('VendorDashboard', { vendor_id: response.data.vendor_id });
        }
      } 
    } catch (error) {
      console.error('Login Error:', error);
  
      let errorMessage = 'Failed to login. Please try again.';
  
      // If the backend sends a response, use the specific error message
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
  
      ToastAndroid.showWithGravity(
        errorMessage,
        ToastAndroid.LONG,
        ToastAndroid.CENTER
      );
    }
  };
  


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Login As:</Text>
      <RNPickerSelect
        style={{
          inputIOS: styles.picker,
          inputAndroid: styles.picker,
        }}
        onValueChange={(value) => setSelectedOption(value)}
        items={[
          { label: 'Customer', value: 'customer' },
          { label: 'Vendor', value: 'vendor' },
        ]}
        placeholder={{ label: 'Select an option...', value: null }}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity 
        style={[styles.loginButton, !selectedOption && styles.disabledButton]} 
        onPress={handleLogin} 
        disabled={!selectedOption}
      >
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Login;

// ✅ **Red-Orange Styling**
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FF4500',
    marginBottom: 15,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#FF4500',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    color: '#FF4500',
    backgroundColor: '#FFF3E0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FF4500',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  loginText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#FFA07A',
  },
});
