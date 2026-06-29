import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import PrimaryButton from './common/PrimaryButton';
import SecondaryButton from './common/SecondaryButton';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Text from "../GlobalText.js";

const { width } = Dimensions.get('window');

const Welcome = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.iconCircle}>
            <Icon name="moped" size={80} color={colors.primary} />
          </View>
        </View>

        {/* Text Section */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Local Delivery</Text>
          <Text style={styles.subtitle}>
            Order delicious food and goods from your favorite local shops directly to your doorstep.
          </Text>
        </View>
      </View>

      {/* Button Section */}
      <View style={styles.buttonSection}>
        <PrimaryButton
          title="Customer Portal"
          onPress={() => navigation.navigate("Login", { defaultRole: 'customer' })}
          style={styles.button}
        />
        <SecondaryButton
          title="Vendor Portal"
          onPress={() => navigation.navigate("Login", { defaultRole: 'vendor' })}
          style={[styles.button, styles.signUpButton]}
          textStyle={{ color: colors.primary }}
        />
      </View>
    </View>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xxl + 4,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm + 1,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
  },
  signUpButton: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.white,
  },
});
