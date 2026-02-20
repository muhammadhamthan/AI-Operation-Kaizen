import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  capturePhoto,
  selectPhoto,
  showImagePickerOptions,
  getFileInfo,
  formatFileSize,
} from '../../utils/photoUpload';

const PhotoUploader = ({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  label = 'Add Photos',
  required = false,
  showInfo = true,
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleAddPhoto = () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only add up to ${maxPhotos} photos.`);
      return;
    }

    showImagePickerOptions(
      async () => {
        setLoading(true);
        const result = await capturePhoto();
        if (result) {
          const fileInfo = await getFileInfo(result.uri);
          onPhotosChange([
            ...photos,
            {
              uri: result.uri,
              width: result.width,
              height: result.height,
              size: fileInfo?.size || 0,
              type: 'camera',
            },
          ]);
        }
        setLoading(false);
      },
      async () => {
        setLoading(true);
        const result = await selectPhoto();
        if (result) {
          const fileInfo = await getFileInfo(result.uri);
          onPhotosChange([
            ...photos,
            {
              uri: result.uri,
              width: result.width,
              height: result.height,
              size: fileInfo?.size || 0,
              type: 'gallery',
            },
          ]);
        }
        setLoading(false);
      }
    );
  };

  const handleRemovePhoto = (index) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const totalSize = photos.reduce((sum, photo) => sum + (photo.size || 0), 0);

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.text }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {photos.length}/{maxPhotos}
        </Text>
      </View>

      {/* Photos Grid */}
      <View style={styles.photosGrid}>
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: theme.error || '#ef4444' }]}
              onPress={() => handleRemovePhoto(index)}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
            {photo.type === 'camera' && (
              <View style={[styles.photoTypeBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={10} color="#fff" />
              </View>
            )}
          </View>
        ))}

        {/* Add Button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            onPress={handleAddPhoto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="add" size={28} color={theme.primary} />
                <Text style={[styles.addText, { color: theme.textSecondary }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      {showInfo && photos.length > 0 && (
        <View style={[styles.infoRow, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Total size: {formatFileSize(totalSize)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: '#ef4444',
  },
  count: {
    fontSize: 13,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {
    fontSize: 11,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
  },
});

export default PhotoUploader;
