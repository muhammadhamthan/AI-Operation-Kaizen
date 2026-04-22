# KAIROX AI OPEX — EMERGENT AI PROMPT

## Production Build: Industry-Level Product + Enhanced Feature Set

**Platform:** React Native + Expo (Pure JavaScript — no TypeScript)
**Build basis:** Existing MVP (Phase 1 + Phase 2 complete — 2 roles: Supervisor, Problem Solver)
**This build extends the MVP to:** 4 roles (Problem Solver, Supervisor, Managing Director, Customer's MD) + 17 new features
**Source of truth for all feature requirements:** Kairox AI Opex Development Prompt Document v3.0 (April 2026)

---

## ⚠ READ THIS BEFORE BUILDING

1. **Do NOT rebuild the MVP from scratch.** The MVP is working. Phase 1 and Phase 2 screens, navigation, Redux store, chat components, photo upload, location capture, offline banner, pull-to-refresh, filter modals — all already exist. Extend them.

2. **Do NOT break existing features.** Supervisor and Problem Solver flows that work today must continue to work identically after this build.

3. **Preserve the existing ChatGPT-style theme.** Dark theme tokens (`theme.background = #0f1419`, `theme.card = #1f2937`, `theme.primary = #3b82f6`, etc.) and Ionicons iconography are already in use. Every new screen and component must use the existing theme provider, the existing `StatusBadge`, `NotificationBanner`, `OfflineBanner`, `ChatInput`, `ChatMessage`, `Input`, `Button` components — do not create parallel component systems.

4. **Backend gap policy:** Several features below require backend endpoints that DO NOT exist yet in the current API. For each such feature, this prompt instructs you to:
   - Build the full frontend UI as specified
   - Wire it to a mock data service (in `/src/services/mocks/`)
   - Emit a clear `console.warn("[BACKEND-GAP] <feature>: needs <endpoint>")` at the integration point
   - Add a `// TODO(backend): <endpoint spec>` comment above every mocked call
   A complete list of backend gaps is in **Section 11** at the end of this document.

5. **Role model expands from 2 to 4:** Add `managing_director` and `customer_md` alongside existing `supervisor` and `problem_solver`. Update `/src/utils/roles.js`, role-gating hooks, and all navigation guards accordingly. Existing role checks for `supervisor` and `problem_solver` must continue to work unchanged.

6. **Build order follows Section 10 (Implementation Priorities).** Do not build features out of order — later features depend on the navigation and role work done early.

---

## SECTION 0 — GLOBAL FOUNDATION WORK (DO THIS FIRST)

### 0.1 Role Model Expansion

**File:** `/src/utils/roles.js` (modify)

Add two new role constants:

```js
export const ROLES = {
  PROBLEM_SOLVER: 'problem_solver',
  SUPERVISOR: 'supervisor',
  MANAGING_DIRECTOR: 'managing_director',  // NEW
  CUSTOMER_MD: 'customer_md',              // NEW
};
```

Update `isManager()`, `isSupervisor()`, `isProblemSolver()` helpers. Add `isMD()` and `isCustomerMD()`. Replace any existing hard-coded `'manager'` string with `ROLES.MANAGING_DIRECTOR` — the MVP's "manager" role is now the "Managing Director" role.

**File:** `/src/hooks/useRole.js` (modify or create)

Returns: `{ role, isPS, isSupervisor, isMD, isCustomerMD, can(action) }`. The `can(action)` function centralises all permission checks — every screen reads from here, never from role strings directly.

**File:** `/src/navigation/RoleGuard.js` (create)

Wraps any screen/component. Renders children only if role is permitted. Otherwise renders the existing `EmptyState` component with text `"You do not have access to this screen."` and Ionicons `lock-closed-outline`.

### 0.2 Navigation Restructure

**File:** `/src/navigation/MainNavigator.js` (modify)

The existing navigator defines tabs for Supervisor and Problem Solver. Extend it to emit a different tab set per role, resolved at mount time from `user.role`. Use the **exact tab sets from Kairox v3.0 Section 2.1**:

**Problem Solver tabs:**
`Dashboard | Issues | AI Chatbot | Profile`
(Dashboard contains sub-cards: Active Tasks, Resolved, My Analytics, My Sites, Complaints Logged, My Activity Tasks. Issues tab opens Issue List → Issue Detail.)

**Supervisor tabs:**
`Dashboard | Issues | Sites | Solvers | MD Card | Budget Request | AI Chatbot | Profile`
(Dashboard contains sub-cards: Escalated, Pending Review, Pending Issues, Resolved, Total Recorded Complaints, Sites, Solvers, Recent Activity.)

**Managing Director tabs:**
`Dashboard | Issues | Sites | Supervisors Card | Customer's MD Card | Budget | AI Chatbot | Profile`
(Dashboard sub-cards identical to Supervisor plus system-wide scope.)

**Customer's MD tabs:**
`Dashboard | Issues | MD Card | Budget (read-only) | AI Chatbot | Profile`
(Dashboard sub-cards: Escalated, Pending Review, Pending Issues, Resolved, Total Recorded Complaints, Sites, Solvers — scoped to this Customer MD's assigned sites only.)

**Tab bar styling:** Reuse existing `TabBar` component. No visual change — same `theme.tabBar` background, same `theme.primary` active colour, same `theme.textSecondary` inactive colour, Ionicons throughout, fontSize 12 / fontWeight 500 labels. New tabs (MD Card, Budget, Supervisors Card, Customer's MD Card) use outlined Ionicons to match the existing tab icon style.

**Icon assignments:**
- MD Card: `person-circle-outline`
- Supervisors Card: `people-outline`
- Customer's MD Card: `business-outline`
- Budget / Budget Request: `wallet-outline`

### 0.3 Theme Tokens

Confirm the existing theme object exposes these tokens (add any missing):
```
theme.background        #0f1419 dark / #ffffff light
theme.card              #1f2937 dark / #f9fafb light
theme.primary           #3b82f6 dark / #2563eb light
theme.primaryLight      #1e3a5f dark / #dbeafe light
theme.text              light text on dark bg
theme.textSecondary     #9ca3af dark / #6b7280 light
theme.border            subtle divider
theme.inputBackground
theme.tabBar            #1f2937 dark / #ffffff light
theme.headerBackground
theme.success           #22c55e
theme.successLight
theme.warning           amber
theme.warningLight
theme.danger            #f87171
theme.dangerLight
theme.statusOpen        #60a5fa
```

Do not introduce new colour tokens. Every new component must style itself from these tokens only.

### 0.4 Services & Mock Layer

**New folder:** `/src/services/mocks/`

Every new feature below that requires a backend endpoint the current API does not expose MUST route through a mock service file in this folder. Mock files export the same function signatures that the real service will expose later, so swapping in real APIs is a one-line change.

Mock files to create (details in each feature section):
- `/src/services/mocks/budgetMockService.js`
- `/src/services/mocks/personalChatMockService.js`
- `/src/services/mocks/groupChatMockService.js`
- `/src/services/mocks/customerMDMockService.js`
- `/src/services/mocks/siteDiaryMockService.js`
- `/src/services/mocks/projectTimelineMockService.js`
- `/src/services/mocks/sheetSyncMockService.js`
- `/src/services/mocks/adminMockService.js`

All mock data persists to AsyncStorage so it survives app reloads during demo.

---

## SECTION 1 — FULL ROLE-BASED NAVIGATION (Kairox 2.1)

### PROMPT

Extend the app's navigator so each of the four roles sees only their tab set defined in Section 0.2. Role detection happens on login: read `user.role` from the auth response, store in Redux `authSlice`, and render the role-specific `TabNavigator` from `MainNavigator.js`.

No user must ever see, route to, or API-access another role's screens. All route guards must be enforced both at the navigation layer (cannot navigate) AND at the screen layer (if navigated programmatically, screen shows `EmptyState`).

### UI / UX SPEC

- Tab bar: existing `TabBar`, no style changes
- Active tab icon: `theme.primary`, inactive: `theme.textSecondary`
- Tab labels: fontSize 12, fontWeight 500
- All new tab icons use outlined Ionicons style (see 0.2 for mapping)
- Role-based splash on login: brief 400ms dissolve from login to the role's home tab — existing transition, no new animation

### FILES

- Modify: `/src/navigation/MainNavigator.js` — add MD and Customer's MD tab stacks
- Modify: `/src/utils/roles.js` — 4-role enum (see 0.1)
- Create: `/src/navigation/RoleGuard.js`
- Create: `/src/hooks/useRole.js`
- Modify: `/src/store/authSlice.js` — extend `user.role` acceptable values

### BACKEND

No new endpoint. Existing `/api/v1/auth/login` and `/api/v1/auth/me` must return `role` ∈ {`problem_solver`, `supervisor`, `managing_director`, `customer_md`}.

**[BACKEND-GAP]** Current backend enum is `{manager, supervisor, problemsolver}`. Update backend enum to rename `manager` → `managing_director` and add `customer_md`. Until backend is updated, frontend should accept `manager` as an alias for `managing_director` in a compatibility shim inside `authSlice`.

### TESTING

1. Log in as Problem Solver → see 4 tabs only, no Sites / Solvers / MD Card / Budget / Supervisors / Customer's MD
2. Log in as Supervisor → see 8 tabs per spec
3. Log in as MD → see 8 tabs per spec
4. Log in as Customer's MD → see 6 tabs per spec
5. Manually deep-link a Problem Solver to `/sites` → `EmptyState` with lock icon shown
6. Manually call a site endpoint as Problem Solver via the service layer → 403 from backend, toast shown

---

## SECTION 2 — AI CHATBOT PERSONALISED PER ROLE (Kairox 2.2)

### PROMPT

Replace the single `ChatbotScreen` with a role-aware chatbot. Same screen component, same layout, same chat bubbles — but the system prompt, available intents, and quick-action chip set vary by role.

**Problem Solver intents (locked to these only):**
- Report the log
- Mark as complete

**Supervisor intents:**
- Raise new issue (triggers automatic assignment to solver — see Section 5)
- Approve submitted issues
- Extend deadlines
- Modify priorities
- Reassign solvers
- Summarise ongoing issues
- Query sites and assigned solvers
Natural-language extraction must pull out: issue type, location, urgency.

**MD intents:**
- Query action (any read on any site)
- Database analytics & reports

**Customer's MD intents:**
- Query action (any read on their assigned sites only)
- Database analytics & reports

All four chatbots share the same underlying `POST /api/v1/chat` endpoint. The backend's existing intent-router handles scoping — the frontend simply must not render intent-chips the user is not allowed to use.

The data visible in query results is already scoped server-side by role, so the frontend does not re-filter. It just renders whatever comes back in the `data` field.

### UI / UX SPEC

- Screen background: `theme.background`
- User message bubble: `backgroundColor: theme.primary`, white text, `borderRadius: 18`, right-aligned
- AI message bubble: `backgroundColor: theme.card`, text `theme.text`, `borderRadius: 18`, left-aligned
- Input bar: `backgroundColor: theme.inputBackground`, `borderRadius: 24`, `border: theme.border`
- Send button: `backgroundColor: theme.primary`, white icon
- Header: `backgroundColor: theme.headerBackground`, title `"Your AI Assistant"`
- Reuse existing `ChatInput` and `ChatMessage` components verbatim. Do not create new chat bubble components.
- Empty state (new session): role-specific greeting + 3 quick-action chips:
  - PS: "Log today's report" / "Mark issue complete"
  - Sup: "Raise new issue" / "Extend deadline" / "Reassign solver"
  - MD: "Show escalated issues" / "Top 5 sites by issue count" / "Generate monthly report"
  - Cust MD: "Show my sites status" / "Show escalated on my sites" / "Show my budget"

### FILES

- Modify: `/src/screens/ChatbotScreen.js` — accept role, render role-specific chip set
- Create: `/src/config/chatbotIntents.js` — role → intent list mapping
- Create: `/src/components/chat/QuickActionChips.js` — chip row
- Modify: `/src/services/chatService.js` — no change to endpoint, but add `role` hint in metadata field so backend logs know which role sent the message (existing `metadata` field already supports arbitrary context)

### BACKEND

Uses existing `POST /api/v1/chat`. No new endpoint.

**[BACKEND-GAP]** Backend's chatbot intent router currently handles Supervisor + Problem Solver + Manager intents. Needs extension to:
- Reject any intent outside the allowed set per role (defence in depth)
- Support Customer's MD scoping (filter by `customer_md_id` → sites)
- Add `budget_request` intent (used by Section 7)

Flag with `console.warn("[BACKEND-GAP] Chat: role-scoped intents for managing_director and customer_md not yet enforced server-side")` on first send per session.

### TESTING

1. PS types "show me all issues in the system" → chatbot returns scope-limited response ("Here are your active tasks") or politely declines
2. Supervisor types "raise issue: leak at vepery, urgent" → issue created, Section 5 dual-channel alert fires
3. MD types "which site has most escalations this month" → response with data card listing sites
4. Customer's MD types "show issues at site I don't have access to" → politely declines / no data
5. Verify all 4 roles see role-correct quick-action chips on empty state

---

## SECTION 3 — ISSUE LIFECYCLE WITH EMAIL TRIGGER ON ESCALATION (Kairox 2.3)

### PROMPT

Extend the issue status model from the current 6-state machine to the exact states specified by Kairox v3.0:

```
Active          — issue created + assigned (maps to existing ASSIGNED / IN_PROGRESS)
Awaiting Review — work completed, pending supervisor approval (maps to RESOLVED_PENDING_REVIEW)
Fixed           — approved + closed (maps to COMPLETED)
Not Fixed       — supervisor rejected work, needs rework (maps to REOPENED)
Escalated       — raised to MD (maps to ESCALATED)
Complaint       — user dissatisfied after resolution (rendered from Complaint records)
```

Expose these as the canonical frontend labels in `/src/config/issueStatuses.js`. The frontend label layer maps each backend enum value to a Kairox label. Backend values do not change.

**Escalation Email Automation:** When a Supervisor sends an Escalation Report via personal chat to MD (see Section 7), the system sends an email to MD containing: Site Name, Issue Title, Escalation Reason, Timestamp, Supervisor Name.

From the frontend, the flow is:
1. Supervisor is in personal chat with MD (Section 7)
2. Taps "Escalation Report" button in the chat toolbar (Ionicons `alert-circle-outline`)
3. Modal form: issue (auto-populated if invoked from an issue), reason text, site auto-filled
4. On submit: POST to backend, backend handles email
5. Success toast: `"Escalation report sent to MD"`, backgroundColor `#10a37f`, auto-dismiss 3s

### UI / UX SPEC

- Escalated status badge: reuse `StatusBadge` component — `backgroundColor: theme.dangerLight`, text `theme.danger`
- Escalation Report button in chat toolbar: red (`variant='danger'`), white text, Ionicons `alert-circle-outline`
- Success confirmation: reuse `NotificationBanner`, `backgroundColor: #10a37f`, white text, 3s auto-dismiss

### FILES

- Create: `/src/config/issueStatuses.js` — backend-value → Kairox-label map + colour map
- Modify: every screen that renders status (dashboard cards, issue list, issue detail) to use the config map instead of hard-coded strings
- Create: `/src/components/modals/EscalationReportModal.js`
- Modify: `/src/screens/PersonalChatScreen.js` (introduced in Section 7) — add Escalation Report button in toolbar

### BACKEND

**[BACKEND-GAP]** Add endpoint:
```
POST /api/v1/escalations/report
Body: { issue_id, reason, site_id? }
Side effects: creates Escalation record (NO_RESPONSE→MANUAL type), sends email to MD via NotificationService
```
Email template already exists in backend for NO_RESPONSE escalations (`notification_service.send_escalation_email`) — extend the renderer to accept a `MANUAL` subtype with supervisor-provided reason.

Until endpoint exists, mock: writes to AsyncStorage, shows toast, `console.warn("[BACKEND-GAP] Escalation report email not sent — backend endpoint missing")`.

### TESTING

1. Every screen rendering an issue status shows Kairox labels, not backend enum values
2. Supervisor files escalation report from personal chat → toast appears, mock record saved, warn logged
3. Escalation badge colour matches spec on dashboard + issue list + issue detail
4. PS and Customer MD cannot access the escalation report modal

---

## SECTION 4 — ENHANCED SITE & PROBLEM SOLVER MANAGEMENT (Kairox 2.4)

### PROMPT

Enforce strict role scoping on site and solver data — already partially done for Supervisor vs Manager in the MVP. Extend to 4 roles:

- **Supervisor:** only their assigned sites and solvers on those sites (already enforced)
- **MD:** all sites, all solvers, all supervisors (already enforced under "manager")
- **Customer's MD:** only the sites they are contractually linked to + solvers on those sites
- **Problem Solver:** only sites they have assignments on (already enforced)

**New MD Dashboard card — "Supervisors":**
- On MD dashboard grid, add a card with Ionicons `people-outline`, title "Supervisors"
- Tap → `SupervisorsListScreen`: FlatList of all supervisors with name, phone, assigned-site count, active-issue count
- Tap a supervisor row → `SupervisorProfileScreen`: operational performance data (issues raised, resolution rate, avg resolution time), assigned sites list, active issues list, issue resolution history list, and a "Chat with Supervisor" button that opens personal chat (Section 7)

### UI / UX SPEC

- Supervisors card: `backgroundColor: theme.card`, `borderRadius: 12`, `padding: 16`, same card style as existing dashboard cards
- Icon: Ionicons `people-outline`, color `theme.primary`
- Title: fontSize 16, fontWeight 600, color `theme.text`
- Supervisor list: FlatList, separator color `theme.border`
- Supervisor profile: same layout as existing `solver-profile.js` — do not invent a new layout
- Chat button: `variant='primary'`, full width, Ionicons `chatbubble-outline`

### FILES

- Create: `/src/screens/SupervisorsListScreen.js`
- Create: `/src/screens/SupervisorProfileScreen.js`
- Modify: `/src/screens/Dashboard/index.js` → add Supervisors card to MD dashboard grid
- Modify: `/src/services/mocks/customerMDMockService.js` → expose `fetchAssignedSites(customerMdId)` (the backend analytics endpoint needs to add a `customer_md_id` filter)

### BACKEND

**[BACKEND-GAP]** Three gaps:
1. `GET /api/v1/supervisors` — list all supervisors (MD only). Shape mirrors existing `/api/v1/solvers` — id, name, phone, email, is_active, assigned_sites, active_issues, resolution_rate.
2. `GET /api/v1/supervisors/:id` — supervisor detail with performance metrics.
3. `GET /api/v1/sites/analytics?customer_md_id=<id>` — extend existing endpoint to accept a customer_md_id query param for Customer's MD scoping. Requires a new `customer_md_sites` junction table (mirrors existing `supervisor_sites`).

Mock endpoints return realistic synthetic data; console.warn on every call.

### TESTING

1. MD dashboard shows Supervisors card → taps → sees supervisor list
2. Tap supervisor → profile loads with performance + sites + issues
3. Tap "Chat with Supervisor" → opens personal chat (Section 7)
4. Customer's MD logged in → sees only their sites on Sites tab
5. Supervisor logged in → cannot see Supervisors card (not in their tab set)

---

## SECTION 5 — DUAL-CHANNEL ALERT: TWILIO + WHATSAPP (Kairox 2.5)

### PROMPT

When Supervisor assigns a new issue to a Problem Solver (via chatbot, Section 2), trigger **two notifications in parallel** — no sequential delay:

**Channel 1 — Twilio Voice Call to PS** (already exists in backend `call_service.py`):
- If answered: TTS reads issue title, site location, urgency, assigned time
- If missed: sends fallback email with full issue details to PS
- In either case: sends email confirmation to Supervisor with call status (answered/missed) and whether fallback fired

**Channel 2 — WhatsApp Message to PS** (NEW):
- Simultaneously send WhatsApp to PS with: issue title, site location, urgency, assigned timestamp
- Retry on delivery failure
- Logged in a new `communication_logs` table server-side

From the frontend perspective: this is fire-and-forget. The issue-creation chat response returns a success banner; the dual-channel logic lives on the backend. The frontend's job is only to render:

1. **Success banner** immediately after issue is assigned:
   `"Alert sent via Call & WhatsApp"`, `backgroundColor: #10a37f`, white text, Ionicons `checkmark-circle-outline`, reuse `NotificationBanner`, auto-dismiss 3s
2. **Failure toast** if backend returns a partial failure flag:
   `backgroundColor: theme.danger`, white text, `"Alert delivery failed — check Issue Detail for status"`

The chat response from `POST /api/v1/chat` for a `create_issue` intent returns a `data.channels` field (new):
```json
{
  "channels": {
    "voice_call": "initiated",
    "whatsapp": "sent",
    "all_ok": true
  }
}
```
Frontend reads `data.channels.all_ok` — if false, shows failure toast.

### UI / UX SPEC

- Success banner: `backgroundColor: #10a37f`, white text, Ionicons `checkmark-circle-outline`, 3s auto-dismiss, reuse `NotificationBanner`
- Failure toast: `backgroundColor: theme.danger`, white text
- Issue Detail screen: new "Alert Status" row showing call status + WhatsApp status with colour-coded pill per channel

### FILES

- Modify: `/src/screens/ChatbotScreen.js` → on `create_issue` intent success response, read `data.channels` and show banner
- Modify: `/src/screens/IssueDetailScreen.js` → add "Alert Status" section rendering voice + WhatsApp status
- Modify: `/src/components/chat/IssueCard.js` (rendered inline in chat) → show channel status icons

### BACKEND

Existing: Twilio voice call flow in `call_service.py` — no change.

**[BACKEND-GAP]** Three additions:
1. WhatsApp sender module — recommend Twilio WhatsApp API (same vendor as voice, reuses credentials). Module: `app/services/whatsapp_service.py`. Function: `send_issue_assignment(solver_phone, issue)`.
2. Extend `POST /api/v1/chat` `create_issue` handler to call WhatsApp sender in parallel with voice call (use `asyncio.gather`).
3. Extend `ChatResponse.data` schema with `channels: { voice_call, whatsapp, all_ok }`.

Mock: always returns `{voice_call: "initiated", whatsapp: "sent", all_ok: true}` with 10% random failure in dev mode to exercise the failure path.

### TESTING

1. Supervisor raises issue → success banner appears within 500ms
2. Issue detail screen shows voice + whatsapp status rows
3. Simulate `all_ok: false` → failure toast appears
4. Navigate to issue detail → status pill reflects failure
5. Problem Solver (in real env) gets both the phone call and the WhatsApp simultaneously

---

## SECTION 6 — WHATSAPP ALERT ON MISSED CALL (Kairox 2.6)

### PROMPT

If the Twilio voice call triggered in Section 5 results in a **missed / rejected / no-answer / failed** status, the backend automatically fires two WhatsApp messages:

**To Problem Solver:**
> "You missed an alert for a new issue assigned to you. Please open the app immediately."
> + Issue title
> + Site location

**To Supervisor (who raised the issue):**
> "Your assigned Problem Solver missed the call alert for [issue title]. The issue remains active."

Both messages are triggered automatically and simultaneously. No manual intervention. Retry on failure. Log all events.

From the frontend: the Supervisor sees a **"Missed Call — WhatsApp Sent"** notice inside the issue detail screen when this happens. It is not a toast — it's a persistent notice card inside the issue detail, because the supervisor may open the issue hours after the missed-call event.

### UI / UX SPEC

- Persistent notice card in Issue Detail (Supervisor view only):
  - `backgroundColor: theme.warningLight`, text `theme.warning`
  - Ionicons `warning-outline`
  - Text: `"Problem Solver missed the call. WhatsApp alert sent to both parties."`
  - Style: reuse existing `OfflineBanner` component style (match padding, border-radius, layout)
  - Placement: top of the issue detail, below the status/priority row

### FILES

- Modify: `/src/screens/IssueDetailScreen.js` — conditional render of missed-call notice when `issue.last_call_status === 'MISSED'` AND `issue.status !== 'COMPLETED'`
- Create: `/src/components/common/MissedCallNotice.js`

### BACKEND

Existing: `call_service.py` detects missed calls and creates `Escalation` NO_RESPONSE records.

**[BACKEND-GAP]** Extend the missed-call handler to also:
1. Send WhatsApp to PS with specified template
2. Send WhatsApp to Supervisor with specified template
3. Log events in communication_logs

No new API endpoints needed — the frontend reads missed-call state from existing `last_call_status` field on `IssueDetailResponse.assignments[*]`.

### TESTING

1. Force a missed call in staging → PS receives WhatsApp within seconds
2. Same event → Supervisor receives WhatsApp
3. Supervisor opens issue detail → persistent warning notice visible
4. After issue is completed → notice no longer renders

---

## SECTION 7 — TWO-WAY PERSONAL CHAT: SUPERVISOR ↔ MD (Kairox 2.7)

### PROMPT

Build a private in-app one-to-one chat channel between each Supervisor and the MD.

**Entry points:**
- Supervisor: Dashboard → MD Card → MD Profile → "Open Personal Chat" button
- MD: any Supervisor Profile (Section 4) → "Chat with Supervisor" button

**Chat capabilities:**
- Real-time (WebSocket — backend-gap; fall back to 3s polling for mock)
- Persistent (stored server-side)
- One-to-one only; pair-isolated
- Full message history on reload
- Not tied to any specific issue (free communication)

**Smart action detection — TWO distinct automations:**

**7A. Budget Report Handling (escalation-style message):**
When a Supervisor types a message that the NLP classifier identifies as a "formal budget report / escalation" (e.g. "we urgently need 50k for the vepery site — pump broke, this is blocking resolution"):
- System sends an email to MD (backend)
- Email contains: Site Name, Issue Title, Escalation Reason, Timestamp, Supervisor Name
- Frontend: renders a small "✉ Report emailed to MD" confirmation below the message bubble

**7B. Budget Request Handling (structured request):**
When a Supervisor types a message that the NLP classifier identifies as a "budget request" (e.g. "need 20k for cement at anna nagar site"):
- Backend parses the message using NLP to extract: amount, reason, site, timestamp
- Creates a **structured budget_request record** in DB
- Renders the budget request as an **inline card in the chat** (see UI spec)
- MD sees the card + three action buttons: Accept / Reject / Escalate

**MD actions per budget request card:**
- **Accept:** site budget updated immediately. Supervisor gets in-app confirmation message posted automatically in chat.
- **Reject:** MD taps → input modal for reason → reason posted as chat message → Supervisor notified.
- **Escalate:** forwarded to Customer's MD for the site (see Section 8). Original budget card in Supervisor↔MD chat updates status to "Escalated".

Full status machine for budget requests (from Kairox 3.1):
```
Pending | Accepted | Rejected | Escalated | Escalated Approved | Escalated Rejected
```

### UI / UX SPEC

- **MD Card on Supervisor dashboard:** same card style as existing dashboard cards
  - `backgroundColor: theme.card`, `borderRadius: 12`, `padding: 16`
  - Icon: Ionicons `person-circle-outline`, color `theme.primary`
  - Title: "Managing Director" (or MD's actual name if known)
- **Personal chat screen:** reuse exact layout of existing `chat.js` — same bubbles, same input bar, same send button
- **Budget request card inside chat:**
  - `backgroundColor: theme.primaryLight (#1e3a5f dark)`, `borderRadius: 12`, `padding: 14`
  - Header: `"BUDGET REQUEST"`, color `theme.primary`, fontSize 11, fontWeight 700
  - Item (auto-extracted) + Amount: color `theme.text`, fontSize 16, fontWeight 600
  - Reason: color `theme.textSecondary`, fontSize 14
  - Status badge: reuse `StatusBadge` component (colour per status machine)
- **MD action buttons below budget card:**
  - Accept: `backgroundColor: #10a37f`, white text
  - Reject: `backgroundColor: theme.danger`, white text
  - Escalate: `backgroundColor: theme.warning`, black text
  - All: `borderRadius: 8`, fontSize 14, fontWeight 600, equal width, row layout
- **Escalation Report button in chat toolbar:** Ionicons `alert-circle-outline`, color `theme.danger` (Section 3)
- **"Report emailed" confirmation below budget-report messages:** small grey text below bubble, fontSize 11

### FILES

- Create: `/src/screens/PersonalChatScreen.js` — one screen, used by both Supervisor and MD (role detects pairing)
- Create: `/src/components/chat/BudgetRequestCard.js` — inline card renderer
- Create: `/src/components/chat/BudgetActionButtons.js` — Accept/Reject/Escalate row
- Create: `/src/components/modals/RejectReasonModal.js` — reason input for Reject action
- Create: `/src/screens/MDProfileScreen.js` — static MD profile page with "Open Personal Chat" button
- Modify: `/src/screens/Dashboard/index.js` → add MD Card to Supervisor dashboard
- Create: `/src/services/mocks/personalChatMockService.js` — exposes `fetchThread(pairId)`, `sendMessage(pairId, text)`, `pollNewMessages(pairId, sinceTs)`, `respondToBudget(requestId, action, reason?)`

### BACKEND

**[BACKEND-GAP]** This is a substantial backend build:

1. **New tables:**
   - `personal_chat_threads (id, user_a_id, user_b_id, created_at)` — one row per unique pair
   - `personal_chat_messages (id, thread_id, sender_id, text, message_type ∈ {text, budget_request, budget_report, system}, metadata JSONB, created_at)`
   - `budget_requests (id, supervisor_id, site_id, amount, reason, status ∈ PENDING|ACCEPTED|REJECTED|ESCALATED|ESC_APPROVED|ESC_REJECTED, raised_via_thread_id, raised_via_message_id, md_decision_at, md_decision_reason, customer_md_decision_at, customer_md_decision_reason, created_at, updated_at)`

2. **New endpoints:**
   - `GET /api/v1/personal-chats/threads` — list threads visible to caller
   - `GET /api/v1/personal-chats/threads/:id/messages?cursor=` — paginated messages
   - `POST /api/v1/personal-chats/threads/:id/messages` — send; server-side NLP classifies intent; if budget request detected, auto-creates budget_requests row and emits a message of type `budget_request`; if budget report detected, triggers email and emits confirmation
   - `POST /api/v1/budget-requests/:id/accept` — MD only, updates site budget
   - `POST /api/v1/budget-requests/:id/reject` — MD only, body `{reason}`
   - `POST /api/v1/budget-requests/:id/escalate` — MD only, creates a thread message in MD↔CustomerMD thread (Section 8)
   - `WebSocket /ws/personal-chats/:threadId` — real-time deliver. Until this exists, frontend polls every 3s.

3. **NLP classifier:** extend existing chatbot intent router with two new intents: `budget_request`, `budget_report`. Reuse extraction patterns already in place for `create_issue`.

All of the above go into `personalChatMockService.js` until built. Console.warn on first open of personal chat screen.

### TESTING

1. Supervisor dashboard shows MD Card → tap → MD Profile → Open Personal Chat → chat loads (mock messages)
2. MD dashboard → Supervisor list (Section 4) → tap supervisor → Chat with Supervisor → same thread
3. Supervisor types "need 20k for cement at vepery" → budget request card renders inline; Supervisor sees "Pending" status badge
4. MD opens same thread → sees the budget request card + three action buttons
5. MD taps Accept → card status updates to "Accepted"; confirmation message auto-posted
6. MD taps Reject → reason modal → on submit, reason posted as a message; card status → "Rejected"
7. MD taps Escalate → card status → "Escalated"; a new card appears in MD↔CustomerMD thread (Section 8)
8. Supervisor types "urgent budget escalation — vepery site pump broken" → detected as budget_report → email trigger (mock: toast + warn); no inline card
9. Supervisor taps Escalation Report button (Section 3) → modal → submit → confirmation
10. Problem Solver logged in → no access to personal chat anywhere

---

## SECTION 8 — TWO-WAY PERSONAL CHAT: MD ↔ CUSTOMER'S MD (Kairox 2.8)

### PROMPT

Build a private in-app one-to-one chat channel between the MD and each Customer's MD.

**Entry points:**
- MD: Dashboard → Customer's MD Card → Customer MD list → tap one → personal chat
- Customer's MD: Dashboard → MD Card → MD Profile → "Open Personal Chat"

Same pairing rules, same message persistence, same history behaviour as Section 7.

**Smart event detection:**

**8A. Budget raised in chat:**
When either party types a message classified as a budget request:
- Email notification to the other party
- Email contents: issue title, site reference (if any), message content, timestamp, sender identity

**8B. Escalated budget decisions:**
Budget requests that MD escalated from Supervisor↔MD chat (Section 7.2) appear as **Escalated Budget Request cards** in this MD↔CustomerMD thread.

Customer's MD has two actions per card:
- **Approve:** site budget updated; notifies MD, Customer's MD, and the Supervisor who originally raised it; budget_request status → `ESC_APPROVED`
- **Reject:** reason modal → reason posted; notifies MD, Customer's MD, Supervisor; status → `ESC_REJECTED`

### UI / UX SPEC

- **Customer's MD Card on MD dashboard:** same style as Supervisors Card (Section 4)
  - Icon: Ionicons `business-outline`, color `theme.primary`
- **Customer MD list:** same FlatList style as Supervisor list
- **Chat screen:** identical layout to Supervisor↔MD chat — reuse the same `PersonalChatScreen.js` with a `threadType` prop
- **Escalated Budget Request card in chat:**
  - Header: `"ESCALATED BUDGET REQUEST"`, color `theme.danger`, fontSize 11, fontWeight 700
  - Rest of card body same as normal budget request card (amount, reason, site, status)
  - Customer MD action buttons below:
    - Approve: `backgroundColor: #10a37f`, white text
    - Reject: `backgroundColor: theme.danger`, white text
    - Both side by side, equal width, `borderRadius: 8`

### FILES

- Create: `/src/screens/CustomerMDListScreen.js` (MD view)
- Modify: `/src/screens/PersonalChatScreen.js` → accept `threadType` prop (`sup_md` | `md_customermd`)
- Modify: `/src/components/chat/BudgetActionButtons.js` → accept `mode` prop (`md` shows 3 buttons, `customer_md` shows 2)
- Create: `/src/services/mocks/customerMDMockService.js` → list customer MDs, fetch assigned sites
- Modify: `/src/services/mocks/personalChatMockService.js` → support `md_customermd` threads + escalated budget card rendering

### BACKEND

**[BACKEND-GAP]** Additions to Section 7's backend scope:

1. **`customer_md_sites` table** — junction: customer_md_user_id × site_id
2. **`GET /api/v1/customer-mds`** — list all Customer MDs (MD only)
3. **Extend budget_requests table** — status enum already includes `ESC_APPROVED`, `ESC_REJECTED`
4. **New endpoints:**
   - `POST /api/v1/budget-requests/:id/esc-approve` — Customer MD only
   - `POST /api/v1/budget-requests/:id/esc-reject` — Customer MD only
5. **WebSocket /ws/personal-chats/:threadId** covers both Section 7 and Section 8 threads.

### TESTING

1. MD dashboard shows Customer's MD Card → tap → list → tap customer → chat loads
2. Customer's MD dashboard shows MD Card → same thread from other side
3. MD escalates a budget request from Supervisor↔MD chat → escalated card appears in MD↔CustomerMD chat
4. Customer's MD taps Approve → status propagates back to Supervisor↔MD chat card (`ESC_APPROVED`); all three parties notified (in-app + email)
5. Customer's MD taps Reject → reason modal → propagates as `ESC_REJECTED`
6. Supervisor logged in → cannot see anything from these threads
7. Problem Solver → blocked

---

## SECTION 9 — CUSTOMER'S MD PERSONAL DASHBOARD (Kairox 2.9)

### PROMPT

Build a dedicated dashboard for the Customer's MD role. All data strictly scoped to sites assigned to this Customer MD via `customer_md_sites`. No access to other customers' data, other MDs' data, or unrelated sites.

**Real-time data blocks (WebSocket where available, 15s polling as fallback):**

1. **Open Issues Overview:** count + list of active issues (title, location, urgency, status)
2. **Resolution Status:** counts of Fixed + Pending Review
3. **Escalated Matters (visually prioritised):** issue title, escalation reason, timestamp — highlighted section
4. **Budget Status:** Total Approved Budget / Spent / Remaining, per assigned site
5. **Overall Operational Health:** issue load, resolution efficiency, active vs resolved ratio — visual summary

### UI / UX SPEC

Match existing `dashboard/index.js` structure exactly. Do not invent a new layout.

- Three summary stat cards in a row:
  - `backgroundColor: theme.card`, `borderRadius: 12`, `padding: 16`
  - Open Issues accent: `theme.statusOpen (#60a5fa)`
  - Escalated accent: `theme.danger (#f87171)`
  - Resolved accent: `theme.success (#22c55e)`
- Budget section:
  - Progress bar: `height: 8`, `borderRadius: 4`, fill `theme.primary`, track `theme.border`
  - Below bar: "Spent $X of $Y • $Z remaining"
- Escalated section:
  - `borderLeft: 3px theme.danger`
  - `backgroundColor: theme.dangerLight`
  - Each row: issue title + reason + timestamp + tap → issue detail

### FILES

- Create: `/src/screens/CustomerMDDashboard.js`
- Modify: `/src/navigation/MainNavigator.js` → Customer MD Dashboard tab points here
- Create: `/src/services/mocks/customerMDMockService.js` → `fetchDashboard(customerMdId)` returns full aggregated blob

### BACKEND

**[BACKEND-GAP]** New endpoint:
```
GET /api/v1/dashboard/customer-md
```
- Auth: caller must have role `customer_md`
- Scope: joins `customer_md_sites` to filter everything
- Returns aggregated blob mirroring existing Manager dashboard shape, with added `budget` section per site

Reuses existing `SiteAnalyticsService` — just needs a new `get_customer_md_dashboard(user)` method.

### TESTING

1. Customer's MD logs in → lands on this dashboard
2. Open issues count matches sum across their assigned sites only
3. Escalated section prominently visible
4. Budget bar fills to correct percentage
5. Tap any row → navigates to issue detail (data access permitted)
6. Customer's MD cannot see data from sites not in their `customer_md_sites` list

---

## SECTION 10 — PERSONAL CHAT ACCESS RULES BY ROLE (Kairox 2.10)

### PROMPT

Centralised, enforced access rules for all personal chat and group chat features across Sections 7, 8, and Part 3.4:

| Role | Can chat with |
|---|---|
| Problem Solver | NO personal chat access at all. No UI entry points. No API access. |
| Supervisor | MD only. No access to other Supervisors or Customer MDs. |
| Managing Director | All Supervisors + all Customer MDs. Full group chat (Section 3.4). |
| Customer's MD | MD only. No access to Supervisors, other Customer MDs. |

These rules must be enforced:
1. **Navigation layer** — no tab entry, no deep-link
2. **Screen layer** — `RoleGuard` wraps all personal chat screens
3. **Service layer** — mock and real services check allowed pairings before returning data

Any unauthorised route access shows the existing `EmptyState` component: `"You do not have access to this chat."`, Ionicons `lock-closed-outline`, color `theme.textSecondary`.

### UI / UX SPEC

No new screens — this section is pure enforcement.

### FILES

- Modify: `/src/navigation/RoleGuard.js` → accept an `allowedRoles` prop
- Modify: all personal chat routes in `MainNavigator.js` → wrap in `RoleGuard`
- Modify: `/src/services/mocks/personalChatMockService.js` → throw on unauthorised thread access
- Modify: `/src/utils/roles.js` → add `canChatWith(role1, role2)` helper

### BACKEND

**[BACKEND-GAP]** All personal chat endpoints must enforce pairing rules server-side — frontend enforcement is UX, not security. Dependency: Sections 7 and 8 endpoints must include these checks.

### TESTING

1. PS deep-linked to personal chat route → `EmptyState` shown
2. Supervisor A tries to access chat thread between Supervisor B and MD → blocked, `EmptyState`
3. Customer's MD tries to reach a Supervisor thread → blocked
4. MD accesses any permitted thread → works
5. Direct API call bypass attempt → backend 403 (once backend is built)

---

## PART 3 — ENHANCED FEATURES

---

## SECTION 11 — BUDGET TRACKING & MULTI-LEVEL APPROVAL (Kairox 3.1)

### PROMPT

Formalise the budget system introduced in Sections 7 and 8 into a first-class feature with its own tab, dashboard widgets, and audit log.

**Step 1 — Supervisor raises a budget request:**
Happens in personal chat with MD (Section 7). Captures item name, amount, reason. Creates a `budget_requests` DB record. MD gets in-app push notification (see below).

**Step 2 — MD reviews:**
Inline buttons in chat: Accept / Reject / Escalate (Section 7).

**Step 3 — Customer's MD reviews escalated request:**
In MD↔CustomerMD chat (Section 8). Buttons: Approve / Reject.

**Step 4 — All decisions logged:** timestamp, actor, action, amount, reason. Audit log visible to MD and Customer's MD only.

**Budget Request Status values (complete state machine):**
```
Pending → Accepted
        → Rejected
        → Escalated → Escalated Approved
                    → Escalated Rejected
```

**Site Budget Dashboard (MD and Customer's MD only):**
- Total approved budget | Budget allocated | Budget spent | Remaining budget
- Visual burn-rate indicator (progress bar)
- Full chronological budget history (all past requests + decisions)
- Automatic alert banner when site reaches 80% of approved budget

**Supervisors:** can raise requests. Cannot view site budget totals. Their Budget Request tab shows only their own raised requests and their statuses.

**In-app push notification to MD** (on new budget request):
Reuse the existing `NotificationBanner` that Phase 2 added. When a new budget request arrives in a thread MD is part of, banner appears. On tap → navigates to that chat thread, scrolled to the request card.

### UI / UX SPEC

- **Budget tab icon:** Ionicons `wallet-outline`, color `theme.primary`
- **Budget Request card (inline in chat):** as Section 7 spec
- **Budget Dashboard screen (MD, Customer's MD):**
  - 3 stat cards top of screen: Total / Spent / Remaining — `backgroundColor: theme.card`, `borderRadius: 12`
  - **Burn-rate bar** with threshold colours:
    - 0–60% fill: `#10a37f` (healthy green)
    - 60–80% fill: `theme.warning` (amber)
    - 80–100% fill: `theme.danger` (red)
  - **80% alert banner** (shown automatically when crossing threshold):
    - `backgroundColor: theme.dangerLight`, Ionicons `alert-circle`, text `theme.danger`
    - Text: `"[Site Name] has consumed 80% of approved budget"`
  - **History FlatList:** each row is a card with timestamp + actor + action + amount + site + current status
- **Supervisor Budget Request tab:** simpler — list of their own requests with status badges, tap to open the originating chat thread

### FILES

- Create: `/src/screens/BudgetDashboardScreen.js` (MD, Customer's MD read-only)
- Create: `/src/screens/SupervisorBudgetRequestsScreen.js` (Supervisor view)
- Create: `/src/components/budget/BurnRateBar.js`
- Create: `/src/components/budget/BudgetStatCards.js`
- Create: `/src/components/budget/BudgetHistoryList.js`
- Create: `/src/services/mocks/budgetMockService.js` — exposes `listRequests(scope)`, `getSiteBudget(siteId)`, `listAuditLog(siteId)`, `checkThresholdAlerts(siteId)`
- Modify: `/src/navigation/MainNavigator.js` → add Budget tab to MD, Customer MD (read-only), Supervisor (as "Budget Request")

### BACKEND

**[BACKEND-GAP]** Extends the Section 7/8 backend work:

1. **New table:**
   - `site_budgets (site_id PK, total_approved, allocated, spent, updated_at)` — single row per site, maintained by decision handlers
   - `budget_audit_log (id, budget_request_id, actor_user_id, action, amount, reason, created_at)` — immutable audit trail

2. **New endpoints:**
   - `GET /api/v1/budgets/sites/:id` — MD and Customer MD only
   - `GET /api/v1/budgets/sites/:id/history` — chronological audit log
   - `GET /api/v1/budgets/requests?scope=mine|site:ID|all` — filtered list
   - `GET /api/v1/budgets/threshold-alerts` — sites at ≥80% for the caller's scope

3. **Hooks into existing endpoints:** accept/reject/escalate handlers from Section 7 update `site_budgets` and append to `budget_audit_log` atomically.

Mock: full synthetic data in `budgetMockService.js`, persisted to AsyncStorage.

### TESTING

1. Supervisor raises 3 requests across 2 days → all appear in their Budget Request tab
2. MD accepts one → `site_budgets.allocated` bumps; burn-rate bar extends; audit log entry appears
3. Site crosses 80% → red banner auto-appears on MD Budget Dashboard
4. Customer's MD sees only budgets for their assigned sites
5. Supervisor cannot see total budget — only their own requests
6. Problem Solver has no Budget tab

---

## SECTION 12 — MD IN-APP ADMIN: ADD SITES & USERS (Kairox 3.2)

### PROMPT

MD gains in-app screens to add sites and users without developer intervention.

**Add New Site (MD only):**
- Entry: Sites tab → "+ Add Site" top-right
- Fields: site name, location (text), GPS coordinates (lat/lon, auto-fill via device location button), initial budget allocation
- On save: new site appears immediately on all relevant dashboards (MD + newly-assigned supervisors)

**Add New User (MD only):**
- Entry: new Team screen (accessed from Profile or new menu item) → "+ Add Member"
- Fields: full name, phone number, email, role (`Supervisor` / `Problem Solver` / `Customer's MD` — not MD; there is exactly one MD)
- On save: MD provides the username (phone) and password directly to the new user via their own channels. App does NOT send an invite email, does NOT auto-configure accounts.
- Password: MD sets it in the form. Backend hashes + stores.

**Assign Customer's MD to Sites:**
- From a Customer MD's profile → "Assign Sites" button → multi-select list of sites → save
- Customer's MD immediately gains dashboard access to those sites
- Budget decisions and chat access scoped to these sites only (see Sections 8, 9)

### UI / UX SPEC

- **Add Site / Add Member buttons:** `variant='primary'`, Ionicons `add-circle-outline`, top-right of screen
- **All form fields:** reuse existing `Input` component (`backgroundColor: theme.inputBackground`)
- **GPS field:** Ionicons `location-outline`, small auto-fill button inside the input row to capture current location via `expo-location` (permission handled by existing Phase 2 `LocationPermissionModal`)
- **Role selector:** segmented control — 3 segments (Supervisor / Problem Solver / Customer's MD); active segment `backgroundColor: theme.primary`, white text; inactive `theme.card`
- **Save buttons:** full width, `variant='primary'`
- **Success toast after save:** `backgroundColor: #10a37f`, white text, 3 seconds, reuse `NotificationBanner`

### FILES

- Create: `/src/screens/AddSiteScreen.js`
- Create: `/src/screens/TeamScreen.js` (list all users MD can manage)
- Create: `/src/screens/AddMemberScreen.js`
- Modify: `/src/screens/CustomerMDProfileScreen.js` → add "Assign Sites" button + multi-select modal
- Create: `/src/components/admin/SiteAssignModal.js` (multi-select sites)
- Create: `/src/services/mocks/adminMockService.js`
- Modify: `/src/screens/Sites/index.js` → MD sees "+ Add Site" button top-right

### BACKEND

**[BACKEND-GAP]** Several admin endpoints needed. Existing DB has `users` + `sites` + `supervisor_sites` tables — reuse them, add `customer_md_sites`.

1. `POST /api/v1/sites` — MD only, body `{name, location, latitude, longitude, initial_budget}`. Creates Site row + seeds `site_budgets` row with `total_approved = initial_budget`.
2. `POST /api/v1/users` — MD only, body `{name, phone, email, role, password}`. Creates User row.
3. `POST /api/v1/customer-mds/:id/sites` — MD only, body `{site_ids: [...]}`. Replaces the Customer MD's site assignments.
4. `GET /api/v1/users` — MD only, list of all users for Team screen.

Mock: adminMockService.js persists to AsyncStorage. Warn logs on each call.

### TESTING

1. MD adds a site → appears instantly on Sites list, Sites tab, and in any site picker
2. MD adds a Supervisor → user appears on Supervisors list (Section 4); MD shares creds verbally/by text
3. New Supervisor logs in with those creds → lands on Supervisor dashboard
4. MD adds a Customer's MD + assigns 2 sites → Customer MD logs in → dashboard shows exactly those 2 sites
5. Supervisor tries to access AddSiteScreen → `EmptyState` (not in their tab set)
6. No email invites sent, no auto-configuration — MD provides creds manually

---

## SECTION 13 — GOOGLE SHEETS LIVE SYNC (Kairox 3.3)

### PROMPT

Build a real-time sync between a pre-configured Google Sheet template and the app database. MD connects the sheet once; thereafter, cell-level edits in the sheet propagate to the DB within seconds.

**Technical contract (backend territory; frontend concerns follow):**
- Google Sheets API v4
- Cell-level change detection (only modified cells sync; never full-row overwrite)
- Incremental sync
- 50k–100k+ records supported
- Background sync engine (doesn't block user actions)
- Built-in validation rejects malformed/incomplete records

**Frontend scope:**
1. Settings screen in Profile (MD only): "Connect Google Sheet" flow
2. Status pill on MD dashboard reflecting sync state in real time
3. Error surfacing when sync fails

### UI / UX SPEC

- **Sync status pill on MD dashboard (top-right corner):**
  - OK state: `"Sheets Synced • Just now"` — `backgroundColor: theme.successLight`, text `theme.success`, Ionicons `sync-outline`
  - Syncing: icon rotates (animated)
  - Error state: `"Sync Failed"` — `backgroundColor: theme.dangerLight`, text `theme.danger`, tap → error details sheet

- **Google Sheets Settings (MD Profile):**
  - `"Connect Google Sheet"` button: `variant='primary'`
  - Connected state card: `backgroundColor: theme.card`, `borderRadius: 12`, `padding: 16`
    - Sheet name
    - Last synced timestamp
    - Record count
  - `"Disconnect"` button: `variant='danger'`, small, bottom of card

### FILES

- Create: `/src/screens/GoogleSheetsSettingsScreen.js`
- Create: `/src/components/common/SyncStatusPill.js`
- Create: `/src/services/mocks/sheetSyncMockService.js`
- Modify: `/src/screens/Dashboard/index.js` (MD variant) → SyncStatusPill top-right

### BACKEND

**[BACKEND-GAP]** This is large and backend-only. Frontend gets 3 small endpoints:
1. `POST /api/v1/integrations/google-sheets/connect` — OAuth flow kickoff, returns redirect URL
2. `GET /api/v1/integrations/google-sheets/status` — returns `{connected, sheet_name, last_synced_at, record_count, last_error?}`
3. `POST /api/v1/integrations/google-sheets/disconnect`

Full technical stack on backend side (Sheets API webhooks, cell diffing, validation, incremental sync worker) is out-of-scope for frontend. Mock returns fake status that alternates syncing↔synced on a timer to exercise the UI animation.

### TESTING

1. MD Profile → Google Sheets Settings → tap Connect → (mock) completes after 1s → status card shows connected
2. MD dashboard shows green pill
3. Mock injects "syncing" state → icon rotates
4. Mock injects error → red pill; tap → error details
5. Disconnect → status reverts
6. Non-MD roles cannot access this screen

---

## SECTION 14 — GROUP CHAT: MD + ALL SUPERVISORS (Kairox 3.4)

### PROMPT

Build one centralised group chat containing the MD and all Supervisors. Not included: Customer's MD, Problem Solvers.

**Feature 1 — Standard group messaging:**
- Real-time, persistent
- Shareable: site photos, documents, progress reports
- Files stored and linked to relevant operational records (site / issue / budget)

**Feature 2 — Decision Pinning (Audit Trail):**
- MD long-presses any message → context menu: Pin as Decision / Copy / Reply
- Pinned decisions stored separately as a permanent audit log
- Accessible anytime via Ionicons `bookmark-outline` in the header

**Feature 3 — AI-Powered Monthly Summary:**
- Automated end-of-month generation
- One-page summary: key decisions, recurring issues, action items
- Delivered on the last day of each month (backend cron)
- MD can also trigger on-demand via Ionicons `sparkles-outline` in the header

No WhatsApp or external messaging dependency.

### UI / UX SPEC

- **Group chat screen:** same layout as existing `chat.js` — reuse all bubble and input components
- **Group header:** `"Operations Team"`, member count, Ionicons `people-outline`
- **Pinned Decision messages:**
  - `borderLeftWidth: 3`, `borderLeftColor: theme.warning`
  - `"DECISION"` label: fontSize 10, fontWeight 700, color `theme.warning`
  - Pin icon: Ionicons `pin-outline`, top-right of message
- **MD long-press context menu:**
  - `backgroundColor: theme.card`, `borderRadius: 12`
  - Items: Pin as Decision / Copy / Reply
- **Pinned Decisions log** (accessed via header bookmark icon):
  - Each card: `backgroundColor: theme.card`, borderLeft `theme.warning`, `borderRadius: 8`
  - Chronological descending order
- **AI Summary button** (MD header only): Ionicons `sparkles-outline`
  - On tap: summary shown in bottom sheet modal, `backgroundColor: theme.card`
  - While loading: skeleton placeholder inside the sheet
- **File / photo attach:** Ionicons `attach-outline`, color `theme.textSecondary`, in input bar next to camera button

### FILES

- Create: `/src/screens/GroupChatScreen.js`
- Create: `/src/screens/PinnedDecisionsScreen.js`
- Create: `/src/components/modals/MessageContextMenu.js`
- Create: `/src/components/modals/MonthlySummarySheet.js`
- Create: `/src/services/mocks/groupChatMockService.js` — exposes `fetchMessages()`, `send(text, attachments?)`, `pin(messageId)`, `unpin(messageId)`, `fetchPinned()`, `generateSummary(monthYear?)`
- Modify: `/src/navigation/MainNavigator.js` → add Group Chat entry for MD and Supervisors (accessed from AI Chatbot tab sub-menu or as a new dashboard card — default to dashboard card: "Operations Team")

### BACKEND

**[BACKEND-GAP]** New scope:

1. **Tables:**
   - `group_chats (id, name, type, created_at)` — for extensibility; seed one row "Operations Team"
   - `group_chat_members (group_chat_id, user_id, role_in_chat, joined_at)` — auto-populated: MD + all active Supervisors
   - `group_chat_messages (id, group_chat_id, sender_id, text, attachments JSONB, pinned, pinned_at, pinned_by_user_id, created_at)`
   - `group_chat_summaries (id, group_chat_id, month_year, summary_markdown, generated_at, generated_by_system)`

2. **Endpoints:**
   - `GET /api/v1/group-chats/ops-team` — fetch the single Ops Team group (membership auto-computed from user roles)
   - `GET /api/v1/group-chats/:id/messages?cursor=`
   - `POST /api/v1/group-chats/:id/messages`
   - `POST /api/v1/group-chats/:id/messages/:msgId/pin` — MD only
   - `POST /api/v1/group-chats/:id/messages/:msgId/unpin` — MD only
   - `GET /api/v1/group-chats/:id/pinned`
   - `GET /api/v1/group-chats/:id/summary?month=YYYY-MM` — returns existing, or generates on-demand if MD and not yet generated
   - `WebSocket /ws/group-chats/:id`

3. **Monthly summary generator:** Celery beat task, last day of each month at 23:00 UTC, iterates all group chats, feeds messages of the month into LLM (reuse existing AI service / Groq integration), stores output.

### TESTING

1. MD opens Operations Team → sees message history
2. Supervisor opens Operations Team → same history
3. MD long-presses a message → Pin as Decision → yellow DECISION label appears; pin icon
4. Tap bookmark icon in header → Pinned Decisions log shows all pinned items
5. MD taps sparkles icon → bottom sheet → summary renders (mock: lorem; real: LLM call)
6. Supervisor tries to pin → no long-press menu (MD-only action)
7. Customer's MD tries to access → `EmptyState`
8. PS tries → `EmptyState`
9. End of month cron (simulate) → automatic summary generated and linked

---

## SECTION 15 — DIGITAL SITE DIARY (Kairox 3.5)

### PROMPT

Allow Problem Solvers and Supervisors to submit daily site diary entries via the AI chatbot (Section 2).

**AI chatbot extraction (from natural language):**
- Work completed
- Materials used
- Headcount on site
- Weather conditions (fetched from weather API if location available, else dropdown: Sunny / Cloudy / Rainy / Stormy / Other)
- Percentage complete

**Storage:**
- Structured record linked to `site_id`, `user_id`, `date`
- One diary entry per user per site per date (upsert)

**Outputs:**
- Monthly Site Report auto-compiled to PDF, downloadable by MD and Customer's MD
- Daily log can be attached as supporting evidence when a Supervisor raises a budget request (Section 7)
- MD filters daily logs by site, date range, or keyword

### UI / UX SPEC

- **Diary entry card (renders in chatbot after AI extraction):**
  - `backgroundColor: theme.card`, `borderRadius: 12`, `border: theme.border`
  - Header: `"DIARY ENTRY — [date]"`, color `theme.primary`
  - Fields grid: label `theme.textSecondary` / value `theme.text`
  - `"Save Entry"` button: `variant='primary'`, full width
  - Edit fields inline before save
- **Site Diary log list (MD view, from Site Detail screen):**
  - Filter row: date range picker + keyword search — reuse `Input` component
  - Each entry card: `backgroundColor: theme.card`, `borderRadius: 8`, `padding: 12`
  - Completion bar: fill `theme.primary`, track `theme.border`, `height: 4`
- **Monthly PDF Report button** (top-right of Site Diary log list):
  - Ionicons `document-text-outline`, label `"Download Monthly Report"`
  - On tap: triggers generation (async), then device share sheet with PDF file
- **Budget request evidence attachment:**
  - In the budget request flow (Section 7), a small "Attach diary entry" option below the reason field
  - Opens a list of this supervisor's recent diary entries for the relevant site
  - Selected entry attaches as reference (appears inline on the budget request card)

### FILES

- Create: `/src/components/chat/DiaryEntryCard.js`
- Create: `/src/screens/SiteDiaryListScreen.js` (accessed from Site Detail)
- Create: `/src/components/diary/DiaryFilterBar.js`
- Create: `/src/components/diary/DiaryEntryRow.js`
- Modify: `/src/screens/ChatbotScreen.js` → detect `diary_entry` intent in response and render `DiaryEntryCard`
- Modify: `/src/components/chat/BudgetRequestCard.js` → support optional attached diary entry reference
- Create: `/src/services/mocks/siteDiaryMockService.js`

### BACKEND

**[BACKEND-GAP]** New scope:

1. **Table:**
   `site_diary_entries (id, site_id, user_id, entry_date, work_completed TEXT, materials_used JSONB, headcount INT, weather VARCHAR, percent_complete INT, metadata JSONB, created_at, updated_at)`
   Unique constraint on (site_id, user_id, entry_date).

2. **Chatbot intent extension:** add `site_diary_entry` intent to the NLP router. Extraction prompts pulling the five fields. Reuses existing AI service.

3. **Endpoints:**
   - `POST /api/v1/site-diary` — upsert by (site_id, user_id, date)
   - `GET /api/v1/site-diary?site_id=&from=&to=&q=`
   - `GET /api/v1/site-diary/monthly-report?site_id=&month=YYYY-MM` — generates PDF, returns URL (streams PDF)

4. **Weather API integration:** backend calls a weather service (OpenWeatherMap or similar) by site lat/lon for auto-fill. If unavailable, user picks from dropdown.

5. **PDF generator:** reuse WeasyPrint or ReportLab (backend choice). Template: site name, month, per-day entries list, materials summary, average headcount, weather summary, cumulative completion curve.

### TESTING

1. Supervisor types "today we completed 60% of plumbing, 3 workers, used 10 bags cement, it's raining" → chatbot renders diary card pre-filled
2. Supervisor taps Save → entry saved
3. MD opens Site → Site Diary → sees entry in list
4. MD filters by date range → list updates
5. MD taps Download Monthly Report → PDF downloads
6. Supervisor raises budget request → optional "attach diary entry" → selects today's entry → budget card shows attached diary reference
7. Customer's MD can download monthly reports for their sites; cannot download for other sites

---

## SECTION 16 — PHOTO PROGRESS TIMELINE: BEFORE / DURING / AFTER (Kairox 3.9)

### PROMPT

Extend the existing BEFORE/AFTER photo system to include DURING progress photos.

**Photo types per issue:**
- `BEFORE`: supervisor uploads when issue is raised (existing)
- `DURING`: Problem Solver submits one or more progress snapshots while issue status is Active/IN_PROGRESS (NEW)
- `AFTER`: Problem Solver uploads when marking complete (existing)

**Site detail screen:** new "Issues Photo Timeline" section. For every issue at the site, a visual timeline of its photos in chronological order. MD and Customer's MD can scroll through full timelines.

**AI validation on AFTER photo** (already partially exists — extend):
- Current: backend has `ai_flag` field (`OK` / `SUSPECT` / `NOT_CHECKED`)
- Extension: when AFTER photo is flagged `SUSPECT` (does not visibly demonstrate resolution), backend sends in-app alert to the Supervisor for review
- Frontend: shows validation banner on the photo + `NotificationBanner` alert to Supervisor

### UI / UX SPEC

- **Photo timeline (horizontal scroll row):**
  - Each thumbnail: 80×80, `borderRadius: 8`, `border: 2px theme.border`
  - Label below each thumbnail with timestamp (small text)
  - Border colour by type:
    - BEFORE: `theme.textSecondary`
    - DURING: `theme.warning`
    - AFTER: `theme.success`
  - Tap any thumbnail → full-screen image viewer with label + full timestamp + uploader name
- **"Add Progress Photo" button** (Problem Solver only, on Active issues):
  - Ionicons `camera-outline`, color `theme.primary`
  - Label: `"Add Progress Photo"`
  - Placed in issue detail screen action area
  - Triggers existing `CameraModal` from Phase 2 — upload flows identical, just `image_type: DURING`
- **AI validation banner** (after AFTER photo uploaded):
  - Passed (`ai_flag = OK`): `backgroundColor: theme.successLight`, Ionicons `checkmark-circle`, text `"Photo verified"`
  - Flagged (`ai_flag = SUSPECT`): `backgroundColor: theme.dangerLight`, Ionicons `warning`, text `"Photo flagged — does not show resolution"`
  - Supervisor receives in-app alert (reuse `NotificationBanner`) with a tap-to-navigate action → issue detail

### FILES

- Create: `/src/components/photos/PhotoTimeline.js`
- Create: `/src/components/photos/PhotoThumbnail.js`
- Create: `/src/components/photos/FullscreenPhotoViewer.js`
- Modify: `/src/screens/IssueDetailScreen.js` → render `PhotoTimeline` replacing current two-zone before/after grid
- Modify: `/src/screens/SiteDetailScreen.js` → add "Issues Photo Timeline" section listing each issue with mini timelines
- Modify: `/src/components/chat/PhotoUploadButton.js` (Phase 2) → accept `imageType` prop (`BEFORE` / `DURING` / `AFTER`); PS active-issue context sends `DURING`

### BACKEND

Existing: `issue_images` table with `image_type` enum (BEFORE, AFTER) and `ai_flag` enum. Existing: `POST /api/v1/images/save`.

**[BACKEND-GAP]**
1. Extend `ImageType` enum to include `DURING`
2. AI validation service for AFTER photos: run existing vision AI and set `ai_flag` to `OK` or `SUSPECT`. If `SUSPECT`, call `NotificationService.send_photo_flag_alert(supervisor_id, issue_id, image_id)`.
3. `POST /api/v1/images/save` already accepts `image_type` — just needs to accept `DURING` as a valid value.

### TESTING

1. Supervisor raises issue + uploads BEFORE → timeline shows 1 thumbnail with grey border
2. PS opens issue → "Add Progress Photo" → uploads DURING (amber border)
3. PS uploads AFTER → verified → green banner; timeline shows all 3 thumbnails in order
4. PS uploads unclear AFTER → flagged SUSPECT → red banner + Supervisor gets NotificationBanner
5. MD views site → sees timelines for all issues at site
6. Customer's MD views their site → same

---

## SECTION 17 — PROJECT TIMELINE TRACKER (Kairox 3.10)

### PROMPT

Build a project timeline tracker per site, showing contract start, all tasks/milestones, and contract end.

**Data model per site:**
- `contract_start_date`, `contract_end_date`
- Tasks: `{ id, site_id, task_name, start_date, end_date, assigned_to_supervisor_id, status, depends_on_task_id }`
- Task status: `Not Started` | `In Progress` | `Completed` | `Delayed`

**Dependency logic:**
- Tasks can be linked (A must complete before B starts)
- If a task is delayed, all dependent tasks shift forward by the same number of days
- Contract end date updates if delays cascade to the final task

**Access control:**
- **MD:** view + edit all sites' timelines
- **Supervisor:** view only their assigned sites
- **Customer's MD:** view only their contracted sites (read-only)
- **Problem Solver:** no access

### UI / UX SPEC

- **Timeline screen:** horizontal Gantt-chart style layout
  - X-axis: dates from contract start to end
  - Y-axis: task names
  - Each task: a horizontal bar spanning its start→end
  - **Bar colours by status:**
    - Not Started: `theme.border` (grey)
    - In Progress: `theme.primary` (blue)
    - Completed: `theme.success (#22c55e)`
    - Delayed: `theme.danger (#f87171)`
- **Dependency lines:** dotted line connecting dependent tasks
- **Cascade delay visualisation:** if a delay cascades, affected task bars shift right and turn `theme.warning` (yellow)
- **Contract end marker:** vertical red line + Ionicons `flag`, color `theme.danger`, label `"Contract End — [date]"`
- **Task detail panel** (tap any bar):
  - `backgroundColor: theme.card`, `borderRadius: 12`, `padding: 16`
  - Shows: task name, assigned supervisor, start date, end date, status badge
  - If delayed: `"Delayed by X days — Y dependent tasks affected"`, `backgroundColor: theme.dangerLight`, text `theme.danger`
- **MD edit mode:** tap a bar → edit modal with date pickers + status selector + Save / Cancel
  - Save: `variant='primary'`
  - Cancel: `variant='secondary'`
- **Top summary strip:** `"X tasks on track | Y delayed | Z completed"`, `backgroundColor: theme.card`, `borderRadius: 8`, `padding: 12`

### FILES

- Create: `/src/screens/ProjectTimelineScreen.js`
- Create: `/src/components/timeline/GanttChart.js` — core chart primitive (use react-native-gesture-handler + Reanimated for pan/zoom, or a lightweight hand-rolled SVG-based implementation via `react-native-svg`)
- Create: `/src/components/timeline/GanttTaskBar.js`
- Create: `/src/components/timeline/TaskDetailPanel.js`
- Create: `/src/components/modals/EditTaskModal.js` (MD only)
- Create: `/src/components/timeline/TimelineSummaryStrip.js`
- Create: `/src/services/mocks/projectTimelineMockService.js` — full mock data with realistic task chains and dependency logic
- Modify: `/src/screens/SiteDetailScreen.js` → "Project Timeline" button opens `ProjectTimelineScreen`

### BACKEND

**[BACKEND-GAP]** New scope:

1. **Tables:**
   - `site_contracts (site_id PK, start_date, end_date, updated_at)`
   - `site_tasks (id, site_id, name, start_date, end_date, assigned_supervisor_id, status, depends_on_task_id NULL, created_at, updated_at)`

2. **Dependency cascade logic:** implemented server-side. On any task update, traverse dependencies and shift subsequent tasks. Update `site_contracts.end_date` if final task end shifts.

3. **Endpoints:**
   - `GET /api/v1/sites/:id/timeline` — returns contract + tasks
   - `POST /api/v1/sites/:id/tasks` — MD only
   - `PATCH /api/v1/sites/:id/tasks/:taskId` — MD only; triggers cascade
   - `DELETE /api/v1/sites/:id/tasks/:taskId` — MD only

4. **Role scoping:** standard SupervisorSite / CustomerMDSite filtering.

### TESTING

1. MD opens any site → Project Timeline → Gantt chart renders with tasks
2. MD taps a task → edit modal → change end_date later → Save → dependent tasks visibly shift right; contract end marker updates if cascaded
3. Supervisor opens their site's timeline → read-only view
4. Customer's MD opens their site → read-only
5. PS cannot access
6. Delayed task turns yellow with "affected X downstream tasks" label

---

## SECTION 18 — IMPLEMENTATION PRIORITIES (BUILD ORDER)

Build in strict order. Each priority block should be completed and demo-ready before moving to the next.

### Priority 1 — Foundation (Days 1–3)
- Section 0 (role model expansion, navigation restructure, theme verification, mock service folder)
- Section 1 (full role-based navigation)
- Section 10 (access rules enforcement)

**Demo checkpoint:** 4 roles can log in, each sees their tab set, unauthorised routes blocked.

### Priority 2 — Chat & Communications (Days 4–7)
- Section 2 (role-personalised chatbots)
- Section 3 (issue lifecycle labels + escalation report)
- Sections 5 + 6 (dual-channel alerts + missed-call WhatsApp — frontend parts)
- Section 16 (photo timeline with DURING)

**Demo checkpoint:** all roles can chat, create issues that trigger alerts (frontend banner), photo timeline works for an issue.

### Priority 3 — Personal & Group Chats (Days 8–12)
- Section 7 (Supervisor ↔ MD)
- Section 8 (MD ↔ Customer's MD)
- Section 4 (Supervisors card + profile)
- Section 14 (group chat: Operations Team)

**Demo checkpoint:** all four chat channels work end-to-end with mock data; pin-as-decision, AI summary, budget request cards all render.

### Priority 4 — Dashboards & Budget (Days 13–16)
- Section 9 (Customer's MD dashboard)
- Section 11 (budget dashboard + audit log)
- Section 15 (site diary)

**Demo checkpoint:** all role-specific dashboards complete; budget workflow end-to-end with site threshold alerts; site diary entries savable via chat and viewable in Site Detail.

### Priority 5 — Admin & Advanced (Days 17–21)
- Section 12 (MD admin: add site, add user, assign customer MD)
- Section 13 (Google Sheets sync — frontend only)
- Section 17 (project timeline tracker Gantt)

**Demo checkpoint:** MD can fully onboard new sites/users/customer MDs in-app; Gantt chart renders with dependency cascade.

---

## SECTION 19 — BACKEND GAPS: CONSOLIDATED LIST

Every endpoint the frontend expects but does NOT currently exist. Each is mocked in `/src/services/mocks/` as specified per section. On every mock call, emit `console.warn("[BACKEND-GAP] <feature>: <endpoint-needed>")`.

### Auth & Roles
- Backend user-role enum: add `customer_md`; rename `manager` → `managing_director` (keep `manager` as alias for backwards compat)

### Supervisors & Customer MDs
- `GET /api/v1/supervisors`
- `GET /api/v1/supervisors/:id`
- `GET /api/v1/customer-mds`
- `POST /api/v1/customer-mds/:id/sites` (assign sites)
- New junction table `customer_md_sites`
- Extend `GET /api/v1/sites/analytics?customer_md_id=` for Customer MD scoping

### Personal & Group Chat (Sections 7, 8, 14)
- Tables: `personal_chat_threads`, `personal_chat_messages`, `group_chats`, `group_chat_members`, `group_chat_messages`, `group_chat_summaries`
- Endpoints under `/api/v1/personal-chats/...` and `/api/v1/group-chats/...`
- WebSocket routes `/ws/personal-chats/:id`, `/ws/group-chats/:id` (fallback: 3s polling from frontend)
- NLP intent router additions: `budget_request`, `budget_report`, `site_diary_entry`
- Monthly summary Celery beat task (end-of-month, LLM-backed)
- Message pin / unpin actions (MD-only)

### Budget (Sections 7, 8, 11)
- Tables: `budget_requests` (full state machine), `site_budgets`, `budget_audit_log`
- Endpoints: `POST /api/v1/budget-requests/:id/{accept,reject,escalate,esc-approve,esc-reject}`, `GET /api/v1/budgets/sites/:id`, `GET /api/v1/budgets/sites/:id/history`, `GET /api/v1/budgets/requests`, `GET /api/v1/budgets/threshold-alerts`

### Communications (Sections 3, 5, 6)
- WhatsApp sender service (Twilio WhatsApp API)
- Extend `POST /api/v1/chat` `create_issue` handler to fire voice + WhatsApp in parallel (`asyncio.gather`)
- Extend `ChatResponse.data` with `channels: {voice_call, whatsapp, all_ok}`
- Extend missed-call handler (`call_service.py`) to fire WhatsApp to PS + Supervisor with specified templates
- `POST /api/v1/escalations/report` — Supervisor-initiated escalation email

### MD Admin (Section 12)
- `POST /api/v1/sites` — create site + seed site_budgets
- `POST /api/v1/users` — MD creates user
- `GET /api/v1/users` — MD lists users

### Customer MD Dashboard (Section 9)
- `GET /api/v1/dashboard/customer-md`

### Google Sheets (Section 13)
- `POST /api/v1/integrations/google-sheets/connect`
- `GET /api/v1/integrations/google-sheets/status`
- `POST /api/v1/integrations/google-sheets/disconnect`
- Full Sheets API v4 webhook + cell-diff + incremental sync worker (large backend build)

### Site Diary (Section 15)
- Table: `site_diary_entries`
- Endpoints: `POST /api/v1/site-diary`, `GET /api/v1/site-diary`, `GET /api/v1/site-diary/monthly-report`
- Weather API integration
- PDF generator (reuse WeasyPrint or ReportLab)

### Photos (Section 16)
- `ImageType` enum: add `DURING`
- AI validation for AFTER photos (set `ai_flag`, fire `NotificationService.send_photo_flag_alert`)

### Project Timeline (Section 17)
- Tables: `site_contracts`, `site_tasks` (with `depends_on_task_id`)
- Endpoints: `GET/POST/PATCH/DELETE /api/v1/sites/:id/timeline|tasks`
- Dependency cascade logic on task update

---

## SECTION 20 — DEPENDENCIES TO INSTALL

```
npx expo install react-native-svg          # Gantt chart rendering (Section 17)
npx expo install react-native-gesture-handler  # Gantt pan/zoom
npx expo install react-native-reanimated   # sync-status pill rotation, timeline animations
npx expo install @react-native-community/datetimepicker  # date pickers (admin + timeline)
npx expo install expo-document-picker      # file attach in group chat (Section 14)
npx expo install expo-sharing              # PDF monthly report share (Section 15)
npx expo install expo-file-system          # PDF download cache
```

Already installed from Phase 1/2 (verify, do not re-install):
- `expo-camera`, `expo-image-picker`, `expo-location`
- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`
- `axios`
- React Navigation stack

---

## SECTION 21 — REDUX ENHANCEMENTS

### New slices

**`budgetSlice.js`**
```
state: {
  requests: [],          // all budget requests visible to caller
  siteBudgets: {},       // keyed by site_id
  auditLog: [],
  thresholdAlerts: [],
  loading: false,
  error: null,
}
actions: setRequests, upsertRequest, updateRequestStatus, setSiteBudget, addAuditEntry, setThresholdAlerts
thunks: fetchRequests(scope), fetchSiteBudget(siteId), decideRequest(id, action, reason?)
```

**`personalChatsSlice.js`**
```
state: {
  threads: {},           // keyed by threadId → {messages, lastSyncAt}
  activeThreadId: null,
  sending: {},           // optimistic send status
}
actions: setThreadMessages, appendMessage, markThreadRead, setActiveThread
thunks: fetchThread(threadId), sendMessage(threadId, text, attachments?), respondToBudget(requestId, action, reason?)
```

**`groupChatSlice.js`**
```
state: { opsTeam: {messages, pinned, lastSummary}, sending }
actions: setMessages, appendMessage, setPinned, togglePin, setSummary
thunks: fetchOpsTeam(), sendGroupMessage(text, attachments?), pinMessage(msgId), unpinMessage(msgId), generateSummary(monthYear?)
```

**`siteDiarySlice.js`** — entries by site; thunks `saveEntry`, `fetchEntries`, `downloadMonthlyReport`

**`timelineSlice.js`** — contracts + tasks by site; thunks `fetchTimeline`, `updateTask`, `createTask`, `deleteTask`

**`adminSlice.js`** — for Section 12; thunks `createSite`, `createUser`, `assignSitesToCustomerMD`

### Extensions to existing slices

**`authSlice.js`** — accept 4 roles; add `alias` handling for `manager` → `managing_director`

**`issuesSlice.js`** — add `channelStatus` field on each issue (voice_call + whatsapp + all_ok from Section 5)

---

## SECTION 22 — GLOBAL COMPONENTS TO CREATE

Shared across multiple features. Build once, reuse.

- `/src/components/common/SyncStatusPill.js` — for Section 13 and potentially reused
- `/src/components/common/MissedCallNotice.js` — Section 6
- `/src/components/common/RoleBadge.js` — small role tag used in Section 4 and admin screens
- `/src/components/chat/BudgetRequestCard.js` — Sections 7, 8, 11
- `/src/components/chat/BudgetActionButtons.js` — Sections 7, 8
- `/src/components/chat/DiaryEntryCard.js` — Section 15
- `/src/components/chat/IssueCard.js` — reused; extend with `channels` status row (Section 5)
- `/src/components/photos/PhotoTimeline.js` — Section 16 (replaces current before/after grid)

---

## SECTION 23 — TESTING MATRIX

For each section above, run through the numbered test cases in that section. In addition:

### Cross-cutting tests

1. **Role isolation:** log in as each of the 4 roles, verify no UI element from another role is visible anywhere.
2. **Offline behaviour:** all new screens must respect the existing `OfflineBanner`. Pull-to-refresh disabled when offline (Phase 2 behaviour). Mock services should fail gracefully when offline.
3. **Network retry:** new API calls must use the existing `retryWithBackoff` wrapper from Phase 2's `apiService.js`.
4. **Theme parity:** every new screen and component must render correctly in both dark and light theme (the MVP supports both).
5. **Permission flows:** location, camera, document picker — all must degrade gracefully on denial, with existing Phase 2 permission modals.
6. **Empty states:** every new list screen must render the existing `EmptyState` component when empty, with context-appropriate text.
7. **Loading states:** every new screen must show a skeleton or spinner during initial load.

---

## SECTION 24 — CRITICAL NOTES & BOUNDARIES

- **No TypeScript.** Pure JavaScript only. Match existing codebase.
- **No external messaging platforms.** WhatsApp is the only non-app channel — Twilio WhatsApp API, not direct WhatsApp.
- **No breaking changes** to existing MVP screens. If a modification to an existing screen is required, it must be additive or conditional (`if (role === MD) render new block`).
- **Push notifications out of scope.** In-app `NotificationBanner` only (Phase 2 capability). True push is a later phase.
- **PDF generation lives on backend.** Frontend calls the endpoint, receives URL, triggers device share. Do not render PDFs client-side.
- **All mock services persist to AsyncStorage.** So demo state survives reloads.
- **WebSocket is preferred** for real-time features (Sections 7, 8, 14, 9). If not yet built, fall back to 3s polling. Polling implementations must be cleaned up on screen unmount to avoid memory leaks.
- **Ionicons only** — no other icon packs.
- **Reuse existing components aggressively.** Every new screen should be 80%+ composed of components that already exist. Invent only what's missing.
- **Do not skip the `[BACKEND-GAP]` console warnings.** They are the signalling mechanism for the backend team to know what to build.
- **Do not fabricate API response shapes** beyond what's specified here. If unsure, keep the mock minimal and realistic, and leave the TODO comment.

---

## SECTION 25 — FINAL SUMMARY

This prompt extends the existing Kairox MVP (2 roles, ChatGPT-style dark theme, Expo React Native) into a full industry platform (4 roles, 17 new features) while:

- Preserving every working feature
- Reusing every existing component
- Using only the existing theme tokens
- Routing all missing-backend features through clearly flagged mock services
- Building in a disciplined priority order so each checkpoint is demo-ready

**Build Priority 1 first. Do not skip ahead. Demo after each priority.**

— End of prompt —
