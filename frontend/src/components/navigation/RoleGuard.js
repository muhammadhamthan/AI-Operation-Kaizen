import React from 'react';
import EmptyState from '../common/EmptyState';
import useRole from '../../hooks/useRole';
import { normaliseRole } from '../../utils/roles';

/**
 * Wraps any screen / component. Renders `children` only if the current user's
 * role is permitted. Otherwise renders the shared EmptyState.
 *
 * Use EITHER `allowedRoles` (array of role strings) OR `action` (ACL key).
 *
 *   <RoleGuard allowedRoles={['manager','customer_md']}> ... </RoleGuard>
 *   <RoleGuard action="view:budget"> ... </RoleGuard>
 */
const RoleGuard = ({
  children,
  allowedRoles,
  action,
  title = 'Access Restricted',
  message = 'You do not have access to this screen.',
}) => {
  const { role, can } = useRole();

  let permitted = true;
  if (allowedRoles && allowedRoles.length > 0) {
    const normalised = allowedRoles.map(normaliseRole);
    permitted = normalised.includes(role);
  } else if (action) {
    permitted = can(action);
  }

  if (!permitted) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title={title}
        message={message}
      />
    );
  }

  return children;
};

export default RoleGuard;
