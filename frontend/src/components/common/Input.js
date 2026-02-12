import React from 'react';
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
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBackground,
            borderColor: error ? theme.danger : theme.border,
          },
          multiline && styles.multilineContainer,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={theme.textSecondary}
            style={styles.icon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
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
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={20} color={theme.textSecondary} />
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default Input;
