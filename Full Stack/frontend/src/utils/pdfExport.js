import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

/**
 * Exports a chart or data to a PDF
 * @param {string} chartUri - The base64 or URI of the captured chart image
 * @param {string} chartType - Title of the chart (e.g., "Weekly Analytics")
 */
export const exportChartToPDF = async (chartUri, chartType) => {
  try {
    // 1. Web Protection Check
    if (Platform.OS === 'web') {
      window.print(); // Triggers browser's native print-to-pdf dialog
      return;
    }

    // 2. Check if a chart image was provided
    if (!chartUri) {
      Alert.alert("Error", "No chart data found to export.");
      return;
    }

    // 3. Create the HTML Template
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid #10a37f; padding-bottom: 20px; margin-bottom: 30px; }
            .title { fontSize: 28px; font-weight: bold; margin: 0; color: #1a1a1a; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .chart-container { text-align: center; margin: 20px 0; }
            .chart-img { width: 100%; border-radius: 12px; border: 1px solid #eee; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 10px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">MaintenanceFlow AI</h1>
            <p class="subtitle">${chartType} Report • Generated ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="chart-container">
            <img src="${chartUri}" class="chart-img" />
          </div>

          <div class="footer">
            <p>© 2026 Kaizen Operations • Internal Maintenance Document • Confidential</p>
          </div>
        </body>
      </html>
    `;

    // 4. Generate the PDF file
    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

    // 5. Check if sharing is available (protects against some Android simulators)
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(uri, { 
        mimeType: 'application/pdf', 
        dialogTitle: `Download ${chartType} Report`,
        UTI: 'com.adobe.pdf' 
      });
    } else {
      Alert.alert("Export Successful", "The PDF was generated but your device doesn't support sharing right now.");
    }

  } catch (error) {
    console.error("PDF Export Error:", error);
    Alert.alert("Export Failed", "Something went wrong while generating the PDF.");
  }
};

/**
 * Placeholder for table-based reports (Phase 2-3 logic)
 */
export const exportReportToPDF = async (reportData) => {
  if (Platform.OS === 'web') {
    window.print();
    return;
  }
  Alert.alert("Coming Soon", "Detailed tabular reports are being optimized for Phase 2.");
};