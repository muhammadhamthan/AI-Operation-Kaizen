# Kairox AI OpEx — Backend Build Checklist (v3.0)

> This document is the single source of truth for everything the backend team must build / change so the Kairox AI OpEx v3.0 frontend (React Native + Expo, 4 roles, 17 feature sections) runs against real AWS endpoints instead of the mock services currently in `src/services/mocks/*`.
>
> Scope: **only the delta from your existing main-branch backend**. Anything already live (auth stub, issues CRUD, complaints, sites list, solvers list, dashboard aggregates) is noted as "extend" — not "rewrite".
>
> The frontend emits `console.warn("[BACKEND-GAP] <feature>")` on every mocked call; every line in this doc maps to at least one of those warnings.

---

## 0. Table of Contents

1. Global changes (roles, auth, shared concerns)
2. Directory / people APIs (Supervisors, Customer MDs, MD profile)
3. Personal Chat (§7 Sup↔MD, §8 MD↔Customer MD)
4. Group Chat (§14 Operations Team) + Chatbot (§2) + AI summaries
5. Issue Lifecycle + Escalation (§3)
6. Dual-Channel Alerts: Voice + WhatsApp (§5) + Missed-Call Fallback (§6)
7. Photo Progress Timeline — BEFORE / DURING / AFTER (§16)
8. Customer MD Dashboard scoping (§9)
9. Budget — multi-level approval + audit log + burn rates (§11)
10. Site Diary (§15) + Monthly Report generator
11. MD Admin: create sites, users, assign CMD sites (§12)
12. Google Sheets Live Sync (§13)
13. Project Timeline — Gantt + dependency cascade (§17)
14. WebSockets + polling fallback
15. Background workers (Celery / cron)
16. External integrations (Twilio, WhatsApp, Google Sheets, Weather, LLM, PDF)
17. Testing matrix

---

## 1. Global changes

### 1.1 Role model
| Change | Detail |
|--------|--------|
| Add enum value `customer_md` to the `users.role` column | Migration: `ALTER TYPE user_role ADD VALUE 'customer_md';` |
| Alias `manager` → `managing_director` | Keep `manager` for backwards-compat; `manager == MD` throughout the code |
| New junction table `customer_md_sites(user_id, site_id, assigned_at, assigned_by)` | One row per CMD↔site pair. Used everywhere a CMD view needs site scoping |

### 1.2 Auth
- `POST /api/v1/auth/login` — extend to accept and return `role: customer_md`.
- Password storage: bcrypt (cost 12). **Do not roll your own.**
- JWT payload must include `role`, `user_id`, `assigned_site_ids` (for fast FE scoping without extra lookups).
- Rate-limit: 5 attempts / 10 min per username (ban after).
- No signup / email-invite flow. MD creates users via §12 admin endpoints and shares creds manually.

### 1.3 Shared response shape
- All list endpoints: `{ items: [...], next_cursor: string | null, total?: number }`.
- All mutation endpoints: return the full updated resource, not just an id.
- All timestamps: ISO-8601 in UTC (`2026-04-23T10:30:00Z`).
- Currency: store in paise (integer); frontend formats with `₹` + Indian grouping.

### 1.4 Authorisation middleware
Build ONE reusable decorator (`@require_role(['manager']) / @require_site_access(site_id)`) that:
1. Reads JWT.
2. If endpoint is site-scoped, checks:
   - `manager` → always allowed.
   - `supervisor` → allowed iff `site_id IN supervisor_sites`.
   - `customer_md` → allowed iff `site_id IN customer_md_sites`.
   - `problem_solver` → allowed iff assigned to any issue in that site.
3. Returns 403 with `{error: "site-not-in-scope"}` else.

---

## 2. Directory / people APIs

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| GET | `/api/v1/supervisors` | MD | List all supervisors with stats (active issues, closed count) |
| GET | `/api/v1/supervisors/:id` | MD / Sup (self) | Supervisor profile + assigned sites + issue counts |
| GET | `/api/v1/customer-mds` | MD | List all Customer MDs with `company`, assigned site names |
| GET | `/api/v1/customer-mds/:id` | MD / CMD (self) | Customer MD profile |
| GET | `/api/v1/users` | MD only | Flat user list for the Team screen (Section 12) |
| GET | `/api/v1/me/md` | Sup / CMD | Returns the "company MD" object so the frontend MD-card screen can show avatar, phone, email |

