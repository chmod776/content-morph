# Content Morph - PRD

## Problem
Users generate platform-tailored content (Twitter, LinkedIn, Instagram, YouTube) from raw notes via OpenAI.
NEW: Users want to connect their social accounts and post (now or scheduled) directly from the app, with review/verification.

## Architecture
- Frontend: React (CRA) + Supabase Auth, inline-style components ported from user's Vite project
- Backend: FastAPI + MongoDB + APScheduler
- OAuth 2.0 flows for Twitter, LinkedIn, YouTube (Google), Instagram (Meta)
- Demo-connect fallback when OAuth credentials are not configured

## Implemented (Feb 2026)
- Frontend ported from user's Content-Morph Vite project to CRA
- New components: SocialAccountsModal, PublishModal, ScheduledPostsModal
- Backend social endpoints: accounts list/disconnect/demo-connect, oauth start/callback (4 platforms), post-now, schedule, list-scheduled, cancel-scheduled
- APScheduler job runs every 30s to publish due scheduled posts
- Review/verify step in PublishModal (2-step confirm before publish/schedule)

## P1/P2 Next
- Image/video upload + Instagram/YouTube media posting
- OAuth credential setup UI for app owner
- Retry policy for failed scheduled posts
- Per-platform character/format validation in the review step
- Post history view

## Update (Feb 2026 - session 3)
- Twitter OAuth credentials configured: live posting now active for Twitter
- Batch publish presets feature added:
  - Save reusable batch configs ("Morning blast", "Daily 9am", etc.)
  - Two schedule types: relative offsets (mins from load) OR fixed clock times (HH:MM)
  - Backend endpoints: GET/POST/DELETE /api/social/presets
  - Frontend: preset chips in BatchPublishModal with save panel + per-platform time computation on load
- Test status: 8/8 backend preset endpoint tests passed
