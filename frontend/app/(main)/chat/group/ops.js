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
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';

import { useTheme } from '../../../../src/theme/ThemeContext';
import { selectCurrentUser } from '../../../../src/store/slices/authSlice';
import ChatBubble from '../../../../src/components/chat/ChatBubble';
import AIMonthlySummary from '../../../../src/components/chat/AIMonthlySummary';
import RoleGuard from '../../../../src/components/navigation/RoleGuard';
import { users as mockUsers } from '../../../../src/mocks/users';
import {
  getOpsGroup,
  sendGroupMessage,
  togglePinGroupMessage,
  pollGroupSince,
} from '../../../../src/services/mocks/groupChatMockService';

/**
 * Ops Team group chat (Kairox §14).
 * - All Supervisors + MD
 * - MD can pin/unpin decisions
 * - AI Monthly Summary renders inline
 */
export default function OpsGroupRoute() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const me = useSelector(selectCurrentUser);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const listRef = useRef(null);
  const lastTsRef = useRef(null);

  const loadInitial = useCallback(async () => {
    const g = await getOpsGroup();
    setGroup(g);
    setMessages(g.messages || []);
    const last = g.messages?.[g.messages.length - 1];
    lastTsRef.current = last?.ts || new Date(0).toISOString();
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    const id = setInterval(async () => {
      const { messages: fresh, pinned_ids } = await pollGroupSince(lastTsRef.current);
      if (fresh.length > 0) {
        setMessages((prev) => [...prev, ...fresh]);
        lastTsRef.current = fresh[fresh.length - 1].ts;
      }
      if (pinned_ids) {
        setGroup((g) => (g ? { ...g, pinned_ids } : g));
      }
    }, 3000);
    return () => clearInterval(id);
  }, []);

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
    const res = await sendGroupMessage(me, text);
    if (res.success) {
      setText('');
      setMessages(res.group.messages);
      lastTsRef.current = res.message.ts;
    }
    setSending(false);
  };

  const onPin = async (messageId) => {
    if (me?.role !== 'manager') {
      Alert.alert('Only the MD can pin decisions');
      return;
    }
    const res = await togglePinGroupMessage(me, messageId);
    if (res.success) setGroup(res.group);
  };

  const senderName = (fromId) => {
    if (!fromId) return 'System';
    const u = mockUsers.find((x) => x.id === fromId);
    return u?.name || 'Unknown';
  };

  const pinnedMessages = (group?.pinned_ids || [])
    .map((pid) => messages.find((m) => m.id === pid))
    .filter(Boolean);

  return (
    <RoleGuard action="view:opsGroupChat">
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} testID="group-back">
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.headerIcon, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="people" size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerName, { color: theme.text }]}>{group?.name || 'Ops Team'}</Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
              {group?.member_ids?.length || 0} members · {(group?.pinned_ids || []).length} pinned
            </Text>
          </View>
          {pinnedMessages.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowPinned((v) => !v)}
              testID="group-pinned-toggle"
              style={{ padding: 4 }}
            >
              <Ionicons
                name={showPinned ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Pinned messages drawer */}
        {showPinned && pinnedMessages.length > 0 && (
          <View style={[styles.pinBar, { backgroundColor: theme.primaryLight, borderBottomColor: theme.border }]}>
            <View style={styles.pinHeader}>
              <Ionicons name="bookmark" size={14} color={theme.primary} />
              <Text style={[styles.pinHeaderText, { color: theme.primary }]}>Pinned decisions</Text>
            </View>
            {pinnedMessages.map((m) => (
              <Text key={m.id} style={[styles.pinItem, { color: theme.text }]} numberOfLines={2}>
                · {m.text}
              </Text>
            ))}
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              if (item.type === 'ai_summary') {
                return <AIMonthlySummary summary={item.summary} period={item.period} />;
              }
              const isOwn = item.from === me?.id;
              const isPinned = (group?.pinned_ids || []).includes(item.id);
              return (
                <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
                  <ChatBubble
                    text={item.text}
                    isOwn={isOwn}
                    senderName={senderName(item.from)}
                    showSender={!isOwn}
                    ts={item.ts}
                  />
                  {me?.role === 'manager' && (
                    <TouchableOpacity
                      onPress={() => onPin(item.id)}
                      style={styles.pinBtn}
                      testID={`pin-${item.id}`}
                    >
                      <Ionicons
                        name={isPinned ? 'bookmark' : 'bookmark-outline'}
                        size={14}
                        color={isPinned ? theme.primary : theme.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />

          <View style={[styles.inputBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Message the Ops Team..."
              placeholderTextColor={theme.textSecondary + '99'}
              value={text}
              onChangeText={setText}
              multiline
              testID="group-input"
            />
            <TouchableOpacity
              onPress={onSend}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn,
                { backgroundColor: text.trim() ? theme.primary : isDark ? '#333' : '#e5e5e5' },
              ]}
              testID="group-send"
            >
              <Ionicons name="send" size={16} color={text.trim() ? '#fff' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  headerName: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  pinBar: {
    padding: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  pinHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  pinItem: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  list: { padding: 14, flexGrow: 1, paddingBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  pinBtn: { padding: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, borderTopWidth: StyleSheet.hairlineWidth,
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
});
