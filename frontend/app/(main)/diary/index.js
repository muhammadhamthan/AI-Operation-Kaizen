import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import EmptyState from '../../../src/components/common/EmptyState';
import { users as mockUsers } from '../../../src/mocks/users';
import { sites as mockSites } from '../../../src/mocks/sites';
import {
  getDiaryEntries,
  addDiaryEntry,
} from '../../../src/services/mocks/siteDiaryMockService';

/**
 * Digital site diary (Kairox §15).
 *   - Problem Solver: can add new entries.
 *   - Supervisor / MD: read-only across all sites.
 *   - Customer's MD: read-only, scoped to their assigned sites.
 */
export default function SiteDiaryRoute() {
  const { theme } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const filters = {};
    if (me?.role === 'customer_md') filters.customer_md_sites = me.sites || [];
    if (me?.role === 'problem_solver') filters.author_id = me.id;
    const list = await getDiaryEntries(filters);
    setEntries(list);
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} testID="diary-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Site Diary</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.textSecondary} /></View>
      ) : entries.length === 0 ? (
        <EmptyState icon="book-outline" title="No diary entries" message="Nothing logged yet." />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} testID={`diary-${item.id}`}>
              <View style={styles.cardHeader}>
                <View style={[styles.dateBadge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={[styles.dateText, { color: theme.primary }]}>{item.date}</Text>
                </View>
                <Text style={[styles.site, { color: theme.text }]} numberOfLines={1}>
                  {item.site_name}
                </Text>
              </View>
              <Text style={[styles.author, { color: theme.textSecondary }]}>
                {item.author?.name} · {item.weather || '—'}
              </Text>
              <LabeledLine theme={theme} label="Work done" value={item.work_done} />
              {!!item.issues_noted && (
                <LabeledLine theme={theme} label="Issues noted" value={item.issues_noted} />
              )}
              <LabeledLine theme={theme} label="Safety" value={item.safety_incidents || 'None'} />
            </View>
          )}
        />
      )}

      {me?.role === 'problem_solver' && (
        <TouchableOpacity
          onPress={() => setShowNew(true)}
          style={[styles.fab, { backgroundColor: theme.primary }]}
          testID="diary-add-fab"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.fabText}>Log today</Text>
        </TouchableOpacity>
      )}

      <NewDiaryModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onSaved={async (entry) => {
          setShowNew(false);
          await load();
        }}
        theme={theme}
        me={me}
      />
    </SafeAreaView>
  );
}

const LabeledLine = ({ theme, label, value }) => (
  <View style={{ marginTop: 8 }}>
    <Text style={[{ color: theme.textSecondary }, styles.label]}>{label}</Text>
    <Text style={[{ color: theme.text }, styles.value]}>{value}</Text>
  </View>
);

const NewDiaryModal = ({ visible, onClose, onSaved, theme, me }) => {
  const [siteId, setSiteId] = useState(null);
  const [workDone, setWorkDone] = useState('');
  const [issues, setIssues] = useState('');
  const [weather, setWeather] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSiteId(null); setWorkDone(''); setIssues(''); setWeather(''); setSaving(false);
    }
  }, [visible]);

  const sites = mockSites;

  const handleSave = async () => {
    if (!siteId) { Alert.alert('Pick a site'); return; }
    if (!workDone.trim()) { Alert.alert('Describe work done'); return; }
    setSaving(true);
    const site = sites.find((s) => s.id === siteId);
    const res = await addDiaryEntry(me, {
      site_id: siteId,
      site_name: site?.name,
      work_done: workDone,
      issues_noted: issues,
      weather,
    });
    setSaving(false);
    if (!res.success) { Alert.alert('Save failed', res.error || ''); return; }
    onSaved?.(res.entry);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>New diary entry</Text>
            <TouchableOpacity onPress={onClose} testID="new-diary-close">
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Site *</Text>
            <View style={styles.sitesWrap}>
              {sites.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSiteId(s.id)}
                  style={[
                    styles.siteChip,
                    {
                      backgroundColor: siteId === s.id ? theme.primary : theme.inputBackground,
                      borderColor: siteId === s.id ? theme.primary : theme.border,
                    },
                  ]}
                  testID={`diary-site-${s.id}`}
                >
                  <Text style={{ color: siteId === s.id ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field theme={theme} label="Work done *" value={workDone} onChange={setWorkDone} multiline testID="diary-work" />
            <Field theme={theme} label="Issues noted" value={issues} onChange={setIssues} multiline testID="diary-issues" />
            <Field theme={theme} label="Weather" value={weather} onChange={setWeather} placeholder="e.g. Sunny · 34°C" testID="diary-weather" />
          </ScrollView>
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              testID="diary-cancel"
            >
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={saving}
              testID="diary-save"
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                <Text style={styles.saveText}>Save Entry</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Field = ({ theme, label, value, onChange, placeholder, multiline, testID }) => (
  <View style={{ marginTop: 12 }}>
    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary + '99'}
      style={[
        styles.input,
        multiline && styles.multi,
        { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border },
      ]}
      multiline={!!multiline}
      testID={testID}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { padding: 16, gap: 12, paddingBottom: 120 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  dateText: { fontSize: 11, fontWeight: '700' },
  site: { fontSize: 13, fontWeight: '700', flex: 1 },
  author: { fontSize: 11, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  value: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
  fabText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 16, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 },
  sitesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  siteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 14 },
  multi: { minHeight: 72, textAlignVertical: 'top' },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
