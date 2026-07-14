# Telegram Dating Mini App

A Next.js Telegram Mini App with a trusted server backend built on Supabase Auth,
Postgres, Storage, and row-level security.

The first two backend milestones are implemented:

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
- database-backed rate limits and consistent API responses

Database migrations live in supabase/migrations. The foundation migration is
already recorded in production. Apply
20260714182456_discovery_swipes_matches.sql before deploying the discovery,
swipe, and match routes, then regenerate src/types/database.generated.ts. Never
reapply an already-recorded migration; check migration history first.

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

See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for security
boundaries, data ownership, deployment notes, and the roadmap for daily
chemistry, date ideas, monetization, moderation, social, and TON payments.
