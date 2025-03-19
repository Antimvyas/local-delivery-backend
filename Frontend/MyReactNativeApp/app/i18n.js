import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as RNLocalize from "react-native-localize";

// Import translations
import en from "./locals/en.json";
import hi from "./locals/hi.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
};

// Detect device language
const getDeviceLanguage = () => {
  const locales = RNLocalize.getLocales();
  return locales.length > 0 ? locales[0].languageCode : "en"; // Default to English
};

// Initialize i18n
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(), // Set initial language dynamically
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
