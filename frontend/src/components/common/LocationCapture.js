import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import {
  getCurrentLocation,
  verifySiteProximity,
  formatDistance,
  reverseGeocode,
} from '../../utils/locationCapture';

const LocationCapture = ({
  onLocationCaptured,
  siteLocation = null, // { latitude, longitude, name }
  required = false,
  label = 'Location Verification',
}) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);

  const handleCaptureLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const loc = await getCurrentLocation();
      
      if (loc) {
        setLocation(loc);
        
        // Get address
        const addr = await reverseGeocode(loc.latitude, loc.longitude);
        setAddress(addr);
        
        // Verify site proximity if site location provided
        if (siteLocation) {
          const result = verifySiteProximity(loc, siteLocation);
          setVerification(result);
        }
        
        // Callback with location data
        if (onLocationCaptured) {
          onLocationCaptured({
            ...loc,
            address: addr,
            verification: siteLocation ? verifySiteProximity(loc, siteLocation) : null,
          });
        }
      } else {
        setError('Failed to get location. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!verification) return theme.textSecondary;
    return verification.isVerified ? '#16a34a' : '#ef4444';
  };

  const getStatusIcon = () => {
    if (!verification) return 'location-outline';
    return verification.isVerified ? 'checkmark-circle' : 'warning';
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Capture Button */}
      {!location ? (
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
          onPress={handleCaptureLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <Ionicons name="location" size={24} color={theme.primary} />
              </View>
              <View style={styles.captureTextContainer}>
                <Text style={[styles.captureTitle, { color: theme.text }]}>
                  Capture Current Location
                </Text>
                <Text style={[styles.captureSubtitle, { color: theme.textSecondary }]}>
                  Tap to verify your location at the site
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.locationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Location Header */}
          <View style={styles.locationHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor()}20` }]}>
              <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
            </View>
            <View style={styles.locationInfo}>
              {verification && (
                <Text style={[styles.verificationStatus, { color: getStatusColor() }]}>
                  {verification.isVerified ? '✓ Location Verified' : '✗ Not at Site'}
                </Text>
              )}
              {address && (
                <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={2}>
                  {address.formattedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Coordinates */}
          <View style={[styles.coordsContainer, { backgroundColor: theme.inputBackground }]}>
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Latitude</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.latitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: theme.border }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Longitude</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.longitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: theme.border }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>Accuracy</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                ±{Math.round(location.accuracy)}m
              </Text>
            </View>
          </View>

          {/* Distance to Site */}
          {verification && (
            <View style={[styles.distanceRow, { borderTopColor: theme.border }]}>
              <Ionicons 
                name={verification.isVerified ? 'checkmark-circle' : 'alert-circle'} 
                size={16} 
                color={getStatusColor()} 
              />
              <Text style={[styles.distanceText, { color: theme.textSecondary }]}>
                {verification.message}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: theme.primary }]}
            onPress={handleCaptureLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={theme.primary} />
                <Text style={[styles.refreshText, { color: theme.primary }]}>Refresh Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
    fontWeight: '600',
    marginBottom: 12,
  },
  required: {
    color: '#ef4444',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureTextContainer: {
    flex: 1,
  },
  captureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  captureSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  locationCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  locationHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  verificationStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  coordsContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  coordDivider: {
    width: 1,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  distanceText: {
    flex: 1,
    fontSize: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
  },
});

export default LocationCapture;
