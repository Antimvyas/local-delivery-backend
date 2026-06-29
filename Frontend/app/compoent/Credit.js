import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { showError } from "../utils/toastHelper";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Credit = ({ customer_id, vendor_id }) => {
  const navigation = useNavigation();
  const [customerId, setCustomerId] = useState(customer_id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer_id) {
      showError("Customer ID is missing");
    } else {
      setCustomerId(customer_id);
      setLoading(false);
    }
  }, [customer_id]);

  if (loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => navigation.navigate("RequestUdarScreen", { customer_id: customerId })}
        activeOpacity={0.8}
      >
        <Icon name="hand-coin" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

export default Credit;

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
