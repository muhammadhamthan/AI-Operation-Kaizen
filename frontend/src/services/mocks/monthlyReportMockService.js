/**
 * Mock: monthly operations report (Kairox §9 + premium Priority 4 polish).
 *
 * Returns a structured report keyed by the viewer's role:
 *   - supervisor : scoped to their sites + team
 *   - manager    : company-wide
 *   - customer_md: scoped to their assigned sites
 *
 * Includes synthetic previous-month totals so the UI can render MoM delta
 * pills (the user-requested "↑ 12% vs March" chips).
 *
 * TODO(backend): GET /api/v1/reports/monthly?scope=<role>&month=YYYY-MM
 */

import { issues as mockIssues } from '../../mocks/issues';
import { complaints as mockComplaints } from '../../mocks/complaints';
import { sites as mockSites } from '../../mocks/sites';
import { users as mockUsers } from '../../mocks/users';
import {
  SITE_MONTHLY_CEILING,
  getBudgetRequests,
} from './budgetMockService';

let _warned = false;
const warn = () => {
  if (_warned) return;
  _warned = true;
  // eslint-disable-next-line no-console
  console.warn(
    '[BACKEND-GAP] reports/monthly: needs GET /api/v1/reports/monthly?scope=<role>&month=YYYY-MM'
  );
};

