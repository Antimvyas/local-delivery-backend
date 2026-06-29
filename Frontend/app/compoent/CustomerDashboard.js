import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  PermissionsAndroid
} from "react-native";
import api from "../utils/api";
import BASE_URL from "../config";
import MyNavigation from "./MyNavigation.js";
import { showError, showSuccess } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import AppInput from "./common/AppInput";
import PrimaryButton from "./common/PrimaryButton";
import EmptyState from "./common/EmptyState";
import SkeletonCard from "./common/SkeletonCard";
import StatusChip from "./common/StatusChip";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';

const CustomerDashboard = ({ navigation, route }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerName, setCustomerName] = useState("Customer");
  const [currentLocation, setCurrentLocation] = useState("Select Delivery Address");
  const customer_id = route.params?.customer_id;
  const [imageIndexes, setImageIndexes] = useState({});

  // Location / Address States
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [activeAddressId, setActiveAddressId] = useState(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  useEffect(() => {
    if (!customer_id) {
      showError("Customer ID not found!");
      navigation.goBack();
      return;
    }
    fetchCustomerName();
    fetchCustomerAddressesAndVendors();
  }, [customer_id]);

  const fetchCustomerName = async () => {
    try {
      const response = await api.get(`/update/${customer_id}`);
      if (response.data && response.data.Name) {
        setCustomerName(response.data.Name);
      }
    } catch (err) {
      console.error("Error fetching customer profile", err);
    }
  };

  const fetchCustomerAddressesAndVendors = async () => {
    try {
      const response = await api.get('/customer/addresses');
      setSavedAddresses(response.data);
      const defaultAddr = response.data.find(addr => addr.is_default === 1);
      if (defaultAddr) {
        setCurrentLocation(defaultAddr.formatted_address);
        setActiveAddressId(defaultAddr.address_id);
        await fetchVendors(defaultAddr.latitude, defaultAddr.longitude);
      } else {
        setCurrentLocation("Select Delivery Address");
        await fetchVendors(null, null);
      }
    } catch (err) {
      console.error("Error loading location details:", err);
      setCurrentLocation("Select Delivery Address");
      await fetchVendors(null, null);
    }
  };

  const fetchVendors = async (latitude = null, longitude = null) => {
    try {
      setLoading(true);
      let url = '/customer/nearby-vendors';
      if (latitude !== null && longitude !== null) {
        url += `?latitude=${latitude}&longitude=${longitude}`;
      }
      const response = await api.get(url);
      setVendors(response.data);

      const initialIndexes = {};
      response.data.forEach(vendor => {
        initialIndexes[vendor.vendor_id] = 0;
      });
      setImageIndexes(initialIndexes);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      showError("Failed to load nearby shops.");
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'This app needs access to your location to find nearby shops.',
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

  const handleUseCurrentLocation = async () => {
    setGeocodingLoading(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showError("Location permission denied. Please allow location access in your system settings.");
        setGeocodingLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const geocodeResponse = await api.post('/location/reverse-geocode', {
              latitude,
              longitude
            });
            const formattedAddress = geocodeResponse.data.formatted_address;

            const saveResponse = await api.post('/customer/addresses', {
              address_type: 'current',
              latitude,
              longitude,
              formatted_address: formattedAddress,
              is_default: true
            });

            if (saveResponse.data && saveResponse.data.success) {
              showSuccess("Current location saved and set as default!");
              await fetchCustomerAddressesAndVendors();
              setShowAddressModal(false);
            } else {
              showError("Failed to save address.");
            }
          } catch (err) {
            console.error("Geocoding/Save address error", err);
            showError("Failed to resolve coordinates to an address.");
          } finally {
            setGeocodingLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error", error);
          setGeocodingLoading(false);
          if (error.code === 1) {
            showError("Location permission denied.");
          } else if (error.code === 2) {
            showError("GPS is disabled or location unavailable. Please check device settings.");
          } else if (error.code === 3) {
            showError("Location request timed out. Please try again.");
          } else {
            showError("Unable to fetch location. Please check GPS settings.");
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 10000,
          forceLocationManager: true
        }
      );
    } catch (err) {
      console.error(err);
      showError("An unexpected error occurred while fetching location.");
      setGeocodingLoading(false);
    }
  };

  const handleSelectAddress = async (address) => {
    try {
      setLoading(true);
      const response = await api.put(`/customer/addresses/${address.address_id}/default`);
      if (response.data && response.data.success) {
        showSuccess(`Address changed to ${address.address_type}`);
        setCurrentLocation(address.formatted_address);
        setActiveAddressId(address.address_id);
        await fetchVendors(address.latitude, address.longitude);
        setShowAddressModal(false);
      } else {
        showError("Failed to change delivery address.");
      }
    } catch (err) {
      console.error("Error setting default address", err);
      showError("Failed to change delivery address.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendors.length === 0) return;
    const interval = setInterval(() => {
      setImageIndexes(prevIndexes => {
        const newIndexes = { ...prevIndexes };
        vendors.forEach(vendor => {
          if (vendor.food_images) {
            const imagesArray = vendor.food_images.split(", ");
            newIndexes[vendor.vendor_id] = (newIndexes[vendor.vendor_id] + 1) % imagesArray.length;
          }
        });
        return newIndexes;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [vendors]);

  const filteredVendors = vendors.filter((vendor) =>
    (vendor.Shop_name && vendor.Shop_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.food_types && vendor.food_types.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.food_names && vendor.food_names.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.food_descriptions && vendor.food_descriptions.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (vendor.shop_address && vendor.shop_address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderListHeader = () => {
    return (
      <View style={{ marginBottom: spacing.md }}>
        {/* Promotional Food Banners */}
        <Text style={styles.sectionTitleHeader}>Special Offers for You</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoScroll}
        >
          <View style={[styles.promoCard, { backgroundColor: '#FF6B35' }]}>
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoDiscount}>50% OFF</Text>
              <Text style={styles.promoTag}>Up to ₹100 on first order</Text>
              <Text style={styles.promoCode}>CODE: WELCOME50</Text>
            </View>
            <Icon name="food-fork-drink" size={64} color="rgba(255,255,255,0.22)" style={styles.promoWatermark} />
          </View>

          <View style={[styles.promoCard, { backgroundColor: '#FF9F1C' }]}>
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoDiscount}>FREE DELIVERY</Text>
              <Text style={styles.promoTag}>On orders above ₹199</Text>
              <Text style={styles.promoCode}>NO CODE REQUIRED</Text>
            </View>
            <Icon name="moped" size={64} color="rgba(255,255,255,0.22)" style={styles.promoWatermark} />
          </View>

          <View style={[styles.promoCard, { backgroundColor: '#22C55E' }]}>
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoDiscount}>HEALTHY BITES</Text>
              <Text style={styles.promoTag}>Flat 20% off on Salads</Text>
              <Text style={styles.promoCode}>CODE: HEALTH20</Text>
            </View>
            <Icon name="leaf" size={64} color="rgba(255,255,255,0.22)" style={styles.promoWatermark} />
          </View>
        </ScrollView>

        {/* Categories Chips */}
        <Text style={styles.sectionTitleHeader}>What's on your mind?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {[
            { id: '1', name: 'Pizza', emoji: '🍕' },
            { id: '2', name: 'Burger', emoji: '🍔' },
            { id: '3', name: 'Biryani', emoji: '🍛' },
            { id: '4', name: 'Desserts', emoji: '🍰' },
            { id: '5', name: 'Rolls', emoji: '🌯' },
            { id: '6', name: 'Coffee', emoji: '☕' },
            { id: '7', name: 'Samosa', emoji: '🥟' },
          ].map((cat) => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryItem, searchQuery.toLowerCase() === cat.name.toLowerCase() && styles.categoryItemActive]}
              onPress={() => setSearchQuery(searchQuery.toLowerCase() === cat.name.toLowerCase() ? '' : cat.name)}
            >
              <View style={styles.categoryIconCircle}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={styles.categoryLabel}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Restaurants / Popular choices */}
        <Text style={styles.sectionTitleHeader}>Featured Restaurants</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {vendors.length === 0 ? (
            <Text style={styles.noFeaturedText}>No online restaurants nearby</Text>
          ) : (
            vendors.slice(0, 3).map((v, idx) => (
              <TouchableOpacity
                key={`featured-${v.vendor_id}`}
                style={styles.featuredCard}
                onPress={() => {
                  if (v.is_online) {
                    navigation.navigate("FoodList", { vendor_id: v.vendor_id, customer_id });
                  }
                }}
                disabled={!v.is_online}
              >
                <View style={[styles.featuredImageBg, { backgroundColor: v.is_online ? colors.primary : colors.textSecondary }]}>
                  <Icon name="silverware-fork-knife" size={24} color={colors.white} />
                  {v.is_online ? (
                    <Text style={styles.featuredTag}>POPULAR</Text>
                  ) : (
                    <Text style={[styles.featuredTag, { backgroundColor: colors.textSecondary }]}>CLOSED</Text>
                  )}
                </View>
                <View style={styles.featuredInfo}>
                  <Text style={styles.featuredName} numberOfLines={1}>{v.Shop_name}</Text>
                  <View style={styles.featuredMeta}>
                    <Icon name="star" size={14} color="#FF9F1C" />
                    <Text style={styles.featuredRating}>4.2</Text>
                    <Text style={styles.featuredDot}>•</Text>
                    <Text style={styles.featuredTime}>{15 + idx * 5} mins</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Section title for main list */}
        <View style={styles.mainListHeaderRow}>
          <Text style={styles.sectionTitleHeaderMain}>Nearby Restaurants</Text>
          <Text style={styles.restaurantsCount}>{filteredVendors.length} places near you</Text>
        </View>
      </View>
    );
  };

  const renderVendorItem = ({ item, index }) => {
    const imagesArray = item.food_images ? item.food_images.split(", ") : [];
    const currentImage = imagesArray[imageIndexes[item.vendor_id]] || "";
    const distanceStr = item.distance !== null ? `${item.distance} km away` : "Distance unknown";
    const deliveryTime = `${15 + index * 5}-${25 + index * 5} mins`;
    const serviceRadius = `Up to ${parseFloat(item.service_radius || 5.0).toFixed(1)} km`;

    const handleNavigateMenu = () => {
      if (item.is_online) {
        navigation.navigate("FoodList", { vendor_id: item.vendor_id, customer_id });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_online && styles.blurredCard]}
        onPress={handleNavigateMenu}
        activeOpacity={item.is_online ? 0.7 : 0.9}
        disabled={!item.is_online}
      >
        <View style={styles.cardRow}>
          {/* Shop Image Container */}
          <View style={styles.imageContainer}>
            {currentImage ? (
              <Image source={{ uri: `${BASE_URL}${currentImage}` }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Icon name="storefront" size={40} color={colors.textSecondary} />
                <Text style={styles.noImageText}>No Image</Text>
              </View>
            )}
            <StatusChip
              status={item.is_online ? "open" : "closed"}
              style={styles.statusChipOverlay}
            />
          </View>

          {/* Shop Details */}
          <View style={styles.info}>
            <Text style={styles.shopName} numberOfLines={1}>
              {item.Shop_name}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              <Icon name="map-marker-outline" size={14} color={colors.textSecondary} /> {item.formatted_address || item.shop_address || "Address not set"}
            </Text>

            {/* Distance & Delivery Time Badge Row */}
            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Icon name="navigation-variant-outline" size={12} color={colors.primary} />
                <Text style={styles.metaText}>{distanceStr}</Text>
              </View>
              <View style={[styles.metaBadge, { backgroundColor: 'rgba(255, 159, 28, 0.08)' }]}>
                <Icon name="clock-outline" size={12} color={colors.secondary} />
                <Text style={[styles.metaText, { color: colors.secondary }]}>{deliveryTime}</Text>
              </View>
            </View>

            {/* Service radius & Out of Service Warning */}
            <View style={{ marginBottom: spacing.xs }}>
              <Text style={styles.radiusText} numberOfLines={1}>
                <Icon name="radius-outline" size={12} color={colors.textSecondary} /> Service Area: {serviceRadius}
              </Text>
              {item.distance !== null && !item.is_within_service_radius && (
                <View style={[styles.metaBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', alignSelf: 'flex-start', marginTop: 4 }]}>
                  <Icon name="alert-circle-outline" size={12} color={colors.error} />
                  <Text style={[styles.metaText, { color: colors.error }]}>Outside Service Area</Text>
                </View>
              )}
            </View>

            <Text style={styles.foodTypes} numberOfLines={1}>
              🍔 {item.food_types || "General Delivery"}
            </Text>

            {searchQuery.trim().length > 0 && (() => {
              const foodNamesArray = item.food_names ? item.food_names.split(", ") : [];
              const matchingFoods = foodNamesArray.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
              if (matchingFoods.length > 0) {
                return (
                  <View style={styles.matchingFoodsContainer}>
                    <Text style={styles.matchingFoodsLabel}>Matches:</Text>
                    <View style={styles.matchingFoodsRow}>
                      {matchingFoods.slice(0, 3).map((food, idx) => (
                        <View key={idx} style={styles.matchingFoodChip}>
                          <Text style={styles.matchingFoodText} numberOfLines={1}>{food}</Text>
                        </View>
                      ))}
                      {matchingFoods.length > 3 && (
                        <Text style={styles.moreMatchesText}>+{matchingFoods.length - 3} more</Text>
                      )}
                    </View>
                  </View>
                );
              }
              return null;
            })()}

            <PrimaryButton
              title={item.is_online ? "Place Order" : "Shop Closed"}
              onPress={handleNavigateMenu}
              disabled={!item.is_online}
              style={[styles.orderButton, { marginTop: searchQuery.trim().length > 0 ? spacing.sm : 0 }]}
              textStyle={styles.orderButtonText}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 2. Dashboard Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.greeting}>Welcome, {customerName}</Text>
            <TouchableOpacity 
              style={styles.locationContainer} 
              onPress={() => {
                fetchCustomerAddressesAndVendors();
                setShowAddressModal(true);
              }}
            >
              <Icon name="map-marker" size={16} color={colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{currentLocation}</Text>
              <Icon name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
          <View style={[styles.avatarContainer, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
            <Icon name="account" size={24} color={colors.primary} />
          </View>
        </View>

        <AppInput
          placeholder="Search Shop or Food..."
          iconName="magnify"
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchContainer}
        />
      </View>

      {loading ? (
        <View style={styles.loadingList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filteredVendors}
          keyExtractor={(item) => item.vendor_id.toString()}
          renderItem={renderVendorItem}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <EmptyState
              title="No Shops Found"
              description="No shops matched your search query. Please try searching for something else."
              iconName="store-search"
              actionTitle="Clear Search"
              onActionPress={() => setSearchQuery("")}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Location</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.closeBtn}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Use Current Location Button */}
            <TouchableOpacity 
              style={styles.currentLocationBtn} 
              onPress={handleUseCurrentLocation}
              disabled={geocodingLoading}
            >
              {geocodingLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="crosshairs-gps" size={20} color={colors.white} />
              )}
              <Text style={styles.currentLocationBtnText}>
                {geocodingLoading ? "Getting Location..." : "Use Current Location"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Saved Addresses</Text>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {savedAddresses.length === 0 ? (
                <Text style={styles.noAddressesText}>No saved addresses found. Add one below!</Text>
              ) : (
                savedAddresses.map((addr) => {
                  let typeIcon = "map-marker";
                  if (addr.address_type === "home") typeIcon = "home";
                  else if (addr.address_type === "work") typeIcon = "briefcase";
                  else if (addr.address_type === "current") typeIcon = "crosshairs-gps";

                  const isActive = addr.address_id === activeAddressId;

                  return (
                    <TouchableOpacity
                      key={addr.address_id}
                      style={[styles.addressItem, isActive && styles.activeAddressItem]}
                      onPress={() => handleSelectAddress(addr)}
                    >
                      <Icon 
                        name={typeIcon} 
                        size={22} 
                        color={isActive ? colors.primary : colors.textSecondary} 
                      />
                      <View style={styles.addressInfo}>
                        <Text style={[styles.addressType, isActive && styles.activeAddressText]}>
                          {addr.address_type.toUpperCase()} {addr.is_default ? "(Default)" : ""}
                        </Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                          {addr.formatted_address}
                        </Text>
                      </View>
                      {isActive && (
                        <Icon name="check-circle" size={20} color={colors.success} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Manage Addresses Trigger */}
            <TouchableOpacity 
              style={styles.manageBtn}
              onPress={() => {
                setShowAddressModal(false);
                navigation.navigate("Account", { customer_id });
              }}
            >
              <Icon name="cog-outline" size={18} color={colors.primary} />
              <Text style={styles.manageBtnText}>Manage Saved Addresses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <MyNavigation customer_id={customer_id} />
    </View>
  );
};

export default CustomerDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginLeft: 2,
    fontWeight: typography.fontWeight.medium,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 58, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginBottom: 0,
  },
  loadingList: {
    padding: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18, // Card Design Standard: Border radius 16-20
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    padding: spacing.md, // Consistent padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, // Soft shadow
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  blurredCard: {
    opacity: 0.65,
  },
  cardRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 110,
    height: 145,
    borderRadius: 12,
    backgroundColor: colors.background,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusChipOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    alignSelf: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  info: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  shopName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  address: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 170, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  radiusText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  foodTypes: {
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  orderButton: {
    minHeight: 34,
    height: 36,
    paddingVertical: 0,
    borderRadius: 8,
  },
  orderButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  matchingFoodsContainer: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    padding: spacing.xs,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 53, 0.15)',
    marginBottom: spacing.xs,
  },
  matchingFoodsLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  matchingFoodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  matchingFoodChip: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
    maxWidth: 120,
  },
  matchingFoodText: {
    fontSize: 9,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  moreMatchesText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  currentLocationBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.lg,
  },
  currentLocationBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noAddressesText: {
    color: colors.textSecondary,
    fontStyle: "italic",
    marginVertical: spacing.sm,
    textAlign: "center",
  },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activeAddressItem: {
    backgroundColor: "rgba(30, 58, 170, 0.05)",
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
  },
  addressInfo: {
    flex: 1,
  },
  addressType: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activeAddressText: {
    color: colors.primary,
  },
  addressText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  manageBtnText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionTitleHeader: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleHeaderMain: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  promoScroll: {
    paddingVertical: 4,
    gap: spacing.md,
  },
  promoCard: {
    width: 280,
    height: 120,
    borderRadius: 16,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  promoTextContainer: {
    justifyContent: 'center',
    zIndex: 1,
  },
  promoDiscount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  promoTag: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: typography.fontWeight.medium,
  },
  promoCode: {
    fontSize: 10,
    color: colors.white,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    fontWeight: typography.fontWeight.bold,
  },
  promoWatermark: {
    position: 'absolute',
    bottom: -10,
    right: -10,
  },
  categoryScroll: {
    paddingVertical: 4,
    gap: spacing.md,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 4,
  },
  categoryItemActive: {
    transform: [{ scale: 1.05 }],
  },
  categoryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  featuredScroll: {
    paddingVertical: 4,
    gap: spacing.md,
  },
  featuredCard: {
    width: 150,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  featuredImageBg: {
    height: 90,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  featuredTag: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: '#FF9F1C',
    color: colors.white,
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredInfo: {
    padding: spacing.sm,
  },
  featuredName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  featuredRating: {
    fontSize: 11,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginLeft: 2,
  },
  featuredDot: {
    fontSize: 11,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  featuredTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  mainListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  restaurantsCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  noFeaturedText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
});
