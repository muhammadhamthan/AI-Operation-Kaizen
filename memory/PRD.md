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
| 3 | §7, §8, §4, §14 — Personal + group chats     | **✅ done** (Apr 23) |
| 4 | §9, §11, §15 — Customer MD dash + budget + diary | **✅ done** (Apr 23) |
| 5 | §12, §13, §17 — MD admin + Sheets + Gantt    | ⏳ next              |

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

## ✅ P0 follow-up — Nav back-stack fix + Monthly Report (Apr 23, 2026)

### Scope delivered
- **Navigation back-stack bug fixed** — `src/utils/navigation.js` exposes `backToDashboard()` which calls `router.replace('/(main)/(tabs)/dashboard')` (with `router.back()` fallback). All 6 hidden routes (Budget, Sites, Solvers, MD card, Supervisors, Customer MDs) plus Site Diary and Monthly Report now use this helper in their header chevrons. Users no longer land on the Chat tab when backing out of a dashboard card.
- **Site Diary ↔ Monthly Report separation (Customer MD)** — previously both cards routed to `/diary`. Monthly Report now has its own screen at `/(main)/monthly-report.js` with a distinct layout (structured analytical KPIs) vs. Site Diary (raw daily logs with work-done / issues-noted / safety).
- **Monthly Report card added to Supervisor + Manager dashboards** — full-width card below the Ops Team Group + Site Diary row for both roles. All 3 non-solver roles now see the card; Solver dashboard remains untouched.

### Monthly Report screen (design highlights)
Premium, distinctive layout (no AI-slop defaults):
- Deep-navy hero tile with role-specific hero metric ("Closure rate" for Manager, "Issues closed" for Supervisor, "On-time delivery" for Customer MD), month pill + scope pill, thin blue accent bar.
- KPI grid with MoM delta pills (↑/↓ icons, green = good / red = bad, with `invertSentiment` support for "Escalated" / "Complaints").
- Blue "Kairox AI Highlights" info card — role-specific narrative paragraph.
- Trophy-badged "Top Supervisor / Best-performing site / Best solver" standout card.
- Per-site performance cards with on-time % chip, Raised/Closed/Open mini-stats, and colour-coded budget burn bars (green <70% / amber 70-90% / red >90%).
- Budget summary mini-stat row (Approved ₹ sum, Requests, Rejected, Escalated).
- "Top 5 issues" list with rank badges + status pills.
- Footer with safety-incident count + scope/month caption.

### Files created / modified
| Path | Change |
|------|--------|
| `src/utils/navigation.js` | **Rewritten** — exports `backToDashboard()` |
| `app/(main)/monthly-report.js` | **NEW** — full Monthly Report screen consuming `monthlyReportMockService` |
| `src/services/mocks/monthlyReportMockService.js` | Existing (unchanged) — already builds role-scoped report |
| `app/(main)/(tabs)/dashboard/index.js` | Customer MD Monthly Report now routes to `/monthly-report` (was `/diary`); added new Monthly Report cards for Supervisor + Manager |
| `app/(main)/(tabs)/budget.js`, `sites.js`, `solvers.js`, `md-card.js`, `supervisors-card.js`, `customer-md-card.js` | Header chevron now uses `backToDashboard` |
| `app/(main)/diary/index.js` | Header chevron now uses `backToDashboard` |

### Verified via testing agent (iteration_1.json — 100% pass)
- Manager: Monthly Report card visible · MR screen hero "Closure rate 30%" · scope "All 5 sites · 3 supervisors" · back → /dashboard ✓
- Supervisor: MR hero "Issues closed" · scope "Rajesh Kumar · Vepery, Ambattur" · back → /dashboard ✓
- Customer MD: Site Diary AND Monthly Report render DIFFERENT screens · MR scope "Desai Holdings · 2 sites" · "Your sites" section ✓
- Solver: no Monthly Report card (correct) ✓
- 6/6 manager hidden-route back buttons land on /dashboard (never /chat) ✓

---

## ✅ Priority 5 — Admin + Sheets Sync + Gantt + Backend Gaps (Apr 23, 2026)

