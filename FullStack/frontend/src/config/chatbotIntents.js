/**
 * Role-personalised chatbot quick-action chips (Kairox §2).
 *
 * Each role sees a different first-tap suggestion set when the chat is
 * empty. Tapping a chip fills the input with the chip's `text` (existing
 * MVP behaviour preserved).
 */

import { ROLES } from '../utils/roles';

const PS_CHIPS = [
  { icon: 'play-circle-outline', text: 'Mark my current issue as in-progress' },
  { icon: 'checkmark-circle-outline', text: 'Mark my current issue complete' },
  { icon: 'clipboard-outline', text: "Log today's site diary" },
  { icon: 'image-outline', text: 'Upload a DURING progress photo' },
];

const SUPERVISOR_CHIPS = [
  { icon: 'alert-circle-outline', text: 'Raise a new issue' },
  { icon: 'calendar-outline', text: 'Extend deadline on an active issue' },
  { icon: 'swap-horizontal-outline', text: 'Reassign an issue to another solver' },
  { icon: 'people-outline', text: 'Show solver performance this week' },
  { icon: 'trending-up-outline', text: 'Raise a budget request to MD' },
  { icon: 'arrow-up-circle-outline', text: 'Escalate an overdue issue' },
];

const MD_CHIPS = [
  { icon: 'trophy-outline', text: 'Top 5 best-performing sites' },
  { icon: 'warning-outline', text: 'Show all escalated issues' },
  { icon: 'wallet-outline', text: 'Pending budget requests awaiting my decision' },
  { icon: 'business-outline', text: "Today's customer MD chat summary" },
  { icon: 'bar-chart-outline', text: 'Monthly Ops group decisions summary' },
  { icon: 'people-outline', text: 'Supervisor leaderboard this month' },
];

const CUSTOMER_MD_CHIPS = [
  { icon: 'business-outline', text: 'Show progress on my sites' },
  { icon: 'calendar-outline', text: 'This month\u2019s project timeline' },
  { icon: 'wallet-outline', text: 'Budget status for my sites' },
  { icon: 'document-outline', text: 'Download latest monthly report' },
  { icon: 'chatbubbles-outline', text: 'Message my Managing Director' },
];

const FALLBACK_CHIPS = [
  { icon: 'document-text-outline', text: 'Show overdue issues' },
  { icon: 'bar-chart-outline', text: 'Weekly analytics report' },
  { icon: 'people-outline', text: 'Team performance summary' },
  { icon: 'alert-circle-outline', text: 'Unresolved complaints' },
];

/**
 * @param {string|undefined} role
 * @returns {{icon:string,text:string}[]}
 */
export const getChatbotSuggestions = (role) => {
  switch (role) {
    case ROLES.PROBLEM_SOLVER:
      return PS_CHIPS;
    case ROLES.SUPERVISOR:
      return SUPERVISOR_CHIPS;
    case ROLES.MANAGER:
      return MD_CHIPS;
    case ROLES.CUSTOMER_MD:
      return CUSTOMER_MD_CHIPS;
    default:
      return FALLBACK_CHIPS;
  }
};

// Role-specific empty-state greeting (Kairox §2 tone).
export const getChatbotGreeting = (role, name) => {
  const first = (name || '').split(' ')[0] || 'there';
  switch (role) {
    case ROLES.PROBLEM_SOLVER:
      return `Hi ${first}. What would you like to log today?`;
    case ROLES.SUPERVISOR:
      return `Hi ${first}. Raise a new issue, check your team, or request a budget.`;
    case ROLES.MANAGER:
      return `Welcome back ${first}. Here's what needs your attention today.`;
    case ROLES.CUSTOMER_MD:
      return `Hi ${first}. Track your sites, budgets, and monthly reports here.`;
    default:
      return `Hi ${first}. How can I help?`;
  }
};
