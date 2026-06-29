import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Menu = ({ vendor_id }) => {
  const navigation = useNavigation();
  const [vendorId, setVendorId] = useState(vendor_id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendor_id) {
      showError("Vendor ID is missing");
    } else {
      setVendorId(vendor_id);
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
        onPress={() => navigation.navigate("Add_menu", { vendor_id: vendorId })}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

export default Menu;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 85,
    left: 16,
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
