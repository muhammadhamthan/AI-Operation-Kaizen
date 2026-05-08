/**
 * Kairox issue lifecycle labels (§3).
 *
 * The backend enum (`open | in_progress | resolved | closed` etc.) is kept
 * untouched. This module maps each backend value to the Kairox-branded
 * label, colour family, and icon shown in the UI. If a backend status isn't
 * in the map it falls through to a sensible default.
 *
 * Colours use existing theme tokens (`statusOpen`, `warning`, `success`,
 * `danger`, `primary`). No new tokens introduced.
 */

export const KAIROX_STATUSES = {
  // Fresh issue raised by Supervisor; solver hasn't acted.
  open: {
    kairoxLabel: 'Active',
    themeToken: 'statusOpen',
    icon: 'alert-circle-outline',
    description: 'Issue raised. Waiting for the solver to begin.',
  },
  assigned: {
    kairoxLabel: 'Active',
    themeToken: 'statusOpen',
    icon: 'person-outline',
    description: 'Assigned to a solver.',
  },
  auto_assigned: {
    kairoxLabel: 'Active',
    themeToken: 'statusOpen',
    icon: 'person-outline',
    description: 'Auto-assigned to a solver.',
  },
  reassigned: {
    kairoxLabel: 'Active',
    themeToken: 'statusOpen',
    icon: 'swap-horizontal-outline',
    description: 'Re-assigned to a different solver.',
  },
  // Solver is on-site / working.
  in_progress: {
    kairoxLabel: 'In Progress',
    themeToken: 'warning',
    icon: 'construct-outline',
    description: 'Solver is actively working on this.',
  },
  // Solver finished; awaiting Supervisor approval.
  resolved: {
    kairoxLabel: 'Awaiting Review',
    themeToken: 'warning',
    icon: 'eye-outline',
    description: 'Solver marked complete. Supervisor review pending.',
  },
  completed: {
    kairoxLabel: 'Fixed',
    themeToken: 'success',
    icon: 'checkmark-circle-outline',
    description: 'Resolution accepted. Issue fixed.',
  },
  // Supervisor approved the resolution.
  closed: {
    kairoxLabel: 'Fixed',
    themeToken: 'success',
    icon: 'checkmark-circle-outline',
    description: 'Supervisor has approved and closed this issue.',
  },
  // Supervisor rejected the resolution; back to solver.
  reopened: {
    kairoxLabel: 'Not Fixed',
    themeToken: 'danger',
    icon: 'refresh-circle-outline',
    description: 'Supervisor rejected the fix. Back to solver.',
  },
  // Supervisor escalated to MD after miss or dispute.
  escalated: {
    kairoxLabel: 'Escalated',
    themeToken: 'danger',
    icon: 'arrow-up-circle-outline',
    description: 'Escalated to Managing Director for decision.',
  },
  // Customer / Customer MD-raised complaint, not a normal issue.
  complaint: {
    kairoxLabel: 'Complaint',
    themeToken: 'danger',
    icon: 'megaphone-outline',
    description: 'Customer complaint raised against this issue.',
  },
};

export const STATUS_FALLBACK = {
  kairoxLabel: 'Open',
  themeToken: 'primary',
  icon: 'help-circle-outline',
  description: '—',
};

/** Resolve a backend status string to UI metadata. */
export const getStatusMeta = (backendStatus) => {
  if (!backendStatus) return STATUS_FALLBACK;
  const key = String(backendStatus).toLowerCase();
  return KAIROX_STATUSES[key] || STATUS_FALLBACK;
};

/** Convenience: friendly label only. */
export const getStatusLabel = (backendStatus) =>
  getStatusMeta(backendStatus).kairoxLabel;

/** Convenience: theme-token colour (to be resolved by caller via useTheme). */
export const getStatusThemeToken = (backendStatus) =>
  getStatusMeta(backendStatus).themeToken;
