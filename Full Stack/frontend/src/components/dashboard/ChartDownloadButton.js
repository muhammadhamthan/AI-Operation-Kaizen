import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme/ThemeContext';

// ─── SVG Chart Builders ──────────────────────────────────────────────────────

function buildLineChart(data) {
  if (!data?.length) return '<p style="color:#888">No data</p>';
  const W = 480, H = 180, PL = 36, PR = 16, PT = 20, PB = 36;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  // ✅ handles both { issues } shape and { created, completed } shape
  const getVal = (d) => (d.created ?? d.completed ?? d.issues ?? 0);
  const getCompleted = (d) => (d.completed ?? 0);
  const maxVal = Math.max(...data.map(d => Math.max(getVal(d), getCompleted(d))), 1);

  const xStep = innerW / ((data.length - 1) || 1);
  const toX = i => PL + i * xStep;
  const toY = v => PT + innerH - (v / maxVal) * innerH;

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = PT + innerH * (1 - f);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
            <text x="${PL - 5}" y="${y + 4}" text-anchor="end" font-size="9" fill="#d1d5db">${Math.round(maxVal * f)}</text>`;
  }).join('');

  // If only one series of data (just `issues`), draw single line
  const hasTwoSeries = data[0]?.created !== undefined;
  const pathC = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(getVal(d)).toFixed(1)}`).join(' ');
  const pathD = hasTwoSeries
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(getCompleted(d)).toFixed(1)}`).join(' ')
    : null;

  const dots = data.map((d, i) => `
    <circle cx="${toX(i).toFixed(1)}" cy="${toY(getVal(d)).toFixed(1)}" r="3.5" fill="#ef4444"/>
    ${hasTwoSeries ? `<circle cx="${toX(i).toFixed(1)}" cy="${toY(getCompleted(d)).toFixed(1)}" r="3.5" fill="#10a37f"/>` : ''}
  `).join('');

  const labels = data.map((d, i) =>
    `<text x="${toX(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#9ca3af">${d.day}</text>`
  ).join('');

  const legend = hasTwoSeries
    ? `<span><span style="color:#ef4444;font-weight:700">●</span> Created</span>
       <span><span style="color:#10a37f;font-weight:700">●</span> Completed</span>`
    : `<span><span style="color:#ef4444;font-weight:700">●</span> Issues</span>`;

  return `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      ${grid}${labels}
      <path d="${pathC}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${pathD ? `<path d="${pathD}" fill="none" stroke="#10a37f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      ${dots}
    </svg>
    <div style="display:flex;gap:20px;margin-top:10px;font-size:12px;color:#555">${legend}</div>`;
}
function buildBarChart(data) {
  if (!data?.length) return '<p style="color:#888">No data</p>';
  const W = 480, H = 200, PL = 36, PR = 16, PT = 20, PB = 40;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  // ✅ Exactly mirrors the screen: single value = open + completed (total)
  const getName  = (d) => (d.siteName ?? d.site ?? '').substring(0, 5);
  const getTotal = (d) => (d.open ?? d.pending ?? 0) + (d.completed ?? 0);

  const maxVal = Math.max(...data.map(d => getTotal(d)), 1);
  const groupW = innerW / data.length;
  const barW   = groupW * 0.5;
  const toY    = v => PT + innerH - (v / maxVal) * innerH;
  const toH    = v => Math.max((v / maxVal) * innerH, 2);

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = PT + innerH * (1 - f);
    return `
      <line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${PL - 5}" y="${y + 4}" text-anchor="end" font-size="9" fill="#d1d5db">${Math.round(maxVal * f)}</text>`;
  }).join('');

  const bars = data.map((d, i) => {
    const total = getTotal(d);
    const cx    = PL + i * groupW + groupW / 2;
    const bx    = cx - barW / 2;
    const bh    = toH(total);
    const by    = toY(total);
    return `
      <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}"
            width="${barW.toFixed(1)}" height="${bh.toFixed(1)}"
            fill="#3b82f6" rx="3"/>
      <text x="${cx.toFixed(1)}" y="${(by - 5).toFixed(1)}"
            text-anchor="middle" font-size="10" fill="#374151" font-weight="600">${total}</text>
      <text x="${cx.toFixed(1)}" y="${H - 10}"
            text-anchor="middle" font-size="10" fill="#9ca3af">${getName(d)}</text>`;
  }).join('');

  return `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${grid}${bars}
    </svg>
    <div style="display:flex;gap:20px;margin-top:10px;font-size:12px;color:#555">
      <span><span style="color:#3b82f6;font-weight:700">●</span> Total Issues per Site</span>
    </div>`;
}


function buildPieChart(data) {
  if (!data?.length) return '<p style="color:#888">No data</p>';
  const COLORS = ['#10a37f', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#6b7280'];
  const total = data.reduce((s, d) => s + (d.count || 0), 0) || 1;
  const cx = 110, cy = 110, r = 88;
  let angle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const sweep = (d.count / total) * Math.PI * 2;
    const x1 = (cx + r * Math.cos(angle)).toFixed(2);
    const y1 = (cy + r * Math.sin(angle)).toFixed(2);
    angle += sweep;
    const x2 = (cx + r * Math.cos(angle)).toFixed(2);
    const y2 = (cy + r * Math.sin(angle)).toFixed(2);
    const large = sweep > Math.PI ? 1 : 0;
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${COLORS[i % COLORS.length]}"/>`;
  }).join('');

  const legend = data.map((d, i) => {
    const pct = ((d.count / total) * 100).toFixed(0);
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <div style="width:11px;height:11px;border-radius:3px;background:${COLORS[i % COLORS.length]};flex-shrink:0"></div>
      <span style="font-size:12px;color:#374151">${d.name}</span>
      <span style="font-size:12px;color:#9ca3af;margin-left:auto">${d.count} · ${pct}%</span>
    </div>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:32px">
      <svg width="220" height="220" xmlns="http://www.w3.org/2000/svg">${slices}</svg>
      <div style="flex:1">${legend}</div>
    </div>`;
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function buildPDFHtml(chartType, chartData) {
  let body = '';
  if (chartType === 'Volume Over Time') body = buildLineChart(chartData);
  else if (chartType === 'Category Breakdown') body = buildPieChart(chartData);
  else if (chartType === 'Site Performance') body = buildBarChart(chartData);
  else body = '<p style="color:#888">Unknown chart type</p>';

  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 36px; font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; }
    .header { margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px; }
    h2 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #9ca3af; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .footer { margin-top: 32px; font-size: 11px; color: #d1d5db; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${chartType}</h2>
    <span class="meta">MaintenanceFlow · Exported ${date}</span>
  </div>
  <div class="card">${body}</div>
  <div class="footer">Generated by MaintenanceFlow Dashboard</div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChartDownloadButton({ chartType, chartData }) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    try {
      setLoading(true);
      const html = buildPDFHtml(chartType, chartData);
      console.log('Chart data being exported:', JSON.stringify(chartData, null, 2));

      if (Platform.OS === 'web') {
        // Web: open browser print dialog (Save as PDF)
        await Print.printAsync({ html });
      } else {
        // Mobile: write file then share
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export — ${chartType}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('Export failed:', error.message);
      Alert.alert('Export Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.textSecondary} />
      ) : (
        <>
          <Ionicons name="download-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.label, { color: theme.textSecondary }]}>Export PDF</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  label: { fontSize: 13, fontWeight: '500' },
});
