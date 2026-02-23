import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const ImageGallery = ({ images, showLabels = true }) => {
  const { theme, isDark } = useTheme();

  // Logic remains entirely untouched
  const beforeImage = images?.find(img => img.image_type === 'BEFORE');
  const afterImage = images?.find(img => img.image_type === 'AFTER');

  if (!images || images.length === 0) {
    return (
      <View style={[
        styles.emptyContainer, 
        { 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fafafa',
          borderColor: isDark ? '#333' : '#e5e5e5'
        }
      ]}>
        <Ionicons name="image-outline" size={24} color={theme.textSecondary} style={{ opacity: 0.6 }} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No media attached
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {beforeImage && (
          <View style={[styles.imageContainer, { borderColor: isDark ? '#333' : '#e5e5e5' }]}>
            {showLabels && (
              <View style={styles.labelPill}>
                <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.labelText}>Before</Text>
              </View>
            )}
            <Image
              source={{ uri: beforeImage.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        
        {afterImage && (
          <View style={[styles.imageContainer, { borderColor: isDark ? '#333' : '#e5e5e5' }]}>
            {showLabels && (
              <View style={styles.labelPill}>
                <View style={[styles.statusDot, { backgroundColor: '#10a37f' }]} />
                <Text style={styles.labelText}>After</Text>
              </View>
            )}
            <Image
              source={{ uri: afterImage.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingRight: 16, // Prevents the last image from cutting off against the screen edge
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a', // Shows briefly while image loads
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  image: {
    width: 220, // Wider, more cinematic aspect ratio
    height: 140,
  },
  labelPill: {
    position: 'absolute',
    bottom: 10, // Moved to bottom-left for a more modern camera-app feel
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Premium translucent dark background
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20, // Full pill shape
    zIndex: 1,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed', // Dashed border indicates a "drop zone" or missing data clearly
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ImageGallery;