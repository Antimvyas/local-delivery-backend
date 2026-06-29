import React, { useEffect, useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Switch,
  Platform,
  PermissionsAndroid
} from 'react-native';
import api from '../utils/api';
import { showError, showSuccess } from '../utils/toastHelper';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';

export default function VendorSignup({ navigation, route }) {
  const [Shop_name, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pocket, setPocket] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const username = route.params?.username || '';

  // Default Timings
  const [timings, setTimings] = useState([
    { day: 'Monday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Tuesday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Wednesday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Thursday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Friday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Saturday', open: '09:00 AM', close: '09:00 PM', isOpen: true },
    { day: 'Sunday', open: 'Closed', close: '', isOpen: false },
  ]);

  // Update Open/Close Time
  const handleTimingChange = (index, field, value) => {
    const updatedTimings = [...timings];
    updatedTimings[index][field] = value;
    setTimings(updatedTimings);
  };

  // Toggle Day Open/Closed Status
  const handleToggleDay = (index, val) => {
    const updatedTimings = [...timings];
    updatedTimings[index].isOpen = val;
    if (val) {
      updatedTimings[index].open = '09:00 AM';
      updatedTimings[index].close = '09:00 PM';
    } else {
      updatedTimings[index].open = 'Closed';
      updatedTimings[index].close = '';
    }
    setTimings(updatedTimings);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'GPS access is required to auto-fill your shop address details.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleGPSAutofill = async () => {
    setGpsLoading(true);
    try {
      const hasPerm = await requestLocationPermission();
      if (!hasPerm) {
        showError("Location permission denied");
        setGpsLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });

          try {
            const geocodeRes = await api.post('/location/reverse-geocode', { latitude, longitude });
            const addressStr = geocodeRes.data.formatted_address || '';
            
            // Simple parsing heuristic
            let detectedSector = '';
            let detectedPocket = '';
            let detectedCity = '';
            let detectedState = '';

            const parts = addressStr.split(',').map(p => p.trim());
            for (const part of parts) {
              if (/sector\s*\d+/i.test(part)) {
                detectedSector = part;
              } else if (/pocket\s*[a-z0-9]/i.test(part)) {
                detectedPocket = part;
              } else if (/hisar/i.test(part) || /gurugram/i.test(part) || /delhi/i.test(part)) {
                detectedCity = part;
              } else if (/haryana/i.test(part) || /punjab/i.test(part) || /delhi/i.test(part)) {
                detectedState = part;
              }
            }

            if (!detectedSector) {
              const match = addressStr.match(/Sector\s*\d+/i);
              if (match) detectedSector = match[0];
            }
            if (!detectedPocket) {
              const match = addressStr.match(/Pocket\s*[A-Z0-9]+/i);
              if (match) detectedPocket = match[0];
            }
            if (!detectedCity) {
              if (addressStr.toLowerCase().includes("hisar")) detectedCity = "Hisar";
              else if (addressStr.toLowerCase().includes("gurugram")) detectedCity = "Gurugram";
            }
            if (!detectedState) {
              if (addressStr.toLowerCase().includes("haryana")) detectedState = "Haryana";
            }

            setSector(detectedSector);
            setPocket(detectedPocket);
            setCity(detectedCity);
            setState(detectedState);

            showSuccess("GPS Location auto-detected successfully!");
          } catch (geocodeErr) {
            console.error(geocodeErr);
            showError("Failed to geocode current location coordinates");
          } finally {
            setGpsLoading(false);
          }
        },
        (error) => {
          console.error(error);
          showError("Unable to fetch current GPS coordinates");
          setGpsLoading(false);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000, forceLocationManager: true }
      );
    } catch (err) {
      console.error(err);
      setGpsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!Shop_name || !pocket || !sector || !city || !state || !username) {
      showError('Please fill in Shop Name, Sector, Pocket, City and State');
      return;
    }

    // Build structured full display address
    const addressParts = [];
    if (shopNumber.trim()) addressParts.push(`Shop No ${shopNumber.trim()}`);
    if (landmark.trim()) addressParts.push(`Near ${landmark.trim()}`);
    if (pocket.trim()) addressParts.push(pocket.trim());
    if (sector.trim()) addressParts.push(sector.trim());
    if (city.trim()) addressParts.push(city.trim());
    if (state.trim()) addressParts.push(state.trim());
    const finalDisplayAddress = addressParts.join(",\n");

    setLoading(true);
    try {
      const response = await api.post(`/add-vendor`, {
        Shop_name,
        shop_address: finalDisplayAddress,
        username,
        open_close_timings: JSON.stringify(timings),
        shop_number: shopNumber,
        landmark,
        pocket,
        sector,
        city,
        state,
        structured_address: JSON.stringify({
          shop_number: shopNumber,
          landmark,
          pocket,
          sector,
          city,
          state
        }),
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (response.data && response.data.vendor_id) {
        showSuccess(`Vendor registered successfully!`);
        navigation.navigate('VendorDashboard', { vendor_id: response.data.vendor_id });
      } else {
        throw new Error('Vendor ID not received from backend');
      }
    } catch (error) {
      console.error("Error registering vendor:", error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Shop Details Setup</Text>

      <Text style={styles.label}>Shop Name *</Text>
      <TextInput
        placeholder="e.g. Fresh Grocers"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={Shop_name}
        onChangeText={setShopName}
      />

      <View style={styles.addressHeaderRow}>
        <Text style={styles.sectionTitle}>Shop Address</Text>
        <TouchableOpacity 
          style={styles.gpsBtn} 
          onPress={handleGPSAutofill}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="crosshairs-gps" size={16} color={colors.primary} />
          )}
          <Text style={styles.gpsBtnText}>
            {gpsLoading ? "Detecting..." : "Detect Location"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Shop Number</Text>
      <TextInput
        placeholder="e.g. Shop No. 45"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={shopNumber}
        onChangeText={setShopNumber}
      />

      <Text style={styles.label}>Landmark Near Shop</Text>
      <TextInput
        placeholder="e.g. Near Government School"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={landmark}
        onChangeText={setLandmark}
      />

      <Text style={styles.label}>Pocket / Area *</Text>
      <TextInput
        placeholder="e.g. Pocket A"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={pocket}
        onChangeText={setPocket}
      />

      <Text style={styles.label}>Sector *</Text>
      <TextInput
        placeholder="e.g. Sector 15"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={sector}
        onChangeText={setSector}
      />

      <Text style={styles.label}>City *</Text>
      <TextInput
        placeholder="e.g. Hisar"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={city}
        onChangeText={setCity}
      />

      <Text style={styles.label}>State *</Text>
      <TextInput
        placeholder="e.g. Haryana"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={state}
        onChangeText={setState}
      />

      <Text style={styles.sectionTitle}>Shop Open/Close Timings</Text>

      {/* Timing entries with switches */}
      {timings.map((item, index) => (
        <View key={index} style={styles.timeRow}>
          <View style={styles.dayCol}>
            <Text style={styles.dayText}>{item.day}</Text>
            <Switch
              value={item.isOpen}
              onValueChange={(val) => handleToggleDay(index, val)}
              trackColor={{ false: '#E2E8F0', true: colors.primary + '80' }}
              thumbColor={item.isOpen ? colors.primary : '#94A3B8'}
            />
          </View>
          
          {item.isOpen ? (
            <View style={styles.inputsCol}>
              <TextInput
                placeholder="09:00 AM"
                placeholderTextColor={colors.textSecondary}
                style={styles.timeInput}
                value={item.open}
                onChangeText={(value) => handleTimingChange(index, 'open', value)}
              />
              <Text style={styles.toText}>to</Text>
              <TextInput
                placeholder="09:00 PM"
                placeholderTextColor={colors.textSecondary}
                style={styles.timeInput}
                value={item.close}
                onChangeText={(value) => handleTimingChange(index, 'close', value)}
              />
            </View>
          ) : (
            <View style={styles.closedCol}>
              <Text style={styles.closedText}>CLOSED</Text>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity 
        style={[styles.registerButton, loading && styles.disabledButton]} 
        onPress={handleSignup} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerText}>Save & Proceed</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: spacing.md, 
    backgroundColor: colors.background 
  },
  title: { 
    fontSize: typography.fontSize.lg + 2, 
    fontWeight: 'bold', 
    marginBottom: spacing.md,
    color: colors.textPrimary,
    textAlign: 'center'
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 6
  },
  input: { 
    borderWidth: 1.5, 
    borderColor: colors.border, 
    marginBottom: spacing.sm, 
    padding: spacing.sm, 
    borderRadius: 8, 
    backgroundColor: colors.card,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary
  },
  sectionTitle: { 
    fontSize: typography.fontSize.md, 
    fontWeight: 'bold', 
    color: colors.textPrimary,
    marginVertical: spacing.sm
  },
  timeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56
  },
  dayCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1
  },
  dayText: { 
    fontSize: typography.fontSize.sm, 
    fontWeight: '600',
    color: colors.textPrimary,
    width: 80
  },
  inputsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  timeInput: { 
    borderWidth: 1.5, 
    borderColor: colors.border,
    padding: 6, 
    width: 80, 
    textAlign: 'center', 
    borderRadius: 6, 
    backgroundColor: colors.card,
    color: colors.textPrimary,
    fontSize: typography.fontSize.xs
  },
  toText: { 
    fontSize: typography.fontSize.xs, 
    fontWeight: '500',
    color: colors.textSecondary
  },
  closedCol: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9'
  },
  closedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B'
  },
  registerButton: { 
    backgroundColor: colors.primary, 
    paddingVertical: spacing.md, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: spacing.md 
  },
  registerText: { 
    fontSize: typography.fontSize.md, 
    fontWeight: 'bold', 
    color: colors.white 
  },
  disabledButton: { 
    backgroundColor: '#FFA07A' 
  },
});
