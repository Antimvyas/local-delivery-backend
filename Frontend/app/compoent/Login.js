import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { connectSocket } from '../socket';
import { registerFcmTokenWithServer } from '../utils/notificationHelper';
import { showError, showSuccess } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import AppInput from './common/AppInput';
import AppSelect from './common/AppSelect';
import PrimaryButton from './common/PrimaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from '../GlobalText';

import { useNotification } from './common/GlobalNotificationProvider';

const Login = () => {
  const route = useRoute();
  const defaultRole = route.params?.defaultRole || 'customer';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedOption, setSelectedOption] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { checkUserSession } = useNotification() || {};

  const handleRoleChange = (value) => {
    setSelectedOption(value);
  };

  const handleLogin = async () => {
    if (!username || !password || !selectedOption) {
      showError('All fields are required.');
      return;
    }
  
    setLoading(true);
    try {
      const response = await api.post('/login', {
        username,
        password,
        role: selectedOption,
      });
  
      console.log('Login Response:', response.data);
  
      if (response.data.success) {
        showSuccess('Logged in successfully!');
        const authData = response.data.data;
        
        await AsyncStorage.setItem('accessToken', authData.accessToken);
        await AsyncStorage.setItem('refreshToken', authData.refreshToken);
        await AsyncStorage.setItem('userRole', authData.role);
        await AsyncStorage.setItem('userId', String(authData.user_id));
  
        await connectSocket();
        await registerFcmTokenWithServer();
        if (checkUserSession) {
          await checkUserSession();
        }

        // Clear inputs after success
        setPassword("");
        setUsername('');
  
        if (selectedOption === 'customer') {
          navigation.navigate('CustomerDashboard', { customer_id: authData.customer_id });
        } else if (selectedOption === 'vendor') {
          navigation.navigate('VendorDashboard', { vendor_id: authData.vendor_id });
        }
      } 
    } catch (error) {
      console.error('Login Error:', error);
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
        <Text style={styles.appTitle}>Local Delivery App</Text>
        <Text style={styles.subtitle}>Order from your local shop</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Login</Text>

        <AppSelect
          label="Select Role:"
          value={selectedOption}
          onValueChange={handleRoleChange}
          items={[
            { label: 'Customer', value: 'customer' },
            { label: 'Vendor', value: 'vendor' },
          ]}
          placeholder={{ label: 'Select your role...', value: null }}
        />

        <AppInput
          label="Username:"
          placeholder="Enter Username"
          iconName="account"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <AppInput
          label="Password:"
          placeholder="Enter Password"
          iconName="lock"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <PrimaryButton 
          title="Login" 
          onPress={handleLogin} 
          loading={loading}
          disabled={!selectedOption}
          style={styles.loginBtn}
        />

        {selectedOption === 'customer' && (
          <TouchableOpacity 
            onPress={() => navigation.navigate("CustomerOtpAuth")} 
            style={styles.otpBtn}
          >
            <Text style={styles.otpBtnText}>Or Sign In with Mobile OTP</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("SignUp")} style={styles.signUpLinkContainer}>
          <Text style={styles.signUpText}>
            Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Login;

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
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: spacing.md,
  },
  otpBtn: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  otpBtnText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  signUpLinkContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  signUpLink: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
