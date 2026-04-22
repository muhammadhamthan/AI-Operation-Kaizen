"""
API Router Registry — Chat-First Architecture
──────────────────────────────────────────────
Primary endpoint: POST /api/v1/chat (handles everything)
Supporting endpoints: auth, images, dashboard, webhooks, history
Read-only endpoints: issues, assignments, complaints (for dashboard/detail views)
"""