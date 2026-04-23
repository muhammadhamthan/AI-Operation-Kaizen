import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { addSite } from '../../../src/services/mocks/adminMockService';

/**
 * Add Site form (MD-only).
 * GPS auto-fill uses expo-location when available; on web + pod we fall back
 * to a default Chennai lat/lon the user can tweak.
 */
export default function AddSiteScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const autoFillGPS = async () => {
    try {
      // expo-location only works on device — guard import for web export
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLat('13.0827');
        setLon('80.2707');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: 3 });
      setLat(String(pos.coords.latitude.toFixed(6)));
      setLon(String(pos.coords.longitude.toFixed(6)));
    } catch {
      setLat('13.0827');
      setLon('80.2707');
    }
  };

  const onSave = async () => {
    if (!name.trim() || !location.trim()) {
      Alert.alert('Missing fields', 'Site name and location are required.');
      return;
    }
    setSaving(true);
    const res = await addSite({
      name,
      location,
      latitude: lat,
      longitude: lon,
      initial_budget: budget,
    });
    setSaving(false);
    if (!res.success) {
      Alert.alert('Could not save', res.error || 'Try again.');
      return;
    }
    Alert.alert('Site added', `${res.site.name} is now available across the app.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <RoleGuard allowedRoles={['manager']} title="MD-only" message="Only the Managing Director can add sites.">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="add-site-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Site</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field theme={theme} label="Site name *" value={name} onChange={setName} placeholder="e.g. Sriperumbudur Plant A" testID="field-site-name" />
          <Field theme={theme} label="Location *" value={location} onChange={setLocation} placeholder="City, area" testID="field-location" />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 16 }]}>GPS coordinates</Text>
          <View style={styles.gpsRow}>
            <TextInput
              value={lat}
              onChangeText={setLat}
              placeholder="Latitude"
              placeholderTextColor={theme.textSecondary + '99'}
              style={[
                styles.input,
                { flex: 1, color: theme.text, backgroundColor: theme.inputBackground || theme.card, borderColor: theme.border },
              ]}
              keyboardType="decimal-pad"
              testID="field-lat"
            />
            <TextInput
              value={lon}
              onChangeText={setLon}
              placeholder="Longitude"
              placeholderTextColor={theme.textSecondary + '99'}
              style={[
                styles.input,
                { flex: 1, color: theme.text, backgroundColor: theme.inputBackground || theme.card, borderColor: theme.border },
              ]}
              keyboardType="decimal-pad"
              testID="field-lon"
            />
            <TouchableOpacity
              onPress={autoFillGPS}
              style={[styles.gpsBtn, { backgroundColor: theme.primary }]}
              testID="autofill-gps"
              activeOpacity={0.85}
            >
              <Ionicons name="location-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Field
            theme={theme}
            label="Initial budget (₹)"
            value={budget}
            onChange={(v) => setBudget(v.replace(/[^\d]/g, ''))}
            placeholder="e.g. 500000"
            keyboardType="number-pad"
            testID="field-budget"
          />

          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            testID="save-site"
            style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Site</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const Field = ({ theme, label, value, onChange, placeholder, testID, keyboardType }) => (
  <View style={{ marginTop: 16 }}>
    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary + '99'}
      keyboardType={keyboardType}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.inputBackground || theme.card, borderColor: theme.border },
      ]}
      testID={testID}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  body: { padding: 16, paddingBottom: 60 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
  },
  gpsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gpsBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
