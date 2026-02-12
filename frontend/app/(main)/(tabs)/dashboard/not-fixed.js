import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import { fetchIssues, selectNotFixedIssues, selectIssuesLoading, setFilters } from '../../../../src/store/slices/issuesSlice';
import IssueCard from '../../../../src/components/issue/IssueCard';
import Loader from '../../../../src/components/common/Loader';
import EmptyState from '../../../../src/components/common/EmptyState';

export default function NotFixedIssuesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const issues = useSelector(selectNotFixedIssues);
  const loading = useSelector(selectIssuesLoading);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (user) {
      dispatch(fetchIssues(user));
    }
  }, [user]);

  useEffect(() => {
    dispatch(setFilters({ search: searchText }));
  }, [searchText]);

  const handleIssuePress = (issue) => {
    router.push({ pathname: '/(main)/(tabs)/dashboard/not-fixed-detail', params: { id: issue.id } });
  };

  if (loading && issues.length === 0) {
    return <Loader message="Loading issues..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: '#f97316' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Not Fixed Issues</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.searchInput, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchTextInput, { color: theme.text }]}
            placeholder="Search issues..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <IssueCard issue={item} onPress={() => handleIssuePress(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="All Clear!" message="No pending issues at the moment." />}
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
});
