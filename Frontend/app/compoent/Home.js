import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from "../utils/api";
import { showError, showSuccess } from '../utils/toastHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from '../socket';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import AppInput from './common/AppInput';
import AppSelect from './common/AppSelect';
import PrimaryButton from './common/PrimaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNotification } from './common/GlobalNotificationProvider';
import Text from "../GlobalText.js";

const HomeScreen = ({ navigation }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [Name, setName] = useState('');
  const [username, setuserName] = useState('');
  const [Phone, setPhone] = useState('');
  const [password, setpassword] = useState('');
  const [customer_address, setaddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkUserSession } = useNotification() || {};

  const handleRoleChange = (val) => {
    setSelectedOption(val);
  };

  const handleSubmit = async () => {
    if (!Name || !username || !Phone || !password || (selectedOption === 'customer' && !customer_address)) {
      showError("All fields are required.");
      return;
    }
  
    setLoading(true);
    try {
      const response = await api.post(`/signup`, {
        Name,
        username,
        Phone,
        password,
        role: selectedOption,
        customer_address: selectedOption === 'customer' ? customer_address : undefined,
      });

      if (response.data.success) {
        showSuccess("Account registered successfully!");
        
        await AsyncStorage.setItem('accessToken', response.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        await AsyncStorage.setItem('userRole', response.data.role);
        await AsyncStorage.setItem('userId', String(response.data.user_id));

        await connectSocket();
        await registerFcmTokenWithServer();
        if (checkUserSession) {
          await checkUserSession();
        }

        if (selectedOption === 'customer') {
          navigation.navigate("CustomerDashboard", { customer_id: response.data.customer_id });
        } else if (selectedOption === 'vendor') {
          navigation.navigate("VendorDashboard", { vendor_id: response.data.vendor_id });
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Icon name="truck-delivery" size={48} color={colors.primary} />
        </View>
        <Text style={styles.appTitle}>Register</Text>
        <Text style={styles.subtitle}>Create your new account</Text>
      </View>

      <View style={styles.card}>
        <AppSelect
          label="Account Type:"
          value={selectedOption}
          onValueChange={handleRoleChange}
          items={[
            { label: 'Customer', value: 'customer' },
            { label: 'Vendor', value: 'vendor' },
          ]}
          placeholder={{ label: 'Select account type...', value: null }}
        />

        <AppInput
          label="Username:"
          placeholder="Choose a username"
          iconName="account"
          value={username}
          onChangeText={setuserName}
          autoCapitalize="none"
        />

        <AppInput
          label="Full Name:"
          placeholder="Enter your full name"
          iconName="card-account-details"
          value={Name}
          onChangeText={setName}
        />

        <AppInput
          label="Phone Number:"
          placeholder="Enter your phone number"
          iconName="phone"
          value={Phone}
          onChangeText={setPhone}
          keyboardType="numeric"
        />

        <AppInput
          label="Password:"
          placeholder="Choose a password"
          iconName="lock"
          value={password}
          onChangeText={setpassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {selectedOption === 'customer' && (
          <AppInput
            label="Delivery Address:"
            placeholder="Enter your delivery address"
            iconName="map-marker"
            value={customer_address}
            onChangeText={setaddress}
          />
        )}

        <PrimaryButton
          title="Sign Up"
          onPress={handleSubmit}
          loading={loading}
          disabled={!selectedOption}
          style={styles.signUpBtn}
        />

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={styles.loginLinkContainer}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(30, 58, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  signUpBtn: {
    marginTop: spacing.md,
  },
  loginLinkContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  loginText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
