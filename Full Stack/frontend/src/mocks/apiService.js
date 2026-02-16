// Mock API Service with simulated delays
import { users, getUserByUsername, getUserById } from './users';
import { sites, getSiteById } from './sites';
import { issues, getIssueById } from './issues';
import { issueAssignments, getAssignmentByIssueId, getIssueIdsBySolverId } from './issueAssignments';
import { complaints, getComplaintById, getComplaintsBySupervisorId, getComplaintsBySolverId } from './complaints';
import { issueImages, getImagesByIssueId } from './issueImages';
import { issueHistory, getHistoryByIssueId } from './issueHistory';
import { callLogs, getCallLogsByAssignmentId } from './callLogs';
import { chatMessages, getConversationsList, getChatMessagesByConversationId } from './chatMessages';
import { NOT_FIXED_STATUSES, FIXED_STATUSES } from '../utils/constants';

const delay = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms));

// Auth
export const loginUser = async (username, password) => {
  await delay();
  const user = getUserByUsername(username);
  if (!user || user.password !== password) {
    throw new Error('Invalid credentials');
  }
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Issues - with role-based filtering
export const fetchIssues = async (user) => {
  await delay();
  let filteredIssues = [...issues];
  
  if (user.role === 'supervisor') {
    const userSites = user.sites || [];
    filteredIssues = issues.filter(issue => userSites.includes(issue.site_id));
  } else if (user.role === 'problem_solver') {
    const assignedIssueIds = getIssueIdsBySolverId(user.id);
    filteredIssues = issues.filter(issue => assignedIssueIds.includes(issue.id));
  }
  // Manager sees all issues - no filtering
  
  return filteredIssues.map(issue => ({
    ...issue,
    site: getSiteById(issue.site_id),
    assignment: getAssignmentByIssueId(issue.id),
    beforeImage: getImagesByIssueId(issue.id).find(img => img.image_type === 'BEFORE'),
  }));
};

export const fetchIssueById = async (id) => {
  await delay();
  const issue = getIssueById(id);
  if (!issue) throw new Error('Issue not found');
  
  const assignment = getAssignmentByIssueId(id);
  return {
    ...issue,
    site: getSiteById(issue.site_id),
    assignment,
    images: getImagesByIssueId(id),
    history: getHistoryByIssueId(id),
    callLogs: assignment ? getCallLogsByAssignmentId(assignment.id) : [],
    raisedBy: getUserById(issue.raised_by_supervisor_id),
    solver: assignment ? getUserById(assignment.assigned_to_solver_id) : null,
  };
};

export const fetchNotFixedIssues = async (user) => {
  await delay();
  const allIssues = await fetchIssues(user);
  return allIssues.filter(issue => NOT_FIXED_STATUSES.includes(issue.status));
};

export const fetchFixedIssues = async (user) => {
  await delay();
  const allIssues = await fetchIssues(user);
  return allIssues.filter(issue => FIXED_STATUSES.includes(issue.status));
};

// Complaints - with role-based filtering
export const fetchComplaints = async (user) => {
  await delay();
  let filteredComplaints = [...complaints];
  
  if (user.role === 'supervisor') {
    filteredComplaints = getComplaintsBySupervisorId(user.id);
  } else if (user.role === 'problem_solver') {
    filteredComplaints = getComplaintsBySolverId(user.id);
  }
  // Manager sees all complaints
  
  return filteredComplaints.map(complaint => ({
    ...complaint,
    issue: getIssueById(complaint.issue_id),
    raisedBy: getUserById(complaint.raised_by_supervisor_id),
    targetSolver: complaint.target_solver_id ? getUserById(complaint.target_solver_id) : null,
  }));
};

export const fetchComplaintById = async (id) => {
  await delay();
  const complaint = getComplaintById(id);
  if (!complaint) throw new Error('Complaint not found');
  
  return {
    ...complaint,
    issue: getIssueById(complaint.issue_id),
    raisedBy: getUserById(complaint.raised_by_supervisor_id),
    targetSolver: complaint.target_solver_id ? getUserById(complaint.target_solver_id) : null,
  };
};

// Dashboard
export const fetchDashboardData = async (user) => {
  await delay(300);
  const allIssues = await fetchIssues(user);
  const allComplaints = await fetchComplaints(user);
  
  const totalIssues = allIssues.length;
  const notFixedIssues = allIssues.filter(i => NOT_FIXED_STATUSES.includes(i.status)).length;
  const fixedIssues = allIssues.filter(i => FIXED_STATUSES.includes(i.status)).length;
  const complaintsCount = allComplaints.length;
  
  // Generate trend data for last 7 days
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    trendData.push({
      day: dateStr,
      created: Math.floor(Math.random() * 5) + 1,
      completed: Math.floor(Math.random() * 4) + 1,
    });
  }
  
  // Issue types breakdown
  const issueTypeCounts = {};
  allIssues.forEach(issue => {
    issueTypeCounts[issue.issue_type] = (issueTypeCounts[issue.issue_type] || 0) + 1;
  });
  const issueTypes = Object.entries(issueTypeCounts).map(([name, count]) => ({ name, count }));
  
  // Site comparison (Manager only)
  const sitesComparison = sites.map(site => {
    const siteIssues = allIssues.filter(i => i.site_id === site.id);
    return {
      siteName: site.name.split(' ')[0],
      open: siteIssues.filter(i => NOT_FIXED_STATUSES.includes(i.status)).length,
      completed: siteIssues.filter(i => FIXED_STATUSES.includes(i.status)).length,
    };
  });
  
  return {
    stats: {
      totalIssues,
      notFixedIssues,
      fixedIssues,
      complaints: complaintsCount,
    },
    charts: {
      trend: trendData,
      issueTypes,
      sitesComparison,
    },
  };
};

// Chat
export const fetchChatHistory = async () => {
  await delay();
  return getConversationsList();
};

export const fetchChatMessages = async (conversationId) => {
  await delay();
  return getChatMessagesByConversationId(conversationId);
};

// Sites
export const fetchSites = async () => {
  await delay();
  return sites;
};

// Users
export const fetchUserById = async (id) => {
  await delay();
  const user = getUserById(id);
  if (!user) throw new Error('User not found');
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
