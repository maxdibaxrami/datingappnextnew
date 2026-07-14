# Telegram Dating Mini App

A Next.js Telegram Mini App with a trusted server backend built on Supabase Auth,
Postgres, Storage, and row-level security.

The first four backend milestones are implemented in the repository:

- Telegram Mini App initData verification with replay expiry and constant-time
  signature comparison
- idempotent, race-safe Telegram identity provisioning into Supabase Auth
- HttpOnly access/refresh cookie sessions; tokens are never returned to browser code
- account status, ban, restriction, and profile-completion gates
- profile onboarding and completion APIs
- private original profile-photo uploads through signed Storage URLs
- photo confirmation, primary selection, reordering, and soft deletion
- safe, filterable discovery with opaque cursor pagination
- idempotent likes, passes, super-likes, and secret crushes
- race-safe reciprocal matching with canonical user ordering
- five-minute latest-swipe undo with immutable action history
- cursor-paginated active match reads
- one stored UTC Daily Chemistry card with at most three explainable candidates
- safe 30-day candidate deduplication and backend-only compatibility scoring
- atomic candidate view, swipe, match, expiry, and undo state reconciliation
- Date Idea create, safe marketplace browse, bookmark, join request, author
  decision, and close flows with cursor pagination and idempotent requests
- database-backed rate limits and consistent API responses

Database migrations live in supabase/migrations. Migrations through
20260714200110_fix_daily_chemistry_card_viewer_fk_index.sql are recorded in the
live dating_app project, including Daily Chemistry. The Date Ideas migration is
present for review but is not live until it is explicitly approved and applied.
Never reapply an already-recorded migration; check migration history before
applying the next migration and regenerate database types after every live
schema change.

## Local setup

This project uses pnpm.

~~~bash
pnpm install
cp .env.example .env.local
pnpm dev
~~~

Fill .env.local with server-only credentials. Never expose the Telegram bot
token, service-role key, or application secrets through a NEXT_PUBLIC_
variable.

## Commands

~~~bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
~~~

## API contract

Successful responses:

~~~json
{
  "data": {}
}
~~~

Errors:

~~~json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
~~~

Implemented routes:

- POST /api/auth/telegram
- GET /api/auth/me
- POST /api/auth/refresh
- POST /api/auth/logout
- GET|PATCH /api/profile/me
- POST /api/profile/complete
- POST /api/profile/photos/upload-url
- POST /api/profile/photos/:photoId/confirm
- POST /api/profile/photos/:photoId/primary
- DELETE /api/profile/photos/:photoId
- POST /api/profile/photos/reorder
- GET /api/discovery
- POST /api/swipes
- POST /api/swipes/undo
- GET /api/matches
- GET /api/daily-chemistry
- POST /api/daily-chemistry/candidates/:candidateId/view

See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for security
boundaries, data ownership, deployment notes, and the roadmap for daily
chemistry, date ideas, monetization, moderation, social, and TON payments.
