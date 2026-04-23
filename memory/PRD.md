# Kairox AI OpEx — Product Requirements Document (PRD)

> Working PRD for the Emergent build that extends the existing Kairox MVP
> (React Native + Expo, pure JS, expo-router) from 3 → 4 roles and adds 17
> new features per `FULL_COMBINED_PROMPT.md` (1,549 lines, 25 sections).
>
> Source of truth for requirements: `FULL_COMBINED_PROMPT.md`.

---

## Tech Stack
- React Native 0.81 + Expo 54 + **expo-router** 6 (file-based)
- Redux Toolkit 2.11 (auth, theme, issues, complaints, chat, dashboard,
  notifications, offline, sites, performance)
- `@react-native-async-storage/async-storage`, axios, NetInfo
- `react-native-svg` 15.15 (prep for Gantt in Priority 5)
- Ionicons only, no other icon packs
- **Backend:** AWS (user-managed, unavailable from this pod). Per user
  directive, all data is mocked — `src/services/api.js` reads logins from
  `src/mocks/users.js`.

## User Personas (4 roles)

| Role token     | Label             | Access pattern                                   |
|----------------|-------------------|--------------------------------------------------|
| `problem_solver`| Problem Solver   | Existing MVP role, unchanged                     |
| `supervisor`   | Supervisor        | Existing MVP role, extended with new dashboard cards |
| `manager`      | Managing Director | MVP `manager` **IS** the MD — no rename          |
| `customer_md`  | Customer's MD     | **NEW** in v3.0                                   |

## Core Architectural Rules (self-imposed)

1. **No TypeScript.** Pure JS. No `.ts`/`.tsx`.
2. **No MVP file rewrites.** All changes additive or role-conditional.
3. **No new colour tokens.** Only `src/theme/colors.js`.
4. **Ionicons only.**
5. **Bottom tab bar stays MVP-style** — 3 tabs only (Chat, Issues,
   Dashboard). Role-specific sections surface as **cards inside the
   Dashboard**, conditional on `user.role`.
6. **Profile is not a tab.** It opens from the existing top-right avatar.
7. **Hidden routes** (sites, solvers, md-card, supervisors-card,
   customer-md-card, budget) live under `app/(main)/(tabs)/*.js` with
   `href: null` so dashboard cards can `router.push(...)` into them.
8. **Mock everything for missing backend.** Every mock call emits
   `console.warn("[BACKEND-GAP] ...")` and carries `// TODO(backend): ...`.
9. **Pause after each priority** for user test + go-ahead.

## Build Order (Section 18)

| P | Scope                                         | Status            |
|---|-----------------------------------------------|-------------------|
| 1 | §0, §1, §10 — Foundation + role nav + guards | **✅ done** (Apr 22) |
| 2 | §2, §3, §5, §6, §16 — Chat, lifecycle, alerts, photo timeline | **✅ done** (Apr 22) |
| 3 | §7, §8, §4, §14 — Personal + group chats     | ⏳ next               |
| 4 | §9, §11, §15 — Customer MD dash + budget + diary | ⏳                 |
| 5 | §12, §13, §17 — MD admin + Sheets + Gantt    | ⏳                   |

---

## ✅ Priority 2 — Chat + Lifecycle + Alerts + Photos (Completed Apr 22, 2026)

