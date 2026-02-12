import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import Card from '../../../../src/components/common/Card';
import StatusBadge from '../../../../src/components/common/StatusBadge';
import Avatar from '../../../../src/components/common/Avatar';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';
import { formatDate } from '../../../../src/utils/formatters';
import { getUserById } from '../../../../src/mocks/users';
import { getAssignmentByIssueId } from '../../../../src/mocks/issueAssignments';

export default function FixedIssuesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (user) dispatch(fetchIssues(user));
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const renderItem = ({ item }) => {
    const assignment = getAssignmentByIssueId(item.id);
    const solver = assignment ? getUserById(assignment.assigned_to_solver_id) : null;

    return (
      <Card
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#16a34a' }]}
        onPress={() => router.push({ pathname: '/(main)/(tabs)/dashboard/fixed-detail', params: { id: item.id } })}
      >
        <View style={styles.cardHeader}>
          <StatusBadge status="COMPLETED" size="small" />
          <Text style={[styles.cardId, { color: theme.primary }]}>#{item.id}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{item.site?.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>{formatDate(item.updated_at)}</Text>
          </View>
        </View>
        {solver && (
          <View style={styles.solverRow}>
            <Avatar uri={solver.avatar} name={solver.name} size="small" />
            <Text style={[styles.solverName, { color: theme.text }]}>{solver.name}</Text>
          </View>
        )}
      </Card>
    );
  };

  if (loading && issues.length === 0) return <Loader message="Loading fixed issues..." />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#16a34a' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fixed Issues</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search fixed issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="No completed issues" message="No issues have been completed yet." />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  placeholder: { width: 32 },
  searchContainer: { padding: 16 },
  searchInput: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 8 },
  searchTextInput: { flex: 1, fontSize: 16 },
  listContent: { padding: 16, paddingTop: 8 },
  card: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardId: { fontSize: 14, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13 },
  solverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  solverName: { fontSize: 14, fontWeight: '500' },
});
