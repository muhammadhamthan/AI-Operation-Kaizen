import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { getChatbotSuggestions } from '../../config/chatbotIntents';

/**
 * Role-personalised quick-action chips for the AI chatbot empty state
 * (Kairox §2). Replaces the old hard-coded `SUGGESTIONS` array that
 * showed the same 4 chips to every user.
 *
 * Behaviour: tapping a chip fires `onSelect(text)` — the parent (chat
 * screen) wires this to fill the chat input (existing MVP behaviour).
 */
const QuickActionChips = ({ role, onSelect }) => {
  const { theme, isDark } = useTheme();
  const chips = getChatbotSuggestions(role);

  return (
    <View
      style={styles.grid}
      testID="chat-quick-action-chips"
    >
      {chips.map((chip, index) => (
        <TouchableOpacity
          key={`${chip.text}-${index}`}
          style={[
            styles.chip,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fafafa',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          onPress={() => onSelect?.(chip.text)}
          activeOpacity={0.7}
          testID={`quick-chip-${index}`}
        >
          <Ionicons
            name={chip.icon}
            size={20}
            color={theme.textSecondary}
            style={styles.icon}
          />
          <Text
            style={[styles.text, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {chip.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 720,
  },
  chip: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '47%',
    minWidth: 150,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  icon: { marginBottom: 8, opacity: 0.8 },
  text: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
});

export default QuickActionChips;
