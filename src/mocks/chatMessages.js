// Chat Messages Mock Data - Sample conversations
export const chatMessages = [
  // Conversation 1 - Supervisor asking about issues
  {
    id: 1,
    conversation_id: 'conv_001',
    user_id: 1,
    issue_id: null,
    role_in_chat: 'user',
    message: 'Show me all high priority issues at Vepery',
    attachments: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 2,
    conversation_id: 'conv_001',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'I found 3 high priority issues at Vepery Industrial Complex:\n\n1. **Issue #6** - Fire alarm system failure (ESCALATED)\n2. **Issue #24** - Door lock jammed (IN_PROGRESS)\n3. **Issue #9** - Flickering lights (OPEN)\n\nWould you like me to provide more details on any of these?',
    attachments: null,
    created_at: new Date(Date.now() - 2 * 86400000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000 + 5000).toISOString(),
  },
  // Conversation 2 - Manager asking for stats
  {
    id: 3,
    conversation_id: 'conv_002',
    user_id: 4,
    issue_id: null,
    role_in_chat: 'user',
    message: 'What is the overall completion rate this week?',
    attachments: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 4,
    conversation_id: 'conv_002',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'Here are this weeks statistics:\n\n📊 **Weekly Performance Summary**\n- Issues Created: 12\n- Issues Completed: 8\n- Completion Rate: **66.7%**\n- Average Resolution Time: 4.2 hours\n- Overdue Issues: 5\n\nThe completion rate is slightly below the target of 75%. Main delays are in HVAC and Safety categories.',
    attachments: null,
    created_at: new Date(Date.now() - 86400000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 86400000 + 5000).toISOString(),
  },
  // Conversation 3 - Solver checking assignments
  {
    id: 5,
    conversation_id: 'conv_003',
    user_id: 6,
    issue_id: null,
    role_in_chat: 'user',
    message: 'What issues are assigned to me today?',
    attachments: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 6,
    conversation_id: 'conv_003',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: 'You have 2 active assignments today:\n\n1. **Issue #14** - Plumbing repair at cafeteria\n   - Status: IN_PROGRESS\n   - Priority: Medium\n   - Due: Today\n\n2. **Issue #19** - Roof leak during rain\n   - Status: IN_PROGRESS\n   - Priority: Medium\n   - Due: Yesterday (OVERDUE)\n\n⚠️ Please prioritize Issue #19 as it is overdue.',
    attachments: null,
    created_at: new Date(Date.now() - 3600000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 + 5000).toISOString(),
  },
  // Conversation 4 - General query
  {
    id: 7,
    conversation_id: 'conv_004',
    user_id: 2,
    issue_id: null,
    role_in_chat: 'user',
    message: 'How many complaints were raised this month?',
    attachments: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 8,
    conversation_id: 'conv_004',
    user_id: null,
    issue_id: null,
    role_in_chat: 'assistant',
    message: '📋 **Complaints Summary (This Month)**\n\nTotal Complaints: 8\n\n- Open: 4\n- Investigating: 2\n- Escalated: 2\n\n**By Site:**\n- Vepery: 3\n- Ambattur: 1\n- Guindy: 2\n- Perungudi: 1\n- Taramani: 1\n\nMost complaints are related to delayed responses and reopened issues.',
    attachments: null,
    created_at: new Date(Date.now() - 7200000 + 5000).toISOString(),
    updated_at: new Date(Date.now() - 7200000 + 5000).toISOString(),
  },
];

export const getChatMessagesByUserId = (userId) => 
  chatMessages.filter(m => m.user_id === userId || m.role_in_chat === 'assistant');

export const getChatMessagesByConversationId = (conversationId) => 
  chatMessages.filter(m => m.conversation_id === conversationId);

export const getConversationsList = () => {
  const conversations = {};
  chatMessages.forEach(msg => {
    if (!conversations[msg.conversation_id]) {
      conversations[msg.conversation_id] = {
        id: msg.conversation_id,
        firstMessage: msg.message,
        created_at: msg.created_at,
        user_id: msg.user_id,
      };
    }
  });
  return Object.values(conversations).sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
};
