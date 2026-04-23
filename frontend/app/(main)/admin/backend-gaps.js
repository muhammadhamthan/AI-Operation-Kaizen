import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../src/theme/ThemeContext';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { backToDashboard } from '../../../src/utils/navigation';

/**
 * Section 19 — consolidated list of endpoints the frontend expects but which
 * the backend has NOT shipped yet. Every mock service in /src/services/mocks/
 * warns `[BACKEND-GAP]` on first use; this screen is the human-readable
 * equivalent that the MD can show a backend engineer.
 */
const GROUPS = [
  {
    id: 'auth',
    title: 'Auth & Roles',
    items: [
      'Backend user-role enum: add customer_md; alias manager → managing_director (keep manager for compat).',
    ],
  },
  {
    id: 'directory',
    title: 'Supervisors & Customer MDs',
    items: [
      'GET  /api/v1/supervisors',
      'GET  /api/v1/supervisors/:id',
      'GET  /api/v1/customer-mds',
      'POST /api/v1/customer-mds/:id/sites',
      'Junction table: customer_md_sites',
      'Extend GET /api/v1/sites/analytics?customer_md_id=',
    ],
  },
  {
    id: 'chats',
    title: 'Personal & Group Chat',
    items: [
      'Tables: personal_chat_{threads,messages}, group_chats, group_chat_{members,messages,summaries}',
      'REST: /api/v1/personal-chats/* and /api/v1/group-chats/*',
      'WebSockets: /ws/personal-chats/:id, /ws/group-chats/:id (fallback: 3s polling)',
      'NLP intents: budget_request, budget_report, site_diary_entry',
      'Monthly summary Celery beat (LLM-backed)',
      'Message pin / unpin (MD-only)',
    ],
  },
  {
    id: 'budget',
    title: 'Budget',
    items: [
      'Tables: budget_requests (state machine), site_budgets, budget_audit_log',
      'POST /api/v1/budget-requests/:id/{accept,reject,escalate,esc-approve,esc-reject}',
      'GET  /api/v1/budgets/sites/:id',
      'GET  /api/v1/budgets/sites/:id/history',
      'GET  /api/v1/budgets/requests',
      'GET  /api/v1/budgets/threshold-alerts',
    ],
  },
  {
    id: 'comms',
    title: 'Communications (voice + WhatsApp)',
    items: [
      'WhatsApp sender service (Twilio WhatsApp API)',
      'Extend POST /api/v1/chat create_issue → fire voice + WhatsApp in parallel (asyncio.gather)',
      'ChatResponse.data: channels: { voice_call, whatsapp, all_ok }',
      'Missed-call handler → WhatsApp to PS + Supervisor',
      'POST /api/v1/escalations/report (Supervisor-initiated escalation email)',
    ],
  },
  {
    id: 'admin',
    title: 'MD Admin',
    items: [
      'POST /api/v1/sites  (create site + seed site_budgets)',
      'POST /api/v1/users  (MD creates user)',
      'GET  /api/v1/users  (MD lists users)',
    ],
  },
  {
    id: 'cust-md',
    title: "Customer's MD Dashboard",
    items: ['GET /api/v1/dashboard/customer-md'],
  },
  {
    id: 'sheets',
    title: 'Google Sheets Live Sync',
    items: [
      'POST /api/v1/integrations/google-sheets/connect',
      'GET  /api/v1/integrations/google-sheets/status',
      'POST /api/v1/integrations/google-sheets/disconnect',
      'Full Sheets v4 webhook + cell-diff + incremental sync worker',
    ],
  },
  {
    id: 'diary',
    title: 'Site Diary',
    items: [
      'Table: site_diary_entries',
      'POST /api/v1/site-diary',
      'GET  /api/v1/site-diary',
      'GET  /api/v1/site-diary/monthly-report',
      'Weather API integration',
      'PDF generator (WeasyPrint / ReportLab)',
    ],
  },
  {
    id: 'photos',
    title: 'Photos',
    items: [
      'ImageType enum: add DURING',
      'AI validation for AFTER photos → ai_flag → NotificationService.send_photo_flag_alert',
    ],
  },
  {
    id: 'timeline',
    title: 'Project Timeline',
    items: [
      'Tables: site_contracts, site_tasks (with depends_on_task_id)',
      'GET / POST / PATCH / DELETE /api/v1/sites/:id/timeline|tasks',
      'Server-side cascade on task update (shift dependents)',
    ],
  },
];

export default function BackendGaps() {
  const { theme, isDark } = useTheme();

  return (
    <RoleGuard allowedRoles={['manager']}>
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={backToDashboard} testID="gaps-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Backend Gaps</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.banner, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb', borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a' }]}>
            <Ionicons name="construct" size={14} color={theme.warning} />
            <Text style={[styles.bannerText, { color: theme.warning }]}>
              Every item below is mocked on the frontend and emits `[BACKEND-GAP]` on first use. Hand this list to the backend team to ship real endpoints.
            </Text>
          </View>

          {GROUPS.map((g) => (
            <View
              key={g.id}
              style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}
              testID={`gap-group-${g.id}`}
            >
              <Text style={[styles.groupTitle, { color: theme.text }]}>{g.title}</Text>
              {g.items.map((line, i) => (
                <View key={i} style={styles.lineRow}>
                  <Ionicons name="ellipse" size={6} color={theme.textSecondary} style={{ marginTop: 7 }} />
                  <Text style={[styles.lineText, { color: theme.text }]} selectable>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            Source: FULL_COMBINED_PROMPT.md · Section 19
          </Text>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}

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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: { fontSize: 11, lineHeight: 15, fontWeight: '700', flex: 1 },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  groupTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  lineRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  lineText: { fontSize: 12, lineHeight: 17, flex: 1, fontFamily: 'Menlo' },
  footer: { fontSize: 10, textAlign: 'center', marginTop: 12 },
});