### Scope delivered
- **§12 MD Admin Hub** (`/(main)/admin`) — new full-width MD-only dashboard card routes to a 4-tile hub: Team, Add Site, Google Sheets Sync, Backend Gaps.
- **§12 Team screen** — lists all users with role chips + filter pills (All / Supervisors / Solvers / Customer MDs). "+" top-right opens Add Member.
- **§12 Add Member form** — segmented role control (Supervisor / Problem Solver / Customer's MD); Company field surfaces only for Customer MD. On save, mock `addUser` persists to AsyncStorage and the user appears instantly in Team list. MD provides credentials to the new user via their own channel (no email invite).
- **§12 Add Site form** — name, location, GPS lat/lon with auto-fill button (uses `expo-location` when available, falls back to Chennai default on web), initial budget. Persists via mock; new site is immediately visible on the global Sites list (MD/Sup/Customer MD).
- **§12 Assign Customer-MD Sites** — from Team list, "Assign sites" button on any Customer MD row → multi-select screen with pre-checked current assignments. Save persists to AsyncStorage; Customer MD's dashboard Sites scope updates immediately.
- **§13 Google Sheets Settings** — Connect / Disconnect flow. `SyncStatusPill` component animates through 4 states (idle / syncing / synced / error). "Sync now" + "Simulate error" buttons exercise the state machine.
- **§17 Project Timeline Gantt** — SVG-based chart with colour-coded bars (not-started grey / in-progress blue / completed green / delayed red), dashed dependency lines, red contract-end marker, blue dashed today-marker, month ticks. MD gets edit modal (end-date + status); changing end-date forward triggers **dependency cascade** that shifts all downstream tasks and extends the contract end if it overflows. Supervisor + Customer MD get read-only view. Problem Solver blocked by RoleGuard.
- **§19 Backend Gaps** — consolidated 11-group list of every `[BACKEND-GAP]` endpoint, rendered in monospace with category headers. Designed to be handed to the backend team as a build checklist.

### Files created
| Path | Purpose |
|------|---------|
| `src/services/mocks/adminMockService.js` | `addSite`, `addUser`, `getAllSites`, `getAllUsers`, `getCustomerMdSites`, `setCustomerMdSites` — all AsyncStorage-backed |
| `src/services/mocks/sheetSyncMockService.js` | `getSheetsStatus`, `connectSheets`, `disconnectSheets`, `triggerManualSync`, `simulateError` |
| `src/services/mocks/projectTimelineMockService.js` | `getTimeline`, `updateTask` (with cascade), `resetTimeline`. Deterministic per-site 8-task chain with dependencies |
| `src/components/common/SyncStatusPill.js` | Animated pill — spinning sync icon during 'syncing' state |
| `app/(main)/admin/index.js` | Admin Hub (4 tiles) |
| `app/(main)/admin/team.js` | Team list with filters + Add CTA |
| `app/(main)/admin/add-member.js` | User creation form (segmented role) |
| `app/(main)/admin/add-site.js` | Site creation form with GPS auto-fill |
| `app/(main)/admin/assign-sites/[userId].js` | Customer-MD site assignment multi-select |
| `app/(main)/admin/google-sheets.js` | Google Sheets Settings |
| `app/(main)/admin/backend-gaps.js` | Section 19 consolidated list |
| `app/(main)/timeline/[siteId].js` | SVG Gantt with edit modal + cascade |

### Files modified (additive only)
- `app/(main)/(tabs)/dashboard/index.js` — added full-width "Admin" card for MD below Monthly Report
- `app/(main)/(tabs)/sites.js` — MD sees "+" top-right; every site row now navigates to `/timeline/:id`; newly-added sites appear via `getAllSites()` merge

### Verified by testing_agent (iteration_2.json — 100% pass)
- MD: Admin card visible → hub → all 4 sub-screens functional
- MD: Add Member persists 'Test Supervisor' in Team list
- MD: Add Site persists 'Test Plant' in Sites list
- MD: Assign sites for Anita Desai (2 → 3 sites); Customer MD login sees 3 sites
- MD: Sheets pill cycles idle → syncing → synced → error correctly
- MD: Backend Gaps shows all 11 grouped sections
- MD: Gantt edit modal + cascade (moved Structural framing end → 5 downstream tasks turned delayed)
- Supervisor + Customer MD: Gantt read-only; Admin blocked by RoleGuard
- Problem Solver: both Admin + Timeline blocked by RoleGuard
- Back-nav: no screen ever lands on Chat tab

### Known minor
- Deep-linked direct-URL entry to `admin/add-member`, `admin/add-site`, `admin/assign-sites/:id`, `timeline/:id` → header chevron (router.back) has no history to pop → stays on page. Not a functional regression; real tap-chain navigation works. Could be patched by swapping `router.back()` for a parent-aware fallback, but out of scope for P5.

---

## ✅ Priority 6 — ProjectFlow Intelligence (Apr 28, 2026)

### Scope delivered
**ProjectFlow Intelligence** — premium per-site execution coordination module that REPLACES the older raw Gantt timeline. Visible to MD + Supervisor only (CMD blocked, PS blocked). Accessed by tapping any row in the Sites list.

### Module structure (single screen, 5 segmented tabs)
- **Header strip**: deep-navy "EXECUTION HEALTH" hero with score X/100, status pill (On track / At risk / Delayed), recalibration timestamp, contract date range. Italic tagline below header summarising the module.
- **Conditional Weather/Environmental card**: appears only when scenario.recalibrated=true; reads "Execution adjusted based on environmental conditions" with forecast + impact line.
- **Tab 1 — Timeline**: SVG Gantt with stage bars, dashed dependency curves, material-arrival pin dots above the chart, blue today marker, red contract-end marker, full stage list with assigned supervisor names. MD-only edit modal triggers cascade.
- **Tab 2 — Flow Map**: 4-lane node-edge SVG (Approvals → Vendors → Materials → Stages) with curved bezier edges and 3-state color (blue=aligned, amber=at_risk, red=delayed). Tap-to-detail bottom sheet.
- **Tab 3 — Materials**: synthesis banner ("synchronized with execution plan" or "N items need attention"), per-item cards with vendor + linked stage + ETA + status pill + recalibration trigger flag.
- **Tab 4 — Vendors**: 4 vendor cards with status, dispatch ETA, goods chips, delay slip indicator, follow-up automation badge, MD-only "Send follow-up" button.
- **Tab 5 — Alerts**: execution intelligence feed (info/warning/critical) with 5 alert kinds: material_dependency, vendor_delay, environmental, timeline_drift_corrected, continuity_restored. Per-alert dismiss.
- **Top-right Recalibrate button** (MD only): inserts a new "Execution timeline recalibrated" alert and refreshes the bundle.

### Data model
- New mock service `src/services/mocks/projectFlowMockService.js` wraps existing `projectTimelineMockService` and adds materials (8 phase-mapped types), vendors (4-vendor pool), flow_map nodes/edges, weather scenarios (3 deterministic per site_id), 4 starter alerts + auto-cascade alerts.
- `updateStage()` calls cascade engine then auto-inserts a `timeline_drift_corrected` alert with the count of recalibrated tasks.
- Health score = aligned_count / total_count (stages completed/in_progress + materials arrived/on_time + vendors confirmed).

### Files created/changed
| Path | Change |
|------|--------|
| `src/services/mocks/projectFlowMockService.js` | **NEW** — getProjectFlow, updateStage (cascade + alert), sendVendorFollowUp, dismissAlert, recalibrateProjectFlow |
| `app/(main)/projectflow/[siteId].js` | **NEW** — main screen with 5 tabs, edit modal, node-detail sheet |
| `app/(main)/(tabs)/sites.js` | Routes to `/projectflow/:id` for MD+Sup; CMD rows non-interactive; tag changed from "Timeline" to "ProjectFlow" |
| `app/(main)/admin/backend-gaps.js` | Replaced "Project Timeline" group with "ProjectFlow Intelligence (per-site)" — 17 endpoints/tables incl. site_materials, site_vendors, vendor_followups, site_flow_alerts, site_flow_recalibrations |
| `app/(main)/timeline/[siteId].js` | **DELETED** — replaced entirely by ProjectFlow |

### Verified (iteration_3.json — 100% pass)
- MD: full edit + recalibrate + vendor follow-up; cascade edit on Structural framing end → 2026-12-31 advanced contract end from 2026-08-11 to 2027-03-24, added 2 "Timeline drift corrected" alerts ✓
- Supervisor: read-only (no recalibrate, no follow-up, no edit modal on tap) ✓
- Customer MD: site rows non-interactive + RoleGuard "Restricted module" on deep-link ✓
- Problem Solver: RoleGuard blocks deep-link ✓
- Old `/timeline/[siteId]` route fully removed → returns Unmatched Route 404 ✓

### Known minor (non-blocking)
- ProjectFlow screen is 1149 lines — testing agent flagged maintainability. Functional, but a future refactor could split per-tab into separate files (TimelineTab.js, FlowMapTab.js, etc.). Not P0.


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
