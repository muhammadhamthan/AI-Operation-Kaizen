import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/constants';

const StatusBadge = ({ status, type = 'status', size = 'medium' }) => {
  const isStatus = type === 'status';
  const colors = isStatus ? STATUS_COLORS : PRIORITY_COLORS;
  const labels = isStatus ? STATUS_LABELS : PRIORITY_LABELS;

  const color = colors[status] || '#6b7280';
  const label = labels[status] || status;

  const getIcon = () => {
    if (type === 'priority') {
      switch (status) {
        case 'high': return 'alert-circle';
        case 'medium': return 'remove-circle';
        case 'low': return 'checkmark-circle';
        default: return 'ellipse';
      }
    }
    switch (status) {
      case 'OPEN': return 'radio-button-off';
      case 'ASSIGNED': return 'person';
      case 'IN_PROGRESS': return 'time';
      case 'COMPLETED': return 'checkmark-circle';
      case 'ESCALATED': return 'warning';
      case 'REOPENED': return 'refresh';
      default: return 'ellipse';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingHorizontal: 8, paddingVertical: 2 };
      case 'large': return { paddingHorizontal: 16, paddingVertical: 8 };
      default: return { paddingHorizontal: 12, paddingVertical: 4 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return 10;
      case 'large': return 14;
      default: return 12;
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: `${color}15` }, getPadding()]}>
      <Ionicons name={getIcon()} size={getFontSize() + 2} color={color} style={styles.icon} />
      <Text style={[styles.text, { color, fontSize: getFontSize() }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default StatusBadge;
