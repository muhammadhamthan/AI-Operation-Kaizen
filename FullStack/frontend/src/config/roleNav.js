/**
 * Tab configuration per role (Kairox v3.0 Section 0.2 + 1.x).
 *
 * Existing tabs — `chat` (AI Chatbot), `issues`, `dashboard` — are rendered
 * today for every logged-in user. This config adds the role-specific tabs on
 * top. The (tabs)/_layout.js reads this and hides tabs by setting
 * `href: null` on any Tabs.Screen whose route is NOT in the current role's
 * visible list.
 */

import { ROLES } from '../utils/roles';

// Tab meta — name matches the expo-router folder/file under app/(main)/(tabs)/
export const TAB_META = {
  chat: { title: 'Chat', iconActive: 'chatbubbles', iconInactive: 'chatbubbles-outline' },
  issues: { title: 'Issues', iconActive: 'document-text', iconInactive: 'document-text-outline' },
  dashboard: { title: 'Dashboard', iconActive: 'grid', iconInactive: 'grid-outline' },
  sites: { title: 'Sites', iconActive: 'business', iconInactive: 'business-outline' },
  solvers: { title: 'Solvers', iconActive: 'people', iconInactive: 'people-outline' },
  'md-card': { title: 'MD', iconActive: 'person-circle', iconInactive: 'person-circle-outline' },
  'supervisors-card': { title: 'Supervisors', iconActive: 'people', iconInactive: 'people-outline' },
  'customer-md-card': { title: "Customer MD", iconActive: 'business', iconInactive: 'business-outline' },
  budget: { title: 'Budget', iconActive: 'wallet', iconInactive: 'wallet-outline' },
  profile: { title: 'Profile', iconActive: 'person', iconInactive: 'person-outline' },
};

// Ordered per Kairox v3.0 Section 0.2. Existing tabs preserved on top for MVP parity.
export const ROLE_TABS = {
  [ROLES.PROBLEM_SOLVER]: ['dashboard', 'issues', 'chat', 'profile'],
  [ROLES.SUPERVISOR]: [
    'dashboard',
    'issues',
    'sites',
    'solvers',
    'md-card',
    'budget',
    'chat',
    'profile',
  ],
  [ROLES.MANAGER]: [
    'dashboard',
    'issues',
    'sites',
    'supervisors-card',
    'customer-md-card',
    'budget',
    'chat',
    'profile',
  ],
  [ROLES.CUSTOMER_MD]: ['dashboard', 'issues', 'md-card', 'budget', 'chat', 'profile'],
};

// Full list of tab routes we ever render (sum of all role sets).
export const ALL_TAB_ROUTES = Array.from(
  new Set(Object.values(ROLE_TABS).flat())
);

// Helper used by (tabs)/_layout.js
export const getVisibleTabs = (role) => ROLE_TABS[role] || ROLE_TABS[ROLES.SUPERVISOR];
export const isTabVisible = (role, tabRoute) => getVisibleTabs(role).includes(tabRoute);
