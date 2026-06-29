import AsyncStorage from '@react-native-async-storage/async-storage';

let orderBadgeCount = 0;
let paymentBadgeCount = 0;
const badgeListeners = [];

export const getOrderBadgeCount = () => orderBadgeCount;
export const getPaymentBadgeCount = () => paymentBadgeCount;

export const setOrderBadgeCount = async (count) => {
  orderBadgeCount = count;
  await AsyncStorage.setItem('orderBadgeCount', count.toString());
  notifyBadgeListeners();
};

export const incrementOrderBadgeCount = async () => {
  await setOrderBadgeCount(orderBadgeCount + 1);
};

export const setPaymentBadgeCount = async (count) => {
  paymentBadgeCount = count;
  await AsyncStorage.setItem('paymentBadgeCount', count.toString());
  notifyBadgeListeners();
};

export const incrementPaymentBadgeCount = async () => {
  await setPaymentBadgeCount(paymentBadgeCount + 1);
};

export const resetOrderBadgeCount = async () => {
  await setOrderBadgeCount(0);
};

export const resetPaymentBadgeCount = async () => {
  await setPaymentBadgeCount(0);
};

export const addBadgeListener = (listener) => {
  badgeListeners.push(listener);
  // Emit immediately on registration
  listener({ orderBadgeCount, paymentBadgeCount });
  return () => {
    const index = badgeListeners.indexOf(listener);
    if (index > -1) badgeListeners.splice(index, 1);
  };
};

const notifyBadgeListeners = () => {
  badgeListeners.forEach(listener => {
    try {
      listener({ orderBadgeCount, paymentBadgeCount });
    } catch (e) {
      console.warn("Failed to notify badge listener:", e);
    }
  });
};

// Initialize counts from AsyncStorage
export const initBadgeCounts = async () => {
  try {
    const oCount = await AsyncStorage.getItem('orderBadgeCount');
    const pCount = await AsyncStorage.getItem('paymentBadgeCount');
    orderBadgeCount = oCount ? parseInt(oCount, 10) : 0;
    paymentBadgeCount = pCount ? parseInt(pCount, 10) : 0;
    notifyBadgeListeners();
  } catch (e) {
    console.warn("Failed to initialize badge counts:", e);
  }
};
