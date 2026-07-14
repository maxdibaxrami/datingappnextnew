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
| Date ideas | Implemented locally, pending live approval | Marketplace browsing and request workflow |
| Gifts and auras | Planned | Verified-payment fulfillment |
| Premium and boosts | Planned | Entitlements, ledgers, and exposure events |
| Reports and moderation | Planned | Queue, evidence, restrictions, audit trail |
| Follows and social | Planned | Follow state and feed visibility |
| TON and Telegram Stars | Planned | Provider verification and idempotent grants |

Authentication, onboarding, discovery, swipes, undo, active-match reads, and
Daily Chemistry are exposed by the current API code and backed by live
migrations. Date Ideas has its service, routes, migration, guards, indexes, and
tests in the feature branch, but is not live until the migration is approved.
Other tables already present in the database are not automatically considered
safe to use.

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
  by RLS and should be consolidated during moderation work;
- leaked-password protection matters only if password login is introduced;
- future-module foreign keys and permissive SELECT policies should be tuned
  based on real query plans rather than indexed blindly.

Run Supabase security and performance advisors after every DDL change.

## Scaling approach

- Use the Supabase HTTPS Data API from serverless routes instead of opening a
  database connection per request.
- Select explicit columns and cap every list.
- Use cursor pagination for discovery, date ideas, feeds, reports, ledgers, and
  event history; avoid high-offset pagination.
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

The Date Ideas backend is implemented in the feature branch and is intentionally
not live until its migration is approved. `GET /api/date-ideas` gives completed
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

## Planned module contracts

### Date ideas

Add scheduled expiry and moderation workflows after the core marketplace is
approved and live.

### Gifts, auras, premium, and boosts

Treat payments and entitlements as ledgers, not client booleans. A verified,
idempotent provider event grants a product exactly once. Aura activation must
allow one active aura per user. Boost exposure and results are append-only
events with scheduled start/end and counters derived safely.

### Moderation

Reports create immutable evidence references and queue items. Moderator/admin
actions require role guards, reason codes, before/after metadata, and an audit
record. Blocking overrides follows, discovery, date ideas, swipes, gifts,
matches where policy requires, and profile interaction.

### Follows

Model requested/accepted/muted/rejected transitions explicitly. Followers-only
visibility must require an accepted relationship. Blocking invalidates access
regardless of follow state.

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
10. Add provider-specific payment and moderation secrets only when those
    modules are implemented.
