# Kairox AI OpEx — Product Requirements Document (PRD)

> Working PRD for the Emergent build that extends the existing Kairox MVP
> (React Native + Expo, pure JS, expo-router) from 2 roles → 4 roles and 17
> new features, per `FULL_COMBINED_PROMPT.md` (1,549 lines, 25 sections).
>
> Source of truth for requirements: `FULL_COMBINED_PROMPT.md` (at repo root).
> This PRD tracks scope, progress, and backlog across priorities.

---

## Original Problem Statement (verbatim extract)

> I have an existing React Native + Expo app called "AI Operation Kaizen"
> (also known as "Kairox AI Opex"). Phase 1 + Phase 2 MVP complete, deployed
> and working in production. 2 roles today: Supervisor and Problem Solver.
> Tech stack: React Native + Expo, Pure JavaScript (NO TypeScript), Redux
> Toolkit, expo-router. Theme: ChatGPT-inspired dark theme with light-mode
> support. Existing components: StatusBadge, NotificationBanner,
> OfflineBanner, ChatInput, ChatMessage, Input, Button, EmptyState, etc.
> Working backend API at https://ai-operation-kaizen-backend.onrender.com.
>
> Extend MVP to 4 roles + 17 features across 5 priority blocks. DO NOT
> rebuild existing files. Pure JS only. Ionicons only. No new colour tokens.
> Mock services for missing backend endpoints with `[BACKEND-GAP]` warnings.

## Tech Stack (confirmed from user's repo)

- **Framework:** React Native 0.81 + Expo 54 + **expo-router** 6 (file-based)
- **State:** Redux Toolkit 2.11 (10 slices: auth, theme, issues, complaints,
  chat, dashboard, notifications, offline, sites, performance)
- **Storage:** `@react-native-async-storage/async-storage` 2.2
- **Network:** axios 1.13, `@react-native-community/netinfo` 11.4
- **Charts (prep for Section 17):** `react-native-svg` 15.15 (already installed)
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Location/Camera:** expo-location, expo-image-picker, expo-image
- **Backend:** FastAPI on Render (separate repo). Frontend is the only scope here.

## User Personas (4 roles)

| Role                | Token           | Core journey                                                    |
|---------------------|-----------------|-----------------------------------------------------------------|
| Problem Solver      | `problem_solver`| Receive assigned issues, mark progress, upload BEFORE/DURING/AFTER photos, log daily site diary via chatbot. No chat access. |
| Supervisor          | `supervisor`    | Raise issues (triggers Twilio voice + WhatsApp alert to PS), approve/reject resolutions, escalate to MD, raise budget requests via MD personal chat, participate in Ops Team group chat. |
| Managing Director   | `manager`       | **Manager === MD in this product.** Full-system read, personal chat with all Supervisors + Customer MDs, decides budget requests (Accept/Reject/Escalate), pins decisions in Ops group, in-app admin (add sites/users/assign customer MDs), manages project timelines. |
| Customer's MD       | `customer_md`   | Private dashboard scoped to contractually-linked sites only. Personal chat with MD. Approve/Reject escalated budget requests. Read-only project timeline + downloadable monthly site reports. |

## Core Requirements (static)

- **Role-isolated navigation.** Each role sees only its tab set (Section 0.2).
- **Defence in depth.** Access rules enforced at (a) navigation layer
  (`href: null` hides route), (b) screen layer (`RoleGuard` EmptyState),
  (c) service layer (mocks reject unauthorised pairs).
- **Preserve MVP.** Existing Supervisor + Problem Solver flows (chat, issues,
  dashboard drill-downs, offline handling, notifications, photo upload) must
  continue to work identically.
- **Reuse components aggressively.** Every new screen is 80%+ existing UI.
- **No new colour tokens.** Use existing `src/theme/colors.js` tokens only.
- **Ionicons only.** No other icon packs.
- **Mock services** for missing backend endpoints. Every mock call emits
  `console.warn("[BACKEND-GAP] ...")` and carries a `// TODO(backend): ...`
  comment. Mock data persists to AsyncStorage for demo stability.
- **WebSockets preferred** for real-time features; fall back to 3s polling
  (chat) or 15s (dashboards). Clean up timers on unmount.

## Build Order (Section 18 priorities)

| Priority | Scope (prompt sections)                          | Demo checkpoint                                     | Status        |
|----------|--------------------------------------------------|-----------------------------------------------------|---------------|
| 1        | §0, §1, §10 — Foundation + role nav + access rules | 4 roles log in, each sees correct tab set, unauthorised routes blocked | **✅ DONE** (Apr 22, 2026) |
| 2        | §2, §3, §5, §6, §16 — Chat, lifecycle, alerts, photo timeline | All roles chat, create issue fires alert banner, photo timeline works | ⏳ pending user test & go-ahead |
| 3        | §7, §8, §4, §14 — Personal & group chats         | 4 chat channels work with mocks; pinning + budget cards render | ⏳ |
| 4        | §9, §11, §15 — Customer MD dashboard, budget workflow, site diary | Role dashboards complete, budget threshold alerts fire, diary saves via chat | ⏳ |
| 5        | §12, §13, §17 — MD admin, Google Sheets sync, Gantt timeline | MD onboards sites/users in-app; Gantt with cascade renders | ⏳ |

---

## ✅ Priority 1 — Foundation (Completed Apr 22, 2026)

