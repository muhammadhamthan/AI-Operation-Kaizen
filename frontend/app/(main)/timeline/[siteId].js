import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import Svg, { Line, Rect, Text as SvgText, Circle } from 'react-native-svg';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import { getTimeline, updateTask } from '../../../src/services/mocks/projectTimelineMockService';
import { sites as mockSites } from '../../../src/mocks/sites';

/**
 * Project Timeline Gantt (§17).
 *   - MD: edit mode (tap bar → edit end date / status)
 *   - Supervisor (assigned site): read-only
 *   - Customer's MD (assigned site): read-only
 *   - Problem Solver: blocked by RoleGuard
 */

const DAY_MS = 86400000;
const STATUS_META = {
  not_started: { label: 'Not Started', color: '#9ca3af' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  completed: { label: 'Completed', color: '#22c55e' },
  delayed: { label: 'Delayed', color: '#ef4444' },
};
const ROW_H = 34;
const HEADER_H = 36;
const LEFT_PAD = 12;
const DAY_W = 10;

const diffDays = (a, b) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);

export default function ProjectTimelineScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { siteId } = useLocalSearchParams();
  const sid = parseInt(siteId, 10);
  const me = useSelector(selectCurrentUser);

  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // task obj

  const canEdit = me?.role === 'manager';

  const site = mockSites.find((s) => s.id === sid);

  const load = useCallback(async () => {
    setLoading(true);
    const tl = await getTimeline(sid);
    setTimeline(tl);
    setLoading(false);
  }, [sid]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (!timeline) return { onTrack: 0, delayed: 0, completed: 0 };
    return timeline.tasks.reduce(
      (acc, t) => {
        if (t.status === 'delayed') acc.delayed += 1;
        else if (t.status === 'completed') acc.completed += 1;
        else acc.onTrack += 1;
        return acc;
      },
      { onTrack: 0, delayed: 0, completed: 0 }
    );
  }, [timeline]);

  const totalDays = timeline
    ? diffDays(timeline.contract_start_date, timeline.contract_end_date) + 7
    : 0;
  const chartW = LEFT_PAD + totalDays * DAY_W + 20;
  const chartH = timeline ? HEADER_H + timeline.tasks.length * ROW_H + 20 : 0;

  const dateToX = (d) =>
    LEFT_PAD + diffDays(timeline.contract_start_date, d) * DAY_W;

  const handleTaskTap = (t) => {
    if (!canEdit) return;
    setEditing({ ...t, _endStr: t.end_date, _statusStr: t.status });
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    const patch = {};
    if (editing._endStr && editing._endStr !== editing.end_date) patch.end_date = editing._endStr;
    if (editing._statusStr && editing._statusStr !== editing.status) patch.status = editing._statusStr;
    if (Object.keys(patch).length === 0) {
      setEditing(null);
      return;
    }
    const res = await updateTask(sid, editing.id, patch);
    setTimeline(res.timeline);
    setEditing(null);
    if (res.affected.length) {
      Alert.alert(
        'Cascade triggered',
        `${res.affected.length} dependent task(s) shifted forward. Contract end updated if needed.`
      );
    }
  };

  // Month labels along the top
  const monthTicks = useMemo(() => {
    if (!timeline) return [];
    const ticks = [];
    const start = new Date(timeline.contract_start_date);
    const end = new Date(timeline.contract_end_date);
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const x = dateToX(cursor.toISOString().slice(0, 10));
      ticks.push({
        x,
        label: cursor.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return ticks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline]);

  const endMarkerX = timeline ? dateToX(timeline.contract_end_date) : 0;
  const todayX =
    timeline && new Date() >= new Date(timeline.contract_start_date)
      ? dateToX(new Date().toISOString().slice(0, 10))
      : null;

  return (
    <RoleGuard allowedRoles={['manager', 'supervisor', 'customer_md']}>
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="timeline-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Project Timeline</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {site?.name || 'Site'}
            </Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        {loading || !timeline ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {/* Summary strip */}
            <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <SummaryStat theme={theme} label="On track" value={summary.onTrack} color={theme.primary} />
              <SummaryDivider theme={theme} />
              <SummaryStat theme={theme} label="Delayed" value={summary.delayed} color={theme.danger} />
              <SummaryDivider theme={theme} />
              <SummaryStat theme={theme} label="Completed" value={summary.completed} color="#22c55e" />
            </View>

            <View style={styles.contractRow}>
              <ContractMarker theme={theme} icon="flag-outline" label={`Start ${timeline.contract_start_date}`} />
              <ContractMarker
                theme={theme}
                icon="flag"
                color={theme.danger}
                label={`End ${timeline.contract_end_date}`}
              />
            </View>

            {/* Gantt */}
            <View style={[styles.ganttWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Task name column */}
              <View style={styles.nameCol}>
                <View style={{ height: HEADER_H }} />
                {timeline.tasks.map((t) => (
                  <View key={t.id} style={{ height: ROW_H, justifyContent: 'center' }}>
                    <Text style={[styles.taskName, { color: theme.text }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                  </View>
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Svg width={chartW} height={chartH}>
                  {/* Month ticks + grid */}
                  {monthTicks.map((m, i) => (
                    <React.Fragment key={i}>
                      <SvgText
                        x={m.x}
                        y={14}
                        fill={theme.textSecondary}
                        fontSize="9"
                        fontWeight="700"
                      >
                        {m.label}
                      </SvgText>
                      <Line
                        x1={m.x}
                        y1={HEADER_H - 6}
                        x2={m.x}
                        y2={chartH}
                        stroke={theme.border}
                        strokeDasharray="2 3"
                        strokeWidth={1}
                      />
                    </React.Fragment>
                  ))}

                  {/* Contract end vertical line */}
                  <Line
                    x1={endMarkerX}
                    y1={HEADER_H - 6}
                    x2={endMarkerX}
                    y2={chartH}
                    stroke={theme.danger}
                    strokeWidth={2}
                  />

                  {/* Today marker */}
                  {todayX != null && (
                    <Line
                      x1={todayX}
                      y1={HEADER_H - 6}
                      x2={todayX}
                      y2={chartH}
                      stroke="#3b82f6"
                      strokeDasharray="4 3"
                      strokeWidth={1}
                    />
                  )}

                  {/* Dependency lines */}
                  {timeline.tasks.map((t, rowIdx) => {
                    if (!t.depends_on_task_id) return null;
                    const parentIdx = timeline.tasks.findIndex((p) => p.id === t.depends_on_task_id);
                    if (parentIdx === -1) return null;
                    const parent = timeline.tasks[parentIdx];
                    const x1 = dateToX(parent.end_date);
                    const y1 = HEADER_H + parentIdx * ROW_H + ROW_H / 2;
                    const x2 = dateToX(t.start_date);
                    const y2 = HEADER_H + rowIdx * ROW_H + ROW_H / 2;
                    return (
                      <Line
                        key={`dep-${t.id}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={theme.textSecondary}
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                    );
                  })}

                  {/* Task bars */}
                  {timeline.tasks.map((t, idx) => {
                    const x = dateToX(t.start_date);
                    const w = Math.max(8, dateToX(t.end_date) - x);
                    const y = HEADER_H + idx * ROW_H + 6;
                    const meta = STATUS_META[t.status] || STATUS_META.not_started;
                    return (
                      <React.Fragment key={t.id}>
                        <Rect
                          x={x}
                          y={y}
                          width={w}
                          height={ROW_H - 14}
                          rx={5}
                          ry={5}
                          fill={meta.color}
                          opacity={0.95}
                          onPress={() => handleTaskTap(t)}
                        />
                        {w > 60 && (
                          <SvgText
                            x={x + 6}
                            y={y + 14}
                            fill="#fff"
                            fontSize="9"
                            fontWeight="700"
                          >
                            {meta.label}
                          </SvgText>
                        )}
                        {t.status === 'delayed' && (
                          <Circle cx={x + w - 4} cy={y + 4} r={3} fill="#fff" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </Svg>
              </ScrollView>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: v.color }]} />
                  <Text style={[styles.legendText, { color: theme.textSecondary }]}>{v.label}</Text>
                </View>
              ))}
            </View>

            {canEdit && (
              <Text style={[styles.editHint, { color: theme.textSecondary }]}>
                Tap any bar to edit. End-date shifts cascade to dependent tasks automatically.
              </Text>
            )}

            {/* Task list (read-only for non-MD) */}
            <View style={{ marginTop: 8 }}>
              {timeline.tasks.map((t) => (
                <TouchableOpacity
                  key={`row-${t.id}`}
                  onPress={() => handleTaskTap(t)}
                  activeOpacity={canEdit ? 0.7 : 1}
                  disabled={!canEdit}
                  style={[styles.taskRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                  testID={`task-row-${t.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskRowTitle, { color: theme.text }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={[styles.taskRowSub, { color: theme.textSecondary }]}>
                      {t.start_date} → {t.end_date}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: (STATUS_META[t.status]?.color || '#999') + '22' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: STATUS_META[t.status]?.color || '#999' }]}>
                      {STATUS_META[t.status]?.label || t.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Edit modal */}
        <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
          <View style={styles.backdrop}>
            <View style={[styles.sheet, { backgroundColor: isDark ? '#0b0f14' : '#fff', borderColor: theme.border }]}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit Task</Text>
                <TouchableOpacity onPress={() => setEditing(null)} testID="edit-close" hitSlop={10}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              {editing && (
                <>
                  <Text style={[styles.editName, { color: theme.text }]}>{editing.name}</Text>

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>End date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={editing._endStr}
                    onChangeText={(v) => setEditing({ ...editing, _endStr: v })}
                    style={[
                      styles.input,
                      { color: theme.text, backgroundColor: theme.inputBackground || theme.card, borderColor: theme.border },
                    ]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary + '99'}
                    testID="edit-end-date"
                  />

                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Status</Text>
                  <View style={styles.statusPicker}>
                    {Object.entries(STATUS_META).map(([k, v]) => {
                      const on = editing._statusStr === k;
                      return (
                        <TouchableOpacity
                          key={k}
                          onPress={() => setEditing({ ...editing, _statusStr: k })}
                          style={[
                            styles.statusChip,
                            { borderColor: on ? v.color : theme.border, backgroundColor: on ? v.color + '22' : 'transparent' },
                          ]}
                          testID={`status-${k}`}
                        >
                          <Text style={{ color: on ? v.color : theme.text, fontSize: 11, fontWeight: '700' }}>
                            {v.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.sheetFooter}>
                    <TouchableOpacity
                      onPress={() => setEditing(null)}
                      style={[styles.cancelBtn, { borderColor: theme.border }]}
                      testID="edit-cancel"
                    >
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onSaveEdit}
                      style={[styles.saveEdit, { backgroundColor: theme.primary }]}
                      testID="edit-save"
                    >
                      <Text style={styles.saveEditText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}

const SummaryStat = ({ theme, label, value, color }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ color, fontSize: 18, fontWeight: '800' }}>{value}</Text>
    <Text style={{ color: theme.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>
      {label}
    </Text>
  </View>
);
const SummaryDivider = ({ theme }) => (
  <View style={{ width: StyleSheet.hairlineWidth, height: 28, backgroundColor: theme.border }} />
);
const ContractMarker = ({ theme, icon, label, color }) => (
  <View style={styles.contractMarker}>
    <Ionicons name={icon} size={12} color={color || theme.textSecondary} />
    <Text style={[styles.contractText, { color: color || theme.textSecondary }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSub: { fontSize: 11, marginTop: 2 },
  body: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  contractRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  contractMarker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contractText: { fontSize: 11, fontWeight: '700' },
  ganttWrap: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 8,
    marginBottom: 10,
  },
  nameCol: { width: 130, paddingRight: 6 },
  taskName: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '700' },
  editHint: { fontSize: 11, fontStyle: 'italic', marginTop: 4, marginBottom: 8 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  taskRowTitle: { fontSize: 13, fontWeight: '700' },
  taskRowSub: { fontSize: 11, marginTop: 2, fontFamily: 'Menlo' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 18, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sheetTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  editName: { fontSize: 15, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14,
    fontFamily: 'Menlo',
  },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  saveEdit: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveEditText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