const monthLabel = (d = new Date()) =>
  d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const pct = (delta) => {
  if (delta == null) return null;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${Math.round(delta)}%`;
};
const deltaBetween = (current, previous) => {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
};

export const getMonthlyReport = async (user) => {
  warn();
  // TODO(backend): GET /api/v1/reports/monthly
  await new Promise((r) => setTimeout(r, 180));
  if (!user) return null;

  const role = user.role;

  // ── Scope filters ──────────────────────────────────────────────
  let scopedIssues = mockIssues;
  let scopedComplaints = mockComplaints;
  let scopedSites = mockSites;
  let scopeLabel = 'Company-wide';

  if (role === 'supervisor') {
    const myIds = user.sites || [];
    scopedIssues = mockIssues.filter((i) => myIds.includes(i.site_id));
    scopedComplaints = mockComplaints.filter((c) =>
      scopedIssues.some((i) => i.id === c.issue_id)
    );
    scopedSites = mockSites.filter((s) => myIds.includes(s.id));
    scopeLabel = `${user.name} · ${scopedSites.map((s) => s.name).join(', ')}`;
  } else if (role === 'customer_md') {
    const myIds = user.sites || [];
    scopedIssues = mockIssues.filter((i) => myIds.includes(i.site_id));
    scopedComplaints = mockComplaints.filter((c) =>
      scopedIssues.some((i) => i.id === c.issue_id)
    );
    scopedSites = mockSites.filter((s) => myIds.includes(s.id));
    scopeLabel = `${user.company || user.name} · ${scopedSites.length} sites`;
  } else if (role === 'manager') {
    scopeLabel = `All ${scopedSites.length} sites · ${
      mockUsers.filter((u) => u.role === 'supervisor').length
    } supervisors`;
  }

  // ── KPI counts ──────────────────────────────────────────────
  const raised = scopedIssues.length;
  const closed = scopedIssues.filter((i) => i.status === 'COMPLETED').length;
  const escalated = scopedIssues.filter((i) => i.status === 'ESCALATED').length;
  const complaintsCount = scopedComplaints.length;
  const closureRate = raised ? Math.round((closed / raised) * 100) : 0;

  // Synthetic previous-month baselines (stable per role so demos are predictable).
  const PREV = {
    supervisor: { raised: raised - 3, closed: closed - 2, escalated: escalated + 1, complaints: complaintsCount - 1 },
    manager:    { raised: raised - 5, closed: closed - 3, escalated: escalated + 2, complaints: complaintsCount - 2 },
    customer_md:{ raised: raised - 2, closed: closed - 1, escalated: escalated + 1, complaints: complaintsCount - 1 },
  }[role] || { raised: raised - 1, closed: closed - 1, escalated, complaints: complaintsCount };

  const deltas = {
    raised: deltaBetween(raised, PREV.raised),
    closed: deltaBetween(closed, PREV.closed),
    escalated: deltaBetween(escalated, PREV.escalated),
    complaints: deltaBetween(complaintsCount, PREV.complaints),
    closure_rate: null,
  };

  // ── Budget summary ──────────────────────────────────────────
  const budgets = await getBudgetRequests(user);
  const approved = budgets.filter((b) => b.status === 'approved');
  const rejected = budgets.filter((b) => b.status === 'rejected');
  const escalatedBudgets = budgets.filter((b) => b.status === 'escalated_customer_md');
  const approvedSum = approved.reduce((a, b) => a + (b.amount || 0), 0);

  // ── Per-site breakdown ─────────────────────────────────────
  const perSite = scopedSites.map((s) => {
    const siteIssues = scopedIssues.filter((i) => i.site_id === s.id);
    const done = siteIssues.filter((i) => i.status === 'COMPLETED').length;
    const open = siteIssues.length - done;
    const siteBudget = approved.filter((b) => b.site_id === s.id);
    const spent = siteBudget.reduce((a, b) => a + (b.amount || 0), 0);
    const ceiling = SITE_MONTHLY_CEILING[s.id] || 200000;
    return {
      site_id: s.id,
      name: s.name,
      issues_total: siteIssues.length,
      issues_closed: done,
      issues_open: open,
      on_time_rate: siteIssues.length
        ? Math.round((done / siteIssues.length) * 100)
        : 0,
      spent,
      ceiling,
      burn_ratio: ceiling ? spent / ceiling : 0,
    };
  }).sort((a, b) => b.burn_ratio - a.burn_ratio);

  // ── Top 5 issues (by impact_score, fallback severity) ─────
  const topIssues = [...scopedIssues]
    .sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      priority: i.priority,
      site_name:
        mockSites.find((s) => s.id === i.site_id)?.name || `Site ${i.site_id}`,
      impact_score: i.impact_score,
    }));

  // ── Standout / leaderboard ─────────────────────────────────
  let standout = null;
  if (role === 'supervisor') {
    // Best solver for this supervisor's team
    const solver = mockUsers.find((u) => u.role === 'problem_solver');
    standout = { label: 'Best solver this month', name: solver?.name || '—', detail: `${closed} issues closed` };
  } else if (role === 'manager') {
    const supervisors = mockUsers.filter((u) => u.role === 'supervisor');
    const ranked = supervisors
      .map((s) => ({
        id: s.id,
        name: s.name,
        closed: mockIssues.filter(
          (i) => i.raised_by_supervisor_id === s.id && i.status === 'COMPLETED'
        ).length,
      }))
      .sort((a, b) => b.closed - a.closed);
    standout = { label: 'Top supervisor', name: ranked[0]?.name || '—', detail: `${ranked[0]?.closed || 0} issues closed` };
  } else if (role === 'customer_md') {
    const ranked = [...perSite].sort((a, b) => b.on_time_rate - a.on_time_rate);
    standout = {
      label: 'Best-performing site',
      name: ranked[0]?.name || '—',
      detail: `${ranked[0]?.on_time_rate || 0}% on-time closure`,
    };
  }

  // ── AI Highlights paragraph (mocked per role) ─────────────
  const highlights = (() => {
    if (role === 'supervisor') {
      return `This month you closed ${closed} of ${raised} issues (${closureRate}% closure), a ${pct(deltas.closed)} change over last month. ${escalated} escalations reached the MD. Keep the sensor-replacement cadence on Zone C — it's your lowest complaint driver.`;
    }
    if (role === 'manager') {
      return `Company closure rate is ${closureRate}% — ${pct(deltas.closed)} vs last month. ${escalatedBudgets.length} budget requests are currently escalated to Customer MDs. Top burn-rate site: ${perSite[0]?.name || '—'} at ${Math.round((perSite[0]?.burn_ratio || 0) * 100)}% of ceiling.`;
    }
    if (role === 'customer_md') {
      return `Your sites saw ${raised} issues raised, ${closed} closed (${closureRate}%). ${escalatedBudgets.length} budget decisions escalated to you; ${approved.filter((b) => b.raised_by?.role === 'supervisor').length} were approved at the MD level before reaching you. Best performer: ${standout?.name}.`;
    }
    return '';
  })();

  const safety_incidents = 0; // seeded mock — all diaries report "None"

  return {
    month: monthLabel(),
    scope_label: scopeLabel,
    role,
    hero: {
      label:
        role === 'supervisor' ? 'Issues closed'
        : role === 'manager' ? 'Closure rate'
        : 'On-time delivery',
      value: role === 'supervisor' ? closed
        : role === 'manager' ? `${closureRate}%`
        : `${perSite.length ? Math.round(perSite.reduce((a, s) => a + s.on_time_rate, 0) / perSite.length) : 0}%`,
    },
    kpis: [
      { key: 'raised', label: 'Raised', value: raised, delta: pct(deltas.raised), trend: deltas.raised >= 0 ? 'up' : 'down' },
      { key: 'closed', label: 'Closed', value: closed, delta: pct(deltas.closed), trend: deltas.closed >= 0 ? 'up' : 'down', invertSentiment: false },
      { key: 'escalated', label: 'Escalated', value: escalated, delta: pct(deltas.escalated), trend: deltas.escalated >= 0 ? 'up' : 'down', invertSentiment: true },
      {
        key: role === 'customer_md' ? 'budget_approved' : 'complaints',
        label: role === 'customer_md' ? '₹ Approved' : 'Complaints',
        value: role === 'customer_md'
          ? '\u20B9' + new Intl.NumberFormat('en-IN').format(approvedSum)
          : complaintsCount,
        delta: role === 'customer_md' ? null : pct(deltas.complaints),
        trend: 'up',
        invertSentiment: role !== 'customer_md',
      },
    ],
    per_site: perSite,
    top_issues: topIssues,
    budget: {
      approved_count: approved.length,
      approved_sum: approvedSum,
      rejected_count: rejected.length,
      escalated_count: escalatedBudgets.length,
    },
    standout,
    safety_incidents,
    highlights,
  };
};
