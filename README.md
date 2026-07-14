# Telegram Dating Mini App

A Next.js Telegram Mini App with a trusted server backend built on Supabase Auth,
Postgres, Storage, and row-level security.

The first five backend milestones are implemented in the repository:

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
- gift catalog, payment-bound gift intents, Telegram Stars invoice links, and
  TON payment instructions
- server-verified Telegram webhook and TON transaction fulfillment with a
  one-payment/one-gift constraint
- provider-neutral aura unlocks and one-active-aura activation
- database-backed rate limits and consistent API responses

Database migrations live in supabase/migrations. Migrations through
20260714204417_date_ideas_marketplace_backend.sql are recorded in the live
dating_app project, including Daily Chemistry and Date Ideas. The Gifts, Auras,
and Payments migration is present for review but is not live until it is
explicitly approved and applied. Never reapply an already-recorded migration;
check migration history before applying the next migration and regenerate
database types after every live schema change.

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
- GET|POST /api/gifts
- POST /api/payments/ton/confirm
- POST /api/payments/telegram/webhook (Telegram only; no browser session)
- GET /api/profile/auras
- POST /api/profile/auras/:userAuraId/activate

## Payment-provider setup

Telegram Stars needs `TELEGRAM_PAYMENT_WEBHOOK_SECRET` plus an HTTPS Bot API
webhook configured at `/api/payments/telegram/webhook`. The endpoint accepts
only Telegram requests carrying the matching secret header, answers pre-checkout
queries through the Bot API, and fulfills only a matching successful-payment
event.

TON needs a dedicated receiver address, fixed server-side network, and TON API
key. The client must send the returned TON transaction instruction exactly,
including its opaque payment payload, then call `/api/payments/ton/confirm`.
The server independently checks the transaction hash, destination, amount, and
payload before delivering the gift; it never trusts a client-supplied network.
Wallet-ownership proof can be added to the existing TON Connect screen as a
later hardening step; it is not trusted from the browser today.

See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for security
boundaries, data ownership, deployment notes, and the roadmap for daily
chemistry, date ideas, monetization, moderation, social, and TON payments.
