import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { exportChartToPDF } from '../../utils/pdfExport';

// 🚀 Only import captureRef if we are NOT on the web to be extra safe
let captureRef;
if (Platform.OS !== 'web') {
  captureRef = require('react-native-view-shot').captureRef;
}

const ChartDownloadButton = ({ viewShotRef, chartType }) => {
  const { theme, isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

 const handlePress = async () => {
    setIsExporting(true);
    
    try {
      // 🌐 WEB: Seamlessly open the browser's native Print/Save as PDF menu
      if (Platform.OS === 'web') {
        // A tiny timeout allows React to update the UI (showing the loader) 
        // before the browser freezes the DOM to open the print dialog.
        setTimeout(() => {
          window.print();
          setIsExporting(false); // Reset the button after the print dialog closes
        }, 150);
        return;
      }

      // 📱 NATIVE LOGIC (iOS / Android)
      if (!viewShotRef?.current) {
        console.warn("No viewShotRef provided to ChartDownloadButton");
        return;
      }

      const uri = await captureRef(viewShotRef, {
        format: 'jpg',
        quality: 0.9,
      });
      
      await exportChartToPDF(uri, chartType);
    } catch (error) {
      console.error("Export failed", error);
      if (Platform.OS !== 'web') {
        alert("Failed to export the chart.");
      }
    } finally {
      if (Platform.OS !== 'web') {
        setTimeout(() => setIsExporting(false), 800);
      }
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
        {isExporting && Platform.OS !== 'web' ? 'Exporting PDF...' : 'Download Chart'}
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
      web: {
        cursor: 'pointer',
      }
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