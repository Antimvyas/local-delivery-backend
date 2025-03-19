import React, { useState } from "react";
import { View, Button, StyleSheet } from "react-native";
import i18n from "../i18n.js"; "../i18n.js";
import Text from"../GlobalText.js"

import { useTranslation } from "react-i18next";

const SettingsScreen = ({ navigation }) => {
  const [language, setLanguage] = useState(i18n.language); // Get current language

  // Function to toggle between English and Hindi
  const toggleLanguage = () => {
    const newLanguage = language === "en" ? "hi" : "en";
    i18n.changeLanguage(newLanguage);
    setLanguage(newLanguage);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>welcome</Text>
      <Text>login</Text>
      <Text>logout</Text>
      <Text>settings</Text>

      {/* Language Toggle Button */}
      <Button
        title={language === "en" ? "Switch to Hindi" : "अंग्रेज़ी में बदलें"}
        onPress={toggleLanguage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  languageButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 20,
  },
});

export default SettingsScreen;
