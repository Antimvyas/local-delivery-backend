import React, { useState } from 'react';
import { ToastAndroid } from 'react-native';
import { 
  View,  StyleSheet, TextInput, Alert, TouchableOpacity 
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import API_BASE from "../config1.js";
import "../i18n.js";
import Text from"../GlobalText.js"

const HomeScreen = ({ navigation }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [Name, setName] = useState('');
  const [username, setuserName] = useState('');
  const [Phone, setPhone] = useState('');
  const [password, setpassword] = useState('');
  const [customer_address, setaddress] = useState('');
  
  

  const handleSubmit = async () => {
    if (!Name || !username || !Phone || !password || (selectedOption === 'customer' && !customer_address)) {
      ToastAndroid.show("Please fill out all fields", ToastAndroid.LONG);
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE}/set-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedOption,
          username,
          Name,
          Phone,
          password,
          customer_address, // Only include if 'customer' is selected
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        ToastAndroid.show("User added successfully!", ToastAndroid.SHORT);
  
        if (selectedOption === 'customer') {
          navigation.navigate('CustomerDashboard', { customer_id: data.customer_id });
        } else if (selectedOption === 'vendor') {
          navigation.navigate('VendorScreen', { username: data.username });
        }
  
        // Clear form fields
        setSelectedOption(null);
        setuserName('');
        setName('');
        setPhone('');
        setpassword('');
        setaddress('');
      } else {
        // Use Toast instead of Alert
        ToastAndroid.showWithGravity(data.message || "Something went wrong", ToastAndroid.LONG,ToastAndroid.CENTER);
      }
    } catch (error) {
      console.error("Error adding user:", error);
      ToastAndroid.show("Failed to connect to server", ToastAndroid.LONG);
    }
  };
  
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up As:</Text>

      <RNPickerSelect
        onValueChange={(value) => setSelectedOption(value)}
        items={[
          { label: 'Customer', value: 'customer' },
          { label: 'Vendor', value: 'vendor' },
        ]}
        placeholder={{ label: 'Select an option...', value: null }}
        style={{
          inputIOS: styles.picker,
          inputAndroid: styles.picker,
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter Username"
        value={username}
        onChangeText={setuserName}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Name"
        value={Name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Phone"
        value={Phone}
        onChangeText={setPhone}
        maxLength={10}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Password"
        value={password}
        onChangeText={setpassword}
        maxLength={10}
        secureTextEntry
      />

      {/* Conditionally render address field based on selected option */}
      {selectedOption === 'customer' && (
        <TextInput
          style={styles.input}
          placeholder='Enter Address'
          value={customer_address}
          onChangeText={setaddress}
        />
      )}

      <TouchableOpacity
        style={[styles.button, !selectedOption && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={!selectedOption}
      >
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.loginText}>Already have an account? <Text style={styles.loginLink}>Login</Text></Text>
      </TouchableOpacity>
    </View>
  );
};

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
  button: {
    backgroundColor: '#FF4500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#FFA07A',
  },
  loginText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    color: '#555',
  },
  loginLink: {
    color: '#FF4500',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
