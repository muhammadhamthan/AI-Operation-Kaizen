// ─────────────────────────────────────────────────────────────
// src/utils/scoreEngine.js
// ─────────────────────────────────────────────────────────────

import { issueAssignments } from '../mocks/issueAssignments';
import { callLogs } from '../mocks/callLogs';
import { complaints } from '../mocks/complaints';
import { issues } from '../mocks/issues'; 

export const FIXEDSTATUSES = ['COMPLETED']; 

const wasCompletedOnTime = (assignment) => {
  if (!FIXEDSTATUSES.includes(assignment.status)) return false;
  if (!assignment.due_date || !assignment.updated_at) return false;
  return new Date(assignment.updated_at) <= new Date(assignment.due_date);
};

export const calculateSolverScore = (solverId) => {
  // ── FIX: Changed to assigned_to_solver_id ──
  const solverAssignments = issueAssignments.filter(
    (a) => a.assigned_to_solver_id === solverId
  );
  const totalAssigned = solverAssignments.length;

  const completedAssignments = solverAssignments.filter(
    (a) => FIXEDSTATUSES.includes(a.status)
  );
  const completedCount = completedAssignments.length;
  const completionRate = totalAssigned > 0 ? completedCount / totalAssigned : 0;
  const completionScore = completionRate * 40;

  const onTimeCount = completedAssignments.filter(wasCompletedOnTime).length;
  const onTimeRate = completedCount > 0 ? onTimeCount / completedCount : 0;
  const onTimeScore = onTimeRate * 30;

  // ── FIX: Changed to solver_id ──
  const solverCalls = callLogs.filter((log) => log.solver_id === solverId);
  const totalCalls = solverCalls.length;
  const answeredCalls = solverCalls.filter(
    (log) => log.status === 'ANSWERED'
  ).length;
  const callAnswerRate = totalCalls > 0 ? answeredCalls / totalCalls : 1;
  const callScore = callAnswerRate * 20;

  // ── FIX: Changed to target_solver_id ──
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

  // ── FIX: Add the missing count variables the UI needs ──
  const inProgressCount = solverAssignments.filter((a) => a.status === 'IN_PROGRESS').length;
  const assignedNotStartedCount = solverAssignments.filter((a) => a.status === 'ASSIGNED').length;
  const reopenedCount = solverAssignments.filter((a) => a.status === 'REOPENED').length;
  
  const escalatedCount = solverAssignments.filter((a) => {
    const relatedIssue = issues.find(i => i.id === a.issue_id);
    return relatedIssue && relatedIssue.status === 'ESCALATED';
  }).length;

  const activeAssignments = solverAssignments.filter((a) =>
    ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'].includes(a.status)
  );

  const overdueAssignments = solverAssignments.filter((a) => {
    if (!a.due_date) return false;
    if (FIXEDSTATUSES.includes(a.status)) return false;
    return new Date(a.due_date) < new Date();
  });

  return {
    solverId,
    score: totalScore,
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
    completionRate: Math.round(completionRate * 100),
    onTimeRate: Math.round(onTimeRate * 100),
    callAnswerRate: Math.round(callAnswerRate * 100),
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