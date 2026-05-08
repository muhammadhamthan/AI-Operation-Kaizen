import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import {
  fetchDashboardData,
  selectStats,
  selectCharts,
  selectAlerts,
  selectRecentIssues,
  selectIsSolverView,
  selectDashboardLoading
} from '../../../../src/store/slices/dashboardSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import { fetchSolversPerformance, selectAllSolvers } from '../../../../src/store/slices/performanceSlice';
import { fetchSitesWithAnalytics, selectAllSites } from '../../../../src/store/slices/sitesSlice';
import { fetchComplaints, selectAllComplaints } from '../../../../src/store/slices/complaintsSlice';

import DashboardCard from '../../../../src/components/dashboard/DashboardCard';
import ChartDownloadButton from '../../../../src/components/dashboard/ChartDownloadButton';
import Loader from '../../../../src/components/common/Loader';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import FullScreenSpinner from '../../../../src/components/common/FullScreenSpinner';
import { normaliseRole, ROLES } from '../../../../src/utils/roles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatSafeDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
};

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector(selectCurrentUser);
  const currentRole = normaliseRole(user?.role);
  const stats = useSelector(selectStats);
  const charts = useSelector(selectCharts);
  const alerts = useSelector(selectAlerts) || {};
  const recentIssues = useSelector(selectRecentIssues) || [];
  const isSolverView = useSelector(selectIsSolverView);
  const loading = useSelector(selectDashboardLoading);
  const isOnline = useSelector(selectIsOnline);
  const solvers = useSelector(selectAllSolvers);
  const sitesList = useSelector(selectAllSites);
  const complaintsList = useSelector(selectAllComplaints);

  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const lineChartRef = useRef();
  const pieChartRef = useRef();
  const barChartRef = useRef();

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData(user));
      dispatch(fetchSolversPerformance(user));
      dispatch(fetchSitesWithAnalytics(user));
      dispatch(fetchComplaints({ user }));
    }
  }, [user, dispatch]);

  const getDeadlineIndicator = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, color: '#ef4444' };
    if (diffDays === 0) return { text: 'Due Today', color: '#f59e0b' };
    if (diffDays === 1) return { text: 'Due Tomorrow', color: '#f59e0b' };
    return { text: `Due in ${diffDays}d`, color: theme.textSecondary };
  };

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) {
      try {
        await Promise.allSettled([
          dispatch(fetchDashboardData(user)),
          dispatch(fetchSolversPerformance(user)),
          dispatch(fetchSitesWithAnalytics(user)),
          dispatch(fetchComplaints({ user }))
        ]);
      } finally {
        setRefreshing(false);
      }
    } else {
      setRefreshing(false);
    }
  }, [user, isOnline, dispatch]);

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#2a2a2a' : '#ebebeb';

  const calculatedLineData = useMemo(() => {
    const safeSolvers = Array.isArray(solvers) ? solvers : [];
    if (currentRole === ROLES.MANAGER) {
      if (safeSolvers.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }],
          legend: ['Solver Workload'],
          subtitle: 'Total assignments distributed among top solvers.'
        };
      }

      const topSolvers = [...safeSolvers]
        .sort((a, b) => (b.performance?.total_assigned || 0) - (a.performance?.total_assigned || 0))
        .slice(0, 6);

      return {
        labels: topSolvers.map(s => (s.name || `ID:${s.id || '?'}`).split(' ')[0]),
        datasets: [{ data: topSolvers.map(s => s.performance?.total_assigned || 0), color: () => '#8b5cf6' }],
        legend: ['Solver Workload (Total Assignments)'],
        subtitle: 'Total assignments distributed among top solvers.'
      };
    }

    const safeRecentIssues = Array.isArray(recentIssues) ? recentIssues : [];
    if (safeRecentIssues.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
        legend: ['Recent Volume'],
        subtitle: 'Trend over the last 7 active days.'
      };
    }

    const validIssues = [...safeRecentIssues].filter(i =>
      isSolverView ? (i.due_date || i.created_at) : (i.updated_at || i.created_at)
    );

    if (validIssues.length === 0) {
      return {
        labels: ['No Dates'],
        datasets: [{ data: [0] }],
        legend: ['Missing Date Data'],
        subtitle: 'No valid dates found to chart.'
      };
    }

    validIssues.sort((a, b) => {
      const dateA = isSolverView ? (a.due_date || a.created_at) : (a.updated_at || a.created_at);
      const dateB = isSolverView ? (b.due_date || b.created_at) : (b.updated_at || b.created_at);
      return new Date(dateB) - new Date(dateA);
    });

    const latestDateStr = isSolverView
      ? (validIssues[0].due_date || validIssues[0].created_at)
      : (validIssues[0].updated_at || validIssues[0].created_at);

    const latestDate = new Date(latestDateStr);
    const startDate = new Date(latestDate);
    startDate.setDate(latestDate.getDate() - 6);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(latestDate);
      d.setDate(d.getDate() - i);
      labels.push(daysOfWeek[d.getDay()]);

      const dateString = d.toISOString().split('T')[0];

      const count = recentIssues.filter(issue => {
        const issueDate = isSolverView ? (issue.due_date || issue.created_at) : (issue.updated_at || issue.created_at);
        return issueDate?.startsWith(dateString);
      }).length;

      data.push(count);
    }

    const hasData = data.some(val => val > 0);

    return {
      labels,
      datasets: [{ data: hasData ? data : [0], color: () => '#ef4444' }],
      legend: [isSolverView ? 'Recent Deadlines Recorded' : 'Recent Issues'],
      subtitle: `Trend from ${formatSafeDate(startDate)} to ${formatSafeDate(latestDate)}`
    };
  }, [recentIssues, isSolverView, currentRole, solvers]);

  const pieData = charts?.issuesByCategory?.length > 0
    ? charts.issuesByCategory.map((item) => ({
      name: item.name,
      population: item.count,
      color: item.color,
      legendFontColor: theme.text,
      legendFontSize: 12,
    }))
    : [{ name: 'No Data', population: 1, color: isDark ? '#333' : '#e5e5e5', legendFontColor: theme.text, legendFontSize: 12 }];

  const calculatedBarData = useMemo(() => {
    const safeSites = Array.isArray(sitesList) ? sitesList : [];
    if (safeSites.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    const topSites = [...safeSites]
      .sort((a, b) => (b.analytics?.total_issues || 0) - (a.analytics?.total_issues || 0))
      .slice(0, 5);

    return {
      labels: topSites.map(s => (s.name || 'Site').substring(0, 5)),
      datasets: [{ data: topSites.map(s => s.analytics?.total_issues || 0) }]
    };
  }, [sitesList]);

  const getOptimalSegments = (maxVal) => {
    if (maxVal === 0) return 1;
    if (maxVal <= 8) return maxVal;
    return 4;
  };

  const lineDataMax = Math.max(...calculatedLineData.datasets[0].data);
  const lineSegments = getOptimalSegments(lineDataMax);

  const barDataMax = calculatedBarData.datasets[0].data.length > 0
    ? Math.max(...calculatedBarData.datasets[0].data)
    : 0;
  const barSegments = getOptimalSegments(barDataMax);

  if (loading && !stats?.totalIssues) return <Loader message="Analyzing data..." />;

  const chartConfig = {
    backgroundColor: surfaceColor,
    backgroundGradientFrom: surfaceColor,
    backgroundGradientTo: surfaceColor,
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.5})` : `rgba(0, 0, 0, ${opacity * 0.5})`,
    labelColor: () => theme.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 11, fontWeight: '500' },
    propsForDots: { r: '4', strokeWidth: '2', stroke: isDark ? '#171717' : '#ffffff' },
  };

  const healthCardsData = !isSolverView ? [
    {
      id: 'open',
      title: 'Pending Issues',
      count: stats?.notFixedIssues || 0,
      icon: 'list',
      route: '/(main)/(tabs)/dashboard/not-fixed',
      lightTheme: { bg: '#e0f2fe', iconBg: '#ffffff', iconColor: '#0f172a', arrowColor: '#60a5fa', textColor: '#0f172a', titleColor: '#475569' },
      darkTheme: { bg: 'rgba(56,189,248,0.15)', iconBg: 'rgba(56,189,248,0.2)', iconColor: '#38bdf8', arrowColor: '#0284c7', textColor: '#e0f2fe', titleColor: '#bae6fd' },
    },
    {
      id: 'escalated',
      title: 'ESCALATED',
      count: alerts?.escalations || 0,
      icon: 'warning-outline',
      route: '/(main)/(tabs)/dashboard/escalated',
      lightTheme: { bg: '#fce8ec', iconBg: '#ffffff', iconColor: '#ef4444', arrowColor: '#fca5a5', textColor: '#881337', titleColor: '#9f1239' },
      darkTheme: { bg: 'rgba(239,68,68,0.15)', iconBg: 'rgba(239,68,68,0.2)', iconColor: '#f87171', arrowColor: '#ef4444', textColor: '#fecaca', titleColor: '#fca5a5' },
    },
    {
      id: 'fixed',
      title: 'Resolved Issues',
      count: stats?.fixedIssues || 0,
      icon: 'shield-checkmark-outline',
      route: '/(main)/(tabs)/dashboard/fixed',
      lightTheme: { bg: '#ffffff', border: '#e2e8f0', iconBg: '#ffffff', iconColor: '#0f172a', arrowColor: '#94a3b8', textColor: '#0f172a', titleColor: '#475569' },
      darkTheme: { bg: '#171717', border: '#2a2a2a', iconBg: '#262626', iconColor: '#f8fafc', arrowColor: '#475569', textColor: '#f8fafc', titleColor: '#cbd5e1' },
    },
    {
      id: 'review',
      title: 'Awaiting Review',
      count: alerts?.pendingReviews || 0,
      icon: 'clipboard-outline',
      route: '/(main)/(tabs)/dashboard/awaiting_review',
      lightTheme: { bg: '#fff4e0', iconBg: '#ffffff', iconColor: '#b45309', arrowColor: '#fcd34d', textColor: '#78350f', titleColor: '#92400e' },
      darkTheme: { bg: 'rgba(245,158,11,0.15)', iconBg: 'rgba(245,158,11,0.2)', iconColor: '#fbbf24', arrowColor: '#f59e0b', textColor: '#fde68a', titleColor: '#fcd34d' },
    }
  ] : [
    {
      id: 'active',
      title: 'ACTIVE TASKS',
      count: stats?.notFixedIssues || 0,
      icon: 'time-outline',
      route: '/(main)/(tabs)/dashboard/not-fixed',
      lightTheme: { bg: '#e0f2fe', iconBg: '#ffffff', iconColor: '#0f172a', arrowColor: '#60a5fa', textColor: '#0f172a', titleColor: '#475569' },
      darkTheme: { bg: 'rgba(56,189,248,0.15)', iconBg: 'rgba(56,189,248,0.2)', iconColor: '#38bdf8', arrowColor: '#0284c7', textColor: '#e0f2fe', titleColor: '#bae6fd' },
    },
    {
      id: 'my-sites',
      title: 'MY SITES',
      count: sitesList?.length || 0,
      icon: 'business-outline',
      route: '/(main)/(tabs)/dashboard/sites',
      lightTheme: { bg: '#fce8ec', iconBg: '#ffffff', iconColor: '#ef4444', arrowColor: '#fca5a5', textColor: '#881337', titleColor: '#9f1239' },
      darkTheme: { bg: 'rgba(239,68,68,0.15)', iconBg: 'rgba(239,68,68,0.2)', iconColor: '#f87171', arrowColor: '#ef4444', textColor: '#fecaca', titleColor: '#fca5a5' },
    },
    {
      id: 'resolved',
      title: 'RESOLVED',
      count: stats?.fixedIssues || 0,
      icon: 'checkmark-done',
      route: '/(main)/(tabs)/dashboard/fixed',
      lightTheme: { bg: '#ffffff', border: '#e2e8f0', iconBg: '#ffffff', iconColor: '#0f172a', arrowColor: '#94a3b8', textColor: '#0f172a', titleColor: '#475569' },
      darkTheme: { bg: '#171717', border: '#2a2a2a', iconBg: '#262626', iconColor: '#f8fafc', arrowColor: '#475569', textColor: '#f8fafc', titleColor: '#cbd5e1' },
    },
    {
      id: 'analytics',
      title: 'MY ANALYTICS',
      count: (stats?.fixedIssues || 0) + (stats?.notFixedIssues || 0),
      icon: 'stats-chart',
      route: { pathname: '/(main)/(tabs)/dashboard/solver-profile', params: { id: user?.id } },
      lightTheme: { bg: '#fff4e0', iconBg: '#ffffff', iconColor: '#b45309', arrowColor: '#fcd34d', textColor: '#78350f', titleColor: '#92400e' },
      darkTheme: { bg: 'rgba(245,158,11,0.15)', iconBg: 'rgba(245,158,11,0.2)', iconColor: '#fbbf24', arrowColor: '#f59e0b', textColor: '#fde68a', titleColor: '#fcd34d' },
    }
  ];

  const renderHealthCard = (card) => {
    const t = isDark ? card.darkTheme : card.lightTheme;
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.healthCard,
          { backgroundColor: t.bg, borderColor: t.border || 'transparent', borderWidth: t.border ? 1 : 0 }
        ]}
        onPress={() => router.push(card.route)}
        activeOpacity={0.7}
      >
        <View style={styles.healthCardHeader}>
          <View style={[styles.healthIconWrap, { backgroundColor: t.iconBg, borderColor: t.border || 'transparent', borderWidth: t.border ? 1 : 0 }]}>
            <Ionicons name={card.icon} size={18} color={t.iconColor} />
          </View>
          <Ionicons name="arrow-forward" size={16} color={t.arrowColor} />
        </View>
        <View style={styles.healthCardBody}>
          <Text style={[styles.healthCardCount, { color: t.textColor }]}>
            {card.count.toString().padStart(2, '0')}
          </Text>
          <Text style={[styles.healthCardTitle, { color: t.titleColor }]}>{card.title}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111111' : '#ffffff' }]}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#111111' : '#ffffff' }]}>
        <View style={styles.headerLeft} />

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>AI-Operation Kaizen</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="small" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
      >

        {/* ── UPDATING DATA INDICATOR ── */}
        {refreshing && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 }}>
            <Ionicons name="sync" size={16} color={theme.textSecondary} />
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>Updating data...</Text>
          </View>
        )}

        {/* ── OPERATIONAL HEALTH ── */}
        <View style={styles.statsContainer}>
          <View style={styles.healthHeader}>
            <View style={styles.healthTitleWrap}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#3b82f6" />
              <Text style={[styles.healthTitle, { color: theme.textSecondary }]}>OPERATIONAL HEALTH</Text>
            </View>
            <View style={[styles.liveFeedBadge, { backgroundColor: isDark ? '#262626' : '#f3f4f6' }]}>
              <Text style={[styles.liveFeedText, { color: isDark ? '#a3a3a3' : '#6b7280' }]}>LIVE FEED</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              {renderHealthCard(healthCardsData[0])}
              {renderHealthCard(healthCardsData[1])}
            </View>
            <View style={styles.gridRow}>
              {renderHealthCard(healthCardsData[2])}
              {renderHealthCard(healthCardsData[3])}
            </View>
          </View>
        </View>

        {/* ── KEY METRICS (Remaining roles) ── */}
        <View style={styles.statsContainer}>
          {isSolverView ? (
            <>
              <View style={styles.statsRow}>
                <DashboardCard
                  title="Complaints Logged"
                  count={complaintsList?.filter(c => c.target_solver_id === user?.id)?.length || 0}
                  icon="warning-outline"
                  color="#ef4444"
                  style={styles.fullWidthCard}
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')}
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard
                  title="Site Diary"
                  count={null}
                  icon="book-outline"
                  color="#0ea5e9"
                  style={styles.fullWidthCard}
                  onPress={() => router.push('/(main)/diary')}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.statsRow}>
                <DashboardCard
                  title="Total Recorded Complaints"
                  count={complaintsList?.length || 0}

                  icon="warning-outline"
                  color="#ef4444"
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')}
                  style={styles.fullWidthCard}
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard title="Sites" count={sitesList?.length || 0} icon="business-outline" color="#3b82f6" onPress={() => router.push('/(main)/(tabs)/dashboard/sites')} />
                {currentRole !== ROLES.CUSTOMER_MD && (
                  <DashboardCard title="Solvers" count={solvers?.length || 0} icon="people-outline" color="#8b5cf6" onPress={() => router.push('/(main)/(tabs)/dashboard/solvers')} />
                )}
              </View>

              {/* ── Kairox v3.0 role-specific cards (Priority 1) ── */}
              {currentRole === ROLES.SUPERVISOR && (
                <>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="ProjectFlow Intelligence"
                      count={null}
                      icon="git-network-outline"
                      color="#3b82f6"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/projectflow')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Managing Director"
                      count={null}
                      icon="person-circle-outline"
                      color="#3b82f6"
                      onPress={() => router.push('/(main)/(tabs)/md-card')}
                    />
                    <DashboardCard
                      title="Budget Request"
                      count={null}
                      icon="wallet-outline"
                      color="#10a37f"
                      onPress={() => router.push('/(main)/(tabs)/budget')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Ops Team Group"
                      count={null}
                      icon="people-circle-outline"
                      color="#0ea5e9"
                      onPress={() => router.push('/(main)/chat/group/ops')}
                    />
                    <DashboardCard
                      title="Site Diary"
                      count={null}
                      icon="book-outline"
                      color="#8b5cf6"
                      onPress={() => router.push('/(main)/diary')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Monthly Report"
                      count={null}
                      icon="document-text-outline"
                      color="#db2777"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/monthly-report')}
                    />
                  </View>
                </>
              )}
              {currentRole === ROLES.MANAGER && (
                <>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="ProjectFlow Intelligence"
                      count={null}
                      icon="git-network-outline"
                      color="#3b82f6"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/projectflow')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Supervisors"
                      count={null}
                      icon="people-outline"
                      color="#0ea5e9"
                      onPress={() => router.push('/(main)/(tabs)/supervisors-card')}
                    />
                    <DashboardCard
                      title="Customer's MD"
                      count={null}
                      icon="business-outline"
                      color="#db2777"
                      onPress={() => router.push('/(main)/(tabs)/customer-md-card')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Budget"
                      count={null}
                      icon="wallet-outline"
                      color="#10a37f"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/(tabs)/budget')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Ops Team Group"
                      count={null}
                      icon="people-circle-outline"
                      color="#0ea5e9"
                      onPress={() => router.push('/(main)/chat/group/ops')}
                    />
                    <DashboardCard
                      title="Site Diary"
                      count={null}
                      icon="book-outline"
                      color="#8b5cf6"
                      onPress={() => router.push('/(main)/diary')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Monthly Report"
                      count={null}
                      icon="document-text-outline"
                      color="#db2777"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/monthly-report')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Admin"
                      count={null}
                      icon="settings-outline"
                      color="#f59e0b"
                      style={styles.fullWidthCard}
                      onPress={() => router.push('/(main)/admin')}
                    />
                  </View>
                </>
              )}
              {currentRole === ROLES.CUSTOMER_MD && (
                <>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Managing Director"
                      count={null}
                      icon="person-circle-outline"
                      color="#3b82f6"
                      onPress={() => router.push('/(main)/(tabs)/md-card')}
                    />
                    <DashboardCard
                      title="Budget"
                      count={null}
                      icon="wallet-outline"
                      color="#10a37f"
                      onPress={() => router.push('/(main)/(tabs)/budget')}
                    />
                  </View>
                  <View style={styles.statsRow}>
                    <DashboardCard
                      title="Site Diary"
                      count={null}
                      icon="book-outline"
                      color="#0ea5e9"
                      onPress={() => router.push('/(main)/diary')}
                    />
                    <DashboardCard
                      title="Monthly Report"
                      count={null}
                      icon="document-text-outline"
                      color="#db2777"
                      onPress={() => router.push('/(main)/monthly-report')}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* ── DYNAMIC LINE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#f8fafc', borderColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleWrap}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                {currentRole === ROLES.MANAGER ? 'Solver Bandwidth' : isSolverView ? 'Upcoming Deadlines' : 'Recent Issues'}
              </Text>
              <View style={styles.blueDot} />
            </View>
            <View style={styles.cardHeaderTimeWrap}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.realTimeText, { color: theme.textSecondary }]}>Live</Text>
            </View>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
            {calculatedLineData.subtitle}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View ref={lineChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, paddingRight: 16 }}>
              <LineChart
                data={calculatedLineData}
                width={SCREEN_WIDTH - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
                fromZero={true}
                segments={lineSegments}
              />
            </View>
          </ScrollView>
          <ChartDownloadButton viewShotRef={lineChartRef} chartType={currentRole === ROLES.MANAGER ? 'Solver Bandwidth' : 'Volume Over Time'} />
        </View>

        {/* ── PIE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#f8fafc', borderColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleWrap}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Status Breakdown</Text>
              <View style={styles.blueDot} />
            </View>
            <View style={styles.cardHeaderTimeWrap}>
              <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.realTimeText, { color: theme.textSecondary }]}>Live</Text>
            </View>
          </View>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Distribution of issues by current status.</Text>
          <View ref={pieChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, alignItems: 'center' }}>
            <PieChart data={pieData} width={SCREEN_WIDTH - 64} height={200} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
          </View>
          <ChartDownloadButton viewShotRef={pieChartRef} chartType="Status Breakdown" />
        </View>

        {/* ── BAR CHART (Manager Only) ── */}
        {!isSolverView && currentRole === ROLES.MANAGER && (
          <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#f8fafc', borderColor: isDark ? '#2a2a2a' : '#f1f5f9' }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderTitleWrap}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Site Performance</Text>
                <View style={styles.blueDot} />
              </View>
              <View style={styles.cardHeaderTimeWrap}>
                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.realTimeText, { color: theme.textSecondary }]}>Live</Text>
              </View>
            </View>
            <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Total issues handled per location.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View ref={barChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, paddingRight: 16 }}>
                <BarChart
                  data={calculatedBarData}
                  width={SCREEN_WIDTH - 32}
                  height={220}
                  chartConfig={{ ...chartConfig, color: () => '#3b82f6' }}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                  fromZero={true}
                  segments={barSegments}
                />
              </View>
            </ScrollView>
            <ChartDownloadButton viewShotRef={barChartRef} chartType="Site Performance" />
          </View>
        )}

        {/* ── RECENT ISSUES FEED ── */}
        {(Array.isArray(recentIssues) && recentIssues.length > 0) && (
          <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#f8fafc', borderColor: isDark ? '#2a2a2a' : '#f1f5f9', padding: 0, overflow: 'hidden' }]}>
            <View style={[styles.cardHeaderRow, { padding: 20, paddingBottom: 10 }]}>
              <View style={styles.cardHeaderTitleWrap}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>{isSolverView ? "My Active Tasks" : "Recent Activity"}</Text>
                <View style={styles.blueDot} />
              </View>
              <View style={styles.cardHeaderTimeWrap}>
                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.realTimeText, { color: theme.textSecondary }]}>Real-time</Text>
              </View>
            </View>

            {recentIssues.map((issue, index) => {
              const targetDate = isSolverView
                ? (issue.due_date || issue.created_at)
                : (issue.updated_at || issue.created_at);

              const deadline = isSolverView ? getDeadlineIndicator(targetDate) : null;
              const displayDate = targetDate ? formatSafeDate(targetDate) : '';

              const datePrefix = isSolverView ? 'Due' : (issue.updated_at ? 'Updated' : 'Opened');

              return (
                <TouchableOpacity
                  key={issue.id}
                  style={[styles.issueRow, { paddingTop: index === 0 ? 10 : 16, paddingBottom: 16 }]}
                  onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } })}
                >
                  <View style={{ marginRight: 14 }}>
                    <Avatar
                      name={issue.site_name}
                      uri={`https://i.pravatar.cc/150?u=${issue.id}`}
                      size="medium"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, flexShrink: 1, marginRight: 8 }} numberOfLines={1}>
                        {issue.site_name}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase' }}>
                        {displayDate ? displayDate.toUpperCase() : ''}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }} numberOfLines={1}>
                      {issue.title} <Text style={{ fontWeight: '700', textDecorationLine: 'underline', color: theme.text }}>IS-{issue.id}</Text>
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }}>{datePrefix}</Text>
                      {deadline && (
                        <View style={[styles.deadlineBadge, { backgroundColor: `${deadline.color}15` }]}>
                          <Text style={[styles.deadlineText, { color: deadline.color }]}>{deadline.text}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.viewAllButton, { borderTopColor: borderColor }]}
              onPress={() => router.push('/(main)/(tabs)/issues')}
            >
              <Text style={[styles.viewAllText, { color: theme.textSecondary }]}>Manage {isSolverView ? 'Tasks' : 'Issues'} in Full View</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FullScreenSpinner visible={refreshing} message="Updating Dashboard..." />

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },

  // ── HEADER ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
  },
  headerLeft: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerActions: { width: 40, alignItems: 'flex-end' },
  bellButton: { padding: 4 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0 },

  // ── SECTION TITLE ──
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 10,
    marginLeft: 2,
  },

  // ── CONTAINERS ──
  statsContainer: { marginBottom: 32 },
  statsRow: { flexDirection: 'row', marginBottom: 16, gap: 16 },
  fullWidthCard: { flex: 1, marginRight: 0 },

  // ── HEALTH GRID CARDS ──
  healthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  healthTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.1 },
  liveFeedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  liveFeedText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  gridContainer: { flexDirection: 'column', gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  healthCard: { flex: 1, borderRadius: 16, padding: 16 },
  healthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  healthIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  healthCardBody: { gap: 4 },
  healthCardCount: { fontSize: 32, fontWeight: '800', letterSpacing: -1, lineHeight: 36 },
  healthCardTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ── CHART CARDS ──
  chartCard: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
      },
      android: { elevation: 1 },
    }),
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardHeaderTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  cardHeaderTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  realTimeText: { fontSize: 12 },
  chartTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 0 },
  chartSubtitle: { fontSize: 13, marginBottom: 20, lineHeight: 18, opacity: 0.75 },
  chart: { borderRadius: 12, marginLeft: -10 },

  // ── RECENT ISSUES ──
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  issueTitle: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  deadlineBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  deadlineText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.2 },
  issueMeta: { fontSize: 12.5, lineHeight: 17 },

  viewAllButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  bottomPadding: { height: 40 },
});