### Logic notes
- `supervisors` response must include `active_issues_count`, `closed_issues_count`, `sites: [{id, name}]`.
- `customer-mds` response must include `company: string`, `assigned_sites: [{id, name, location}]` derived from `customer_md_sites`.

---

## 3. Personal Chat (§7 + §8 + §10 access rules)

### 3.1 Tables

```
personal_chat_threads
  id (uuid)
  user_a_id (fk users.id)          ── smaller id always in user_a
  user_b_id (fk users.id)
  last_message_at
  created_at
  UNIQUE(user_a_id, user_b_id)

personal_chat_messages
  id (uuid)
  thread_id (fk)
  sender_id (fk users.id)
  body (text)
  type (enum: 'text', 'budget_card', 'site_diary', 'summary', 'pin_decision')
  payload (jsonb)                  ── for budget_card etc: {amount, reason, site_id, status}
  is_pinned_decision (bool default false)  ── MD only
  reply_to_message_id (uuid nullable)
  created_at
  edited_at
  deleted_at
```

### 3.2 Endpoints

| Method | Path | Caller | Behaviour |
|--------|------|--------|-----------|
| GET | `/api/v1/personal-chats` | Any role | List conversations for current user (ordered by last_message_at DESC) |
| GET | `/api/v1/personal-chats/:thread_id/messages?cursor=&limit=50` | Member of thread | Paged messages, newest→oldest |
| POST | `/api/v1/personal-chats` | Any | Body `{peer_user_id}`. Upsert thread, return it |
| POST | `/api/v1/personal-chats/:thread_id/messages` | Member | Body `{body, type, payload?, reply_to_message_id?}` |
| POST | `/api/v1/personal-chats/:thread_id/messages/:id/pin` | MD only | Sets `is_pinned_decision=true`. Broadcast on WS |
| POST | `/api/v1/personal-chats/:thread_id/messages/:id/unpin` | MD only | opposite |
| DELETE | `/api/v1/personal-chats/:thread_id/messages/:id` | Sender | Soft delete (set `deleted_at`) |

### 3.3 Access-rule matrix (§10)

Enforced in the thread creation endpoint, NOT in the message endpoint.

| From role → To role | Allowed? |
|---------------------|----------|
| supervisor → manager | ✅ |
| manager → supervisor | ✅ |
| manager → customer_md | ✅ |
| customer_md → manager | ✅ |
| supervisor → customer_md | ❌ |
| customer_md → supervisor | ❌ |
| problem_solver → * | ❌ (PS has no personal chat in v3.0) |
| * → problem_solver | ❌ |

Return 403 `{error:"chat-not-allowed-between-roles"}` on disallowed pairs.

### 3.4 WebSocket

- `/ws/personal-chats/:thread_id` — bidirectional JSON frames.
- On new message: broadcast `{event:"message", message:{...}}` to both members.
- On pin: broadcast `{event:"pin", message_id, pinned:true}`.
- Fallback: frontend already polls every 3s if WS fails; implement WS-first but keep the GET endpoint idempotent/paged so polling works.

---

## 4. Group Chat + Chatbot + AI summaries

### 4.1 Operations Team group chat (§14)

```
group_chats
  id (uuid)
  name (text)                     ── 'operations_team' is the canonical one for v3.0
  created_by (fk users.id)
  created_at

group_chat_members
  group_id (fk)
  user_id (fk)
  role_in_group (enum: 'admin', 'member')  ── MD is admin by default
  joined_at
  UNIQUE(group_id, user_id)

group_chat_messages            ── same columns as personal_chat_messages
  + group_id (fk)

group_chat_summaries
  id, group_id, month (YYYY-MM), summary_text, generated_at
```

Endpoints:
- `GET /api/v1/group-chats/ops` — return the Ops Team group for the company (auto-creates if missing, adds MD + all supervisors as members).
- `GET /api/v1/group-chats/:id/messages?cursor=&limit=50`
- `POST /api/v1/group-chats/:id/messages` — type: text / budget_card / ai_summary
- `POST /api/v1/group-chats/:id/messages/:msgId/pin` (MD only)
- `GET /api/v1/group-chats/:id/summaries?limit=6` — list of last 6 months' auto-generated summaries
- `POST /api/v1/group-chats/:id/summaries/regenerate` (MD only) — queue Celery task to re-run LLM summary