### Scope delivered
- **§2 Role-personalised AI chatbot** — empty-state greeting + quick-action chips differ per role. Problem Solver sees "Mark complete / Log diary / Upload DURING"; Supervisor sees "Raise issue / Extend deadline / Escalate / Budget request"; MD sees "Top 5 sites / Escalated issues / Pending budgets"; Customer's MD sees "My sites / Timeline / Monthly report".
- **§3 Kairox issue lifecycle labels** — backend enums (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `ESCALATED`, `REOPENED`, `ASSIGNED`, `AUTO_ASSIGNED`, `REASSIGNED`) are rebadged as `Active / In Progress / Fixed / Escalated / Not Fixed` via a central map. No backend changes required.
- **§3 Escalation Report modal** — Supervisor-only. Captures Reason (required), Root cause, Proposed action, Copy-Customer-MD toggle. Submits through mock service; simulated email + MD chat notification.
- **§5 Dual-channel alert banner** — shows on every issue detail: success (green) when both voice call + WhatsApp delivered, warning (amber) when voice missed + WhatsApp-fallback delivered, danger (red) when both failed. Supervisor/MD can tap "Resend" to re-fire WhatsApp.
- **§6 Missed-call notice** — when the alert record has `missed_call: true`, the banner shows "Call was missed · WhatsApp message was sent as a fallback" persistently.
- **§16 Photo timeline** — Before / During / After rows with colour-coded left borders (grey / amber / green), horizontal scroll of thumbnails, fullscreen viewer on tap. Role-aware "Add" button: Supervisor can add Before, Problem Solver can add During / After.

### Files created
| Path | Purpose |
|------|---------|
| `src/config/chatbotIntents.js` | Role → quick-action chips + greeting |
| `src/config/issueStatuses.js` | Backend enum → Kairox label + icon + theme token |
| `src/services/mocks/alertMockService.js` | `sendDualChannelAlert`, `getAlertForIssue`, `resendWhatsappNotice` (AsyncStorage-persisted) |
| `src/services/mocks/photoTimelineMockService.js` | `getPhotos`, `addPhoto` with BEFORE/DURING/AFTER buckets |
| `src/services/mocks/escalationMockService.js` | `submitEscalation`, `getEscalationsForIssue` |
| `src/components/chat/QuickActionChips.js` | Role-aware chip grid (replaces hard-coded MVP `SUGGESTIONS`) |
| `src/components/issue/AlertStatusBanner.js` | 3-variant banner (success/warning/danger) + Resend CTA |
| `src/components/issue/PhotoTimeline.js` | 3-row timeline + fullscreen viewer + ImagePicker-backed Add |
| `src/components/issue/EscalationReportModal.js` | Bottom-sheet modal with 3 fields + copy-Customer-MD toggle |

