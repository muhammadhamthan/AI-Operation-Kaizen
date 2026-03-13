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
const SAFE_NOT_FIXED_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
const SAFE_FIXED_STATUSES = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

// Auth
export const loginUser = async (username, password) => {
  await delay();
  console.log('🔍 loginUser called with:', username, password);
  const user = getUserByUsername(username);
  console.log('🔍 user found:', user?.username || 'NOT FOUND');
  
  if (!user || user.password !== password) {
    return { success: false, error: 'Invalid credentials' };
  }
  const { password: _, ...userWithoutPassword } = user;
  const result = {
    success: true,
    user: userWithoutPassword,
    token: `mock-token-${user.id}-${Date.now()}`,
  };
  console.log('🔍 loginUser returning:', result.success);
  return result;
};

// Auth - Logout
export const logoutUser = async () => {
  await delay();
  return { success: true };
};

// Auth - Get stored user (simulates checking AsyncStorage/localStorage)
export const getStoredUser = async () => {
  await delay();
  return null; // No persisted session in mock
};

// Auth - Get current user (simulates verifying token with server)
export const getCurrentUser = async () => {
  await delay();
  return { success: false }; // No active session in mock
};

// Issues - with role-based filtering
// Issues - with role-based filtering
export const fetchIssues = async (user) => {
  await delay();
  let filteredIssues = [...issues];
  
  // 🚨 THE FIX: Redux might pass an incomplete user object. 
  // Let's grab the full user from the mock DB using their ID to ensure we have their 'sites' array.
  const fullUser = user?.id ? getUserById(user.id) : user;
  
  if (fullUser?.role === 'supervisor') {
    // Fallback to sites [1,2,3,4,5] just in case the mock DB is missing the array too
    const userSites = fullUser?.sites?.length > 0 ? fullUser.sites : [1, 2, 3, 4, 5];
    filteredIssues = issues.filter(issue => userSites.includes(issue.site_id));
    
  } else if (fullUser?.role === 'problem_solver') {
    const assignedIssueIds = getIssueIdsBySolverId(fullUser.id);
    filteredIssues = issues.filter(issue => assignedIssueIds.includes(issue.id));
  }
  
  const mappedIssues = filteredIssues.map(issue => ({
    ...issue,
    site: getSiteById(issue.site_id),
    assignment: getAssignmentByIssueId(issue.id),
    beforeImage: getImagesByIssueId(issue.id).find(img => img.image_type === 'BEFORE'),
  }));

  return { success: true, issues: mappedIssues };
};

export const fetchIssueById = async (id) => {
  await delay();
  const issue = getIssueById(id);
  if (!issue) return { success: false, error: 'Issue not found' };
  
  const assignment = getAssignmentByIssueId(id);
  return {
    success: true,
    issue: {
      ...issue,
      site: getSiteById(issue.site_id),
      assignment,
      images: getImagesByIssueId(id),
      history: getHistoryByIssueId(id),
      callLogs: assignment ? getCallLogsByAssignmentId(assignment.id) : [],
      raisedBy: getUserById(issue.raised_by_supervisor_id),
      solver: assignment ? getUserById(assignment.assigned_to_solver_id) : null,
    },
  };
};



export const fetchNotFixedIssues = async (user) => {
  await delay();
  const result = await fetchIssues(user);
  
  // Extract the issues array from the result object safely
  const issuesList = result.issues || []; 
  
  // Apply the uppercase safety check
  return issuesList.filter(issue => 
    SAFE_NOT_FIXED_STATUSES.includes(issue.status?.toUpperCase())
  );
};

export const fetchFixedIssues = async (user) => {
  await delay();
  const result = await fetchIssues(user);
  
  // Extract the issues array from the result object safely
  const issuesList = result.issues || []; 
  
  // Apply the uppercase safety check
  return issuesList.filter(issue => 
    SAFE_FIXED_STATUSES.includes(issue.status?.toUpperCase())
  );
};

// Complaints - with role-based filtering
export const fetchComplaints = async (user) => {
  await delay();
  let filteredComplaints = [...complaints];

  if (user?.role === 'supervisor') {
    filteredComplaints = getComplaintsBySupervisorId(user.id);
  } else if (user?.role === 'problem_solver') {
    filteredComplaints = getComplaintsBySolverId(user.id);
  }

  const mappedComplaints = filteredComplaints.map(complaint => ({
    ...complaint,
    issue: getIssueById(complaint.issue_id),
    raisedBy: getUserById(complaint.raised_by_supervisor_id),
    targetSolver: complaint.target_solver_id
      ? getUserById(complaint.target_solver_id)
      : null,
  }));

  return { success: true, complaints: mappedComplaints };  // ✅ wrapped
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
// Dashboard
export const fetchDashboardData = async (user) => {
  await delay(300);
  console.log('📊 --- DASHBOARD DATA FETCH START ---');
  console.log('👤 User fetching dashboard:', user?.username, '| Role:', user?.role);

  const allIssues = await fetchIssues(user);
  const allComplaints = await fetchComplaints(user);

  const issuesList = allIssues.issues || [];
  const complaintsList = allComplaints.complaints || [];

  console.log(`📦 Raw Issues fetched: ${issuesList.length}`);
  if (issuesList.length > 0) {
      // Let's see exactly what the statuses look like in the raw data
      console.log('🏷️ Raw statuses found:', issuesList.map(i => i.status));
  } else {
      console.log('⚠️ WARNING: issuesList is empty! Check user role filtering in fetchIssues.');
  }

  // Define safe statuses that perfectly match your mock data
  const safeNotFixedStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED', 'ESCALATED'];
  const safeFixedStatuses = ['COMPLETED', 'RESOLVED_PENDING_REVIEW'];

  const totalIssues = issuesList.length;
  
  const notFixedIssues = issuesList.filter(i => {
    const isMatch = safeNotFixedStatuses.includes(i.status?.toUpperCase());
    if (!isMatch && !safeFixedStatuses.includes(i.status?.toUpperCase())) {
        console.log(`❓ UNKNOWN STATUS FOUND: ${i.status}`);
    }
    return isMatch;
  }).length;

  const fixedIssues = issuesList.filter(i => 
    safeFixedStatuses.includes(i.status?.toUpperCase())
  ).length;

  const complaintsCount = complaintsList.length;

  console.log(`🧮 Calculated -> Total: ${totalIssues} | Pending: ${notFixedIssues} | Resolved: ${fixedIssues} | Complaints: ${complaintsCount}`);

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

  const issueTypeCounts = {};
  issuesList.forEach(issue => {
    issueTypeCounts[issue.issue_type] = (issueTypeCounts[issue.issue_type] || 0) + 1;
  });
  const issueTypes = Object.entries(issueTypeCounts).map(([name, count]) => ({ name, count }));

  const sitesComparison = sites.map(site => {
    const siteIssues = issuesList.filter(i => i.site_id === site.id);
    return {
      siteName: site.name.split(' ')[0],
      open: siteIssues.filter(i => safeNotFixedStatuses.includes(i.status?.toUpperCase())).length,
      completed: siteIssues.filter(i => safeFixedStatuses.includes(i.status?.toUpperCase())).length,
    };
  });

  const finalResult = {
    success: true,
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

  console.log('📤 Returning final payload stats:', finalResult.stats);
  console.log('📊 --- DASHBOARD DATA FETCH END ---');
  return finalResult;
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
