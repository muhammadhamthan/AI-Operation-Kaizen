import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

const STATUS_OPTIONS = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved (Pending Review)', value: 'RESOLVED_PENDING_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Reopened', value: 'REOPENED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'high', color: '#ef4444' },
  { label: 'Medium', value: 'medium', color: '#f97316' },
  { label: 'Low', value: 'low', color: '#10a37f' },
];

const CATEGORY_OPTIONS = [
  { label: 'Electrical', value: 'Electrical' },
  { label: 'Plumbing', value: 'Plumbing' },
  { label: 'Safety', value: 'Safety' },
  { label: 'HVAC', value: 'HVAC' },
  { label: 'Mechanical', value: 'Mechanical' },
  { label: 'Building', value: 'Building' },
  { label: 'Other', value: 'Other' },
];

const DATE_RANGE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'All Time', value: 'all' },
];

const FilterModal = ({
  visible,
  onClose,
  onApply,
  initialFilters = {},
  sites = [],
}) => {
  const { theme, isDark } = useTheme();
  const [slideAnim] = useState(new Animated.Value(0));
  
  const [selectedStatuses, setSelectedStatuses] = useState(initialFilters.statuses || []);
  const [selectedPriorities, setSelectedPriorities] = useState(initialFilters.priorities || []);
  const [selectedCategories, setSelectedCategories] = useState(initialFilters.categories || []);
  const [selectedSite, setSelectedSite] = useState(initialFilters.site || null);
  const [selectedDateRange, setSelectedDateRange] = useState(initialFilters.dateRange || 'all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(initialFilters.overdueOnly || false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const toggleStatus = (status) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  const togglePriority = (priority) => setSelectedPriorities(prev => prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]);
  const toggleCategory = (category) => setSelectedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);

  const handleReset = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedCategories([]);
    setSelectedSite(null);
    setSelectedDateRange('all');
    setShowOverdueOnly(false);
  };

  const handleApply = () => {
    onApply({
      statuses: selectedStatuses,
      priorities: selectedPriorities,
      categories: selectedCategories,
      site: selectedSite,
      dateRange: selectedDateRange,
      overdueOnly: showOverdueOnly,
    });
    onClose();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedStatuses.length > 0) count++;
    if (selectedPriorities.length > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (selectedSite) count++;
    if (selectedDateRange !== 'all') count++;
    if (showOverdueOnly) count++;
    return count;
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  // ── STRICT MONOCHROME PALETTE ──
  const activeBg = isDark ? '#ffffff' : '#101010'; // Stark contrast
  const activeText = isDark ? '#000000' : '#ffffff';
  const inactiveBg = isDark ? '#212121' : '#f9f9f9';
  const inactiveBorder = isDark ? '#333333' : '#e5e5e5';
  const inactiveText = isDark ? '#a1a1aa' : '#52525b';

  const renderChip = (option, isSelected, onToggle, showColor = false) => {
    return (
      <TouchableOpacity
        key={option.value}
        activeOpacity={0.7}
        style={[
          styles.chip,
          { 
            backgroundColor: isSelected ? activeBg : inactiveBg,
            borderColor: isSelected ? activeBg : inactiveBorder,
            borderWidth: 1,
          },
        ]}
        onPress={onToggle}
      >
        {showColor && option.color && (
          <View style={[styles.colorDot, { backgroundColor: option.color }]} />
        )}
        <Text
          style={[
            styles.chipText,
            { color: isSelected ? activeText : inactiveText },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContainer, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', transform: [{ translateY }] }]}>
              
              <View style={styles.dragHandleContainer}>
                <View style={[styles.dragHandle, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} />
              </View>

              <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity onPress={handleReset} activeOpacity={0.6}>
                  <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Filters</Text>
                <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={26} color={isDark ? '#444' : '#e5e5e5'} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Status</Text>
                  <View style={styles.chipsContainer}>
                    {STATUS_OPTIONS.map(option => renderChip(option, selectedStatuses.includes(option.value), () => toggleStatus(option.value)))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Priority</Text>
                  <View style={styles.chipsContainer}>
                    {PRIORITY_OPTIONS.map(option => renderChip(option, selectedPriorities.includes(option.value), () => togglePriority(option.value), true))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Category</Text>
                  <View style={styles.chipsContainer}>
                    {CATEGORY_OPTIONS.map(option => renderChip(option, selectedCategories.includes(option.value), () => toggleCategory(option.value)))}
                  </View>
                </View>

                {sites.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Site</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          { 
                            backgroundColor: !selectedSite ? activeBg : inactiveBg,
                            borderColor: !selectedSite ? activeBg : inactiveBorder,
                            borderWidth: 1,
                          },
                        ]}
                        onPress={() => setSelectedSite(null)}
                      >
                        <Text style={[styles.chipText, { color: !selectedSite ? activeText : inactiveText }]}>
                          All Sites
                        </Text>
                      </TouchableOpacity>
                      {sites.map(site => (
                        <TouchableOpacity
                          key={site.id}
                          style={[
                            styles.chip,
                            { 
                              backgroundColor: selectedSite === site.id ? activeBg : inactiveBg,
                              borderColor: selectedSite === site.id ? activeBg : inactiveBorder,
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => setSelectedSite(site.id)}
                        >
                          <Text style={[styles.chipText, { color: selectedSite === site.id ? activeText : inactiveText }]}>
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Date Range</Text>
                  <View style={styles.chipsContainer}>
                    {DATE_RANGE_OPTIONS.map(option => renderChip(option, selectedDateRange === option.value, () => setSelectedDateRange(option.value)))}
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.toggleRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f9f9f9', borderColor: isDark ? '#333' : '#f0f0f0' }]}
                  onPress={() => setShowOverdueOnly(!showOverdueOnly)}
                >
                  <View style={styles.toggleContent}>
                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <Ionicons name="time" size={18} color="#ef4444" />
                    </View>
                    <Text style={[styles.toggleText, { color: theme.text }]}>Show Overdue Only</Text>
                  </View>
                  {/* Semantic Green used strictly for active toggle state */}
                  <View style={[styles.toggle, { backgroundColor: showOverdueOnly ? '#10a37f' : (isDark ? '#444' : '#e5e5e5') }]}>
                    <View style={[styles.toggleKnob, { transform: [{ translateX: showOverdueOnly ? 20 : 0 }] }]} />
                  </View>
                </TouchableOpacity>

                <View style={styles.bottomPadding} />
              </ScrollView>

              <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.applyButton, { backgroundColor: activeBg }]}
                  onPress={handleApply}
                >
                  <Text style={[styles.applyButtonText, { color: activeText }]}>
                    Apply Filters
                    {getActiveFilterCount() > 0 && ` (${getActiveFilterCount()})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 2,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12, // More structured squircle matching GPT interfaces
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 28,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  bottomPadding: {
    height: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default FilterModal;