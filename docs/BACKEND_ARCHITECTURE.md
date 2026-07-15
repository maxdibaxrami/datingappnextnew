# Backend architecture and roadmap

## Scope and current status

This repository uses Next.js route handlers as the trusted write boundary.
Supabase provides Auth, Postgres, Storage, and RLS. The browser never receives
the service-role key, Telegram bot token, server secrets, or private-schema
records.

| Module | Status | Next responsibility |
| --- | --- | --- |
| Telegram auth and sessions | Implemented | Device/session management and abuse telemetry |
| Profile onboarding | Implemented | Verification workflow and normalized catalogs |
| Profile photo originals | Implemented | Moderation worker and public derivatives |
| Discovery | Implemented | Ranking experiments, travel mode, and public profile detail |
| Swipes and matches | Implemented | Unmatch workflow, likes inbox, and product entitlements |
| Daily chemistry | Implemented and live | Preference learning and queued prewarming |
| Date ideas | Implemented and live | Scheduled expiry and moderation workflow |
| Gifts and auras | Implemented and live | Provider operations and wallet-ownership proof |
| Messaging and notifications | Implemented and live | Private Realtime delivery and notification preferences |
| Premium and boosts | Implemented and live | Provider operations, expiry worker, and product analytics |
| Random video chat | Implemented and live | Client WebRTC integration, TURN provider, and session cleanup worker |
| Reports and moderation | Implemented and live | Moderator UI, verification evidence, and operational runbooks |
| Follows and social | Implemented and live | Media, comments, reposts, polls, and ranking |
| TON and Telegram Stars | Implemented and live | Provider operations and wallet-ownership proof |

Authentication, onboarding, discovery, swipes, undo, active-match reads, Daily
Chemistry, Date Ideas, Gifts/Auras/Payments, Reports/Moderation,
Messaging/Notifications, Premium/Boosts, Random Video Chat, and Follows/Social
are exposed by the current API code and backed by live migrations. Other tables
already present in the database are not automatically considered safe to use.

## Trust boundaries

The frontend sends raw window.Telegram.WebApp.initData only to
POST /api/auth/telegram. The backend:

1. rejects oversized or malformed bodies and disallowed origins;
2. applies a database-backed rate limit using a keyed, non-reversible request
   fingerprint;
3. rejects duplicate initData keys;
4. verifies Telegram's HMAC signature with a constant-time comparison;
5. enforces a short auth_date lifetime and rejects future timestamps;
6. rejects bot accounts and Telegram IDs outside the supported exact integer
   range;
7. derives a stable UUID with a private HMAC secret;
8. creates or retrieves the real Supabase Auth user;
9. calls the race-safe provision_telegram_user RPC;
10. creates a Supabase session server-side and stores its tokens only in
    Secure, HttpOnly, SameSite cookies.

No API accepts user_id as authority. The authenticated UUID always comes from
the verified cookie session. The same UUID owns auth.users, app_users,
telegram_identities, profiles, profile_stats, photos, and future records.

The deterministic identity secret must remain stable. Rotating it without a
migration plan could derive a different candidate UUID for new login attempts.
Existing Telegram identities are looked up first, but secret rotation still
needs an operational runbook.

## Session behavior

- Access and refresh tokens are separate __Host- HttpOnly cookies.
- Protected routes validate the access token with Supabase Auth.
- An expired access token is refreshed server-side when a valid refresh cookie
  exists.
- POST /api/auth/refresh supports an explicit refresh.
- Logout revokes the local Supabase refresh session when possible and always
  clears both cookies.
- Tokens are never included in JSON responses.

For higher-risk operations added later, validate the Auth session server-side
and consider checking session_id against active sessions. Keep access-token
lifetimes short and add a user-facing session/device revocation screen.

## Account and profile gates

get_account_gate_state loads status, role, active bans, active restrictions,
and profile completion in one service-role RPC. Shared guards enforce:

- a real authenticated app account;
- active/non-deleted status;
- no active ban;
- no full-suspension or view-only restriction;
- feature-specific restrictions such as no_profile_edit;
- completed onboarding for dating actions.

