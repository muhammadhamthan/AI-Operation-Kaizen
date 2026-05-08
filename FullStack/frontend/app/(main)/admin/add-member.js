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
import { addUser } from '../../../src/services/mocks/adminMockService';

const ROLES = [
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'problem_solver', label: 'Problem Solver' },
  { key: 'customer_md', label: "Customer's MD" },
];

export default function AddMemberScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('supervisor');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Name, phone and password are required.');
      return;
    }
    setSaving(true);
    const res = await addUser({ name, phone, email, role, password, company });
    setSaving(false);
    if (!res.success) {
      Alert.alert('Could not save', res.error || 'Try again.');
      return;
    }
    Alert.alert(
      'Member added',
      `Share these credentials with ${res.user.name} via your own channel:\n\nUsername: ${res.user.username}\nPassword: ${password}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <RoleGuard allowedRoles={['manager']} title="MD-only" message="Only the Managing Director can add members.">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="add-member-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Member</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            No email invite is sent. Share the generated username + your chosen password with the user directly.
          </Text>

          {/* Role segmented control */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Role</Text>
          <View style={[styles.segment, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  style={[styles.segChip, active && { backgroundColor: theme.primary }]}
                  testID={`role-${r.key}`}
                >
                  <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Field theme={theme} label="Full name *" value={name} onChange={setName} placeholder="e.g. Rahul Menon" testID="field-name" />
          <Field theme={theme} label="Phone *" value={phone} onChange={setPhone} placeholder="+91 98765 XXXXX" testID="field-phone" keyboardType="phone-pad" />
          <Field theme={theme} label="Email" value={email} onChange={setEmail} placeholder="name@company.com" testID="field-email" keyboardType="email-address" autoCapitalize="none" />
          {role === 'customer_md' && (
            <Field theme={theme} label="Company" value={company} onChange={setCompany} placeholder="e.g. Desai Holdings" testID="field-company" />
          )}
          <Field theme={theme} label="Password *" value={password} onChange={setPassword} placeholder="Set a temporary password" testID="field-password" secureTextEntry />

          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            testID="save-member"
            style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: saving ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Member</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const Field = ({ theme, label, value, onChange, placeholder, testID, secureTextEntry, keyboardType, autoCapitalize }) => (
  <View style={{ marginTop: 16 }}>
    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary + '99'}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
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
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 4, gap: 4, marginBottom: 4 },
  segChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
  },
  saveBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
