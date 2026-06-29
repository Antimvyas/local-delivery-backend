import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PrimaryButton from './PrimaryButton';

export const EmptyState = ({
  title,
  description,
  iconName = 'alert-circle-outline',
  actionTitle,
  onActionPress,
  containerStyle
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Icon name={iconName} size={64} color={colors.textSecondary} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionTitle && onActionPress && (
        <PrimaryButton
          title={actionTitle}
          onPress={onActionPress}
          style={styles.button}
        />
      )}
    </View>
  );
};

export default EmptyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    minHeight: 300,
  },
  icon: {
    marginBottom: spacing.md,
    opacity: 0.8,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  button: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 150,
  },
});
