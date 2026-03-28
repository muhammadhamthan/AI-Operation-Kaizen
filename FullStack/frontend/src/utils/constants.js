export const STATUS_COLORS = {
  OPEN: '#3b82f6',
  ASSIGNED: '#8b5cf6',
  IN_PROGRESS: '#eab308',
  RESOLVED_PENDING_REVIEW: '#f97316',
  COMPLETED: '#16a34a',
  REOPENED: '#f97316',
  ESCALATED: '#991b1b',
};

export const STATUS_LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED_PENDING_REVIEW: 'Pending Review',
  COMPLETED: 'Completed',
  REOPENED: 'Reopened',
  ESCALATED: 'Escalated',
};

export const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#22c55e',
};

export const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_LEVELS = ['low', 'medium', 'high'];

export const ROLE_TYPES = ['manager', 'supervisor', 'problem_solver'];

export const ROLE_LABELS = {
  manager: 'Manager',
  supervisor: 'Supervisor',
  problem_solver: 'Problem Solver',
};

export const ISSUE_TYPES = ['Plumbing', 'Electrical', 'HVAC', 'Maintenance', 'Safety', 'Cleaning'];

export const NOT_FIXED_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];
export const FIXED_STATUSES = ['COMPLETED'];

export const TRACK_STATUS = {
  AUTO_ASSIGNED: 'AUTO_ASSIGNED',
  MANUALLY_ASSIGNED: 'MANUALLY_ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  ESCALATED: 'ESCALATED',
};
