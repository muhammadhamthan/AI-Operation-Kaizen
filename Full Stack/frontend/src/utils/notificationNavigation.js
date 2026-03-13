/**
 * Notification Navigation Service
 * * Handles navigation when user taps on notifications
 * Supports deep linking to specific screens
 */

import { router } from 'expo-router';

// Notification types and their target routes — ALL inside dashboard
const NOTIFICATION_ROUTES = {
  // Issue-related notifications
  issue_created: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_assigned: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_status_changed: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_escalated: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_completed: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, fromNotification: 'true' }, // ADDED FLAG
  }),
  issue_reopened: (data) => ({
    route: '/(main)/(tabs)/dashboard/issue-detail',
    params: { id: data.issueId, fromNotification: 'true' }, // ADDED FLAG
  }),
  
  // Complaint-related notifications
  complaint_created: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId, fromNotification: 'true' }, // ADDED FLAG
  }),
  complaint_resolved: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId, fromNotification: 'true' }, // ADDED FLAG
  }),
  
  // Chat-related notifications (No flag needed, chat acts as its own root)
  chat_message: (data) => ({
    route: '/(main)/(tabs)/chat',
    params: { conversationId: data.conversationId },
  }),
  
  // Dashboard notifications
  overdue_issues: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: { filter: 'overdue' },
  }),
  daily_summary: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: {},
  }),
  
  // Default - go to dashboard
  default: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: {},
  }),
};

/**
 * Navigate to the appropriate screen based on notification type
 */
export const navigateToNotification = (notification) => {
  try {
    const { type, data = {} } = notification;
    
    // Get route handler
    const getRoute = NOTIFICATION_ROUTES[type] || NOTIFICATION_ROUTES.default;
    const { route, params } = getRoute(data);
    
    // Navigate to the route
    router.navigate({
      pathname: route,
      params,
    });
    
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to dashboard using navigate
    router.navigate('/(main)/(tabs)/dashboard');
    return false;
  }
};

/**
 * Create a notification object with navigation data
 */
export const createNotification = (type, title, body, data = {}) => {
  return {
    id: Date.now().toString(),
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date().toISOString(),
  };
};

/**
 * Get navigation preview text for a notification
 */
export const getNavigationPreview = (notification) => {
  const { type } = notification;
  
  const previews = {
    issue_created: 'Tap to view issue',
    issue_assigned: 'Tap to view assignment',
    issue_status_changed: 'Tap to see updates',
    issue_escalated: 'Tap to view escalation',
    issue_completed: 'Tap to view completed issue',
    issue_reopened: 'Tap to view reopened issue',
    complaint_created: 'Tap to view complaint',
    complaint_resolved: 'Tap to view resolution',
    chat_message: 'Tap to open chat',
    overdue_issues: 'Tap to view overdue issues',
    daily_summary: 'Tap to view dashboard',
  };
  
  return previews[type] || 'Tap to view';
};

/**
 * Parse deep link URL and extract navigation params
 */
export const parseDeepLink = (url) => {
  try {
    // Expected format: maintenanceflow://issue/123 or maintenanceflow://complaint/456
    const match = url.match(/maintenanceflow:\/\/(\w+)\/(\d+)/);
    
    if (match) {
      const [, type, id] = match;
      
      const routes = {
        issue: {
          route: '/(main)/(tabs)/dashboard/issue-detail',
          params: { id, highlighted: 'true', fromNotification: 'true' }, // ADDED FLAG
        },
        complaint: {
          route: '/(main)/(tabs)/dashboard/complaint-detail',
          params: { id, fromNotification: 'true' }, // ADDED FLAG
        },
        chat: {
          route: '/(main)/(tabs)/chat',
          params: { conversationId: id },
        },
      };
      
      return routes[type] || null;
    }
    
    return null;
  } catch (error) {
    console.error('Deep link parse error:', error);
    return null;
  }
};

export default {
  navigateToNotification,
  createNotification,
  getNavigationPreview,
  parseDeepLink,
  NOTIFICATION_ROUTES,
};