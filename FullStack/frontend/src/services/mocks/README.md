# /src/services/mocks/

Mock data services for features whose backend endpoints do not yet exist in
the production API (`https://ai-operation-kaizen-backend.onrender.com`).

## Policy (Kairox v3.0)

For every feature that requires a missing backend endpoint:

1. Build the full frontend UI as specified in `FULL_COMBINED_PROMPT.md`.
2. Route data access through a mock service file in this folder.
3. On every mock call emit:
   `console.warn("[BACKEND-GAP] <feature>: needs <endpoint-spec>")`
4. Add a `// TODO(backend): <endpoint spec>` comment above every call site.
5. Mock data persists to AsyncStorage so demo state survives reloads.

## Files (created in later priorities)

- `budgetMockService.js` — Section 11
- `personalChatMockService.js` — Sections 7, 8
- `groupChatMockService.js` — Section 14
- `customerMDMockService.js` — Sections 4, 8, 9
- `siteDiaryMockService.js` — Section 15
- `projectTimelineMockService.js` — Section 17
- `sheetSyncMockService.js` — Section 13
- `adminMockService.js` — Section 12

Priority 1 introduces the folder and policy; no service files ship until
the feature that needs them is built.
