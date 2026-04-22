import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import {
  ROLES,
  normaliseRole,
  isProblemSolver,
  isSupervisor,
  isMD,
  isCustomerMD,
  can as canForRole,
  canChatWith as canChatWithForRole,
} from '../utils/roles';

/**
 * Single source of truth for role-based UI decisions.
 *
 *   const { role, isMD, can } = useRole();
 *   if (can('write:createSite')) { ... }
 */
export const useRole = () => {
  const user = useSelector(selectCurrentUser);
  const role = normaliseRole(user?.role);

  return {
    user,
    role,
    isPS: isProblemSolver(role),
    isProblemSolver: isProblemSolver(role),
    isSupervisor: isSupervisor(role),
    isMD: isMD(role),
    isManager: isMD(role), // alias
    isCustomerMD: isCustomerMD(role),
    can: (action) => canForRole(action, role),
    canChatWith: (otherRole) => canChatWithForRole(role, otherRole),
    ROLES,
  };
};

export default useRole;
