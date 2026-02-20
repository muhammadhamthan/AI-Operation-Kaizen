import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { fetchDashboardData, selectStats, selectCharts, selectDashboardLoading } from '../../../../src/store/slices/dashboardSlice';
import { selectIsOnline } from '../../../../src/store/slices/offlineSlice';
import DashboardCard from '../../../../src/components/dashboard/DashboardCard';
import ChartDownloadButton from '../../../../src/components/dashboard/ChartDownloadButton';
import Loader from '../../../../src/components/common/Loader';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const stats = useSelector(selectStats);
  const charts = useSelector(selectCharts);
  const loading = useSelector(selectDashboardLoading);
  const isOnline = useSelector(selectIsOnline);
  
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 📸 REFS FOR PDF CAPTURE
  const lineChartRef = useRef();
  const pieChartRef = useRef();
  const barChartRef = useRef();

  useEffect(() => {
    if (user) dispatch(fetchDashboardData(user));
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (!isOnline) {
      setToastMessage("Can't refresh while offline");
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }
    const now = Date.now();
    if (lastRefresh && now - lastRefresh < 5000) {
      setToastMessage('Just refreshed. Wait a moment.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setRefreshing(true);
    if (user) await dispatch(fetchDashboardData(user));
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  if (loading) return <Loader message="Analyzing data..." />;

  // ── PREMIUM CHART CONFIG ──
  const chartConfig = {
    backgroundColor: isDark ? '#171717' : '#ffffff',
    backgroundGradientFrom: isDark ? '#171717' : '#ffffff',
    backgroundGradientTo: isDark ? '#171717' : '#ffffff',
    color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity * 0.5})` : `rgba(0, 0, 0, ${opacity * 0.5})`,
    labelColor: () => theme.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForLabels: { fontSize: 11, fontWeight: '500' },
    propsForDots: { r: "4", strokeWidth: "2", stroke: isDark ? '#171717' : '#ffffff' },
  };

  const lineData = {
    labels: charts.trend?.map(d => d.day) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      { data: charts.trend?.map(d => d.created) || [3, 4, 2, 5, 4, 3, 2], color: () => '#ef4444' }, // Red
      { data: charts.trend?.map(d => d.completed) || [2, 3, 3, 4, 3, 2, 3], color: () => '#10a37f' }, // OpenAI Green
    ],
    legend: ['Created', 'Completed'],
  };

  const pieColors = ['#10a37f', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6'];
  const pieData = charts.issueTypes?.map((item, index) => ({
    name: item.name,
    population: item.count,
    color: pieColors[index % pieColors.length],
    legendFontColor: theme.text,
    legendFontSize: 12,
  })) || [
    { name: 'Plumbing', population: 8, color: '#10a37f', legendFontColor: theme.text, legendFontSize: 12 },
    { name: 'Electrical', population: 6, color: '#3b82f6', legendFontColor: theme.text, legendFontSize: 12 },
    { name: 'HVAC', population: 4, color: '#ef4444', legendFontColor: theme.text, legendFontSize: 12 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
      
      {/* ── HEADER ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Analytics Overview</Text>
          <Text style={[styles.userName, { color: theme.text }]}>Dashboard</Text>
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
        
        {/* ── KEY METRICS ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <DashboardCard title="Pending" count={stats.notFixedIssues} icon="time-outline" color="#f59e0b" onPress={() => router.push('/(main)/(tabs)/dashboard/not-fixed')} />
            <DashboardCard title="Resolved" count={stats.fixedIssues} icon="checkmark-done" color="#10a37f" onPress={() => router.push('/(main)/(tabs)/dashboard/fixed')} />
          </View>
          <DashboardCard title="Escalated Complaints" count={stats.complaints} icon="warning-outline" color="#ef4444" onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')} style={styles.fullWidthCard} />
        </View>

        {/* ── LINE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#ffffff', borderColor: isDark ? '#333' : '#e5e5e5' }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Volume Over Time</Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>7-day rolling average of issue creation vs completion.</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* 🚀 Changed to View with collapsable={false} for Web/PDF Fix */}
            <View ref={lineChartRef} collapsable={false} style={{ backgroundColor: isDark ? '#171717' : '#ffffff', paddingRight: 16 }}>
              <LineChart
                data={lineData}
                width={SCREEN_WIDTH - 32}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
              />
            </View>
          </ScrollView>
          <ChartDownloadButton viewShotRef={lineChartRef} chartType="Volume Over Time" />
        </View>

        {/* ── PIE CHART ── */}
        <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#ffffff', borderColor: isDark ? '#333' : '#e5e5e5' }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Category Breakdown</Text>
          <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Distribution of issues by maintenance category.</Text>
          
          <View ref={pieChartRef} collapsable={false} style={{ backgroundColor: isDark ? '#171717' : '#ffffff', alignItems: 'center' }}>
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH - 64}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
          <ChartDownloadButton viewShotRef={pieChartRef} chartType="Category Breakdown" />
        </View>

        {/* ── BAR CHART (Manager Only) ── */}
        {user?.role === 'manager' && (
          <View style={[styles.chartCard, { backgroundColor: isDark ? '#171717' : '#ffffff', borderColor: isDark ? '#333' : '#e5e5e5' }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Site Performance</Text>
            <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>Total issues handled per location.</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View ref={barChartRef} collapsable={false} style={{ backgroundColor: isDark ? '#171717' : '#ffffff', paddingRight: 16 }}>
                <BarChart
                  data={{
                    labels: charts.sitesComparison?.map(s => s.siteName.substring(0, 5)) || ['Vepery', 'Ambat', 'Guindy', 'Perun', 'Taram'],
                    datasets: [{ data: charts.sitesComparison?.map(s => s.open + s.completed) || [8, 6, 7, 5, 4] }],
                  }}
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

        <View style={styles.bottomPadding} />
      </ScrollView>

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 20,
  },
  greeting: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  userName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  content: { padding: 16 },
  statsContainer: { marginBottom: 24 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  fullWidthCard: { flex: 1, marginRight: 0 },
  chartCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    // Modern Flat shadow (very subtle)
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  chartTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  chartSubtitle: { fontSize: 13, marginBottom: 24, lineHeight: 18 },
  chart: { borderRadius: 12, marginLeft: -10 },
  bottomPadding: { height: 40 },
});