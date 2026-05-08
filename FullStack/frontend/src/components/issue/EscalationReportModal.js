import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { submitEscalation } from '../../services/mocks/escalationMockService';

/**
 * Escalation report modal (Kairox §3).
 *
 * Supervisor-initiated. Captures reason, root cause, and proposed action,
 * optionally copies the site's Customer MD. Writes through the escalation
 * mock service; real backend `POST /api/v1/issues/:id/escalate` land later.
 */
const EscalationReportModal = ({
  visible,
  onClose,
  onSubmitted,
  issueId,
  currentUser,
}) => {
  const { theme, isDark } = useTheme();
  const [reason, setReason] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [action, setAction] = useState('');
  const [copyCustomerMD, setCopyCustomerMD] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason('');
    setRootCause('');
    setAction('');
    setCopyCustomerMD(true);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please describe why this is being escalated.');
      return;
    }
    setSubmitting(true);
    const res = await submitEscalation(issueId, {
      reason: reason.trim(),
      root_cause: rootCause.trim(),
      proposed_action: action.trim(),
      copy_customer_md: copyCustomerMD,
      created_by: currentUser?.id || null,
    });
    setSubmitting(false);
    if (!res.success) {
      Alert.alert('Could not escalate', res.error || 'Try again.');
      return;
    }
    onSubmitted?.(res.record);
    reset();
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
          testID="escalation-modal"
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="arrow-up-circle" size={22} color={theme.danger} />
              <Text style={[styles.title, { color: theme.text }]}>
                Escalate to Managing Director
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} testID="escalation-close">
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            This notifies the MD and posts into your Supervisor{'\u2194'}MD chat.
          </Text>

          <ScrollView
            style={styles.body}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label="Reason *"
              value={reason}
              onChange={setReason}
              placeholder="Why are you escalating this issue?"
              theme={theme}
              testID="escalation-reason"
              multiline
            />
            <Field
              label="Root cause (optional)"
              value={rootCause}
              onChange={setRootCause}
              placeholder="What do you think caused it?"
              theme={theme}
              testID="escalation-rootcause"
              multiline
            />
            <Field
              label="Proposed action (optional)"
              value={action}
              onChange={setAction}
              placeholder="What should happen next?"
              theme={theme}
              testID="escalation-action"
              multiline
            />

            <View style={[styles.toggleRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>
                  Copy Customer's MD
                </Text>
                <Text style={[styles.toggleHelp, { color: theme.textSecondary }]}>
                  Site owner's MD is emailed + chat-notified
                </Text>
              </View>
              <Switch
                value={copyCustomerMD}
                onValueChange={setCopyCustomerMD}
                testID="escalation-copy-customer"
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={Platform.OS === 'android' ? theme.primary : undefined}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.7}
              testID="escalation-cancel"
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: theme.danger }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              testID="escalation-submit"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={styles.submitText}>Escalate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const Field = ({ label, value, onChange, placeholder, theme, testID, multiline }) => (
  <View style={styles.field}>
    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
      {label}
    </Text>
    <TextInput
      style={[
        styles.input,
        multiline && styles.inputMulti,
        {
          color: theme.text,
          backgroundColor: theme.inputBackground,
          borderColor: theme.border,
        },
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary + '99'}
      multiline={!!multiline}
      numberOfLines={multiline ? 3 : 1}
      testID={testID}
    />
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingTop: 16,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, paddingHorizontal: 18, paddingBottom: 10 },
  body: { paddingHorizontal: 18, maxHeight: 440 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600' },
  toggleHelp: { fontSize: 11, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default EscalationReportModal;
