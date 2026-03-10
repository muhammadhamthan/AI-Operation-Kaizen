import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
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
  selectIsSolverView, // ✅ IMPORTED PROPERLY
  selectDashboardLoading 
} from '../../../../src/store/slices/dashboardSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import { fetchSolversPerformance, selectAllSolvers } from '../../../../src/store/slices/performanceSlice';
import { fetchSitesWithAnalytics, selectAllSites } from '../../../../src/store/slices/sitesSlice';
// ✅ IMPORTED COMPLAINTS ACTIONS AND SELECTORS
import { fetchComplaints, selectAllComplaints } from '../../../../src/store/slices/complaintsSlice';

import DashboardCard from '../../../../src/components/dashboard/DashboardCard';
import ChartDownloadButton from '../../../../src/components/dashboard/ChartDownloadButton';
import Loader from '../../../../src/components/common/Loader';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';
import StatusBadge from '../../../../src/components/common/StatusBadge'; 

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const user = useSelector(selectCurrentUser);
  const stats = useSelector(selectStats);
  const charts = useSelector(selectCharts);
  const alerts = useSelector(selectAlerts) || {};
  const recentIssues = useSelector(selectRecentIssues) || [];
  const isSolverView = useSelector(selectIsSolverView); // ✅ DETECTS IF USER IS SOLVER
  const loading = useSelector(selectDashboardLoading);
  const isOnline = useSelector(selectIsOnline);
  const solvers = useSelector(selectAllSolvers);
  const sitesList = useSelector(selectAllSites);
  const complaintsList = useSelector(selectAllComplaints); // ✅ SELECT COMPLAINTS LIST

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
      dispatch(fetchComplaints(user)); // ✅ FETCH COMPLAINTS ON MOUNT
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    setRefreshing(true);
    if (user) {
      await dispatch(fetchDashboardData(user));
      await dispatch(fetchSolversPerformance(user));
      await dispatch(fetchSitesWithAnalytics(user));
      await dispatch(fetchComplaints(user)); // ✅ FETCH COMPLAINTS ON REFRESH
    }
    setRefreshing(false);
  }, [user, isOnline]);

  const surfaceColor = isDark ? '#171717' : '#ffffff';
  const borderColor = isDark ? '#333333' : '#e5e5e5';

  // ==========================================
  // 🧮 DYNAMIC CHART DATA CALCULATIONS
  // ==========================================

  // 1. Line Chart
  const calculatedLineData = useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(daysOfWeek[d.getDay()]);
      
      const dateString = d.toISOString().split('T')[0];
      const count = recentIssues.filter(issue => issue.created_at?.startsWith(dateString)).length;
      data.push(count);
    }

    return {
      labels,
      datasets: [{ data, color: () => '#ef4444' }],
      legend: [isSolverView ? 'Tasks Assigned' : 'Opened Issues'],
    };
  }, [recentIssues, isSolverView]);

  // 2. Pie Chart
  const pieData = charts?.issuesByCategory?.length > 0 
    ? charts.issuesByCategory.map((item) => ({
        name: item.name,
        population: item.count,
        color: item.color,
        legendFontColor: theme.text,
        legendFontSize: 12,
      })) 
    : [{ name: 'No Data', population: 1, color: isDark ? '#333' : '#e5e5e5', legendFontColor: theme.text, legendFontSize: 12 }];

 // 3. Bar Chart
  const calculatedBarData = useMemo(() => {
    if (!sitesList || sitesList.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    const topSites = [...sitesList]
      // ✅ FIXED: Changed totalIssues to total_issues (snake_case)
      .sort((a, b) => (b.analytics?.total_issues || 0) - (a.analytics?.total_issues || 0))
      .slice(0, 5);

    return {
      labels: topSites.map(s => s.name.substring(0, 5)),
      // ✅ FIXED: Changed totalIssues to total_issues (snake_case)
      datasets: [{ data: topSites.map(s => s.analytics?.total_issues || 0) }]
    };
  }, [sitesList]);
  // ==========================================
  // UI RENDER
  // ==========================================

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Analytics Overview</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{isSolverView ? 'Workspace' : 'Dashboard'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')} activeOpacity={0.7}>
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />}
      >

        {/* ── ACTION REQUIRED ALERTS (Hidden for Solvers, always shows for Managers/Supervisors) ── */}
        {!isSolverView && (
          <View style={styles.statsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Action Required</Text>
            <View style={styles.alertsRow}>
              
              <View style={[styles.alertCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }]}>
                <Ionicons name="alert-circle" size={22} color="#ef4444" />
                <Text style={[styles.alertCount, { color: '#ef4444' }]}>{alerts?.escalations || 0}</Text>
                <Text style={[styles.alertLabel, { color: '#ef4444' }]}>Escalated</Text>
              </View>
              
              <View style={[styles.alertCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb', borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a' }]}>
                <Ionicons name="timer" size={22} color="#f59e0b" />
                <Text style={[styles.alertCount, { color: '#f59e0b' }]}>{alerts?.deadlines || 0}</Text>
                <Text style={[styles.alertLabel, { color: '#f59e0b' }]}>Deadlines</Text>
              </View>
              
              <View style={[styles.alertCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff', borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#bfdbfe' }]}>
                <Ionicons name="clipboard" size={22} color="#3b82f6" />
                <Text style={[styles.alertCount, { color: '#3b82f6' }]}>{alerts?.pendingReviews || 0}</Text>
                <Text style={[styles.alertLabel, { color: '#3b82f6' }]}>Reviews</Text>
              </View>

            </View>
          </View>
        )}

        {/* ── KEY METRICS ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <DashboardCard title={isSolverView ? "Active Tasks" : "Pending"} count={stats?.notFixedIssues || 0} icon="time-outline" color="#f59e0b" onPress={() => router.push('/(main)/(tabs)/dashboard/not-fixed')} />
            <DashboardCard title="Resolved" count={stats?.fixedIssues || 0} icon="checkmark-done" color="#10a37f" onPress={() => router.push('/(main)/(tabs)/dashboard/fixed')} />
          </View>

          {/* Role-Based Analytics Cards */}
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
                {/* ✅ ADDED MY SITES CARD FOR SOLVERS */}
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
                  count={complaintsList?.length || 0} 
                  icon="warning-outline" 
                  color="#ef4444" 
                  style={styles.fullWidthCard} 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.statsRow}>
                <DashboardCard 
                  title="Total Complaints" 
                  count={complaintsList?.length || 0} 
                  icon="warning-outline" 
                  color="#ef4444" 
                  onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')} 
                  style={styles.fullWidthCard} 
                />
              </View>
              <View style={styles.statsRow}>
                <DashboardCard title="Sites" count={sitesList?.length || 0} icon="business-outline" color="#3b82f6" onPress={() => router.push('/(main)/(tabs)/dashboard/sites')} />
                <DashboardCard title="Team" count={solvers?.length || 0} icon="people-outline" color="#8b5cf6" onPress={() => router.push('/(main)/(tabs)/dashboard/solvers')} />
              </View>
            </>
          )}
        </View>

        {/* ── LINE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: surfaceColor, borderColor }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>{isSolverView ? "Task Volume" : "Opened Issues"}</Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Volume of newly opened issues recently.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View ref={lineChartRef} collapsable={false} style={{ backgroundColor: surfaceColor, paddingRight: 16 }}>
              <LineChart data={calculatedLineData} width={SCREEN_WIDTH - 32} height={220} chartConfig={chartConfig} bezier style={styles.chart} withInnerLines={true} withOuterLines={false} />
            </View>
          </ScrollView>
          <ChartDownloadButton viewShotRef={lineChartRef} chartType="Volume Over Time" />
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
              <Text style={[styles.chartTitle, { color: theme.text }]}>{isSolverView ? "My Active Tasks" : "Recent Issues"}</Text>
              <Text style={[styles.chartSubtitle, { color: theme.textSecondary, marginBottom: 10 }]}>Latest issues reported across your sites.</Text>
            </View>
            {recentIssues.slice(0, 5).map((issue, index) => (
              <TouchableOpacity 
                key={issue.id} 
                style={[styles.issueRow, { borderTopColor: borderColor, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth }]}
                onPress={() => router.push({ pathname: '/(main)/(tabs)/issues/issue-detail', params: { id: issue.id } })}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={1}>{issue.title}</Text>
                  <Text style={[styles.issueMeta, { color: theme.textSecondary }]}>{issue.site_name} · #{issue.id}</Text>
                </View>
                <StatusBadge status={issue.status} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.viewAllButton, { borderTopColor: borderColor }]}
              onPress={() => router.push('/(main)/(tabs)/issues')}
            >
              <Text style={[styles.viewAllText, { color: theme.textSecondary }]}>View All {isSolverView ? 'Tasks' : 'Issues'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 20 },
  greeting: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  userName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginLeft: 4 },
  statsContainer: { marginBottom: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  alertsRow: { flexDirection: 'row', gap: 12 },
  fullWidthCard: { flex: 1, marginRight: 0 },
  alertCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  alertCount: { fontSize: 24, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  alertLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chartCard: { marginBottom: 20, padding: 20, borderRadius: 16, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 }, android: { elevation: 1 } }) },
  chartTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  chartSubtitle: { fontSize: 13, marginBottom: 24, lineHeight: 18 },
  chart: { borderRadius: 12, marginLeft: -10 },
  issueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  issueTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  issueMeta: { fontSize: 13 },
  viewAllButton: { paddingVertical: 14, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  viewAllText: { fontSize: 13, fontWeight: '600' },
  bottomPadding: { height: 40 },
});