WebSocket: `/ws/group-chats/:id`.

### 4.2 Role-personalised chatbot (§2)

Extend the existing `POST /api/v1/chat` endpoint:
- Request: `{session_id, message, role, user_id}`
- Response: `{reply, data: {intent, entities, quick_actions[], channels? }}`

**NLP intent router** — add 3 intents:
| Intent | Example message | Handler |
|--------|-----------------|---------|
| `budget_request` | "Raise 2 lakh for new sensors at Zone C" | Calls classify-budget + persist budget_requests row, return budget_card payload |
| `budget_report` | "Show top 5 escalated budgets" | Aggregates from budget_requests, returns markdown |
| `site_diary_entry` | "Log today: replaced pump at Ambattur, 2 hours rain" | Creates site_diary_entries row, returns confirmation card |

**Role-specific greeting + quick actions** — backend returns them from a static map keyed by role (frontend has this right now in `src/config/chatbotIntents.js`; move the canonical copy to backend so it's one source).

### 4.3 Monthly summary Celery beat

- Runs on the 1st of every month at 02:00 IST.
- For each group chat + each (personal chat thread that had ≥10 messages): summarise using LLM (Claude/GPT; use your existing provider).
- Insert into `group_chat_summaries` and also post a `type=ai_summary` message into the chat.

---

## 5. Issue Lifecycle + Escalation (§3)

### 5.1 Enum mapping (frontend labels)

Backend stores ALL-CAPS enum; frontend renders the "Kairox label":

| Backend enum | Kairox label | Colour token |
|--------------|--------------|--------------|
| `OPEN`, `ASSIGNED`, `AUTO_ASSIGNED`, `REASSIGNED` | Active | primary (blue) |
| `IN_PROGRESS` | In Progress | warning (amber) |
| `COMPLETED` | Fixed | success (green) |
| `ESCALATED` | Escalated | danger (red) |
| `REOPENED` | Not Fixed | danger (red) |

No DB change needed — just ensure these exact strings are in the enum. Frontend has the label map.

### 5.2 Escalation report

```
issue_escalations
  id, issue_id (fk), raised_by_supervisor_id,
  reason (text), root_cause (text nullable),
  proposed_action (text nullable),
  copy_customer_md (bool),
  email_sent_at, chat_notification_sent_at,
  created_at
```

Endpoint:
- `POST /api/v1/issues/:id/escalate` — Supervisor only.
  - Body: `{reason, root_cause, proposed_action, copy_customer_md}`
  - Logic:
    1. Set `issues.status = 'ESCALATED'`
    2. Insert `issue_escalations` row
    3. Send email to MD (+ CMD if `copy_customer_md=true`) via your existing email service
    4. Post a `type=text` message into the MD↔Sup personal thread: `"⚠ Issue #{id} escalated — {reason}"`
    5. Return the updated issue + the escalation row
- `GET /api/v1/issues/:id/escalations` — return all escalation records for the issue

---

## 6. Dual-Channel Alerts (§5 + §6)

### 6.1 Flow when a Supervisor creates an issue via chat or API

1. Insert issue row.
2. **Fire voice + WhatsApp in parallel** using `asyncio.gather`:
   - Twilio Voice API → `call_service.place_alert_call(issue, recipient_phone)`
   - Twilio WhatsApp Business API → `whatsapp_service.send_template(recipient_phone, template_id, vars)`
3. Wait for both to return (or timeout at 15s).
4. Persist:

```
issue_alerts
  id, issue_id (fk),
  voice_call_status (enum: 'delivered','missed','failed','pending'),
  voice_call_sid (text), voice_call_duration_sec (int),
  whatsapp_status (enum: 'delivered','failed','pending'),
  whatsapp_message_sid (text),
  all_ok (bool), missed_call (bool),
  created_at
```

5. Response body `ChatResponse.data.channels = { voice_call: '...', whatsapp: '...', all_ok: bool }`.

### 6.2 Missed-call fallback (§6)

- Twilio status callback webhook (`/api/v1/webhooks/twilio/call-status`) fires when call status changes.
- If status transitions to `no-answer` or `busy`:
  1. Set `issue_alerts.missed_call = true`, `voice_call_status = 'missed'`.
  2. Fire a **different WhatsApp template** to PS + Supervisor: `"Call missed — please check app. Issue #{id} {title}"`.
  3. Broadcast `{event:"alert-updated"}` on issue WS so the banner flips to amber in real time.

### 6.3 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/issues/:id/alert` | Return the `issue_alerts` row (used by AlertStatusBanner) |
| POST | `/api/v1/issues/:id/alert/whatsapp/resend` | Re-fire WhatsApp template. Caller must be Sup or MD |
| POST | `/api/v1/webhooks/twilio/call-status` | Twilio status webhook (no auth, signature-verified) |

---

## 7. Photo Progress Timeline (§16)

### 7.1 Enum extension

`issue_photos.phase`: add `DURING` to the existing `BEFORE`/`AFTER`.

### 7.2 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/issues/:id/photos?group_by=phase` | Return `{before: [...], during: [...], after: [...]}` |
| POST | `/api/v1/issues/:id/photos` | Body `{phase, uri OR multipart-file}`. Access: Supervisor adds BEFORE, Problem Solver adds DURING/AFTER |
| DELETE | `/api/v1/issues/:id/photos/:photoId` | Uploader or MD only |

### 7.3 AI validation on AFTER photos (keep if you already have it)

When an AFTER photo is uploaded:
1. Run through your existing image-moderation / sanity-check pipeline.
2. If suspicious (unrelated image, blank, etc.), set `issue_photos.ai_flag = true`.
3. Fire `NotificationService.send_photo_flag_alert(issue.id, supervisor_id)` → posts a text message into the Sup↔PS chat AND adds a banner in the issue detail.

---

## 8. Customer MD Dashboard (§9)

New endpoint:
- `GET /api/v1/dashboard/customer-md` (CMD only)

Response:
```json
{
  "stats": {
    "pending_issues": 7,
    "resolved_issues": 15,
    "total_sites": 3,
    "escalated_to_me": 2
  },
  "sites": [ { "id":1, "name":"...", "location":"...", "issues_total":12, "issues_open":4 }, ... ],
  "escalated_budgets": [ { "id":..., "amount":..., "site_name":"...", "reason":"..." }, ... ],
  "recent_issues": [ ... ]  // limit 10, scoped to assigned sites
}
```

Scoping: every row must be filtered by `site_id IN (SELECT site_id FROM customer_md_sites WHERE user_id = :me)`.

---

## 9. Budget — multi-level approval + audit + burn rates (§11)

### 9.1 Tables

```
site_budgets
  site_id (pk)
  monthly_ceiling (int, paise)       ── default 10,00,000 = ₹10 L
  updated_at

budget_requests
  id (uuid)
  title, reason (text)
  amount (int, paise)
  site_id (fk)
  raised_by_user_id (fk)
  raised_at
  status (enum: 'pending_md','approved','rejected','escalated_customer_md','cmd_approved','cmd_rejected','auto_approved')
  decided_by_user_id (fk nullable)
  decided_at (nullable)
  decision_note (text nullable)

budget_audit_log
  id, budget_request_id, actor_user_id,
  action (enum: 'created','auto_approved','md_approved','md_rejected','escalated','cmd_approved','cmd_rejected'),
  note (text), created_at
```

### 9.2 Classification logic (port from `budgetMockService.classifyBudget`)

```
if amount <= 50,000  → auto_approved
elif amount <= 2,00,000 → pending_md
else → escalated_customer_md (but still goes through MD first as "pending_md",
                              then MD's decision flips it to escalated_customer_md)
```

Exact thresholds live in a config table `budget_thresholds(company_id, auto_limit, md_limit)` so they're admin-editable — do NOT hardcode.

### 9.3 State machine

```
              ┌── auto_approved (if amount<=AUTO_LIMIT)
pending_md ───┼── approved (md_accept)
              ├── rejected (md_reject)
              └── escalated_customer_md (md_escalate, only when amount>MD_LIMIT)
                        ├── cmd_approved (cmd_esc_approve)
                        └── cmd_rejected (cmd_esc_reject)
```

### 9.4 Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| POST | `/api/v1/budget/requests` | Sup | Create request. Auto-classifies, auto-approves if small |
| GET | `/api/v1/budget/requests?scope=<role>` | Sup/MD/CMD | Returns role-scoped list. Sup=own, MD=all, CMD=only escalated_customer_md assigned to their sites |
| GET | `/api/v1/budget/totals?scope=<role>` | same | `{count, pending, approvedSum, rejectedCount}` |
| POST | `/api/v1/budget-requests/:id/accept` | MD | status → approved. Append audit |
| POST | `/api/v1/budget-requests/:id/reject` | MD | status → rejected |
| POST | `/api/v1/budget-requests/:id/escalate` | MD | status → escalated_customer_md (only allowed if amount > MD_LIMIT) |
| POST | `/api/v1/budget-requests/:id/esc-approve` | CMD | status → cmd_approved |
| POST | `/api/v1/budget-requests/:id/esc-reject` | CMD | status → cmd_rejected |
| GET | `/api/v1/budgets/sites/:id` | Sup/MD/CMD (with access) | Month-to-date approved sum vs ceiling |
| GET | `/api/v1/budgets/sites/:id/history?months=6` | same | Monthly series for charts |
| GET | `/api/v1/budget/burn-rate?scope=<role>&month=YYYY-MM` | Sup/MD | Per-site `{site_id, spent, ceiling, ratio}` |
| GET | `/api/v1/budgets/threshold-alerts` | MD | Sites at ≥90% of ceiling (for dashboard banner) |

### 9.5 Threshold-alert Celery beat

- Every hour: for every site, compute this month's burn; if ≥90% and no alert fired in last 24h, insert a notification and post a message in the Ops Team group.

---

## 10. Site Diary (§15) + Monthly Report

### 10.1 Table

```
site_diary_entries
  id (uuid)
  site_id (fk)
  author_id (fk users.id)         ── Problem Solver
  entry_date (date)               ── one per (site, author, date) ideally
  work_done (text)
  issues_noted (text nullable)
  weather (text)                  ── optional, from weather API if lat/lon known
  safety_incidents (text default 'None')
  photos (jsonb)                  ── array of photo URIs (optional)
  created_at
```

### 10.2 Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| POST | `/api/v1/site-diary` | PS | Create entry |
| GET | `/api/v1/site-diary?site_id=&author_id=&customer_md_sites=[...]` | Sup/MD/CMD/PS | List with filters |
| GET | `/api/v1/site-diary/:id` | same (if has access) | Fetch one |
| GET | `/api/v1/site-diary/monthly-report?scope=<role>&month=YYYY-MM` | Sup/MD/CMD | **See §10.3** |
| GET | `/api/v1/site-diary/export/pdf?site_id=&month=YYYY-MM` | MD/CMD | Server-side PDF (WeasyPrint or ReportLab) |

### 10.3 Monthly Report response contract

This is the single most complex aggregator. Frontend currently constructs this in `monthlyReportMockService.js`; backend must return **exactly** the same shape:

```json
{
  "month": "April 2026",
  "scope_label": "Vikram Singh · All 5 sites · 3 supervisors",
  "role": "manager",
  "hero": { "label": "Closure rate", "value": "30%" },
  "kpis": [
    { "key":"raised", "label":"Raised", "value":27, "delta":"+23%", "trend":"up", "invertSentiment": false },
    { "key":"closed", "label":"Closed", "value":8,  "delta":"+60%", "trend":"up", "invertSentiment": false },
    { "key":"escalated", "label":"Escalated", "value":3, "delta":"-40%", "trend":"down", "invertSentiment": true },
    { "key":"complaints", "label":"Complaints", "value":8, "delta":"+33%", "trend":"up", "invertSentiment": true }
  ],
  "per_site": [
    { "site_id":1, "name":"...", "issues_total":6, "issues_closed":2, "issues_open":4,
      "on_time_rate":33, "spent":62000, "ceiling":1000000, "burn_ratio":0.062 }, ...
  ],
  "top_issues": [ { "id":7, "title":"...", "status":"ESCALATED", "priority":"high", "site_name":"...", "impact_score":86 }, ... ],
  "budget": { "approved_count":4, "approved_sum":380000, "rejected_count":1, "escalated_count":2 },
  "standout": { "label":"Top supervisor", "name":"Priya Sharma", "detail":"4 issues closed" },
  "safety_incidents": 0,
  "highlights": "Company closure rate is 30% — +60% vs last month. 2 budget requests are currently escalated to Customer MDs. Top burn-rate site: Ambattur Manufacturing Unit at 6% of ceiling."
}
```

### 10.4 Logic

- Per role (enforced server-side), filter scope:
  - `supervisor` → `site_id IN supervisor_sites[me]`
  - `customer_md` → `site_id IN customer_md_sites[me]`
  - `manager` → all sites
- Deltas: query same metrics for previous month (closed month). Compute `(cur - prev)/prev * 100`.
- `hero.value` differs per role — see `monthlyReportMockService.hero` block for the exact mapping.
- `highlights` paragraph: **LLM-generated** (pass KPIs + standout into a prompt). Cache per (scope, month) for 1 hour.
- Weather field on `site_diary_entries`: call weather API (e.g., OpenWeatherMap) once per (site, date) using `site.coordinates`, store the result.

---

## 11. MD Admin — create sites, users, assign CMD sites (§12)

| Method | Path | Caller | Body | Behaviour |
|--------|------|--------|------|-----------|
| POST | `/api/v1/sites` | MD | `{name, location, latitude, longitude, initial_budget}` | Insert `sites` row + insert `site_budgets(site_id, monthly_ceiling=initial_budget)` |
| POST | `/api/v1/users` | MD | `{name, phone, email, role, password, company?, site_ids?}` | Validate role ∈ {supervisor,problem_solver,customer_md}. `username = last 10 digits of phone`. Hash password. If role=customer_md and site_ids provided, insert into `customer_md_sites` |
| GET | `/api/v1/users` | MD | — | All users flat list (Team screen) |
| POST | `/api/v1/customer-mds/:id/sites` | MD | `{site_ids: [int]}` | **Replace** entire assignment — delete rows for (user_id), insert new set |

Validation:
- Phone must be E.164-ish (`+\d{10,15}`).
- Email RFC-5322 (optional).
- Password min 8 chars.

---

## 12. Google Sheets Live Sync (§13) — backend-heavy

This is the biggest pure-backend build. Frontend has 3 endpoints + a status pill; everything else is server work.

### 12.1 Tables

```
sheet_integrations
  id, user_id (MD who connected), sheet_id, sheet_name, spreadsheet_url,
  oauth_refresh_token (encrypted), webhook_channel_id,
  connected_at, disconnected_at, last_error (text nullable)

sheet_sync_state
  integration_id (pk)
  last_synced_at, last_full_sync_at,
  record_count, state (enum: 'idle','syncing','synced','error')

sheet_cell_diff (ring buffer, keep last 10k)
  id, integration_id, row_index, col_index, old_value, new_value, applied_at, record_affected (fk)
```

### 12.2 Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| POST | `/api/v1/integrations/google-sheets/connect` | MD | Returns OAuth URL |
| GET | `/api/v1/integrations/google-sheets/oauth-callback?code=` | Google | Completes OAuth, stores refresh token, registers webhook |
| GET | `/api/v1/integrations/google-sheets/status` | MD | Returns full state object the frontend pill needs |
| POST | `/api/v1/integrations/google-sheets/sync` | MD | Manual trigger — schedules a full sync, returns immediately |
| POST | `/api/v1/integrations/google-sheets/disconnect` | MD | Revoke token, delete webhook, clear state |
| POST | `/api/v1/webhooks/google-sheets/push` | Google | Webhook target — enqueues cell-diff job |

### 12.3 Core logic to build

1. **OAuth2 flow** with scope `https://www.googleapis.com/auth/spreadsheets`.
2. **Register a webhook** (Drive API `changes.watch`) on the sheet — Google POSTs to your endpoint on any change.
3. **Cell-diff worker** (Celery task triggered by webhook):
   - Read the sheet's current state via Sheets API v4 `batchGet`.
   - Compare to your last-known snapshot (store the snapshot per-integration in S3 / Redis).
   - For each changed cell, look up which DB field it maps to (via a column-mapping config: e.g., sheet column A → `issues.title`).
   - Apply the change with validation (reject malformed rows; log into `sheet_cell_diff.last_error`).
4. **Validation rules** — refuse to sync a row if required columns are empty or types don't match.
5. **Incremental sync** — only changed cells, never full-row overwrites (per spec).
6. **Resilience** — if Google token expires, refresh it. If Google returns 429, exponential backoff.

### 12.4 Required env vars

- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_SHEETS_WEBHOOK_URL` (your public callback)
- `SHEETS_INTEGRATION_SECRET` (HMAC signing for webhook payloads)

---

## 13. Project Timeline — Gantt + dependency cascade (§17)

### 13.1 Tables

```
site_contracts
  site_id (pk, fk sites.id)
  start_date (date), end_date (date)
  updated_at

site_tasks
  id (uuid)
  site_id (fk)
  name (text)
  start_date, end_date (date)
  assigned_to_supervisor_id (fk users.id)
  status (enum: 'not_started','in_progress','completed','delayed')
  depends_on_task_id (uuid nullable, fk site_tasks.id)
  created_at, updated_at
```

### 13.2 Endpoints

| Method | Path | Caller | Purpose |
|--------|------|--------|---------|
| GET | `/api/v1/sites/:id/timeline` | MD/Sup(assigned)/CMD(assigned) | `{site_id, contract_start_date, contract_end_date, tasks:[...]}` |
| POST | `/api/v1/sites/:id/tasks` | MD | Create task |
| PATCH | `/api/v1/sites/:id/tasks/:taskId` | MD | Update any field. Triggers cascade |
| DELETE | `/api/v1/sites/:id/tasks/:taskId` | MD | Remove + reparent dependents |

### 13.3 Cascade logic (port from `projectTimelineMockService.updateTask`)

When PATCHing a task:
1. Compute `delta_days = new_end_date - old_end_date`.
2. If `delta_days > 0` (task extended later):
   - Find all tasks where `depends_on_task_id = :taskId`.
   - Shift their `start_date` and `end_date` by `+delta_days`.
   - If any shifted task had `status='not_started'`, set it to `'delayed'`.
   - Recurse to dependents-of-dependents (BFS; keep a `seen` set to avoid cycles).
3. After recursion, compute `max(tasks.end_date)`. If that's later than `site_contracts.end_date`, update `site_contracts.end_date`.
4. Return `{timeline, affected: [task_ids_shifted]}`.

Do cascade inside a DB transaction so partial failure rolls back cleanly.

### 13.4 Access

- Read: MD (any site), Sup (sites in `supervisor_sites`), CMD (sites in `customer_md_sites`).
- Write: MD only.
- PS: always 403.

---

## 14. WebSockets + polling fallback

### 14.1 WS endpoints

- `/ws/personal-chats/:thread_id`
- `/ws/group-chats/:id`
- `/ws/issues/:id` — for alert-status + escalation real-time updates
- `/ws/dashboard/:user_id` — broadcast threshold-alerts + sheet sync state

### 14.2 Auth on WS

Pass JWT as first message on connect: `{"type":"auth","token":"..."}`. Disconnect on invalid.

### 14.3 Fallback

If WS connect fails, frontend polls REST every 3s. Ensure list endpoints return newest-first with an `If-Modified-Since` header honoured so poll traffic stays light.

---

## 15. Background workers (Celery / cron)

| Schedule | Task | Purpose |
|----------|------|---------|
| `0 2 1 * *` (monthly) | `generate_monthly_summaries` | LLM summary for every group chat + high-traffic personal thread |
| `0 * * * *` (hourly) | `check_budget_thresholds` | Fire threshold-alerts when site burn ≥ 90% |
| `*/5 * * * *` | `google_sheets_resync_if_stale` | If last_synced_at > 5 min ago and integration is healthy, refresh |
| On webhook | `apply_sheet_cell_diff` | Driven by Google webhook, not timer |
| On issue create | `send_dual_channel_alert` | Voice + WhatsApp, see §6 |
| On escalation | `send_escalation_email` | +`post_md_chat_notification` |
| Nightly | `ai_flag_after_photos` | Batch re-check flagged photos (rate-limit upstream AI calls) |

---

## 16. External integrations summary

| Service | Purpose | Required env vars |
|---------|---------|-------------------|
| Twilio Voice API | `place_alert_call` — auto-call Sup/PS on new issue | `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Twilio WhatsApp Business | templated messages (issue alert, missed-call fallback, CMD escalation notify) | `TWILIO_WHATSAPP_FROM`, 3 approved template SIDs |
| Google Sheets API v4 + Drive API | Live sync (§13) | See §12.4 |
| OpenWeatherMap (or similar) | `weather` field on site diary entries | `WEATHER_API_KEY` |
| LLM provider (Claude / GPT / Gemini) | Monthly summaries + `highlights` paragraph + chatbot replies | Already in place |
| PDF generator (WeasyPrint or ReportLab) | Site-diary monthly-report export | — |
| S3 / equivalent | Photo uploads, sheet snapshot storage | Already in place |
| Sentry / log sink | Error tracking for webhooks + cascade jobs | — |

---

## 17. Testing matrix (minimum before promoting)

| Test | Type | Owner |
|------|------|-------|
| Create budget @ ₹30k → auto-approved, audit log has `auto_approved` action | Integration | Backend |
| Create budget @ ₹1.5L → pending_md → md_accept → approved | Integration | Backend |
| Create budget @ ₹5L → pending_md → md_escalate → cmd_approve → cmd_approved | Integration | Backend |
| Supervisor raises issue → voice call placed + WhatsApp sent in parallel | Integration (mock Twilio) | Backend |
| Twilio webhook `call-status=no-answer` → `missed_call=true`, fallback WhatsApp | Integration | Backend |
| Shift task end-date +10d → all downstream tasks shifted, contract_end_date updated | Unit (cascade) | Backend |
| Cascade with cycle in depends_on_task_id → loop terminates, no infinite recursion | Unit | Backend |
| Google webhook POST → cell-diff applied to `issues.title` for row N | Integration (mock Google) | Backend |
| CMD login → dashboard shows only their `customer_md_sites` | Integration | Backend |
| MD adds CMD user + assigns 2 sites → CMD login shows exactly those 2 | E2E | Both |
| Pin a message as MD → WS broadcasts pin event; Sup sees pin indicator live | E2E | Both |
| Monthly report endpoint for `supervisor1` → `scope_label` matches supervisor name + their sites | Integration | Backend |
| Delete site_task with dependents → dependents' `depends_on_task_id` cleared (reparent to null) | Unit | Backend |
| Rate-limit auth at 6th attempt → 429 | Integration | Backend |

---

## 18. Rollout plan (suggested order)

Because every mock currently works, you can ship backend in any order and the frontend will gracefully accept the real endpoint once it lands (just remove the `[BACKEND-GAP]` mock branch in `src/services/api.js` / the mock file).

Recommended sequence:

1. **Week 1** — Section 1 (role enum + CMD junction), Section 2 (directory APIs), Section 11 (MD admin — unlocks real user/site creation).
2. **Week 2** — Section 5+6 (alerts) + Section 3 (escalations) — biggest risk-reduction; voice + WhatsApp need external credentials.
3. **Week 3** — Section 9 (budget state machine) + Section 10 (site diary + monthly report).
4. **Week 4** — Sections 3+4 (personal + group chat + WS + chatbot intents).
5. **Week 5** — Section 13 (Google Sheets — largest pure-backend build).
6. **Week 6** — Section 17 (timeline cascade) + Section 7+8 (photo AI flag) + polish.

After each section is live, swap the corresponding mock import in `src/services/mocks/*` for the real axios call (the `// TODO(backend):` comments in every mock file tell you exactly what URL to call).

---

## 19. Handy grep cheatsheet (frontend side)

Give this to backend engineers so they can find the exact frontend call site for any endpoint they're building:

```
# every backend-gap line with its endpoint
grep -rn "BACKEND-GAP" /app/frontend/src
# every TODO(backend) comment above the call site
grep -rn "TODO(backend)" /app/frontend/src
# the canonical request/response shapes
ls /app/frontend/src/services/mocks/*.js
```

Each mock file is ≤250 lines and exactly mirrors what the real endpoint must return. The mock is the spec.

---

*Last updated: Apr 23, 2026 — v3.0 frontend is fully shipped and mocked; this doc is the backend's delta to make it real.*