A profile becomes complete only when it has:

- display name;
- age from 18 through 100;
- gender;
- ISO-style two-letter country code;
- city;
- a confirmed primary photo.

Discovery has stricter requirements than onboarding. A completed profile still
does not appear publicly until its primary derivative is public, approved by
moderation, and passes face review.

## Photo and media pipeline

The current API issues a signed URL for the private
profile-photos-original bucket. Database rows are created in pending state,
limited to nine active photos and 8 MiB each. Confirmation checks ownership,
expiry, object existence, dimensions, MIME metadata when available, and then
marks the row confirmed. RPCs enforce a single active primary photo and refresh
profile completion.

Production media processing should add:

1. a queue or Storage event consumer;
2. true file-type detection and decompression-bomb protection;
3. malware scanning;
4. EXIF and exact-location removal;
5. image normalization and size variants;
6. perceptual hash, face checks, and moderation;
7. public WebP/AVIF derivatives in profile-photos-public;
8. CDN caching and lifecycle deletion;
9. idempotent retry/dead-letter handling;
10. deletion propagation to every derivative.

Video should use object storage, asynchronous transcoding, HLS/DASH output, a
CDN, signed playback where appropriate, and a moderation evidence retention
policy. Postgres stores metadata only.

## Database security

The foundation migration:

- removes client write grants and unsafe write policies from public tables;
- enables defense-in-depth RLS for private Telegram identity/rate-limit tables;
- grants sensitive RPC execution only to service_role;
- creates a security_invoker public profile-card view;
- limits authenticated SELECT columns for profile-related tables;
- adds discovery, array, upload, canonical-match, and payment idempotency
  indexes/constraints;
- requires verified matching payment data before a sent-gift insert;
- creates private-original and public-derivative Storage buckets.

Service-role calls are allowed only in modules importing server-only. Route
handlers remain thin and never expose database error details or stack traces.

Current advisor notes to review operationally:

- private deny-all tables have RLS with no user policy by design;
- private.current_user_is_admin() is an existing security-definer helper used
  by RLS. Its narrow behavior is intentional, but moving role data into trusted
  app metadata is the clean way to remove the advisor warning later;
- leaked-password protection matters only if password login is introduced;
- future-module foreign keys and permissive SELECT policies should be tuned
  based on real query plans rather than indexed blindly.

Run Supabase security and performance advisors after every DDL change.

## Scaling approach

- Use the Supabase HTTPS Data API from serverless routes instead of opening a
  database connection per request.
- Select explicit columns and cap every list.
- Use cursor pagination for discovery, date ideas, messages, notifications,
  feeds, reports, ledgers, and event history; avoid high-offset pagination.
- Keep middleware limited to cheap routing/session presence checks. Database
  gates belong in route services.
- Make create/payment/event operations idempotent with provider IDs, invoice
  payloads, or idempotency keys.
- Use stable canonical user ordering for matches.
- Move scoring, fan-out, media work, payment processing, and expiry jobs to
  queues/workers.
- Partition only after measured table size and query patterns justify it.
- Use pg_stat_statements, slow-query sampling, advisor output, and load tests
  against a staging branch before large launches.
- Add structured request IDs, redacted logs, metrics, traces, alerts, and audit
  retention before production growth.

For 1M+ users, discovery should query a narrow, safe card projection using a
stable cursor and indexed filters. Nearby search must expose only city/country
and a coarse geohash prefix. Exact coordinates belong in a private schema with
strict retention and access controls.

## Implemented dating loop

### Discovery

GET /api/discovery queries only safe public cards. It excludes self,
either-direction blocks, current prior swipes, active matches, and
incomplete/hidden/inactive/banned/shadow-banned users. A primary photo must be
public, confirmed, approved, and face-checked. Filters cover age, gender,
country, case-insensitive city, coarse geohash prefix, goals, languages, and
interests. Pages use an opaque keyset cursor over recency plus UUID and are
capped at 50 records.

