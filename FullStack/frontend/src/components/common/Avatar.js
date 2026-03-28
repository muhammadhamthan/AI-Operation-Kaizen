import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const Avatar = ({ uri, name, size = 'medium', showName = false }) => {
  const { theme, isDark } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small': return 32;
      case 'large': return 64;
      case 'xlarge': return 120;
      default: return 44; // medium
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
  // Ensures we only get max 2 letters, perfectly capitalized
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : '?';

  // Premium flat color palette for placeholders
  const placeholderBg = isDark ? '#343541' : '#e5e5e5'; 
  const placeholderText = isDark ? '#ececec' : '#4b5563';
  const imageBg = isDark ? '#2f2f2f' : '#f4f4f4';

  return (
    <View style={[styles.container, showName && styles.containerWithName]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { 
              width: avatarSize, 
              height: avatarSize, 
              borderRadius: avatarSize / 2,
              backgroundColor: imageBg, // Shows cleanly while loading
            },
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
              backgroundColor: placeholderBg,
            },
          ]}
        >
          <Text 
            style={[
              styles.initials, 
              { 
                fontSize: getFontSize(), 
                color: placeholderText 
              }
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      
      {showName && name && (
        <Text 
          style={[styles.name, { color: theme.text }]} 
          numberOfLines={1}
        >
          {name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerWithName: {
    gap: 8, // Modern flex gap
  },
  image: {
    // Subtle border to define the image boundary, especially helpful for dark images in dark mode
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.1)', // Matches image border logic
  },
  initials: {
    fontWeight: '600',
    letterSpacing: 0.5, // Slight tracking makes initials look much more intentional
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 100,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

export default Avatar;