export const calculateOverdueDays = (deadline_at, status) => {
  if (!deadline_at) return null;
  if (status === 'COMPLETED') return null;
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = now - deadline;
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays > 0) {
    return diffDays;
  }
  return null;
};

export const isOverdue = (deadline_at, status) => {
  if (!deadline_at) return false;
  if (status === 'COMPLETED') return false;
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  return now > deadline;
};

export const formatOverdueText = (deadline_at, status) => {
  if (!deadline_at) return '';
  if (status === 'COMPLETED') return 'Completed';
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = deadline - now;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / 86400000));
    const overdueHours = Math.abs(Math.floor(diffMs / 3600000));
    if (overdueDays > 0) {
      return `Overdue ${overdueDays} day${overdueDays > 1 ? 's' : ''}`;
    }
    return `Overdue ${overdueHours} hour${overdueHours > 1 ? 's' : ''}`;
  }
  
  if (diffDays > 0) {
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  return 'Due soon';
};

export const getDeadlineColor = (deadline_at, status) => {
  if (!deadline_at || status === 'COMPLETED') return '#6b7280';
  
  const now = new Date();
  const deadline = new Date(deadline_at);
  const diffMs = deadline - now;
  const diffHours = diffMs / 3600000;
  
  if (diffMs < 0) return '#ef4444'; // Red - overdue
  if (diffHours < 24) return '#f97316'; // Orange - urgent
  if (diffHours < 72) return '#eab308'; // Yellow - approaching
  return '#6b7280'; // Gray - normal
};
