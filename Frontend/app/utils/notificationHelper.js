import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { showInfo } from './toastHelper';

const isFirebaseAvailable = false;
const messaging = () => ({
  requestPermission: async () => 1,
  getToken: async () => 'mock_fcm_token',
});

/**
 * Gets or creates a unique device ID to uniquely track this device on the server
 */
export const getOrCreateDeviceId = async () => {
  try {
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  } catch (e) {
    console.error('Error in getOrCreateDeviceId:', e);
    return 'default_device_id';
  }
};

/**
 * Requests notification permissions for Android 13+ and iOS
 */
export const requestNotificationPermission = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'This app needs notification permissions to alert you about orders, payments, and credit updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('POST_NOTIFICATIONS permission request error:', err);
        return false;
      }
    }
    return true; // Permissions granted automatically on older Androids
  } else {
    // iOS permission request
    return true;
  }
};

/**
 * Fetches the FCM token and registers it on the backend server
 */
export const registerFcmTokenWithServer = async () => {
  console.log('registerFcmTokenWithServer called: Firebase/FCM is temporarily disabled.');
  return;
};

/**
 * Triggers Notifee to display a local head-up notification when app is in foreground
 */
export const displayLocalNotification = async (remoteMessage) => {
  try {
    console.log('displayLocalNotification called:', remoteMessage);
    if (remoteMessage.notification) {
      showInfo(
        remoteMessage.notification.body || '',
        remoteMessage.notification.title || 'Local Delivery App'
      );
    }
  } catch (e) {
    console.error('Error displaying local notification:', e);
  }
};

/**
 * Handles navigation to specific screens when notification is tapped
 */
export const handleNotificationNavigation = (data) => {
  if (!data || !data.type) {
    console.log('No notification type/data provided for navigation.');
    return;
  }

  const { type, screen, role, user_id } = data;
  console.log(`Navigating from notification tap. Type: ${type}, Screen: ${screen}`);

  const { navigationRef } = require('./navigation');
  if (!navigationRef || !navigationRef.isReady()) {
    // Retry if navigator is not fully initialized
    setTimeout(() => handleNotificationNavigation(data), 500);
    return;
  }

  // Parse parameters
  const userIdParsed = Number(user_id);

  // Mapping logic based on type/screen
  switch (type) {
    case 'New Order':
      navigationRef.navigate('PendingOrder', { vendor_id: userIdParsed });
      break;
    case 'Order Cancelled':
      navigationRef.navigate('Orders', { vendor_id: userIdParsed });
      break;
    case 'Payment Received':
      // Requires customer_id (who paid). Since data object is string key-value, the backend will send customer_id if present
      const customerId = data.customer_id ? Number(data.customer_id) : null;
      if (customerId) {
        navigationRef.navigate('VendorCustomerDetails', { customer_id: customerId, vendor_id: userIdParsed });
      } else {
        navigationRef.navigate('VendorDashboard', { vendor_id: userIdParsed });
      }
      break;
    case 'Credit Request Received':
      navigationRef.navigate('UdarRequestsScreen', { vendor_id: userIdParsed });
      break;
    case 'Order Accepted':
    case 'Order Rejected':
    case 'Order Delivered':
      navigationRef.navigate('MyOrdersScreen', { customer_id: userIdParsed });
      break;
    case 'Payment Approved':
    case 'Credit Request Approved':
    case 'Credit Request Rejected':
      const vendorId = data.vendor_id ? Number(data.vendor_id) : null;
      navigationRef.navigate('MyUdarScreen', { customer_id: userIdParsed, vendor_id: vendorId });
      break;
    default:
      // Fallback dashboard navigation
      if (role === 'vendor') {
        navigationRef.navigate('VendorDashboard', { vendor_id: userIdParsed });
      } else if (role === 'customer') {
        navigationRef.navigate('CustomerDashboard', { customer_id: userIdParsed });
      }
      break;
  }
};
