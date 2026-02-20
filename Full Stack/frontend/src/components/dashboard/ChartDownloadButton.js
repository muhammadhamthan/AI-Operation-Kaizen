import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { exportChartToPDF } from '../../utils/pdfExport';
import { captureRef } from 'react-native-view-shot'; // 🚀 ADD THIS IMPORT

// 🚀 Changed prop here
const ChartDownloadButton = ({ viewShotRef, chartType }) => {
  const { theme, isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

const handlePress = async () => {
    if (!viewShotRef?.current) {
      console.warn("No viewShotRef provided to ChartDownloadButton");
      return;
    }

    setIsExporting(true);
    try {
      // 🚀 USE captureRef INSTEAD of .capture()
      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.9,
      });
      
      await exportChartToPDF(uri, chartType);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  // Premium ChatGPT Palette
  const btnBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f4f4f4';
  const textColor = isDark ? '#ececec' : '#424242';
  const iconColor = isDark ? '#b4b4b4' : '#666666';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: btnBg }]}
      onPress={handlePress}
      disabled={isExporting}
      activeOpacity={0.6}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={iconColor} style={styles.loader} />
      ) : (
        <Ionicons name="download-outline" size={15} color={iconColor} />
      )}
      
      <Text style={[styles.text, { color: textColor }]}>
        {isExporting ? 'Exporting PDF...' : 'Download Chart'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12, 
    alignSelf: 'flex-start', 
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loader: {
    marginRight: 2,
    transform: [{ scale: 0.8 }],
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default ChartDownloadButton;