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
import Svg, {
  Line,
  Rect,
  Text as SvgText,
  Circle,
  Path,
  G,
} from 'react-native-svg';

import { useTheme } from '../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../src/store/slices/authSlice';
import RoleGuard from '../../../src/components/navigation/RoleGuard';
import {
  getProjectFlow,
  updateStage,
  sendVendorFollowUp,
  dismissAlert,
  recalibrateProjectFlow,
} from '../../../src/services/mocks/projectFlowMockService';

/**
 * ProjectFlow Intelligence — premium per-site execution coordination screen.
 * Replaces the earlier raw-Gantt screen. MD-edit mode + Supervisor read-only.
 *
 * Sections (5 segmented tabs):
 *   Timeline  — Gantt with material-arrival pins + vendor markers + checkpoints
 *   Flow Map  — node-edge SVG: approvals → vendors → materials → stages
 *   Materials — material readiness list with vendor linkage + recalibration tag
 *   Vendors   — vendor coordination list with follow-up automation
 *   Alerts    — execution intelligence feed + environmental adjustment
 */

const TABS = [
  { key: 'timeline', label: 'Timeline', icon: 'calendar-outline' },
  { key: 'flow', label: 'Flow Map', icon: 'git-network-outline' },
  { key: 'materials', label: 'Materials', icon: 'cube-outline' },
  { key: 'vendors', label: 'Vendors', icon: 'business-outline' },
  { key: 'alerts', label: 'Alerts', icon: 'sparkles-outline' },
];

const STATUS_META = {
  not_started: { label: 'Not Started', color: '#9ca3af' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  completed: { label: 'Completed', color: '#22c55e' },
  delayed: { label: 'Delayed', color: '#ef4444' },
};

/* ───────── Layout constants for inner SVGs ───────── */
const ROW_H = 32;
const HEADER_H = 32;
const LEFT_PAD = 12;
const DAY_W = 9;
const DAY_MS = 86400000;

const diffDays = (a, b) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY_MS);

