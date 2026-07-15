# Telegram Dating Mini App

A Next.js Telegram Mini App with a trusted server backend built on Supabase Auth,
Postgres, Storage, and row-level security.

The core backend milestones are implemented and applied to the live
`dating_app` database:

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
- user block/unblock, reporting, a moderator queue, and auditable moderation
  decisions (restrictions, bans, profile/photo/post actions)
- active-match conversations, idempotent text messages, unread counts, mute
  settings, and private in-app notifications
- verified Telegram Stars and TON premium purchases with one current
  subscription entitlement, feature limits, and daily premium super-like claims
- paid and premium-benefit boosts with sequential scheduling, pause/resume,
  exposure metrics, and private discovery priority
- random video queue pairing with reciprocal location/interest scope matching,
  protected WebRTC signaling, block-triggered termination, and participant-proof
  moderation reports
- requested/accepted/muted/rejected follows with approval controls, cursor
  pagination, atomic profile counters, and block-triggered relationship removal
- server-only social feeds, idempotent safe-text posts, post likes, coarse
  visibility rules, and feed-safe profile projections
- database-backed rate limits and consistent API responses

Database migrations live in supabase/migrations. The live `dating_app` project
records the `premium_boost_backend`, `random_video_chat_backend`, and
`social_feed_backend` migrations (including their safety/index follow-ups) in
addition to the earlier Daily Chemistry, Date Ideas, Gifts/Auras/Payments,
moderation, and messaging work. Never reapply an already-recorded migration;
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
- GET|POST /api/date-ideas
- POST /api/date-ideas/:dateIdeaId/bookmark
- POST /api/date-ideas/:dateIdeaId/close
- GET|POST /api/date-ideas/:dateIdeaId/requests
- POST /api/date-ideas/:dateIdeaId/requests/:requestId/decision
- GET|POST /api/gifts
- POST /api/payments/ton/confirm
- POST /api/payments/telegram/webhook (Telegram only; no browser session)
- GET /api/profile/auras
- POST /api/profile/auras/:userAuraId/activate
- GET|POST /api/blocks
- DELETE /api/blocks/:blockedUserId
- GET|POST /api/reports
- GET /api/admin/moderation (moderator/admin only)
- POST /api/admin/moderation/:moderationQueueId/assign
- POST /api/admin/moderation/:moderationQueueId/decision
- GET /api/conversations
- GET|POST /api/conversations/:conversationId/messages
- POST /api/conversations/:conversationId/read
- PATCH /api/conversations/:conversationId/settings
- GET /api/notifications
- POST /api/notifications/:notificationId/read
- POST /api/notifications/read-all
- GET /api/premium/plans
- GET /api/premium/me
- POST /api/premium/purchases
- POST /api/premium/payments/ton/confirm
- POST /api/premium/claim-super-likes
- GET /api/boosts
- POST /api/boosts/purchases
- POST /api/boosts/payments/ton/confirm
- POST /api/boosts/premium
- POST /api/boosts/:boostId/pause
- POST /api/boosts/:boostId/resume
- GET|POST|DELETE /api/video/queue
- GET /api/video/sessions/:videoSessionId
- POST /api/video/sessions/:videoSessionId/ready
- POST /api/video/sessions/:videoSessionId/connected
- POST /api/video/sessions/:videoSessionId/heartbeat
- POST /api/video/sessions/:videoSessionId/end
- GET|POST /api/video/sessions/:videoSessionId/signals
- GET|POST /api/follows
- DELETE /api/follows/:targetUserId
- POST /api/follows/:targetUserId/mute
- GET /api/follow-requests
- POST /api/follow-requests/:followerUserId/decision
- GET /api/feed
- POST /api/posts
- DELETE /api/posts/:postId
- POST|DELETE /api/posts/:postId/like

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

## Random video transport

The video backend pairs eligible completed profiles and relays bounded WebRTC
signaling payloads through authenticated APIs. It does not persist audio or
video. The client should use the queue/session/ready/connected/signal lifecycle
and immediately call the end route when a peer connection closes. A TURN
provider is required before relying on peer-to-peer WebRTC across restrictive
mobile and carrier networks; public STUN alone is not a production guarantee.

## Social feed

Users can enable follow approval through `PATCH /api/profile/me` with
`followApprovalRequired`. Follows and social posts are server-owned: the
browser cannot read or write `follows`, `posts`, or `post_likes` directly.
`POST /api/posts` requires a client-generated UUID so a retry returns the
original post rather than duplicating it. The current post surface is safe text
only; attachments, replies, reposts, polls, and a media-processing pipeline
remain future work.

Feed visibility uses only stored country/city/coarse geohash data. Blocks erase
both directional follows and prevent feed/profile interactions. Muting keeps
the relationship record for counters and audience semantics while hiding that
author's posts and preventing likes from the muting user.

See [docs/BACKEND_ARCHITECTURE.md](docs/BACKEND_ARCHITECTURE.md) for security
boundaries, data ownership, deployment notes, and the roadmap for daily
chemistry, date ideas, monetization, moderation, social, and TON payments.
