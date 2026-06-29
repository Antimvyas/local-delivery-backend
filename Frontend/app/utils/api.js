import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config1.js';
import { disconnectSocket } from '../socket';
import { showError } from './toastHelper';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const isPublicRoute = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('?')[0]; // strip query params
  return (
    cleanUrl.endsWith('/login') ||
    cleanUrl.endsWith('/set-data') ||
    cleanUrl.endsWith('/refresh') ||
    cleanUrl.endsWith('/vendors') ||
    cleanUrl.endsWith('/food')
  );
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      originalRequest &&
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicRoute(originalRequest.url)
    ) {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        originalRequest._retry = true;
        try {
          const role = await AsyncStorage.getItem('userRole');
          const user_id = await AsyncStorage.getItem('userId');

          const res = await axios.post(`${API_BASE}/refresh`, { refreshToken, role, user_id });
          const newAccessToken = res.data.accessToken;
          
          await AsyncStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          return api(originalRequest);
        } catch (refreshError) {
          // Validation failed - auto logout
          disconnectSocket();
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId', 'userRole']);
          showError("Please login again.", "Session Expired");
          const { navigationRef } = require('../App');
          if (navigationRef && navigationRef.isReady()) {
            navigationRef.navigate('Login');
          }
          return Promise.reject(refreshError);
        }
      }
    }

    // Global Error Handling for other failures
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        showError("Access denied. Please login again.", "Forbidden");
      } else if (status >= 500) {
        showError("Something went wrong. Please try again.", "Server Error");
      }
    } else if (error.request) {
      // Network failure / server unreachable
      showError("Unable to connect. Please try again.", "Connection Error");
    }
    
    return Promise.reject(error);
  }
);

export default api;
