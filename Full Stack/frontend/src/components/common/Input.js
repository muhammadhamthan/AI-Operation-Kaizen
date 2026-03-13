import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  editable = true,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Exact OpenAI minimalist color palette
  const inputBg = isDark ? '#2f2f2f' : '#f4f4f4';
  const defaultBorder = isDark ? '#2f2f2f' : '#f4f4f4'; // Blends in until focused
  const focusedBorder = isDark ? '#555555' : '#d1d5db'; 
  const placeholderColor = isDark ? '#8e8ea0' : '#8e8ea0';
  const labelColor = isDark ? '#ececec' : '#333333';

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: error ? theme.danger : (isFocused ? focusedBorder : defaultBorder),
          },
          multiline && styles.multilineContainer,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? theme.text : placeholderColor}
            style={styles.icon}
          />
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            { color: theme.text },
            multiline && styles.multilineInput,
          ]}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={placeholderColor}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity 
            onPress={onRightIconPress} 
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={20} color={placeholderColor} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 6, // Reduced outer margin, relies on screen layout for spacing
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4, // Aligns perfectly with the inner text
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16, // Smooth squircle edges
    borderWidth: 1.5, // Slightly thicker border for focus states
    paddingHorizontal: 16,
    minHeight: 56, // Taller, more premium feel
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    minHeight: 24,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 4,
  },
});

export default Input;