Public geohashes are limited to five characters. Exact location must remain in
a private location table when that module is introduced.

### Swipes and matches

POST /api/swipes accepts like, pass, super_like, and secret_crush plus a
client-generated UUID idempotency key. The atomic RPC:

- rechecks actor status, completion, bans, and swipe restrictions;
- rechecks target visibility, safety, bans, restrictions, and both-direction
  blocks;
- serializes each unordered user pair with a transaction advisory lock;
- records one current action per actor/target pair;
- spends a super-like balance and appends its ledger entry atomically;
- detects a current reciprocal positive action;
- creates or reactivates one canonical least(UUID), greatest(UUID) match;
- updates like and match counters only once.

POST /api/swipes/undo preserves history by timestamping the original action and
inserting a linked undo event. Only the globally latest current action can be
undone, only within five minutes, and never after it formed an active match. An
internal identity sequence orders actions deterministically even when several
actions share a transaction timestamp. Undo refunds an actually spent
super-like in the same transaction.

GET /api/matches returns active, unblocked matches with safe opponent media and
an opaque matched-at/UUID cursor. A no_swipe restriction does not prevent a user
from reading existing matches.

The database RPCs are executable only by service_role. The browser supplies no
actor user ID; the backend derives it from the verified cookie session. The
application guard and database transaction both enforce account state so a ban
or block racing with a request cannot bypass the final write check.

### Daily Chemistry

GET /api/daily-chemistry lazily creates one stored card per user and UTC day.
Each card contains at most three candidates, expires at the next UTC midnight,
and stores an algorithm version, compatibility score, shared attributes,
explainable reason tags, and lifecycle state. A stored zero-result card prevents
repeated scans when no safe candidate is available.

The v1 candidate pool is deliberately bounded to 500 safe, same-country
profiles and excludes self, either-direction blocks, current swipes, active
matches, bans, unsafe/incomplete/hidden profiles, and anyone recommended in the
previous 30 days. It ranks shared interests, languages, relationship goals,
lifestyle intents, coarse proximity, and recent activity. The API returns clear
reasons without exposing weights, hidden moderation data, or exact location.

POST /api/daily-chemistry/candidates/:candidateId/view records an idempotent
view. Swipes continue through POST /api/swipes, but the daily_chemistry surface
requires the stored candidate ID. Contextual database wrappers atomically link
the swipe, update the candidate/card quota, propagate a match, and restore the
candidate when an eligible swipe is undone. The lower-level swipe RPCs are no
longer directly executable by service_role.

Lazy generation avoids writing three million daily rows for inactive users.
At higher traffic, a queue can prewarm cards for recently active users by using
the same versioned generation contract. Persisted age/gender/distance
preferences should be added before personalized preference filtering; the
current schema does not contain trustworthy dating preference fields.

### Date Ideas

The Date Ideas backend is live. `GET /api/date-ideas` gives completed
users a cursor-paginated, safe marketplace card feed. It excludes the author,
either-direction blocks, inactive/banned/restricted accounts, incomplete or
hidden profiles, unsafe primary photos, expired or closed ideas, and ideas that
do not satisfy the creator's audience and visibility rules.

`POST /api/date-ideas` creates an open idea using only the author's stored
coarse location. The client cannot supply exact location, premium state, or
verification state. Bookmark create/delete, idempotent join requests, author
request listing, accept/reject, and close operations each run through a
server-only security-definer RPC. A per-idea advisory lock makes competing
requests, decisions, expiry, and close updates atomic.

### Gifts, profile auras, and payments

`GET /api/gifts` returns only active catalog items to a completed, usable
account. `POST /api/gifts` accepts the gift, receiver, provider, presentation
data, and a client-generated idempotency UUID; it never accepts a sender ID,
amount, or product price. The database checks the sender/receiver account
state, `no_gift` restriction, completed profile, self-gifting, bans, and both
block directions before creating one private gift-payment intent. Intents expire
after 15 minutes; retrying an expired or already-settled intent requires a new
idempotency UUID.

