import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

const VendorNavigation = ({ vendor_id }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const [vendorId, setVendorId] = useState(vendor_id);
  const [loading, setLoading] = useState(false);
  const [orderBadge, setOrderBadge] = useState(0);
  const [paymentBadge, setPaymentBadge] = useState(0);

  useEffect(() => {
    if (vendor_id) setVendorId(vendor_id);
  }, [vendor_id]);

  useEffect(() => {
    const { addBadgeListener } = require('../utils/notificationService');
    const unsubscribe = addBadgeListener(({ orderBadgeCount, paymentBadgeCount }) => {
      setOrderBadge(orderBadgeCount);
      setPaymentBadge(paymentBadgeCount);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <ActivityIndicator size="small" color={colors.primary} />;
  }

  // Determine active tab based on route name
  const currentRouteName = route.name;
  const isDashboardActive = currentRouteName === 'VendorDashboard';
  const isOrdersActive = currentRouteName === 'Orders' || currentRouteName === 'PendingOrder';
  const isMenuActive = currentRouteName === 'View_menu' || currentRouteName === 'Add_menu' || currentRouteName === 'EditFood' || currentRouteName === 'DeleteFood';
  const isAccountActive = currentRouteName === 'AccountScreen' || currentRouteName === 'VendorCustomerDetails' || currentRouteName === 'UdarRequestsScreen';

  return (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("VendorDashboard", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <Icon
          name={isDashboardActive ? "view-dashboard" : "view-dashboard-outline"}
          size={26}
          color={isDashboardActive ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isDashboardActive && styles.activeTabLabel]}>Dashboard</Text>
        {isDashboardActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("Orders", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <View style={{ position: 'relative' }}>
          <Icon
            name={isOrdersActive ? "clipboard-list" : "clipboard-list-outline"}
            size={26}
            color={isOrdersActive ? colors.primary : colors.textSecondary}
          />
          {orderBadge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{orderBadge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, isOrdersActive && styles.activeTabLabel]}>Orders</Text>
        {isOrdersActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("View_menu", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <Icon
          name={isMenuActive ? "food-fork-drink" : "food-fork-drink"}
          size={26}
          color={isMenuActive ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabLabel, isMenuActive && styles.activeTabLabel]}>Menu</Text>
        {isMenuActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => navigation.navigate("AccountScreen", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <View style={{ position: 'relative' }}>
          <Icon
            name={isAccountActive ? "account-group" : "account-group-outline"}
            size={26}
            color={isAccountActive ? colors.primary : colors.textSecondary}
          />
          {paymentBadge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{paymentBadge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, isAccountActive && styles.activeTabLabel]}>Account</Text>
        {isAccountActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    </View>
  );
};

export default VendorNavigation;

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    backgroundColor: colors.card,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
    paddingBottom: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: 'relative',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.fontWeight.medium,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
  },
});