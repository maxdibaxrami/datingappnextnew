# Telegram Dating Mini App

A Next.js Telegram Mini App with a trusted server backend built on Supabase Auth,
Postgres, Storage, and row-level security.

The first backend milestone is implemented:

- Telegram Mini App initData verification with replay expiry and constant-time
  signature comparison
- idempotent, race-safe Telegram identity provisioning into Supabase Auth
- HttpOnly access/refresh cookie sessions; tokens are never returned to browser code
- account status, ban, restriction, and profile-completion gates
- profile onboarding and completion APIs
- private original profile-photo uploads through signed Storage URLs
- photo confirmation, primary selection, reordering, and soft deletion
- database-backed rate limits and consistent API responses

The production Supabase migration is
supabase/migrations/20260714163611_backend_foundation_auth.sql. Do not reapply
an already-recorded migration. Check migration history before deploying.

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

See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for security
boundaries, data ownership, deployment notes, and the roadmap for discovery,
swipes, matches, daily chemistry, date ideas, monetization, moderation, social,
and TON payments.
