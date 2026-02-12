import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  size = 'medium',
  fullWidth = true,
  style,
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return '#9ca3af';
    switch (variant) {
      case 'primary': return theme.primary;
      case 'secondary': return 'transparent';
      case 'danger': return theme.danger;
      case 'success': return theme.success;
      case 'outline': return 'transparent';
      default: return theme.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#ffffff';
    switch (variant) {
      case 'primary': return '#ffffff';
      case 'secondary': return theme.primary;
      case 'danger': return '#ffffff';
      case 'success': return '#ffffff';
      case 'outline': return theme.primary;
      default: return '#ffffff';
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'secondary': return theme.primary;
      case 'outline': return theme.primary;
      default: return 'transparent';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 24 };
      default: return { paddingVertical: 12, paddingHorizontal: 20 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 18;
      default: return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'secondary' || variant === 'outline' ? 1.5 : 0,
          ...getPadding(),
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={getFontSize() + 2} color={getTextColor()} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, { color: getTextColor(), fontSize: getFontSize() }]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={getFontSize() + 2} color={getTextColor()} style={styles.iconRight} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
