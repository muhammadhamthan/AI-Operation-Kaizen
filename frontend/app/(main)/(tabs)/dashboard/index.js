import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
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
import Card from '../../../../src/components/common/Card';
import Loader from '../../../../src/components/common/Loader';
import Avatar from '../../../../src/components/common/Avatar';
import Toast from '../../../../src/components/common/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const { theme } = useTheme();
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

  useEffect(() => {
    if (user) {
      dispatch(fetchDashboardData(user));
    }
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
    if (user) {
      await dispatch(fetchDashboardData(user));
    }
    setLastRefresh(Date.now());
    setRefreshing(false);
  }, [user, isOnline, lastRefresh]);

  if (loading) {
    return <Loader message="Loading dashboard..." />;
  }

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    labelColor: () => theme.textSecondary,
    propsForLabels: {
      fontSize: 10,
    },
  };

  const lineData = {
    labels: charts.trend?.map(d => d.day) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: charts.trend?.map(d => d.created) || [3, 4, 2, 5, 4, 3, 2],
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: charts.trend?.map(d => d.completed) || [2, 3, 3, 4, 3, 2, 3],
        color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ['Created', 'Completed'],
  };

  const pieColors = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#eab308'];
  const pieData = charts.issueTypes?.map((item, index) => ({
    name: item.name,
    population: item.count,
    color: pieColors[index % pieColors.length],
    legendFontColor: theme.textSecondary,
    legendFontSize: 11,
  })) || [
    { name: 'Plumbing', population: 8, color: '#3b82f6', legendFontColor: theme.textSecondary, legendFontSize: 11 },
    { name: 'Electrical', population: 6, color: '#ef4444', legendFontColor: theme.textSecondary, legendFontSize: 11 },
    { name: 'HVAC', population: 4, color: '#22c55e', legendFontColor: theme.textSecondary, legendFontSize: 11 },
    { name: 'Maintenance', population: 5, color: '#f97316', legendFontColor: theme.textSecondary, legendFontSize: 11 },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
          <Avatar uri={user?.avatar} name={user?.name} size="medium" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Stats Cards - 3 Cards: Not Fixed, Fixed, Complaints */}
        {/* Total Issues moved to Issues tab */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <DashboardCard
              title="Not Fixed"
              count={stats.notFixedIssues}
              icon="time"
              color="#f97316"
              onPress={() => router.push('/(main)/(tabs)/dashboard/not-fixed')}
            />
            <DashboardCard
              title="Fixed"
              count={stats.fixedIssues}
              icon="checkmark-circle"
              color="#16a34a"
              onPress={() => router.push('/(main)/(tabs)/dashboard/fixed')}
            />
          </View>
          <View style={styles.statsRow}>
            <DashboardCard
              title="Complaints"
              count={stats.complaints}
              icon="alert-circle"
              color="#ef4444"
              onPress={() => router.push('/(main)/(tabs)/dashboard/complaints')}
              style={styles.fullWidthCard}
            />
          </View>
        </View>

        {/* Line Chart - Issues Trend */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            Issues Trend (Last 7 Days)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={lineData}
              width={SCREEN_WIDTH - 64}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
            />
          </ScrollView>
          <ChartDownloadButton chartData={lineData} chartType="line" />
        </Card>

        {/* Pie Chart - Issues by Type */}
        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>
            Issues by Type
          </Text>
          <PieChart
            data={pieData}
            width={SCREEN_WIDTH - 64}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
          <ChartDownloadButton chartData={pieData} chartType="pie" />
        </Card>

        {/* Bar Chart - Manager Only */}
        {user?.role === 'manager' && (
          <Card style={styles.chartCard}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Issues by Site
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={{
                  labels: charts.sitesComparison?.map(s => s.siteName) || ['Vepery', 'Ambattur', 'Guindy', 'Perungudi', 'Taramani'],
                  datasets: [
                    {
                      data: charts.sitesComparison?.map(s => s.open + s.completed) || [8, 6, 7, 5, 4],
                    },
                  ],
                }}
                width={SCREEN_WIDTH - 32}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                }}
                style={styles.chart}
                showValuesOnTopOfBars
              />
            </ScrollView>
            <ChartDownloadButton chartData={charts.sitesComparison} chartType="bar" />
          </Card>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {toastMessage !== '' && <Toast message={toastMessage} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  fullWidthCard: {
    flex: 1,
    marginRight: 0,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  bottomPadding: {
    height: 24,
  },
});
