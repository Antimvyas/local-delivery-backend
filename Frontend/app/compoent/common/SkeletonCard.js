import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const SkeletonCard = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.8,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.card, style]}>
      {/* Shop Image Skeleton */}
      <Animated.View style={[styles.imageSkeleton, { opacity: pulseAnim }]} />
      
      <View style={styles.content}>
        {/* Title Skeleton */}
        <Animated.View style={[styles.titleSkeleton, { opacity: pulseAnim }]} />
        
        {/* Badges/Info Row Skeleton */}
        <View style={styles.row}>
          <Animated.View style={[styles.badgeSkeleton, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.badgeSkeleton, { opacity: pulseAnim }]} />
        </View>

        {/* Text line skeleton */}
        <Animated.View style={[styles.textLineSkeleton, { opacity: pulseAnim }]} />

        {/* Button Skeleton */}
        <Animated.View style={[styles.buttonSkeleton, { opacity: pulseAnim }]} />
      </View>
    </View>
  );
};

export default SkeletonCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageSkeleton: {
    height: 140,
    backgroundColor: colors.border,
  },
  content: {
    padding: spacing.md,
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '60%',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeSkeleton: {
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: 60,
  },
  textLineSkeleton: {
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '85%',
    marginBottom: spacing.md,
  },
  buttonSkeleton: {
    height: 40,
    backgroundColor: colors.border,
    borderRadius: 8,
    width: '100%',
  },
});
