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
      dispatch(fetchComplaints(user)); 
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
          dispatch(fetchComplaints(user))
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
    if (user?.role === 'manager') {
      if (!solvers || solvers.length === 0) {
        return { 
          labels: ['No Data'], 
          datasets: [{ data: [0] }], 
          legend: ['Solver Workload'],
          subtitle: 'Total assignments distributed among top solvers.' 
        };
      }
      
      const topSolvers = [...solvers]
        .sort((a, b) => (b.performance?.total_assigned || 0) - (a.performance?.total_assigned || 0))
        .slice(0, 6);

      return {
        labels: topSolvers.map(s => (s.name || `ID:${s.id || '?'}`).split(' ')[0]),
        datasets: [{ data: topSolvers.map(s => s.performance?.total_assigned || 0), color: () => '#8b5cf6' }],
        legend: ['Solver Workload (Total Assignments)'],
        subtitle: 'Total assignments distributed among top solvers.'
      };
    } 
    
    if (!recentIssues || recentIssues.length === 0) {
      return { 
        labels: ['No Data'], 
        datasets: [{ data: [0] }], 
        legend: ['Recent Volume'],
        subtitle: 'Trend over the last 7 active days.' 
      };
    }

    const validIssues = [...recentIssues].filter(i => 
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
  }, [recentIssues, isSolverView, user?.role, solvers]);

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
    if (!sitesList || sitesList.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    const topSites = [...sitesList]
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

  // Alert card config — keeps all routing logic untouched
  const alertCards = [
    {
      icon: 'alert-circle',
      count: alerts?.escalations || 0,
      label: 'Escalated',
      accentColor: '#ef4444',
      bgLight: '#fef2f2',
      bgDark: 'rgba(239,68,68,0.08)',
      borderLight: '#fecaca',
      borderDark: 'rgba(239,68,68,0.2)',
      iconBgLight: '#fee2e2',
      iconBgDark: 'rgba(239,68,68,0.15)',
      route: '/(main)/(tabs)/dashboard/escalated',
    },
    {
      icon: 'clipboard-outline',
      count: alerts?.pendingReviews || 0,
      label: 'Pending Review',
      accentColor: '#3b82f6',
      bgLight: '#eff6ff',
      bgDark: 'rgba(59,130,246,0.08)',
      borderLight: '#bfdbfe',
      borderDark: 'rgba(59,130,246,0.2)',
      iconBgLight: '#dbeafe',
      iconBgDark: 'rgba(59,130,246,0.15)',
      route: '/(main)/(tabs)/dashboard/awaiting_review',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111111' : '#f4f4f6' }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#111111' : '#f4f4f6' }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Analytics Overview</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{isSolverView ? 'Workspace' : 'Dashboard'}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {Platform.OS === 'web' && (
            <TouchableOpacity 
              onPress={onRefresh} 
              disabled={refreshing}
              style={styles.refreshButton}
            >
              <Ionicons 
                name="sync" 
                size={22} 
                color={refreshing ? theme.primary : theme.textSecondary} 
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/(main)/(tabs)/chat')} activeOpacity={0.7} style={{ marginRight: 4, padding: 4 }}>
            <Ionicons name="arrow-undo-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
            <Avatar uri={user?.avatar} name={user?.name} size="medium" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
      >

        {/* ── ACTION REQUIRED ALERTS (Manager only) ── */}
        {!isSolverView && <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Action Required</Text>
          
          <View style={styles.alertsRow}>
            {alertCards.map((card) => (
              <TouchableOpacity
                key={card.label}
                activeOpacity={0.75}
                onPress={() => router.push(card.route)}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: isDark ? card.bgDark : card.bgLight,
                    borderColor: isDark ? card.borderDark : card.borderLight,
                  },
                ]}
              >
                {/* Accent bar */}
                <View style={[styles.alertAccentBar, { backgroundColor: card.accentColor }]} />

                {/* Icon */}
                <View style={[styles.alertIconWrap, { backgroundColor: isDark ? card.iconBgDark : card.iconBgLight }]}>
                  <Ionicons name={card.icon} size={18} color={card.accentColor} />
                </View>

                {/* Count */}
                <Text style={[styles.alertCount, { color: card.accentColor }]}>
                  {card.count}
                </Text>

                {/* Label */}
                <Text
                  style={[styles.alertLabel, { color: isDark ? card.accentColor : card.accentColor }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {card.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>}

        {/* ── KEY METRICS ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <DashboardCard title={isSolverView ? "Active Tasks" : "Pending issues"} count={stats?.notFixedIssues || 0} icon="time-outline" color="#f59e0b" onPress={() => router.push('/(main)/(tabs)/dashboard/not-fixed')} />
            <DashboardCard title="Resolved" count={stats?.fixedIssues || 0} icon="checkmark-done" color="#10a37f" onPress={() => router.push('/(main)/(tabs)/dashboard/fixed')} />
          </View>

          {isSolverView ? (
            <>
              <View style={styles.statsRow}>
                <DashboardCard 
                  title="My Analytics" 
                  count={(stats?.fixedIssues || 0) + (stats?.notFixedIssues || 0)} 
                  icon="stats-chart" 
                  color="#8b5cf6" 
                  onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/solver-profile', params: { id: user?.id } })} 
                />
                <DashboardCard 
                  title="My Sites" 
                  count={sitesList?.length || 0} 
                  icon="business-outline" 
                  color="#3b82f6" 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/sites')}
                />
              </View>
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
                {user?.role !== 'customer_md' && (
                  <DashboardCard title="Solvers" count={solvers?.length || 0} icon="people-outline" color="#8b5cf6" onPress={() => router.push('/(main)/(tabs)/dashboard/solvers')} />
                )}
              </View>

              {/* ── Kairox v3.0 role-specific cards (Priority 1) ── */}
              {user?.role === 'supervisor' && (
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
              {user?.role === 'manager' && (
                <>
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
                </>
              )}
              {user?.role === 'customer_md' && (
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
        <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            {user?.role === 'manager' ? 'Solver Bandwidth' : isSolverView ? 'Upcoming Deadlines' : 'Recent Issues'}
          </Text>
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
          <ChartDownloadButton viewShotRef={lineChartRef} chartType={user?.role === 'manager' ? 'Solver Bandwidth' : 'Volume Over Time'} />
        </View>

        {/* ── PIE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Status Breakdown</Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Distribution of issues by current status.</Text>
          <View ref={pieChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, alignItems: 'center' }}>
            <PieChart data={pieData} width={SCREEN_WIDTH - 64} height={200} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="15" absolute />
          </View>
          <ChartDownloadButton viewShotRef={pieChartRef} chartType="Status Breakdown" />
        </View>

        {/* ── BAR CHART (Manager Only) ── */}
        {!isSolverView && user?.role === 'manager' && (
          <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Site Performance</Text>
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
        {recentIssues?.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 20, paddingBottom: 10 }}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>{isSolverView ? "My Active Tasks" : "Recent Activity"}</Text>
              <Text style={[styles.chartSubtitle, { color: theme.textSecondary, marginBottom: 10 }]}>Current tasks requiring attention.</Text>
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
                  style={[styles.issueRow, { borderTopColor: borderColor, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth }]}
                  onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/issue-detail', params: { id: issue.id } })}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    
                    <View style={styles.titleRow}>
                      <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={1}>
                        {issue.title}
                      </Text>
                      
                      {deadline && (
                        <View style={[styles.deadlineBadge, { backgroundColor: `${deadline.color}15` }]}>
                          <Text style={[styles.deadlineText, { color: deadline.color }]}>
                            {deadline.text}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>
                      {issue.site_name} · #{issue.id}
                      {displayDate ? ` · ${datePrefix}: ${displayDate}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={issue.status} />
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
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 3, letterSpacing: 0.2 },
  userName: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  refreshButton: { padding: 8, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
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
  statsContainer: { marginBottom: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  fullWidthCard: { flex: 1, marginRight: 0 },

  // ── ALERT CARDS — now match chart card language ──
  alertsRow: { flexDirection: 'row', gap: 10 },
  alertCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 0,          // accent bar sits flush at top
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  alertAccentBar: {
    width: '100%',          // full-width top stripe — mirrors chart card section headers
    height: 3,
    borderRadius: 2,
    marginBottom: 14,
    marginLeft: -12,        // bleed to edges of paddingHorizontal
    alignSelf: 'stretch',
    // override width approach:
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,          // pushes below the accent bar
    marginBottom: 12,
  },
  alertCount: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
    lineHeight: 34,
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 15,
  },

  // ── CHART CARDS ──
  chartCard: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 1 },
    }),
  },
  chartTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 3 },
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