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
| 2 | §2, §3, §5, §6, §16 — Chat, lifecycle, alerts, photo timeline | ⏳ next |
| 3 | §7, §8, §4, §14 — Personal + group chats     | ⏳                |
| 4 | §9, §11, §15 — Customer MD dash + budget + diary | ⏳            |
| 5 | §12, §13, §17 — MD admin + Sheets + Gantt   | ⏳                |

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

*Last updated: Apr 22, 2026 — Priority 1 complete (revised per user feedback: tab bar reduced to 3 tabs, role sections moved into dashboard cards, mock-only auth).*