Telegram Stars intents return a server-created invoice link. The Telegram
webhook endpoint is protected by a constant-time comparison of Telegram's
secret header. It rechecks the opaque payload, Telegram identity, currency, and
Stars amount before calling the atomic fulfillment RPC. The successful-payment
charge ID is unique, so webhook retries are harmless.

TON intents return the exact receiver address, nanoTON amount, expiry, and
opaque comment to use with TON Connect. Confirmation fetches the transaction
from the configured TON API and requires the exact transaction hash,
destination, minimum amount, and payment comment before fulfillment. The source
address and raw verified transaction are retained server-side. A future
TON-connect proof verifier should bind a wallet address to a user before using
wallet-owned features; a client-provided address is never trusted as proof.

Expiry prevents new payment initiation (and Telegram Stars pre-checkout) after
the deadline. A provider-confirmed payment remains idempotently fulfillable so
that a late webhook never silently strands settled value; refund/review handling
for exceptional post-payment cases belongs to the future payments operations
module. The authenticated TON confirmation endpoint therefore verifies only the
caller-owned pending payment when settling an already-sent transfer; it does not
re-open general dating access for a restricted account.

Fulfillment first records the verified provider payment, then inserts exactly
one `sent_gifts` record, and then sets `granted_at`, all in one database
transaction. A database trigger unlocks all qualifying auras after the verified
gift insert and records an immutable aura event. `GET /api/profile/auras` lists
only the caller's auras; activating one via
`POST /api/profile/auras/:userAuraId/activate` atomically deactivates any other
aura for that user. A partial unique index enforces this invariant even during
concurrent calls.

### Messaging and notifications

Every active match automatically receives one canonical conversation and two
membership rows. A match that is blocked, unmatched, or expires closes the
conversation at the database level, and any current or future block makes the
conversation unavailable to both users. The message and notification tables
have RLS enabled and no browser table grants; all reads and writes use
service-role-only RPCs behind session-verified Next.js routes.

`GET /api/conversations` returns safe match context with a keyset cursor,
unread count, mute state, and a bounded last-message preview. `GET` and `POST`
to `/api/conversations/:conversationId/messages` page and send text messages.
The send operation requires an active, unblocked match, validates both account
states in the same transaction, assigns a per-conversation sequence number, and
is idempotent on the caller's client message UUID. Retried sends return the
original message without a second notification.

`POST /api/conversations/:conversationId/read` stores a durable read position
and recomputes only the residual unread count. `PATCH` to that conversation's
`settings` route sets a bounded mute-until time. A sender's message increments
the recipient's unread count and creates a generic in-app notification only
when that conversation is not muted; message text is not copied into the
notification body.

`GET /api/notifications`, the individual read route, and the read-all route
are a private notification inbox with cursor pagination. Match creation also
creates a generic match notification for each user. Current delivery is via
these protected APIs (polling is safe with the HttpOnly cookie session). Do not
enable browser Realtime subscriptions until the client has a deliberately
designed, short-lived authorization mechanism for Supabase private channels;
the current session token is intentionally never exposed to browser JavaScript.

### Premium and boosts

`GET /api/premium/plans` exposes only active, server-owned plan catalog data.
`POST /api/premium/purchases` uses a client idempotency UUID but derives the
plan price, invoice payload, expiration, and provider from the database. The
existing Telegram Stars webhook now dispatches opaque `prm_` payment payloads
to the premium fulfillment RPC; `POST /api/premium/payments/ton/confirm` uses
the same server-side TON transaction verifier as gifts. Each verified payment
is unique by provider payment ID and can grant only one entitlement. Renewals
extend a single current subscription rather than creating competing active rows.

`GET /api/premium/me` returns the caller's current entitlement and feature
limits; browser roles cannot read subscriptions, premium usage, or super-like
ledgers. `POST /api/premium/claim-super-likes` makes a daily, idempotent UTC
claim using the plan limit and records the associated feature-usage period.

