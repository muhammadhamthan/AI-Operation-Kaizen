import { issueAssignments } from '../mocks/issueAssignments';
import { callLogs } from '../mocks/callLogs';
import { complaints } from '../mocks/complaints';
import { issues } from '../mocks/issues';

// Include both completed statuses to match your API
export const FIXEDSTATUSES = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

const wasCompletedOnTime = (assignment) => {
  if (!FIXEDSTATUSES.includes(assignment.status?.toUpperCase())) return false;
  
  // ✅ REVERTED TO SNAKE CASE: due_date (or deadline_at) and updated_at
  const due = assignment.due_date || assignment.deadline_at; 
  if (!due || !assignment.updated_at) return false;
  
  return new Date(assignment.updated_at) <= new Date(due);
};

export const calculateSolverScore = (solverId) => {
  // ✅ REVERTED TO SNAKE CASE: assigned_to_solver_id
  const solverAssignments = issueAssignments.filter(
    (a) => a.assigned_to_solver_id === solverId
  );
  const totalAssigned = solverAssignments.length;

  const completedAssignments = solverAssignments.filter(
    (a) => FIXEDSTATUSES.includes(a.status?.toUpperCase())
  );
  const completedCount = completedAssignments.length;
  const completionRate = totalAssigned > 0 ? completedCount / totalAssigned : 0;
  const completionScore = completionRate * 40;

  const onTimeCount = completedAssignments.filter(wasCompletedOnTime).length;
  const onTimeRate = completedCount > 0 ? onTimeCount / completedCount : 0;
  const onTimeScore = onTimeRate * 30;

  // ✅ REVERTED TO SNAKE CASE: solver_id
  const solverCalls = callLogs.filter((log) => log.solver_id === solverId);
  const totalCalls = solverCalls.length;
  const answeredCalls = solverCalls.filter(
    (log) => log.status?.toUpperCase() === 'ANSWERED'
  ).length;
  const callAnswerRate = totalCalls > 0 ? answeredCalls / totalCalls : 1;
  const callScore = callAnswerRate * 20;

  // ✅ REVERTED TO SNAKE CASE: target_solver_id
  const solverComplaints = complaints.filter(
    (c) => c.target_solver_id === solverId
  );
  const complaintCount = solverComplaints.length;
  const complaintPenalty = Math.min(complaintCount * 3, 10);
  const complaintScore = 10 - complaintPenalty;

  const totalScore = Math.round(
    completionScore + onTimeScore + callScore + complaintScore
  );

  let label = 'Needs Attention';
  let labelColor = '#ef4444';
  if (totalScore >= 80) {
    label = 'Top Performer';
    labelColor = '#10a37f';
  } else if (totalScore >= 55) {
    label = 'Good';
    labelColor = '#f59e0b';
  }

  // ✅ FIXED: IN_PROGRESS (with underscore)
  const inProgressCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'IN_PROGRESS').length;
  const assignedNotStartedCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'ASSIGNED').length;
  const reopenedCount = solverAssignments.filter((a) => a.status?.toUpperCase() === 'REOPENED').length;

  // ✅ REVERTED TO SNAKE CASE: issue_id
  const escalatedCount = solverAssignments.filter((a) => {
    const relatedIssue = issues.find(i => i.id === a.issue_id);
    return relatedIssue && relatedIssue.status?.toUpperCase() === 'ESCALATED';
  }).length;

  const activeAssignments = solverAssignments.filter((a) =>
    ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(a.status?.toUpperCase())
  );

  const overdueAssignments = solverAssignments.filter((a) => {
    const due = a.due_date || a.deadline_at;
    if (!due) return false;
    if (FIXEDSTATUSES.includes(a.status?.toUpperCase())) return false;
    return new Date(due) < new Date();
  });

  return {
    solverId,
    score: totalScore || 0,
    label,
    labelColor,
    totalAssigned,
    completedCount,
    activeCount: activeAssignments.length,
    overdueCount: overdueAssignments.length,
    complaintCount,
    inProgressCount,
    assignedNotStartedCount,
    reopenedCount,
    escalatedCount,
    completionRate: Math.round(completionRate * 100) || 0,
    onTimeRate: Math.round(onTimeRate * 100) || 0,
    callAnswerRate: Math.round(callAnswerRate * 100) || 0,
    totalCalls,
    answeredCalls,
    missedCalls: totalCalls - answeredCalls,
  };
};

export const calculateAllSolverScores = (solverIds) => {
  return solverIds.reduce((acc, id) => {
    acc[id] = calculateSolverScore(id);
    return acc;
  }, {});
};

export default calculateSolverScore;