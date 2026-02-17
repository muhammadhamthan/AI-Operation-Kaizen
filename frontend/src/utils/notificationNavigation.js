/**
 * Notification Navigation Service
 * 
 * Handles navigation when user taps on notifications
 * Supports deep linking to specific screens
 */

import { router } from 'expo-router';

// Notification types and their target routes
const NOTIFICATION_ROUTES = {
  // Issue-related notifications
  issue_created: (data) => ({
    route: '/(main)/(tabs)/issues/issue-detail',
    params: { id: data.issueId, highlighted: 'true' },
  }),
  issue_assigned: (data) => ({
    route: '/(main)/(tabs)/issues/issue-detail',
    params: { id: data.issueId, highlighted: 'true' },
  }),
  issue_status_changed: (data) => ({
    route: '/(main)/(tabs)/issues/issue-detail',
    params: { id: data.issueId, highlighted: 'true' },
  }),
  issue_escalated: (data) => ({
    route: '/(main)/(tabs)/issues/issue-detail',
    params: { id: data.issueId, highlighted: 'true' },
  }),
  issue_completed: (data) => ({
    route: '/(main)/(tabs)/dashboard/fixed-detail',
    params: { id: data.issueId },
  }),
  issue_reopened: (data) => ({
    route: '/(main)/(tabs)/dashboard/not-fixed-detail',
    params: { id: data.issueId },
  }),
  
  // Complaint-related notifications
  complaint_created: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId },
  }),
  complaint_resolved: (data) => ({
    route: '/(main)/(tabs)/dashboard/complaint-detail',
    params: { id: data.complaintId },
  }),
  
  // Chat-related notifications
  chat_message: (data) => ({
    route: '/(main)/(tabs)/chat',
    params: { conversationId: data.conversationId },
  }),
  
  // Dashboard notifications
  overdue_issues: () => ({
    route: '/(main)/(tabs)/dashboard/not-fixed',
    params: {},
  }),
  daily_summary: () => ({
    route: '/(main)/(tabs)/dashboard',
    params: {},
  }),
  
  // Default - go to issues list
  default: () => ({
    route: '/(main)/(tabs)/issues',
    params: {},
  }),
};

/**
 * Navigate to the appropriate screen based on notification type
 * 
 * @param {Object} notification - Notification object with type and data
 */
export const navigateToNotification = (notification) => {
  try {
    const { type, data = {} } = notification;
    
    // Get route handler
    const getRoute = NOTIFICATION_ROUTES[type] || NOTIFICATION_ROUTES.default;
    const { route, params } = getRoute(data);
    
    // Navigate to the route
    router.push({
      pathname: route,
      params,
    });
    
    return true;
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to issues tab
    router.push('/(main)/(tabs)/issues');
    return false;
  }
};

/**
 * Create a notification object with navigation data
 * 
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} body - Notification body/message
 * @param {Object} data - Additional data (issueId, complaintId, etc.)
 * @returns {Object} - Formatted notification object
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
 * 
 * @param {Object} notification - Notification object
 * @returns {string} - Navigation preview text
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
 * 
 * @param {string} url - Deep link URL
 * @returns {Object|null} - Parsed route and params or null
 */
export const parseDeepLink = (url) => {
  try {
    // Expected format: maintenanceflow://issue/123 or maintenanceflow://complaint/456
    const match = url.match(/maintenanceflow:\/\/(\w+)\/(\d+)/);
    
    if (match) {
      const [, type, id] = match;
      
      const routes = {
        issue: {
          route: '/(main)/(tabs)/issues/issue-detail',
          params: { id, highlighted: 'true' },
        },
        complaint: {
          route: '/(main)/(tabs)/dashboard/complaint-detail',
          params: { id },
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
