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
  { label: 'Low', value: 'low', color: '#22c55e' },
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
  const { theme } = useTheme();
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

  const toggleStatus = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const togglePriority = (priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleReset = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedCategories([]);
    setSelectedSite(null);
    setSelectedDateRange('all');
    setShowOverdueOnly(false);
  };

  const handleApply = () => {
    const filters = {
      statuses: selectedStatuses,
      priorities: selectedPriorities,
      categories: selectedCategories,
      site: selectedSite,
      dateRange: selectedDateRange,
      overdueOnly: showOverdueOnly,
    };
    onApply(filters);
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

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const renderChip = (option, isSelected, onToggle, showColor = false) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.chip,
        { 
          backgroundColor: isSelected ? theme.primary : theme.inputBackground,
          borderColor: isSelected ? theme.primary : theme.border,
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
          { color: isSelected ? '#fff' : theme.text },
        ]}
      >
        {option.label}
      </Text>
      {isSelected && (
        <Ionicons name="checkmark" size={14} color="#fff" style={styles.chipIcon} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                { backgroundColor: theme.card, transform: [{ translateY }] },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={handleReset}>
                  <Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Filters</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Filter Content */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Status</Text>
                  <View style={styles.chipsContainer}>
                    {STATUS_OPTIONS.map(option =>
                      renderChip(
                        option,
                        selectedStatuses.includes(option.value),
                        () => toggleStatus(option.value)
                      )
                    )}
                  </View>
                </View>

                {/* Priority */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Priority</Text>
                  <View style={styles.chipsContainer}>
                    {PRIORITY_OPTIONS.map(option =>
                      renderChip(
                        option,
                        selectedPriorities.includes(option.value),
                        () => togglePriority(option.value),
                        true
                      )
                    )}
                  </View>
                </View>

                {/* Category */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Category</Text>
                  <View style={styles.chipsContainer}>
                    {CATEGORY_OPTIONS.map(option =>
                      renderChip(
                        option,
                        selectedCategories.includes(option.value),
                        () => toggleCategory(option.value)
                      )
                    )}
                  </View>
                </View>

                {/* Site */}
                {sites.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Site</Text>
                    <View style={styles.chipsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.chip,
                          { 
                            backgroundColor: !selectedSite ? theme.primary : theme.inputBackground,
                            borderColor: !selectedSite ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedSite(null)}
                      >
                        <Text style={[styles.chipText, { color: !selectedSite ? '#fff' : theme.text }]}>
                          All Sites
                        </Text>
                      </TouchableOpacity>
                      {sites.map(site => (
                        <TouchableOpacity
                          key={site.id}
                          style={[
                            styles.chip,
                            { 
                              backgroundColor: selectedSite === site.id ? theme.primary : theme.inputBackground,
                              borderColor: selectedSite === site.id ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedSite(site.id)}
                        >
                          <Text style={[styles.chipText, { color: selectedSite === site.id ? '#fff' : theme.text }]}>
                            {site.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Date Range */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Date Range</Text>
                  <View style={styles.chipsContainer}>
                    {DATE_RANGE_OPTIONS.map(option =>
                      renderChip(
                        option,
                        selectedDateRange === option.value,
                        () => setSelectedDateRange(option.value)
                      )
                    )}
                  </View>
                </View>

                {/* Overdue Toggle */}
                <TouchableOpacity
                  style={[styles.toggleRow, { backgroundColor: theme.inputBackground }]}
                  onPress={() => setShowOverdueOnly(!showOverdueOnly)}
                >
                  <View style={styles.toggleContent}>
                    <Ionicons name="time" size={20} color="#ef4444" />
                    <Text style={[styles.toggleText, { color: theme.text }]}>
                      Show Overdue Only
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: showOverdueOnly ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        {
                          transform: [{ translateX: showOverdueOnly ? 20 : 0 }],
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                <View style={styles.bottomPadding} />
              </ScrollView>

              {/* Apply Button */}
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: theme.primary }]}
                  onPress={handleApply}
                >
                  <Text style={styles.applyButtonText}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipIcon: {
    marginLeft: 2,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '500',
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
    backgroundColor: '#fff',
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterModal;