`GET /api/boosts` returns the active boost catalog and only the caller's boost
history. Paid boosts have a payment-bound intent with the same Stars/TON
verification rules. Premium users can create a benefit boost only when their
plan's configured minutes remain. Overlapping boosts are queued sequentially;
the database permits at most one active boost per user. The caller can pause or
resume an owned active boost through the dedicated routes, preserving remaining
seconds rather than silently losing paid time.

Discovery uses a private exposure multiplier for a currently active (or due
scheduled) boost and a smaller plan-based `priority_discovery` multiplier. It
never returns these values in a profile card. A returned discovery page records
boost impressions best-effort; it cannot make discovery unavailable. A future
worker should expire boosts and start queued boosts promptly even when a user is
not being discovered, while the current bounded metric path refreshes due
returned profiles transactionally.

### Random video chat

The random video backend is live but deliberately separates safe matching from
media transport. `POST /api/video/queue` creates or reuses one 90-second queue
entry using only the caller's stored country, city, coarse three-character
geohash, languages, and interests. It can pair only a counterpart whose own
selected mode also accepts the caller. The atomic queue RPC uses row locks with
`SKIP LOCKED`, excludes self, blocks in either direction, banned/restricted
accounts, unsafe or hidden profiles, already-active video participants, and
the same pair from the preceding 12 hours.

Matching creates one private `video_sessions` row and exactly two participant
rows. `GET /api/video/queue` returns only the caller's queue/session state;
`GET /api/video/sessions/:videoSessionId` returns only the other participant's
safe profile projection (name, age, country/city, approved primary photo) and
never exposes exact location, queue metadata, or the other user's signaling
history. A new block ends any active session between the pair immediately via a
database trigger.

The `ready`, `connected`, `heartbeat`, `end`, and `signals` routes provide a
provider-neutral WebRTC lifecycle. Signaling is a bounded, idempotent offer,
answer, ICE-candidate, or hangup relay between the two verified participants;
the browser has no direct database access or Supabase Realtime credential. It
is designed for polling from the HttpOnly-cookie client. The backend records
only session metadata and short-lived signaling payloads, not media. A client must supply a production TURN configuration before reliable
mobile/network traversal can be promised; a future LiveKit/Daily adapter can
replace the transport without changing pairing, safety, or reporting contracts.

### Follows and social feed

Users can opt into private follow approval with `follow_approval_required`,
updated through their existing profile route. `POST /api/follows` creates either
an accepted follow or a requested follow; `GET /api/follow-requests` lets the
owner inspect pending requests and the decision route accepts or rejects one.
`GET /api/follows?direction=following|followers` is cursor-paginated and shows
only safe public profile projections. The `follows` table records requested,
accepted, muted, and rejected states, while database triggers keep follower,
following, and post counters synchronized.

Follow, post, and post-like tables use RLS with no browser grants. All access
runs through service-role-only RPCs after the Next.js route derives the actor
from the verified cookie session. A new block deletes follows in both directions
immediately, and every follow, feed, and like operation independently checks
blocks, active account state, bans, restrictions, discoverability, and safe
profile status to cover races.

`POST /api/posts` is an idempotent safe-text surface. The client must provide a
UUID `clientPostId`; concurrent retries converge on one post. The server derives
country, city, and coarse geohash from the author's stored profile rather than
accepting location from the browser. Current post types are text, question,
confession, and local shout; media, polls, replies, and reposts are deliberately
not exposed until their moderation and storage contracts exist.

`GET /api/feed?scope=following|discover` returns a keyset-paginated safe feed.
Visibility supports public/global, followers, country, city, and nearby rules
without returning exact location. Muting does not silently remove a follow or
corrupt its counters, but it hides that author from both feed scopes and prevents
new likes from the muting user. `DELETE /api/posts/:postId` soft-deletes an own
post, and post likes use a per-pair advisory lock to keep the count accurate
under concurrent retry traffic.

### Reports, blocks, and moderation

`POST /api/blocks` and `DELETE /api/blocks/:blockedUserId` are available to
any usable account, including an account still completing its profile. A block
is idempotent, cannot target the caller, and immediately turns an active match
between the pair into a blocked historical match. Every discovery, dating, date
idea, and gift workflow already checks both block directions.

