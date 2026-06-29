import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Credit_account = ({ vendor_id }) => {
  const navigation = useNavigation();
  const [vendorId, setVendorId] = useState(vendor_id?.vendor_id ?? vendor_id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const vid = vendor_id?.vendor_id ?? vendor_id;
    if (!vid) {
      showError("Vendor ID is missing");
    } else {
      setVendorId(vid);
      setLoading(false);
    }
  }, [vendor_id]);

  if (loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("UdarRequestsScreen", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <Icon name="bell-badge-outline" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

export default Credit_account;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 85,
    right: 16,
    zIndex: 99,
  },
  floatingButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
});