import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const statusConfig = {
  open: {
    text: 'Open',
    color: colors.success,
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: 'store-outline',
  },
  closed: {
    text: 'Closed',
    color: colors.error,
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: 'store-off-outline',
  },
  pending: {
    text: 'Pending',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: 'clock-outline',
  },
  accepted: {
    text: 'Accepted',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: 'check-circle-outline',
  },
  preparing: {
    text: 'Preparing',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: 'fire',
  },
  ready: {
    text: 'Out for Delivery',
    color: colors.accent,
    bgColor: 'rgba(20, 184, 166, 0.1)',
    icon: 'moped',
  },
  'out for delivery': {
    text: 'Out for Delivery',
    color: colors.secondary,
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: 'moped',
  },
  delivered: {
    text: 'Delivered',
    color: colors.success,
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: 'checkbox-marked-circle-outline',
  },
  cancelled: {
    text: 'Cancelled',
    color: colors.error,
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: 'close-circle-outline',
  },
};

export const StatusChip = ({ status, style, textStyle }) => {
  const normStatus = (status || '').toLowerCase();
  const config = statusConfig[normStatus] || {
    text: status || 'Unknown',
    color: colors.textSecondary,
    bgColor: 'rgba(100, 116, 139, 0.1)',
    icon: 'help-circle-outline',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, style]}>
      {config.icon && (
        <Icon
          name={config.icon}
          size={14}
          color={config.color}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { color: config.color }, textStyle]}>
        {config.text}
      </Text>
    </View>
  );
};

export default StatusChip;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
});