### Files modified (additive only)
| Path | Change |
|------|--------|
| `app/(main)/(tabs)/chat.js` | Replaced local `SUGGESTIONS` array with `<QuickActionChips role={user?.role} />`; greeting now `getChatbotGreeting(role, name)`. |
| `app/(main)/(tabs)/dashboard/issue-detail.js` | Added AlertStatusBanner below header card, replaced plain ImageGallery with PhotoTimeline, added Supervisor-only Escalate button + modal. Status badge now uses Kairox label. |
| `src/services/api.js` | `fetchIssues`, `fetchIssueById`, `fetchIssueTimeline` now read from `src/mocks/issues.js` (AWS unavailable). Real calls preserved as commented block. `[BACKEND-GAP]` warns on each. |
| `src/components/common/StatusBadge.js` | Added optional `label` + `color` prop overrides (one-line additive — also fixes the latent overdue-badge bug). |
| `src/config/issueStatuses.js` | Extended to handle all MVP uppercase enums (`OPEN`, `ASSIGNED`, `AUTO_ASSIGNED`, `REASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `REOPENED`, `ESCALATED`). |

### Verified on preview
- Supervisor login → chat shows 6 role-specific chips + "Hi Rajesh. Raise a new issue, check your team, or request a budget."
- Problem Solver login → chat shows 4 PS-specific chips + "Hi Suresh. What would you like to log today?"
- Issue #13 (IN_PROGRESS) shows "In Progress" Kairox badge + green `Alert delivered` banner (voice + WhatsApp both OK) + Photo Timeline with seeded Before photo.
- Issue #6 (ESCALATED) shows "Escalated" badge + amber `Call was missed` banner with `Resend` button + `2d Overdue` pill.
- Issue #13 Supervisor → "Escalate to Managing Director" button visible at bottom of Actions; tapping opens modal with Reason / Root cause / Proposed action + Copy Customer's MD toggle (on).
- Lint clean across all 9 new + 5 modified files.

### Known pod limitation (unchanged)
Metro dev server still can't run here; use `yarn build` + `serve dist` static pipeline. User's local dev workflow unchanged.

---

## ✅ Priority 1 — Foundation (Completed Apr 22, 2026)

### What shipped
- **Role model** — `customer_md` added alongside existing 3 MVP roles.
  `manager` == MD. No rename, full backwards compat.
- **Bottom tab bar = MVP-parity 3 tabs** (Chat, Issues, Dashboard).
- **Role-specific dashboard cards** (added inside the existing Dashboard,
  below the current Sites/Solvers row):
  - **Supervisor:** Managing Director + Budget Request cards.
  - **Managing Director:** Supervisors + Customer's MD cards, plus a
    full-width Budget card.
  - **Customer's MD:** Sites (full-width, no Solvers) + Managing Director
    + Budget cards.
  - **Problem Solver:** unchanged — MVP dashboard as-is.
- **Hidden destination routes** — `sites.js`, `solvers.js`, `md-card.js`,
  `supervisors-card.js`, `customer-md-card.js`, `budget.js` under
  `app/(main)/(tabs)/`, each wrapped in `RoleGuard` and rendering an
  `EmptyState` placeholder. Hidden from tab bar via `href: null`, reachable
  via `router.push('/(main)/(tabs)/<route>')` from dashboard cards.
- **Profile stays as existing top-right modal** — no new profile tab.
- **Mock-only auth** — `loginUser` reads `src/mocks/users.js`. Real AWS
  call preserved as commented block for one-line switch-back. `[BACKEND-GAP]
  auth/login` warned on first invocation.
- **Role helpers** — `src/utils/roles.js` (`ROLES`, `normaliseRole`,
  `canChatWith`, `can(action)`), `src/hooks/useRole.js`,
  `src/components/navigation/RoleGuard.js`.
- **Mocks folder** — `src/services/mocks/README.md` documenting the
  backend-gap policy. Actual service files land in Priorities 2+.

### Files created
- `src/utils/roles.js`
- `src/hooks/useRole.js`
- `src/components/navigation/RoleGuard.js`
- `src/config/roleNav.js` (retained for later priorities)
- `src/services/mocks/README.md`
- `app/(main)/(tabs)/sites.js`
- `app/(main)/(tabs)/solvers.js`
- `app/(main)/(tabs)/md-card.js`
- `app/(main)/(tabs)/supervisors-card.js`
- `app/(main)/(tabs)/customer-md-card.js`
- `app/(main)/(tabs)/budget.js`

### Files modified (additive only)
- `app/(main)/(tabs)/_layout.js` — 3 visible tabs + 6 hidden routes via
  `href: null`. Styling unchanged.
- `app/(main)/(tabs)/dashboard/index.js` — role-conditional new cards
  inserted below existing Sites/Solvers row. Solvers suppressed for
  `customer_md`. All existing paths unchanged.
- `src/services/api.js` — `loginUser` rewired to mocks; original preserved
  as commented block.
- `src/mocks/users.js` — two `customer_md` test users appended (IDs 11, 12).

### Pod build + serve pipeline
- `yarn build` → `expo export --platform web --output-dir dist`
- `yarn start` (supervisor managed) → `serve -s dist -l tcp://0.0.0.0:3000`
- Rebuild required after every source change (pod cannot run Metro dev
  server — kernel inotify limit). User's local `yarn start:dev` still runs
  the normal interactive Expo workflow.

### Verified on preview
All 4 logins → correct 3-tab bar + correct dashboard card set:
- `solver1 / solver123` → PS dashboard unchanged.
- `supervisor1 / super123` → MD + Budget Request cards added.
- `manager1 / manager123` → Supervisors + Customer's MD + Budget cards added.
- `customer1 / cust123` → Sites (no Solvers) + MD + Budget cards.

Lint clean on all new/modified files.

---

## Prioritised Backlog

### P0 — Priority 2 (next)
§2 Role-personalised chatbots, §3 Kairox issue lifecycle labels + escalation
report modal, §5+§6 dual-channel alerts banners + missed-call WhatsApp
notice, §16 photo timeline BEFORE/DURING/AFTER. Estimate: ~12 new files,
5-8 modifications.

### P1 — planned
Priority 3 (personal + group chats), Priority 4 (dashboards + budget),
Priority 5 (admin + Gantt).

### P2 — backend-owned
Full gap list in `FULL_COMBINED_PROMPT.md` §19.

---

*Last updated: Apr 23, 2026 — Priority 1 + 2 complete, all cards + destination screens wired to mock data.*

## Priority 1 + 2 Mock Data Coverage (Apr 23 follow-up)

Per user directive "use mock data on all cards and screens till priority 2",
the entire dashboard + every role-scoped destination screen is now driven
by AsyncStorage-backed mock data. No call reaches the AWS backend.

### Dashboard card data (per role)

| Role         | Action cards                        | Main cards + counts (typical)                                   |
|--------------|-------------------------------------|-----------------------------------------------------------------|
| Supervisor   | Escalated: 3 · Pending Review: 3   | Pending 19 · Resolved 8 · Complaints 8 · Sites 5 · Solvers 5 · **MD** · **Budget Request** |
| MD (manager) | Escalated · Pending Review         | Pending · Resolved · Complaints · Sites · **Supervisors 3** · **Customer MD 2** · **Budget ₹ total** |
| Customer MD  | Escalated (scoped) · Pending Review | Pending · Resolved · Sites (scoped) · **MD** · **Budget (escalated only)** |
| Problem Solver | none                              | My Pending · My Completed · Complaints against me              |

### Destination screens (reached from dashboard cards)

| Screen (route)           | Role access          | Data shown                                                                              |
|--------------------------|----------------------|-----------------------------------------------------------------------------------------|
| `/sites` (hidden tab)    | Sup / MD / CustMD    | Site name, location, issue total + active count; Customer MD scoped to assigned sites. |
| `/solvers`               | Sup / MD             | Solver name, skill, phone, ✓ completed chip, ⏳ pending chip, ★ rating.                 |
| `/md-card`               | Sup / CustMD         | MD profile card (avatar, name, email, phone, username) + Call + Message MD buttons.     |
| `/supervisors-card`      | MD                   | Supervisor directory, avatar, site list, active/closed chips, chat icon.                |
| `/customer-md-card`      | MD                   | Customer MD directory, avatar, company, assigned-sites list, chat icon.                 |
| `/budget`                | Sup / MD / CustMD    | Totals row (total / pending / ₹approved / rejected) + per-request list with status pill. Role-scoped: Supervisor sees own; MD sees all; Customer MD sees escalated-to-them only. |
| `/dashboard/complaints`  | existing MVP screen  | Now mock-backed via `fetchComplaints`; 8 seeded entries with issue + site names.        |
| `/dashboard/issue-detail`| existing MVP screen  | Now mock-backed via `fetchIssueById`; shows Kairox labels + AlertStatusBanner + PhotoTimeline + (Sup) Escalate button. |

### Mock layer touched
- `src/services/api.js` — 6 more endpoints mocked (`fetchDashboardStats`, `fetchComplaints`, `fetchComplaintById`, `fetchSites`, `fetchSitesAnalytics`, `fetchSolversPerformanceAPI`). All emit `[BACKEND-GAP]` on first call.
- `src/services/mocks/budgetMockService.js` — **NEW**, 5 seed requests, role-scoped filtering, `getBudgetRequests()` + `getBudgetTotals()`.
- Screens `sites.js`, `solvers.js`, `md-card.js`, `supervisors-card.js`, `customer-md-card.js`, `budget.js` — all filled with list/detail UIs wired to mocks.

Every mock call path has a `// TODO(backend): <endpoint>` comment, so the
real backend team can search-and-replace when the AWS endpoints land.
