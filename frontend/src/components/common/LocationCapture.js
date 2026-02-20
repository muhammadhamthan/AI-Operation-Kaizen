import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
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
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState(null);

  // ── Animations ──
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const refreshScale = useRef(new Animated.Value(1)).current;

  const animatePressIn = (anim) => {
    Animated.spring(anim, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animatePressOut = (anim) => {
    Animated.spring(anim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
  };

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

  // ── Premium Color Palette ──
  const successColor = '#10a37f'; // OpenAI Green
  const dangerColor = '#ef4444'; // Clean Red
  
  const getStatusColor = () => {
    if (!verification) return theme.textSecondary;
    return verification.isVerified ? successColor : dangerColor;
  };

  const getStatusIcon = () => {
    if (!verification) return 'location';
    return verification.isVerified ? 'checkmark-circle' : 'warning';
  };

  const cardBg = isDark ? '#212121' : '#ffffff';
  const cardBorder = isDark ? '#424242' : '#e5e5e5';
  const innerCardBg = isDark ? '#2f2f2f' : '#f7f7f8';
  const iconBg = isDark ? '#ffffff' : '#000000';
  const iconColor = isDark ? '#000000' : '#ffffff';

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Capture Button */}
      {!location ? (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.captureButton, 
              { backgroundColor: innerCardBg, borderColor: cardBorder }
            ]}
            onPress={handleCaptureLocation}
            onPressIn={() => animatePressIn(scaleAnim)}
            onPressOut={() => animatePressOut(scaleAnim)}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                  <Ionicons name="navigate" size={20} color={iconColor} />
                </View>
                <View style={styles.captureTextContainer}>
                  <Text style={[styles.captureTitle, { color: theme.text }]}>
                    Capture Current Location
                  </Text>
                  <Text style={[styles.captureSubtitle, { color: theme.textSecondary }]}>
                    Tap to verify your position
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={[styles.locationCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          
          {/* Location Header */}
          <View style={styles.locationHeader}>
            <View style={[styles.statusIcon, { backgroundColor: `${getStatusColor()}15` }]}>
              <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
            </View>
            <View style={styles.locationInfo}>
              {verification ? (
                <Text style={[styles.verificationStatus, { color: getStatusColor() }]}>
                  {verification.isVerified ? 'Location Verified' : 'Not at Site'}
                </Text>
              ) : (
                <Text style={[styles.verificationStatus, { color: theme.text }]}>
                  Location Captured
                </Text>
              )}
              {address && (
                <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                  {address.formattedAddress}
                </Text>
              )}
            </View>
          </View>

          {/* Coordinates Grid (Sleek Inner Card) */}
          <View style={[styles.coordsContainer, { backgroundColor: innerCardBg }]}>
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>LATITUDE</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.latitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>LONGITUDE</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                {location.longitude.toFixed(6)}
              </Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: cardBorder }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: theme.textSecondary }]}>ACCURACY</Text>
              <Text style={[styles.coordValue, { color: theme.text }]}>
                ±{Math.round(location.accuracy)}m
              </Text>
            </View>
          </View>

          {/* Distance to Site Message */}
          {verification && !verification.isVerified && (
            <View style={styles.distanceRow}>
              <Text style={[styles.distanceText, { color: dangerColor }]}>
                {verification.message}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <Animated.View style={{ transform: [{ scale: refreshScale }] }}>
            <TouchableOpacity
              style={[styles.refreshButton, { borderTopColor: cardBorder }]}
              onPress={handleCaptureLocation}
              onPressIn={() => animatePressIn(refreshScale)}
              onPressOut={() => animatePressOut(refreshScale)}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.textSecondary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color={theme.textSecondary} />
                  <Text style={[styles.refreshText, { color: theme.textSecondary }]}>Refresh Location</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={dangerColor} />
          <Text style={[styles.errorText, { color: dangerColor }]}>{error}</Text>
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  required: {
    color: '#ef4444',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16, // Squircle
    borderWidth: 1,
    gap: 14,
    minHeight: 72, // Generous height
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureTextContainer: {
    flex: 1,
  },
  captureTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  captureSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden', // Keeps the inner borders clean
  },
  locationHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  coordsContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12, // Inner nested squircle
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8, // All-caps premium tracking
    marginBottom: 6,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  coordDivider: {
    width: 1,
    opacity: 0.5, // Softens the lines
  },
  distanceRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default LocationCapture;