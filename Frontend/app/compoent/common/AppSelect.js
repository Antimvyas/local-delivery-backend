import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const AppSelect = ({
  label,
  value,
  onValueChange,
  items,
  placeholder = { label: 'Select an option...', value: null },
  error,
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.pickerWrapper,
        error && styles.pickerErrorBorder
      ]}>
        <RNPickerSelect
          value={value}
          onValueChange={onValueChange}
          items={items}
          placeholder={placeholder}
          style={{
            inputIOS: styles.inputIOS,
            inputAndroid: styles.inputAndroid,
            iconContainer: styles.iconContainer,
          }}
          useNativeAndroidPickerStyle={false}
          Icon={() => (
            <Icon
              name="chevron-down"
              size={24}
              color={colors.textSecondary}
            />
          )}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default AppSelect;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
    height: 48,
    justifyContent: 'center',
  },
  pickerErrorBorder: {
    borderColor: colors.error,
  },
  inputIOS: {
    fontSize: typography.fontSize.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: typography.fontSize.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  iconContainer: {
    top: Platform.OS === 'ios' ? 12 : 10,
    right: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
});