`POST /api/reports` accepts user/profile, profile-photo, post, or video-session
reports. The client sends only a target ID and a bounded reason/details field;
the database derives the content owner for photo and post reports. Video reports
must identify the other participant and the database now proves both users were
participants in that exact session before creating evidence. Each report
atomically creates one moderation-queue case and records a video-report event
where appropriate.

Moderators and admins receive a cursor-paginated queue through
`GET /api/admin/moderation`. They can assign a case and make an auditable
decision through the admin routes. The atomic decision RPC can warn, hide or
unhide a profile, remove or restore a photo/post, create/lift a restriction,
ban/unban, record verification decisions, or leave a manual note. It writes an
`admin_actions` audit record for every decision. Payment refunds are deliberately
rejected here: only a provider-specific payment adapter may record a financial
refund after it actually succeeds.

All report, block, moderation queue, restriction, ban, and event tables are
server-only; browser roles do not receive table grants or execute privileges on
the corresponding RPCs. The Next.js route verifies the session-derived actor,
then the database rechecks the actor's active role before the write.

## Planned module contracts

### Date ideas

Add scheduled expiry and moderation workflows after the core marketplace is
approved and live.

### Premium and boosts operations

Add an expiry/scheduling worker before advertising precise boost start-time
guarantees, reconcile provider refunds through a provider-specific adapter, and
instrument funnel/retention metrics without copying payment data into client
analytics. Treat all entitlement changes as verified ledger events, never as a
client-side flag.

### Random video operations

Provision a TURN service with short-lived credentials before launch, add a
scheduled cleanup worker for expired queue entries/signaling rows, and monitor
connection success, skips, blocks, reports, and median pairing time by coarse
mode. Do not store recordings by default; any future recording feature needs
explicit consent, regional retention controls, access review, and a moderation
evidence policy.

### Messaging delivery

When a short-lived, least-privilege Realtime authorization path is added, use
private Broadcast channels named by conversation/user IDs and authorize each
channel from the membership table. Do not publish raw `messages` table changes
to browser clients; Broadcast avoids per-subscriber Postgres Changes overhead
and keeps the message projection intentionally small.

### Moderation

Reports create immutable evidence references and queue items. Moderator/admin
actions require role guards, reason codes, before/after metadata, and an audit
record. Blocking overrides follows, discovery, date ideas, swipes, gifts,
matches where policy requires, and profile interaction.

### Social media and ranking

Add attachment upload/derivative processing, text/media moderation queues,
comments, replies, reposts, polls, notification fan-out, and feed ranking only
after each has bounded payloads, private storage/RLS policies, reporting, and
abuse controls. Keep the current feed projection coarse-location-only and avoid
adding exact coordinates or direct browser table access.

### Telegram Stars and TON

Generate invoices only on the backend. Store invoice payload, provider payment
ID, raw request/webhook, verification/grant timestamps, failure reason, and the
product snapshot. Verify provider signatures and chain finality server-side.
Use unique constraints and transactional fulfillment so webhook retries cannot
double-grant gifts, premium, themes, or boosts. Wallet connection proves address
ownership; a client-supplied address alone is not sufficient.

## Deployment checklist

1. Configure all .env.example values in the hosting provider; never commit real
   values.
2. Set the exact production origin in APP_ORIGINS.
3. Keep Telegram bot and application secrets in managed secret storage.
4. Confirm the migration version before applying new migrations.
5. Regenerate src/types/database.generated.ts after schema changes.
6. Run tests, type-check, lint, production build, dependency audit, and
   git diff --check.
7. Run Supabase security/performance advisors and smoke queries.
8. Verify both Storage buckets and their public/private flags.
9. Configure backups, point-in-time recovery, log retention, alerting, and a
   staging environment.
10. Add `TELEGRAM_PAYMENT_WEBHOOK_SECRET`, the exact Telegram webhook URL, and
    `TON_PAYMENT_RECEIVER_ADDRESS`/`TONAPI_*` only when payment providers are
    ready to be enabled.
