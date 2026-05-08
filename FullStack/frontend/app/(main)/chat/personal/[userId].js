import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import Avatar from '../../../../src/components/common/Avatar';
import ChatBubble from '../../../../src/components/chat/ChatBubble';
import BudgetCardMessage from '../../../../src/components/chat/BudgetCardMessage';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import { users as mockUsers } from '../../../../src/mocks/users';
import { canChatWith } from '../../../../src/utils/roles';
import {
  getPersonalConversation,
  sendPersonalMessage,
  pollSince,
  MESSAGE_TYPES,
} from '../../../../src/services/mocks/personalChatMockService';
import {
  getBudgetRequests,
} from '../../../../src/services/mocks/budgetMockService';
import { sendBudgetCard } from '../../../../src/services/mocks/personalChatMockService';

/**
 * Personal (1:1) chat screen (Kairox §7 + §8).
 * Route: /(main)/chat/personal/[userId]
 *
 * Polls the mock service every 3s for new messages (prompt rule #9).
 */
export default function PersonalChatRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const me = useSelector(selectCurrentUser);
  const other = mockUsers.find((u) => String(u.id) === String(userId));

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showBudgetPicker, setShowBudgetPicker] = useState(false);
  const [myBudgets, setMyBudgets] = useState([]);
  const listRef = useRef(null);
  const lastTsRef = useRef(null);

  const allowed = canChatWith(me?.role, other?.role);

  const loadInitial = useCallback(async () => {
    if (!me || !other) return;
    const convo = await getPersonalConversation(me.id, other.id);
    setMessages(convo.messages || []);
    const last = convo.messages?.[convo.messages.length - 1];
    lastTsRef.current = last?.ts || new Date(0).toISOString();
  }, [me, other]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Poll every 3s for new messages (prompt rule #9).
  useEffect(() => {
    if (!me || !other) return;
    const id = setInterval(async () => {
      const fresh = await pollSince(me.id, other.id, lastTsRef.current);
      if (fresh.length > 0) {
        setMessages((prev) => [...prev, ...fresh]);
        lastTsRef.current = fresh[fresh.length - 1].ts;
      }
    }, 3000);
    return () => clearInterval(id);
  }, [me, other]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => {
        try { listRef.current.scrollToEnd({ animated: true }); } catch {}
      }, 80);
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await sendPersonalMessage(me, other.id, text);
    if (res.success) {
      setText('');
      setMessages(res.conversation.messages);
      lastTsRef.current = res.message.ts;
    } else {
      Alert.alert('Message not sent', res.error || 'Try again.');
    }
    setSending(false);
  };

  const onAttachBudget = async () => {
    if (me?.role !== 'supervisor' && me?.role !== 'manager') {
      Alert.alert('Not allowed', 'Only Supervisors and MDs can attach budget cards.');
      return;
    }
    const list = await getBudgetRequests(me);
    setMyBudgets(list);
    setShowBudgetPicker(true);
  };

  const pickBudget = async (budget) => {
    setShowBudgetPicker(false);
    const res = await sendBudgetCard(me, other.id, budget.id);
    if (res.success) {
      setMessages(res.conversation.messages);
      lastTsRef.current = res.message.ts;
    }
  };

  if (!other) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, padding: 24 }}>User not found.</Text>
      </SafeAreaView>
    );
  }

  if (!allowed) {
    return (
      <RoleGuard allowedRoles={[]} title="Chat blocked" message={`You cannot message a ${other.role} from your role.`}>
        <View />
      </RoleGuard>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} testID="chat-back">
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Avatar name={other.name} uri={other.avatar} size={34} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
            {other.name}
          </Text>
          <Text style={[styles.headerRole, { color: theme.textSecondary }]} numberOfLines={1}>
            {other.role === 'manager' ? 'Managing Director'
              : other.role === 'customer_md' ? "Customer's MD"
              : other.role === 'supervisor' ? 'Supervisor'
              : 'Problem Solver'}
          </Text>
        </View>
        <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name="chatbubbles-outline" size={50} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Secure AI Kaizen Chat</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                This conversation is private. Send a message to {other.name} to start collaborating on operational tasks.
              </Text>
              <View style={[styles.securityBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5' }]}>
                <Ionicons name="lock-closed" size={12} color="#10b981" />
                <Text style={styles.securityText}>End-to-end encrypted</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.from === me?.id;
            if (item.type === MESSAGE_TYPES.BUDGET_CARD) {
              return (
                <View style={[styles.bcWrap, isOwn ? styles.right : styles.left]}>
                  <BudgetCardMessage
                    budgetId={item.budget_id}
                    viewerRole={me?.role}
                    viewerUser={me}
                  />
                </View>
              );
            }
            return (
              <ChatBubble
                text={item.text}
                isOwn={isOwn}
                ts={item.ts}
              />
            );
          }}
        />

        {/* Input row */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          {(me?.role === 'supervisor' || me?.role === 'manager') && (
            <TouchableOpacity
              onPress={onAttachBudget}
              style={[styles.attachBtn, { borderColor: theme.border }]}
              activeOpacity={0.7}
              testID="chat-attach-budget"
            >
              <Ionicons name="wallet-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
              },
            ]}
            placeholder="Write a message..."
            placeholderTextColor={theme.textSecondary + '99'}
            value={text}
            onChangeText={setText}
            multiline
            testID="chat-input"
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? theme.primary : isDark ? '#333' : '#e5e5e5',
              },
            ]}
            testID="chat-send"
          >
            <Ionicons name="send" size={16} color={text.trim() ? '#fff' : theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Budget picker */}
      {showBudgetPicker && (
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity style={styles.pickerBackdropTouch} onPress={() => setShowBudgetPicker(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Attach a budget request</Text>
              <TouchableOpacity onPress={() => setShowBudgetPicker(false)} testID="budget-picker-close">
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {myBudgets.length === 0 ? (
              <Text style={{ color: theme.textSecondary, padding: 16 }}>No budget requests to attach.</Text>
            ) : (
              myBudgets.slice(0, 6).map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  onPress={() => pickBudget(b)}
                  activeOpacity={0.7}
                  testID={`budget-picker-item-${b.id}`}
                >
                  <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.pickerRowTitle, { color: theme.text }]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[styles.pickerRowSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {'\u20B9'}{new Intl.NumberFormat('en-IN').format(b.amount)} · {b.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerRole: { fontSize: 11, marginTop: 1 },
  list: { padding: 14, flexGrow: 1, gap: 2, paddingBottom: 20 },
  
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    opacity: 0.7,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  securityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#10b981',
  },

  bcWrap: { marginVertical: 4, maxWidth: '78%' },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, justifyContent: 'center', alignItems: 'center',
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  pickerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerBackdropTouch: { flex: 1 },
  pickerSheet: {
    borderTopLeftRadius: 14, borderTopRightRadius: 14,
    borderWidth: 1, padding: 14, gap: 8, paddingBottom: 28,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pickerTitle: { fontSize: 15, fontWeight: '700' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  pickerRowTitle: { fontSize: 13, fontWeight: '700' },
  pickerRowSub: { fontSize: 11, marginTop: 2 },
});