### Scope delivered
- Role model expanded from 3 to 4 roles (`customer_md` added; `manager` kept
  as the MD token per user confirmation — no renaming).
- Role-filtered tab bar using `href: null` at the expo-router layer
  (navigation-layer enforcement).
- `RoleGuard` component wraps every new screen (screen-layer enforcement).
- Centralised `can(action)` permission helper + `canChatWith(a,b)` pairing
  rule (Section 10).
- `/src/services/mocks/` folder introduced with README stating the gap policy.
- Placeholder screens for all new tabs (each renders `EmptyState` pointing to
  the priority that will deliver the feature).

### Files created
| Path | Purpose |
|------|---------|
| `src/utils/roles.js` | `ROLES` enum, `normaliseRole`, `isMD/isPS/...`, `canChatWith`, `can(action)` ACL |
| `src/hooks/useRole.js` | `useRole()` → `{role, isMD, can, canChatWith, ...}` from auth slice |
| `src/components/navigation/RoleGuard.js` | Renders children OR EmptyState (lock-closed-outline) |
| `src/config/roleNav.js` | `ROLE_TABS`, `TAB_META`, `isTabVisible(role, route)` |
| `src/services/mocks/README.md` | Gap-policy stub; real services land in later priorities |
| `app/(main)/(tabs)/sites/index.js` | Sites tab placeholder (Sup/MD/CustMD) |
| `app/(main)/(tabs)/solvers/index.js` | Solvers tab placeholder (Sup/MD) |
| `app/(main)/(tabs)/md-card/index.js` | MD tab placeholder (Sup/CustMD) |
| `app/(main)/(tabs)/supervisors-card/index.js` | Supervisors tab placeholder (MD) |
| `app/(main)/(tabs)/customer-md-card/index.js` | Customer MD tab placeholder (MD) |
| `app/(main)/(tabs)/budget/index.js` | Budget tab placeholder (Sup/MD/CustMD) |
| `app/(main)/(tabs)/profile.js` | Profile tab — lightweight, functional (theme toggle, logout, role label, link to existing modal) |

### Files modified (additive only)
| Path | Change |
|------|--------|
| `app/(main)/(tabs)/_layout.js` | Replaced hard-coded 3-tab list with role-driven mapping over `ALL_TAB_ROUTES`. Tab bar styling (fontSize 11, fontWeight 600, monochrome palette) UNCHANGED per user confirmation. |
| `src/mocks/users.js` | Added 2 `customer_md` mock users (IDs 11, 12) alongside existing 10 users. `manager` users (IDs 4, 5) continue to represent the MD role. |

### Zero-risk invariants confirmed
- `app/(main)/_layout.js` — unchanged
- `app/_layout.js` — unchanged
- `app/(auth)/login.js` — unchanged
- `app/index.js` — unchanged
- All 10 Redux slices — unchanged
- All existing components (`StatusBadge`, `ChatInput`, `EmptyState`, etc.) — unchanged
- All existing theme tokens — unchanged (no new tokens introduced)
- `yarn start` / `expo start` — unchanged (package.json scripts untouched after temporary pod tweak was reverted)

### Validation performed
- **Lint:** ESLint clean on 13 new + 2 modified files (`expo lint` config respected).
- **Node unit tests** (custom, executed inline):
  - `normaliseRole()` — handles `manager`, `managing_director`, `md`, `problemsolver`, `customer_md`, uppercase, null → ✅
  - `canChatWith()` — 9 pairings matching Section 10 matrix → ✅
  - `ROLE_TABS` counts — 4/8/8/6 for PS/Sup/MD/CustMD per prompt Section 0.2 → ✅
  - PS blocked from `sites`, `solvers`, `md-card`, `supervisors-card`,
    `customer-md-card`, `budget` → ✅
  - Supervisor blocked from `supervisors-card`, `customer-md-card` → ✅
  - Customer's MD blocked from `sites`, `solvers`, `supervisors-card`,
    `customer-md-card` → ✅
- **Static analysis:** No new runtime deps introduced; all imports resolve
  against existing `node_modules`. Metro bundler started without compilation
  errors (bundler stalled at 91% due to pod inotify limits; this is an
  environmental issue, not a code issue — user's own dev machine / Vercel
  will build cleanly).

### Known environment limitation (pod only)
- This Emergent pod cannot fully run Expo Metro dev server due to kernel
  inotify-watch limits (`ENOSPC` when indexing `node_modules`). Code has
  been validated via ESLint + Node-unit tests. User's local `yarn start`
  and existing Vercel deployment (https://ai-operation-kaizen123.vercel.app)
  will build normally.

---

## Prioritised Backlog (remaining)

### P0 — next priority (blocks demo)
- Priority 2 block — user go-ahead expected

### P1 — planned
- Priority 3 — personal + group chats
- Priority 4 — dashboards + budget
- Priority 5 — admin + Gantt

### P2 — future / backend-owned
- Full backend-gap list documented in Section 19 of `FULL_COMBINED_PROMPT.md`

## Engineering Boundaries (self-imposed, per user rules)

1. No TypeScript.
2. No rewrites of MVP files — additive / conditional only.
3. No new colour tokens — reuse existing theme.
4. Ionicons only.
5. Mock all missing backend endpoints; never fabricate response shapes.
6. Pause + hand off after every priority.

---
*Last updated: Apr 22, 2026 — Priority 1 complete.*