export default function ProjectFlowScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { siteId } = useLocalSearchParams();
  const sid = parseInt(siteId, 10);
  const me = useSelector(selectCurrentUser);

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('timeline');
  const [editing, setEditing] = useState(null); // task obj
  const [nodeDetail, setNodeDetail] = useState(null);

  const canEdit = me?.role === 'manager';

  const load = useCallback(async () => {
    setLoading(true);
    const b = await getProjectFlow(sid);
    setBundle(b);
    setLoading(false);
  }, [sid]);

  useEffect(() => {
    load();
  }, [load]);

  const onTaskTap = (t) => {
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
    const res = await updateStage(sid, editing.id, patch);
    setEditing(null);
    await load();
    if (res.affected.length) {
      Alert.alert(
        'Execution timeline recalibrated',
        `${res.affected.length} downstream task(s) automatically shifted.`
      );
    }
  };

  const onRecalibrate = async () => {
    await recalibrateProjectFlow(sid);
    await load();
  };

  const onFollowUp = async (vendor) => {
    await sendVendorFollowUp(sid, vendor.id);
    Alert.alert('Follow-up sent', `Automation triggered for ${vendor.name}.`);
    await load();
  };

  const onDismissAlert = async (alertId) => {
    await dismissAlert(sid, alertId);
    await load();
  };

  return (
    <RoleGuard
      allowedRoles={['manager', 'supervisor']}
      title="Restricted module"
      message="ProjectFlow Intelligence is available to MD and Supervisors only."
    >
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: isDark ? '#0b0f14' : '#f4f4f6' }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="pf-back" hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>ProjectFlow Intelligence</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {bundle?.site_name || '…'}
            </Text>
          </View>
          {canEdit ? (
            <TouchableOpacity onPress={onRecalibrate} testID="pf-recalibrate" hitSlop={10}>
              <Ionicons name="refresh-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>

        {loading || !bundle ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.textSecondary} />
          </View>
        ) : (
          <>
            {/* ── Hero strip: description + health + recalibrated + weather ── */}
            <ScrollView contentContainerStyle={styles.body}>
              <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                Continuously synchronizes timelines, materials, vendor readiness, and
                execution dependencies in real time — automatically recalibrating when
                conditions change.
              </Text>

              <HealthHero theme={theme} isDark={isDark} bundle={bundle} />

              {bundle.weather?.recalibrated && (
                <WeatherCard theme={theme} isDark={isDark} weather={bundle.weather} />
              )}

              {/* Segmented tabs */}
              <View style={styles.tabsRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsScroll}
                >
                  {TABS.map((t) => {
                    const active = tab === t.key;
                    const badge = t.key === 'alerts' ? bundle.alerts.length : 0;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setTab(t.key)}
                        style={[
                          styles.tabBtn,
                          {
                            backgroundColor: active ? theme.primary : theme.card,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                        testID={`pf-tab-${t.key}`}
                        activeOpacity={0.85}
                      >
                        <Ionicons name={t.icon} size={13} color={active ? '#fff' : theme.text} />
                        <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: '700' }}>
                          {t.label}
                        </Text>
                        {badge > 0 && (
                          <View style={[styles.tabBadge, { backgroundColor: active ? '#fff' : theme.primary }]}>
                            <Text style={{ color: active ? theme.primary : '#fff', fontSize: 10, fontWeight: '800' }}>
                              {badge}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Body per-tab */}
              {tab === 'timeline' && (
                <TimelineTab
                  theme={theme}
                  isDark={isDark}
                  bundle={bundle}
                  canEdit={canEdit}
                  onTaskTap={onTaskTap}
                />
              )}
              {tab === 'flow' && (
                <FlowMapTab
                  theme={theme}
                  isDark={isDark}
                  bundle={bundle}
                  onNodeTap={setNodeDetail}
                />
              )}
              {tab === 'materials' && <MaterialsTab theme={theme} isDark={isDark} bundle={bundle} />}
              {tab === 'vendors' && (
                <VendorsTab
                  theme={theme}
                  isDark={isDark}
                  bundle={bundle}
                  canEdit={canEdit}
                  onFollowUp={onFollowUp}
                />
              )}
              {tab === 'alerts' && (
                <AlertsTab
                  theme={theme}
                  isDark={isDark}
                  bundle={bundle}
                  onDismiss={onDismissAlert}
                />
              )}
              <View style={{ height: 32 }} />
            </ScrollView>

            {/* Edit task modal */}
            <EditTaskModal
              theme={theme}
              isDark={isDark}
              editing={editing}
              setEditing={setEditing}
              onSave={onSaveEdit}
            />
            {/* Node detail bottom sheet */}
            <NodeDetailModal
              theme={theme}
              isDark={isDark}
              node={nodeDetail}
              close={() => setNodeDetail(null)}
            />
          </>
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}

/* ════════════════════════ Sub-components ════════════════════════ */

const HealthHero = ({ theme, isDark, bundle }) => {
  const tone =
    bundle.health_label === 'On track' ? '#22c55e'
    : bundle.health_label === 'At risk' ? '#f59e0b'
    : '#ef4444';

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: isDark ? '#111827' : '#0f172a', borderColor: isDark ? '#1f2937' : '#0b1220' },
      ]}
      testID="pf-hero"
    >
      <View style={styles.heroTopRow}>
        <Text style={styles.heroLabel}>Execution health</Text>
        <View style={[styles.heroChip, { backgroundColor: tone + '33' }]}>
          <View style={[styles.heroDot, { backgroundColor: tone }]} />
          <Text style={[styles.heroChipText, { color: tone === '#22c55e' ? '#86efac' : tone === '#f59e0b' ? '#fcd34d' : '#fca5a5' }]}>
            {bundle.health_label}
          </Text>
        </View>
      </View>
      <Text style={styles.heroValue}>{bundle.health_score}<Text style={styles.heroValueSm}>/100</Text></Text>
      <View style={styles.heroBar}>
        <View style={[styles.heroBarFill, { width: `${bundle.health_score}%`, backgroundColor: tone }]} />
      </View>
      <Text style={styles.heroFoot}>
        Recalibrated · {timeAgo(bundle.recalibrated_at)}  ·  Contract {bundle.contract_start_date} → {bundle.contract_end_date}
      </Text>
    </View>
  );
};

const WeatherCard = ({ theme, isDark, weather }) => (
  <View
    style={[
      styles.weather,
      {
        backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : '#fffbeb',
        borderColor: isDark ? 'rgba(245,158,11,0.25)' : '#fde68a',
      },
    ]}
    testID="pf-weather"
  >
    <View style={[styles.weatherIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a' }]}>
      <Ionicons name="rainy-outline" size={14} color="#b45309" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.weatherTitle, { color: theme.text }]}>
        Execution adjusted based on environmental conditions
      </Text>
      <Text style={[styles.weatherBody, { color: theme.textSecondary }]} numberOfLines={2}>
        {weather.forecast} — {weather.impact}
      </Text>
    </View>
  </View>
);

/* ────── Timeline tab ────── */

const TimelineTab = ({ theme, isDark, bundle, canEdit, onTaskTap }) => {
  const stages = bundle.timeline.stages;
  const totalDays =
    diffDays(bundle.contract_start_date, bundle.contract_end_date) + 7;
  const chartW = LEFT_PAD + totalDays * DAY_W + 20;
  const chartH = HEADER_H + stages.length * ROW_H + 20;

  const dateToX = (d) =>
    LEFT_PAD + diffDays(bundle.contract_start_date, d) * DAY_W;

  const todayX =
    new Date() >= new Date(bundle.contract_start_date)
      ? dateToX(new Date().toISOString().slice(0, 10))
      : null;

  // Material arrivals & vendor milestones along the chart top
  const materialPins = bundle.materials.slice(0, 8).map((m) => ({
    x: dateToX(m.expected_arrival),
    color:
      m.status === 'arrived' || m.status === 'on_time' ? '#22c55e'
      : m.status === 'in_transit' ? '#3b82f6'
      : '#ef4444',
    label: m.name,
  }));

  return (
    <View>
      <SectionLabel theme={theme} icon="trending-up-outline" text="Execution timeline" />
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        {canEdit ? 'Tap any stage bar to edit. Downstream tasks recalibrate automatically.' : 'Read-only view for your assigned site.'}
      </Text>

      <View style={[styles.svgWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.nameCol}>
          <View style={{ height: HEADER_H }} />
          {stages.map((s) => (
            <View key={s.id} style={{ height: ROW_H, justifyContent: 'center' }}>
              <Text style={[styles.taskName, { color: theme.text }]} numberOfLines={1}>
                {s.name}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartW} height={chartH}>
            {/* Material arrival pins */}
            {materialPins.map((p, i) => (
              <G key={`pin-${i}`}>
                <Line x1={p.x} y1={HEADER_H - 2} x2={p.x} y2={chartH} stroke={p.color} strokeWidth={1} strokeDasharray="2 4" opacity={0.45} />
                <Circle cx={p.x} cy={12} r={4} fill={p.color} />
              </G>
            ))}
            {/* Today marker */}
            {todayX != null && (
              <Line x1={todayX} y1={HEADER_H - 2} x2={todayX} y2={chartH} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />
            )}
            {/* Contract end */}
            <Line
              x1={dateToX(bundle.contract_end_date)}
              y1={HEADER_H - 2}
              x2={dateToX(bundle.contract_end_date)}
              y2={chartH}
              stroke="#ef4444"
              strokeWidth={2}
            />
            {/* Dependency lines */}
            {stages.map((t, idx) => {
              if (!t.depends_on_task_id) return null;
              const parentIdx = stages.findIndex((p) => p.id === t.depends_on_task_id);
              if (parentIdx === -1) return null;
              const parent = stages[parentIdx];
              const x1 = dateToX(parent.end_date);
              const y1 = HEADER_H + parentIdx * ROW_H + ROW_H / 2;
              const x2 = dateToX(t.start_date);
              const y2 = HEADER_H + idx * ROW_H + ROW_H / 2;
              return (
                <Path
                  key={`dep-${t.id}`}
                  d={`M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  stroke={theme.textSecondary}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  fill="none"
                />
              );
            })}
            {/* Stage bars */}
            {stages.map((t, idx) => {
              const x = dateToX(t.start_date);
              const w = Math.max(8, dateToX(t.end_date) - x);
              const y = HEADER_H + idx * ROW_H + 5;
              const meta = STATUS_META[t.status] || STATUS_META.not_started;
              return (
                <G key={t.id} onPress={() => onTaskTap(t)}>
                  <Rect x={x} y={y} width={w} height={ROW_H - 12} rx={5} ry={5} fill={meta.color} opacity={0.95} />
                  {w > 60 && (
                    <SvgText x={x + 6} y={y + 13} fill="#fff" fontSize="9" fontWeight="700">
                      {meta.label}
                    </SvgText>
                  )}
                  {t.status === 'delayed' && <Circle cx={x + w - 4} cy={y + 4} r={3} fill="#fff" />}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: v.color }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{v.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Material pin</Text>
        </View>
      </View>

      <SectionLabel theme={theme} icon="checkbox-outline" text="Stage list" />
      {stages.map((t) => (
        <TouchableOpacity
          key={`row-${t.id}`}
          onPress={() => onTaskTap(t)}
          activeOpacity={canEdit ? 0.7 : 1}
          disabled={!canEdit}
          style={[styles.stageRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          testID={`pf-stage-${t.id}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.stageName, { color: theme.text }]} numberOfLines={1}>{t.name}</Text>
            <Text style={[styles.stageMeta, { color: theme.textSecondary }]}>
              {t.start_date} → {t.end_date}
              {t.assigned_to_supervisor_name ? ` · ${t.assigned_to_supervisor_name}` : ''}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: (STATUS_META[t.status]?.color || '#999') + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_META[t.status]?.color || '#999' }]}>
              {STATUS_META[t.status]?.label || t.status}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ────── Flow Map tab ────── */

const FLOW_COLOR = {
  aligned: '#3b82f6',
  at_risk: '#f59e0b',
  delayed: '#ef4444',
};

const LANE_LABELS = ['Approvals', 'Vendors', 'Materials', 'Stages'];

const FlowMapTab = ({ theme, isDark, bundle, onNodeTap }) => {
  const { nodes, edges } = bundle.flow_map;

  // Layout: each lane gets its own X column, nodes stacked vertically
  const LANE_W = 130;
  const NODE_H = 40;
  const ROW_GAP = 12;
  const MARGIN_TOP = 32;

  const byLane = [0, 1, 2, 3].map((l) => nodes.filter((n) => n.lane === l));
  const maxRows = Math.max(...byLane.map((arr) => arr.length));
  const chartW = 4 * LANE_W + 30;
  const chartH = MARGIN_TOP + maxRows * (NODE_H + ROW_GAP) + 20;

  const nodeXY = useMemo(() => {
    const map = {};
    byLane.forEach((arr, lane) => {
      arr.forEach((n, idx) => {
        map[n.id] = {
          x: 12 + lane * LANE_W,
          y: MARGIN_TOP + idx * (NODE_H + ROW_GAP),
          width: LANE_W - 18,
          height: NODE_H,
        };
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle]);

  return (
    <View>
      <SectionLabel theme={theme} icon="git-network-outline" text="Dependency flow map" />
      <Text style={[styles.helperText, { color: theme.textSecondary }]}>
        Approvals → Vendors → Materials → Stages. Tap a node for details.
      </Text>

      <View style={[styles.svgWrap, { backgroundColor: theme.card, borderColor: theme.border, padding: 0 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartW} height={chartH}>
            {/* Lane labels */}
            {LANE_LABELS.map((lab, i) => (
              <SvgText
                key={lab}
                x={12 + i * LANE_W + (LANE_W - 18) / 2}
                y={20}
                fill={theme.textSecondary}
                fontSize="10"
                fontWeight="800"
                textAnchor="middle"
              >
                {lab.toUpperCase()}
              </SvgText>
            ))}

            {/* Edges */}
            {edges.map((e, i) => {
              const a = nodeXY[e.from];
              const b = nodeXY[e.to];
              if (!a || !b) return null;
              const x1 = a.x + a.width;
              const y1 = a.y + a.height / 2;
              const x2 = b.x;
              const y2 = b.y + b.height / 2;
              const mx = (x1 + x2) / 2;
              return (
                <Path
                  key={`e-${i}`}
                  d={`M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  strokeWidth={1.2}
                  fill="none"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const pos = nodeXY[n.id];
              if (!pos) return null;
              const color = FLOW_COLOR[n.status] || '#9ca3af';
              return (
                <G key={n.id} onPress={() => onNodeTap(n)}>
                  <Rect
                    x={pos.x}
                    y={pos.y}
                    width={pos.width}
                    height={pos.height}
                    rx={10}
                    ry={10}
                    fill={isDark ? '#0b1220' : '#fff'}
                    stroke={color}
                    strokeWidth={1.6}
                  />
                  <Circle cx={pos.x + 10} cy={pos.y + pos.height / 2} r={4} fill={color} />
                  <SvgText
                    x={pos.x + 20}
                    y={pos.y + pos.height / 2 - 1}
                    fill={isDark ? '#e5e7eb' : '#0f172a'}
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {truncate(n.label, 14)}
                  </SvgText>
                  <SvgText
                    x={pos.x + 20}
                    y={pos.y + pos.height / 2 + 11}
                    fill={isDark ? '#9ca3af' : '#64748b'}
                    fontSize="8"
                  >
                    {n.type.toUpperCase()}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.legend}>
        {[
          { k: 'aligned', label: 'Aligned' },
          { k: 'at_risk', label: 'At risk' },
          { k: 'delayed', label: 'Delayed' },
        ].map((l) => (
          <View key={l.k} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: FLOW_COLOR[l.k] }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/* ────── Materials tab ────── */

const MAT_STATUS = {
  on_time: { label: 'On time', color: '#22c55e', icon: 'checkmark-circle' },
  arrived: { label: 'Arrived', color: '#22c55e', icon: 'checkmark-done-circle' },
  in_transit: { label: 'In transit', color: '#3b82f6', icon: 'time-outline' },
  delayed: { label: 'Delayed', color: '#ef4444', icon: 'alert-circle' },
};

const MaterialsTab = ({ theme, isDark, bundle }) => {
  const onTime = bundle.materials.filter((m) => ['on_time', 'arrived'].includes(m.status)).length;
  const total = bundle.materials.length;
  const synced = onTime === total;

  return (
    <View>
      <View
        style={[
          styles.synthBanner,
          {
            backgroundColor: synced
              ? (isDark ? 'rgba(34,197,94,0.1)' : '#ecfdf5')
              : (isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb'),
            borderColor: synced ? '#86efac' : '#fde68a',
          },
        ]}
        testID="pf-materials-banner"
      >
        <Ionicons name={synced ? 'checkmark-done' : 'alert-circle-outline'} size={14} color={synced ? '#22c55e' : '#f59e0b'} />
        <Text style={[styles.synthBannerText, { color: synced ? '#15803d' : '#b45309' }]}>
          Material readiness {synced ? 'synchronized with execution plan' : `— ${total - onTime} item(s) need attention`}
        </Text>
      </View>

      <SectionLabel theme={theme} icon="cube-outline" text={`Materials (${total})`} />

      {bundle.materials.map((m) => {
        const meta = MAT_STATUS[m.status] || MAT_STATUS.on_time;
        return (
          <View
            key={m.id}
            style={[styles.matCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            testID={`pf-material-${m.id}`}
          >
            <View style={[styles.matIcon, { backgroundColor: meta.color + '22' }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.matName, { color: theme.text }]} numberOfLines={1}>
                {m.name} · <Text style={{ color: theme.textSecondary }}>{m.qty} {m.unit}</Text>
              </Text>
              <Text style={[styles.matMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                Vendor: {m.vendor_name}
              </Text>
              <Text style={[styles.matMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                For: {m.linked_stage_name} · ETA {m.expected_arrival}
              </Text>
              {m.recalibration_triggered && (
                <View style={styles.recalRow}>
                  <Ionicons name="refresh" size={10} color="#ef4444" />
                  <Text style={[styles.recalText, { color: '#ef4444' }]}>Recalibration triggered</Text>
                </View>
              )}
            </View>
            <View style={[styles.matStatusPill, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.matStatusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

/* ────── Vendors tab ────── */

const VENDOR_STATUS = {
  confirmed: { label: 'Confirmed', color: '#22c55e' },
  pending: { label: 'Pending', color: '#9ca3af' },
  follow_up_sent: { label: 'Follow-up sent', color: '#3b82f6' },
  delayed: { label: 'Delayed', color: '#ef4444' },
};

const VendorsTab = ({ theme, isDark, bundle, canEdit, onFollowUp }) => (
  <View>
    <SectionLabel theme={theme} icon="business-outline" text={`Vendors (${bundle.vendors.length})`} />
    {bundle.vendors.map((v) => {
      const meta = VENDOR_STATUS[v.status] || VENDOR_STATUS.pending;
      return (
        <View
          key={v.id}
          style={[styles.vendorCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          testID={`pf-vendor-${v.id}`}
        >
          <View style={styles.vendorHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vendorName, { color: theme.text }]}>{v.name}</Text>
              <Text style={[styles.vendorContact, { color: theme.textSecondary }]}>
                {v.contact} · Dispatch ETA {v.dispatch_eta}
              </Text>
            </View>
            <View style={[styles.vendorPill, { backgroundColor: meta.color + '22' }]}>
              <View style={[styles.vendorDot, { backgroundColor: meta.color }]} />
              <Text style={[styles.vendorPillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <View style={styles.vendorGoodsRow}>
            {v.goods.map((g) => (
              <View key={g} style={[styles.goodChip, { backgroundColor: isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9' }]}>
                <Text style={[styles.goodChipText, { color: theme.textSecondary }]}>{g}</Text>
              </View>
            ))}
          </View>

          {v.status === 'delayed' && (
            <View style={styles.delayLine}>
              <Ionicons name="time-outline" size={11} color="#ef4444" />
              <Text style={[styles.delayText, { color: '#ef4444' }]}>+{v.delay_days}d slip — timeline auto-recalibrated downstream</Text>
            </View>
          )}
          {v.follow_ups.length > 0 && (
            <View style={styles.delayLine}>
              <Ionicons name="logo-whatsapp" size={11} color="#3b82f6" />
              <Text style={[styles.delayText, { color: '#3b82f6' }]}>Follow-up automation engaged</Text>
            </View>
          )}

          {canEdit && (
            <TouchableOpacity
              onPress={() => onFollowUp(v)}
              style={[styles.followBtn, { borderColor: theme.border }]}
              testID={`pf-followup-${v.id}`}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane-outline" size={12} color={theme.primary} />
              <Text style={[styles.followBtnText, { color: theme.primary }]}>Send follow-up</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    })}
  </View>
);

/* ────── Alerts tab ────── */

const ALERT_STYLE = {
  critical: { color: '#ef4444', icon: 'alert-circle' },
  warning: { color: '#f59e0b', icon: 'warning' },
  info: { color: '#3b82f6', icon: 'information-circle' },
};

const AlertsTab = ({ theme, isDark, bundle, onDismiss }) => (
  <View>
    <SectionLabel theme={theme} icon="sparkles-outline" text="Execution intelligence alerts" />
    {bundle.alerts.length === 0 ? (
      <View style={[styles.emptyAlerts, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="checkmark-done-circle-outline" size={26} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>All clear — no pending intelligence alerts.</Text>
      </View>
    ) : (
      bundle.alerts.map((a) => {
        const meta = ALERT_STYLE[a.severity] || ALERT_STYLE.info;
        return (
          <View
            key={a.id}
            style={[styles.alertCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            testID={`pf-alert-${a.id}`}
          >
            <View style={[styles.alertIcon, { backgroundColor: meta.color + '22' }]}>
              <Ionicons name={meta.icon} size={14} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertText, { color: theme.text }]}>{a.text}</Text>
              <Text style={[styles.alertMeta, { color: theme.textSecondary }]}>
                {a.kind.replace(/_/g, ' ')} · {timeAgo(a.at)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onDismiss(a.id)} hitSlop={10} testID={`pf-alert-dismiss-${a.id}`}>
              <Ionicons name="close" size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        );
      })
    )}
  </View>
);

/* ────── Modals ────── */

const EditTaskModal = ({ theme, isDark, editing, setEditing, onSave }) => (
  <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: isDark ? '#0b0f14' : '#fff', borderColor: theme.border }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Edit stage</Text>
          <TouchableOpacity onPress={() => setEditing(null)} testID="pf-edit-close" hitSlop={10}>
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
              style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground || theme.card, borderColor: theme.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + '99'}
              testID="pf-edit-end"
            />
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Status</Text>
            <View style={styles.statusPicker}>
              {Object.entries(STATUS_META).map(([k, v]) => {
                const on = editing._statusStr === k;
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setEditing({ ...editing, _statusStr: k })}
                    style={[styles.statusChip, { borderColor: on ? v.color : theme.border, backgroundColor: on ? v.color + '22' : 'transparent' }]}
                    testID={`pf-status-${k}`}
                  >
                    <Text style={{ color: on ? v.color : theme.text, fontSize: 11, fontWeight: '700' }}>{v.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.sheetFooter}>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.cancelBtn, { borderColor: theme.border }]} testID="pf-edit-cancel">
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSave} style={[styles.saveEdit, { backgroundColor: theme.primary }]} testID="pf-edit-save">
                <Text style={styles.saveEditText}>Save</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  </Modal>
);

const NodeDetailModal = ({ theme, isDark, node, close }) => (
  <Modal visible={!!node} transparent animationType="slide" onRequestClose={close}>
    <View style={styles.backdrop}>
      <View style={[styles.sheet, { backgroundColor: isDark ? '#0b0f14' : '#fff', borderColor: theme.border }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Node Detail</Text>
          <TouchableOpacity onPress={close} testID="pf-node-close" hitSlop={10}>
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        {node && (
          <>
            <Text style={[styles.editName, { color: theme.text }]}>{node.label}</Text>
            <View style={[styles.nodeStatusPill, { backgroundColor: (FLOW_COLOR[node.status] || '#9ca3af') + '22' }]}>
              <Text style={{ color: FLOW_COLOR[node.status] || '#9ca3af', fontSize: 11, fontWeight: '800' }}>
                {String(node.status).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.nodeMeta, { color: theme.textSecondary }]}>
              Type: {node.type}{node.sub_label ? ` · ${node.sub_label}` : ''}
            </Text>
            <Text style={[styles.nodeMeta, { color: theme.textSecondary, marginTop: 8 }]}>
              Lane: {LANE_LABELS[node.lane] || '—'}
            </Text>
          </>
        )}
      </View>
    </View>
  </Modal>
);

/* ────── Helpers ────── */

const SectionLabel = ({ theme, icon, text }) => (
  <View style={styles.sectionLabel}>
    <Ionicons name={icon} size={13} color={theme.textSecondary} />
    <Text style={[styles.sectionLabelText, { color: theme.textSecondary }]}>{text}</Text>
  </View>
);

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function timeAgo(iso) {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ════════════════════════ Styles ════════════════════════ */

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
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tagline: { fontSize: 12, lineHeight: 17, marginBottom: 12 },

  /* Hero */
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -1.5, marginTop: 8 },
  heroValueSm: { fontSize: 18, color: '#94a3b8' },
  heroBar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(148,163,184,0.2)', overflow: 'hidden', marginTop: 10 },
  heroBarFill: { height: 4, borderRadius: 2 },
  heroFoot: { color: '#94a3b8', fontSize: 10, fontWeight: '600', marginTop: 10, letterSpacing: 0.2 },

  /* Weather */
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  weatherIcon: {
    width: 28, height: 28, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  weatherTitle: { fontSize: 12, fontWeight: '800' },
  weatherBody: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  /* Tabs */
  tabsRow: { marginTop: 18, marginBottom: 8 },
  tabsScroll: { gap: 8, paddingRight: 16 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },

  /* Section labels & helper */
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8 },
  sectionLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  helperText: { fontSize: 11, lineHeight: 15, marginBottom: 8, fontStyle: 'italic' },

  /* SVG / Gantt */
  svgWrap: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 8,
    marginBottom: 8,
  },
  nameCol: { width: 120, paddingRight: 6 },
  taskName: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, fontWeight: '700' },

  /* Stage rows */
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  stageName: { fontSize: 13, fontWeight: '700' },
  stageMeta: { fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },

  /* Materials */
  synthBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  synthBannerText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 16 },
  matCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  matIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  matName: { fontSize: 13, fontWeight: '700' },
  matMeta: { fontSize: 11, marginTop: 2 },
  matStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  matStatusText: { fontSize: 10, fontWeight: '800' },
  recalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  recalText: { fontSize: 10, fontWeight: '700' },

  /* Vendors */
  vendorCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  vendorHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  vendorName: { fontSize: 14, fontWeight: '800' },
  vendorContact: { fontSize: 11, marginTop: 2 },
  vendorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  vendorDot: { width: 6, height: 6, borderRadius: 3 },
  vendorPillText: { fontSize: 10, fontWeight: '800' },
  vendorGoodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  goodChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  goodChipText: { fontSize: 10, fontWeight: '700' },
  delayLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  delayText: { fontSize: 11, fontWeight: '700' },
  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginTop: 10,
  },
  followBtnText: { fontSize: 11, fontWeight: '700' },

  /* Alerts */
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  alertIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  alertText: { fontSize: 13, fontWeight: '700' },
  alertMeta: { fontSize: 10, marginTop: 2, textTransform: 'capitalize' },
  emptyAlerts: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 1 },
  emptyText: { fontSize: 12, marginTop: 8, fontWeight: '600' },

  /* Modals shared */
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 18, paddingBottom: 28 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  editName: { fontSize: 15, fontWeight: '800', marginTop: 10, marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, fontFamily: 'Menlo',
  },
  statusPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  saveEdit: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveEditText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  nodeStatusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 8 },
  nodeMeta: { fontSize: 12 },
});
