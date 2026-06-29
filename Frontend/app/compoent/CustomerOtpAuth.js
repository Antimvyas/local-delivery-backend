import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput 
} from 'react-native';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { connectSocket } from '../socket';
import { registerFcmTokenWithServer } from '../utils/notificationHelper';
import { showError, showSuccess } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import AppInput from './common/AppInput';
import PrimaryButton from './common/PrimaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from '../GlobalText';
import { useNotification } from './common/GlobalNotificationProvider';

const CustomerOtpAuth = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP, 3 = New Profile Setup
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { checkUserSession } = useNotification() || {};

  const handleSendOtp = async () => {
    if (!phone || phone.length !== 10) {
      showError('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/otp/send', { phone });
      if (response.data.success) {
        showSuccess('OTP sent successfully (Mock OTP is 123456)');
        setStep(2);
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/otp/verify', { phone, otp });
      const { success, isNewUser, accessToken, refreshToken, role, user_id, customer_id } = response.data;

      if (success) {
        if (isNewUser) {
          showSuccess('Phone verified. Please create your profile.');
          setStep(3);
        } else {
          // Logged in immediately
          showSuccess('Logged in successfully!');
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);
          await AsyncStorage.setItem('userRole', role);
          await AsyncStorage.setItem('userId', String(user_id));

          await connectSocket();
          await registerFcmTokenWithServer();
          if (checkUserSession) {
            await checkUserSession();
          }

          navigation.reset({
            index: 0,
            routes: [{ name: 'CustomerDashboard', params: { customer_id } }],
          });
        }
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      showError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/otp/register', { phone, name });
      const { success, accessToken, refreshToken, role, user_id, customer_id } = response.data;

      if (success) {
        showSuccess('Account created successfully!');
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('userRole', role);
        await AsyncStorage.setItem('userId', String(user_id));

        await connectSocket();
        await registerFcmTokenWithServer();
        if (checkUserSession) {
          await checkUserSession();
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'CustomerDashboard', params: { customer_id } }],
        });
      }
    } catch (error) {
      console.error('Register OTP Error:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Icon name="phone-lock" size={48} color={colors.primary} />
        </View>
        <Text style={styles.appTitle}>Customer Sign In</Text>
        <Text style={styles.subtitle}>Secure login via mobile OTP</Text>
      </View>

      <View style={styles.card}>
        {step === 1 && (
          <>
            <Text style={styles.cardTitle}>Verify Mobile Number</Text>
            <AppInput
              label="Phone Number:"
              placeholder="10-digit mobile number"
              iconName="phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="numeric"
              maxLength={10}
            />
            <PrimaryButton 
              title="Send Verification Code" 
              onPress={handleSendOtp} 
              loading={loading}
              style={styles.actionBtn}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.cardTitle}>Verify Security Code</Text>
            <Text style={styles.infoText}>We have sent a 6-digit code to +91 {phone}</Text>
            <AppInput
              label="Verification Code (OTP):"
              placeholder="Enter 6-digit OTP"
              iconName="numeric"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
            <PrimaryButton 
              title="Verify Code" 
              onPress={handleVerifyOtp} 
              loading={loading}
              style={styles.actionBtn}
            />
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
              <Text style={styles.backLinkText}>Change mobile number</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.cardTitle}>Create New Profile</Text>
            <Text style={styles.infoText}>Welcome! Please complete your account setup.</Text>
            
            <AppInput
              label="Full Name:"
              placeholder="Enter your full name"
              iconName="account"
              value={name}
              onChangeText={setName}
            />

            <PrimaryButton 
              title="Create Account" 
              onPress={handleRegister} 
              loading={loading}
              style={styles.actionBtn}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default CustomerOtpAuth;

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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  infoText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  backLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
});
