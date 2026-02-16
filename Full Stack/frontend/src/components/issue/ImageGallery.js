import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const ImageGallery = ({ images, showLabels = true }) => {
  const { theme } = useTheme();

  const beforeImage = images?.find(img => img.image_type === 'BEFORE');
  const afterImage = images?.find(img => img.image_type === 'AFTER');

  if (!images || images.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="image-outline" size={32} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No images available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {beforeImage && (
          <View style={styles.imageContainer}>
            {showLabels && (
              <View style={[styles.label, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.labelText}>BEFORE</Text>
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
          <View style={styles.imageContainer}>
            {showLabels && (
              <View style={[styles.label, { backgroundColor: '#16a34a' }]}>
                <Text style={styles.labelText}>AFTER</Text>
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
    marginVertical: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: 160,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  label: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});

export default ImageGallery;
