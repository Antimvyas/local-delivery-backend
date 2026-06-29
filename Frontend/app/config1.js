import { Platform } from 'react-native';

let host = '192.168.69.179';
let port = '3000';

try {
  const env = require('./env.js');
  if (env.API_HOST) host = env.API_HOST;
  if (env.API_PORT) port = env.API_PORT;
} catch (e) {
  console.log("No env.js configuration found, using default fallback.");
}

const getBaseIp = () => {
  if (Platform.OS === 'android') {
    const brand = Platform.constants.Brand || '';
    const model = Platform.constants.Model || '';
    const fingerprint = Platform.constants.Fingerprint || '';
    const hardware = Platform.constants.Hardware || '';
    
    const isEmulator = 
      fingerprint.startsWith('generic') ||
      fingerprint.startsWith('unknown') ||
      model.includes('google_sdk') ||
      model.includes('Emulator') ||
      model.includes('Android SDK built for x86') ||
      hardware.includes('goldfish') ||
      hardware.includes('ranchu') ||
      brand.toLowerCase().includes('generic');
      
    if (isEmulator) {
      return 'http://10.0.2.2:3000';
    }
  }
  return `http://${host}:${port}`;
};

export const BASE_IP = getBaseIp();
export const API_BASE = `${BASE_IP}/api/v1`;
export const IMAGE_BASE = `${BASE_IP}/image/`;

export default API_BASE;
