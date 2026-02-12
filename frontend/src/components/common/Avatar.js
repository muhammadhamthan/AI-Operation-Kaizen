import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Avatar = ({ uri, name, size = 'medium', showName = false }) => {
  const { theme } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 64;
      case 'xlarge': return 120;
      default: return 44;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'large': return 24;
      case 'xlarge': return 40;
      default: return 16;
    }
  };

  const avatarSize = getSize();
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

  return (
    <View style={[styles.container, showName && styles.containerWithName]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: getFontSize(), color: '#ffffff' }]}>
            {initials}
          </Text>
        </View>
      )}
      {showName && name && (
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerWithName: {
    gap: 8,
  },
  image: {
    backgroundColor: '#e5e7eb',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 100,
  },
});

export default Avatar;
