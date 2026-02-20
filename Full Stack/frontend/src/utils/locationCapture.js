/**
 * Location Capture Utility with GPS Verification
 * 
 * Features:
 * - Get current location
 * - Distance calculation
 * - Site proximity verification
 * - Address geocoding (reverse)
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

// Location accuracy settings
const LOCATION_OPTIONS = {
  accuracy: Location.Accuracy.High,
  timeInterval: 5000,
  distanceInterval: 10,
};

// Max distance for site verification (in meters)
const MAX_DISTANCE_FROM_SITE = 500; // 500 meters

/**
 * Request location permissions
 * 
 * @returns {boolean} - Whether permission was granted
 */
export const requestLocationPermission = async () => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Location access is needed to verify your position at the site.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openSettings() 
          },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Location permission error:', error);
    return false;
  }
};

/**
 * Get current location
 * 
 * @param {Object} options - Location options
 * @returns {Object|null} - Location object or null
 */
export const getCurrentLocation = async (options = {}) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;
  
  try {
    const location = await Location.getCurrentPositionAsync({
      ...LOCATION_OPTIONS,
      ...options,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Get location error:', error);
    
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          },
        ]
      );
    } else {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
    
    return null;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Format distance to human readable
 * 
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Verify user is at site location
 * 
 * @param {Object} userLocation - User's current location
 * @param {Object} siteLocation - Site's location
 * @param {number} maxDistance - Maximum allowed distance in meters
 * @returns {Object} - Verification result
 */
export const verifySiteProximity = (userLocation, siteLocation, maxDistance = MAX_DISTANCE_FROM_SITE) => {
  if (!userLocation || !siteLocation) {
    return {
      isVerified: false,
      distance: null,
      message: 'Location data not available',
    };
  }
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    siteLocation.latitude,
    siteLocation.longitude
  );
  
  const isVerified = distance <= maxDistance;
  
  return {
    isVerified,
    distance,
    distanceFormatted: formatDistance(distance),
    message: isVerified 
      ? `You are ${formatDistance(distance)} from the site.`
      : `You are ${formatDistance(distance)} away. Please move closer to the site (within ${formatDistance(maxDistance)}).`,
  };
};

/**
 * Get address from coordinates (reverse geocoding)
 * 
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Object|null} - Address object or null
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    
    if (addresses.length > 0) {
      const addr = addresses[0];
      return {
        street: addr.street,
        city: addr.city,
        region: addr.region,
        country: addr.country,
        postalCode: addr.postalCode,
        formattedAddress: [
          addr.street,
          addr.city,
          addr.region,
          addr.postalCode,
        ].filter(Boolean).join(', '),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
};

/**
 * Watch location updates
 * 
 * @param {Function} callback - Callback for location updates
 * @returns {Function} - Cleanup function
 */
export const watchLocation = async (callback) => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return () => {};
  
  try {
    const subscription = await Location.watchPositionAsync(
      LOCATION_OPTIONS,
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp,
        });
      }
    );
    
    return () => subscription.remove();
  } catch (error) {
    console.error('Watch location error:', error);
    return () => {};
  }
};

/**
 * Get location with timeout
 * 
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Object|null} - Location or null if timed out
 */
export const getLocationWithTimeout = async (timeout = 15000) => {
  return Promise.race([
    getCurrentLocation(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Location request timed out')), timeout)
    ),
  ]).catch((error) => {
    console.error('Location timeout:', error);
    Alert.alert('Timeout', 'Getting location is taking too long. Please try again.');
    return null;
  });
};

export default {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  formatDistance,
  verifySiteProximity,
  reverseGeocode,
  watchLocation,
  getLocationWithTimeout,
  MAX_DISTANCE_FROM_SITE,
};
