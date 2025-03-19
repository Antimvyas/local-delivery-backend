import React from "react";
import { Text as RNText } from "react-native";
import { useTranslation } from "react-i18next";

const GlobalText = ({ children, ...props }) => {
  const { t } = useTranslation();

  // Check if children is a string, translate it; otherwise, return as-is
  const translatedText =
    typeof children === "string" ? t(children.trim()) || children : children;

  return <RNText {...props}>{translatedText}</RNText>;
};

export default GlobalText;
