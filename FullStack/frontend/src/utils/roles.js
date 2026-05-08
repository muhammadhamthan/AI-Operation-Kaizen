/**
 * Role model for Kairox AI OpEx.
 *
 * Four production roles. The `manager` role IS the Managing Director (MD)
 * in this product — there is no separate `managing_director` token. MVP
 * role strings (`problem_solver`, `supervisor`, `manager`) continue to work
 * unchanged; `customer_md` is new in v3.0.
 */

export const ROLES = {
  PROBLEM_SOLVER: 'problem_solver',
  SUPERVISOR: 'supervisor',
  MANAGER: 'manager', // == Managing Director (MD)
  CUSTOMER_MD: 'customer_md',
};

// Friendly labels for UI (RoleBadge, AdminScreens, etc.)
export const ROLE_LABELS = {
  [ROLES.PROBLEM_SOLVER]: 'Problem Solver',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.MANAGER]: 'Managing Director',
  [ROLES.CUSTOMER_MD]: "Customer's MD",
};

// ── Role detection helpers ─────────────────────────────────────────────
export const isProblemSolver = (role) => role === ROLES.PROBLEM_SOLVER;
export const isSupervisor = (role) => role === ROLES.SUPERVISOR;
export const isMD = (role) => role === ROLES.MANAGER; // MD === manager
export const isManager = isMD; // MVP alias used by existing screens
export const isCustomerMD = (role) => role === ROLES.CUSTOMER_MD;

/**
 * Normalise any role string coming from the backend. Accepts the
 * current prod enum {problem_solver, supervisor, manager} plus
 * future-proofing for `managing_director` and `problemsolver`.
 */
export const normaliseRole = (role) => {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r === 'problemsolver') return ROLES.PROBLEM_SOLVER;
  if (r === 'managing_director' || r === 'md') return ROLES.MANAGER;
  if (r === 'customer_md' || r === 'customermd' || r === "customer's md") {
    return ROLES.CUSTOMER_MD;
  }
  return r;
};

// ── Personal chat pairing rules (Section 10) ───────────────────────────
// | Role           | Can chat with                                   |
// | PS             | NONE                                            |
// | Supervisor     | MD only                                         |
// | MD             | All Supervisors + all Customer MDs + Ops group |
// | Customer's MD  | MD only                                         |
export const canChatWith = (roleA, roleB) => {
  const a = normaliseRole(roleA);
  const b = normaliseRole(roleB);
  if (!a || !b) return false;
  if (a === ROLES.PROBLEM_SOLVER || b === ROLES.PROBLEM_SOLVER) return false;
  if (a === ROLES.SUPERVISOR && b === ROLES.MANAGER) return true;
  if (a === ROLES.MANAGER && b === ROLES.SUPERVISOR) return true;
  if (a === ROLES.MANAGER && b === ROLES.CUSTOMER_MD) return true;
  if (a === ROLES.CUSTOMER_MD && b === ROLES.MANAGER) return true;
  return false;
};

/**
 * Centralised permission check. Every screen should ask `can(action, role)`
 * rather than inspect role strings directly.
 *
 * Returns `true` if the role is permitted to perform `action`.
 */
export const can = (action, role) => {
  const r = normaliseRole(role);
  if (!r) return false;

  // Map each action to the set of roles allowed to perform it.
  const ACL = {
    // Navigation / tab visibility
    'view:dashboard': [ROLES.PROBLEM_SOLVER, ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:issues': [ROLES.PROBLEM_SOLVER, ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:chatbot': [ROLES.PROBLEM_SOLVER, ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:profile': [ROLES.PROBLEM_SOLVER, ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:sites': [ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:solvers': [ROLES.SUPERVISOR, ROLES.MANAGER],
    'view:mdCard': [ROLES.SUPERVISOR, ROLES.CUSTOMER_MD],
    'view:supervisorsCard': [ROLES.MANAGER],
    'view:customerMDCard': [ROLES.MANAGER],
    'view:budget': [ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:opsGroupChat': [ROLES.SUPERVISOR, ROLES.MANAGER],
    'view:projectTimeline': [ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.CUSTOMER_MD],
    'view:googleSheetsSync': [ROLES.MANAGER],

    // Writes / actions
    'write:createIssue': [ROLES.SUPERVISOR],
    'write:approveIssue': [ROLES.SUPERVISOR],
    'write:escalateIssue': [ROLES.SUPERVISOR],
    'write:completeIssue': [ROLES.PROBLEM_SOLVER],
    'write:raiseBudgetRequest': [ROLES.SUPERVISOR],
    'write:decideBudgetRequest': [ROLES.MANAGER],
    'write:escApproveBudgetRequest': [ROLES.CUSTOMER_MD],
    'write:createSite': [ROLES.MANAGER],
    'write:createUser': [ROLES.MANAGER],
    'write:assignSitesToCustomerMD': [ROLES.MANAGER],
    'write:pinGroupMessage': [ROLES.MANAGER],
    'write:editProjectTimeline': [ROLES.MANAGER],
    'write:uploadBeforePhoto': [ROLES.SUPERVISOR],
    'write:uploadDuringPhoto': [ROLES.PROBLEM_SOLVER],
    'write:uploadAfterPhoto': [ROLES.PROBLEM_SOLVER],
  };

  const allowed = ACL[action];
  if (!allowed) {
    // Unknown actions default to DENY (defence in depth).
    return false;
  }
  return allowed.includes(r);
};

// Legacy export kept for any MVP screen importing from this file.
export default ROLES;
