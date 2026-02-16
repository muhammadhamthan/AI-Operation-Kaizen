import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { exportChartToPDF } from '../../utils/pdfExport';

const ChartDownloadButton = ({ chartData, chartType }) => {
  const { theme } = useTheme();

  const handlePress = () => {
    exportChartToPDF(chartData, chartType);
  };

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: theme.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="download-outline" size={16} color={theme.primary} />
      <Text style={[styles.text, { color: theme.primary }]}>Download PDF</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ChartDownloadButton;
