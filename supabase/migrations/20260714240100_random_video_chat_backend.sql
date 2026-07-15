begin;

-- Random video requires a private pairing and signaling plane. Browser clients
-- never receive direct access to queues, participants, session events, or SDP/
--ICE payloads; all access remains behind session-verified Next.js routes.
do $$ begin
  create type public.video_queue_status as enum ('waiting', 'matched', 'cancelled', 'expired');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.video_participant_state as enum ('matched', 'ready', 'joined', 'left', 'disconnected', 'blocked');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.video_signal_type as enum ('offer', 'answer', 'ice_candidate', 'hangup');
exception when duplicate_object then null;
end $$;

alter table public.video_sessions
  add column if not exists connection_expires_at timestamptz,
  add column if not exists last_activity_at timestamptz not null default now(),
  add column if not exists ended_by_user_id uuid references public.app_users(id) on delete set null;

create table if not exists public.video_queue_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  status public.video_queue_status not null default 'waiting',
  mode public.video_mode not null,
  country_code text not null,
  city_name text not null,
  geohash_prefix text,
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  matched_session_id uuid references public.video_sessions(id) on delete set null,
  joined_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 seconds'),
  matched_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint video_queue_entries_expiry_check check (expires_at > joined_at),
  constraint video_queue_entries_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.video_session_participants (
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  position smallint not null check (position in (1, 2)),
  state public.video_participant_state not null default 'matched',
  matched_at timestamptz not null default now(),
  ready_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  primary key (video_session_id, user_id),
  unique (video_session_id, position)
);

create table if not exists public.video_session_signals (
  id uuid primary key default gen_random_uuid(),
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  sender_user_id uuid not null references public.app_users(id) on delete cascade,
  recipient_user_id uuid not null references public.app_users(id) on delete cascade,
  signal_type public.video_signal_type not null,
  payload jsonb not null,
  client_signal_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  constraint video_session_signals_distinct_participants check (sender_user_id <> recipient_user_id),
  constraint video_session_signals_payload_check check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 49152
  ),
  constraint video_session_signals_client_id_unique unique (video_session_id, sender_user_id, client_signal_id)
);

create table if not exists public.video_session_events (
  id uuid primary key default gen_random_uuid(),
  video_session_id uuid not null references public.video_sessions(id) on delete cascade,
  actor_user_id uuid references public.app_users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]{1,63}$'),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint video_session_events_payload_check check (jsonb_typeof(payload) = 'object')
);

create unique index if not exists video_queue_entries_one_waiting_user_idx
  on public.video_queue_entries (user_id)
  where status = 'waiting';
create index if not exists video_queue_entries_waiting_mode_expiry_idx
  on public.video_queue_entries (mode, expires_at, joined_at, id)
  where status = 'waiting';
create index if not exists video_queue_entries_user_status_idx
  on public.video_queue_entries (user_id, status, joined_at desc, id desc);
create index if not exists video_queue_entries_matched_session_idx
  on public.video_queue_entries (matched_session_id)
  where matched_session_id is not null;
create index if not exists video_sessions_ended_by_user_id_idx
  on public.video_sessions (ended_by_user_id)
  where ended_by_user_id is not null;
create index if not exists video_sessions_active_expiry_idx
  on public.video_sessions (connection_expires_at, id)
  where status = 'connecting';
create index if not exists video_session_participants_user_active_idx
  on public.video_session_participants (user_id, last_seen_at desc, video_session_id);
create index if not exists video_session_signals_recipient_created_idx
  on public.video_session_signals (video_session_id, recipient_user_id, created_at, id);
create index if not exists video_session_signals_sender_idx
  on public.video_session_signals (sender_user_id, created_at desc, id desc);
create index if not exists video_session_events_session_created_idx
  on public.video_session_events (video_session_id, created_at desc, id desc);
create index if not exists video_session_events_actor_created_idx
  on public.video_session_events (actor_user_id, created_at desc, id desc)
  where actor_user_id is not null;

alter table public.video_sessions enable row level security;
alter table public.video_queue_entries enable row level security;
alter table public.video_session_participants enable row level security;
alter table public.video_session_signals enable row level security;
alter table public.video_session_events enable row level security;

revoke all on table public.video_sessions from public, anon, authenticated;
revoke all on table public.video_queue_entries from public, anon, authenticated;
revoke all on table public.video_session_participants from public, anon, authenticated;
revoke all on table public.video_session_signals from public, anon, authenticated;
revoke all on table public.video_session_events from public, anon, authenticated;

drop policy if exists video_sessions_admin_all on public.video_sessions;

create or replace function private.assert_video_account(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_dating_account(p_user_id, false);

  if exists (
    select 1
    from public.user_restrictions restriction
    where restriction.user_id = p_user_id
      and restriction.status = 'active'
      and restriction.starts_at <= now()
      and (restriction.ends_at is null or restriction.ends_at > now())
      and restriction.restriction_type = 'no_video'
  ) then
    raise exception using errcode = 'P0001', message = 'account_restricted';
  end if;
end;
$$;

create or replace function private.video_mode_accepts(
  p_mode public.video_mode,
  p_left_country_code text,
  p_left_city_name text,
  p_left_geohash_prefix text,
  p_left_languages text[],
  p_left_interests text[],
  p_right_country_code text,
  p_right_city_name text,
  p_right_geohash_prefix text,
  p_right_languages text[],
  p_right_interests text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_mode
    when 'global'::public.video_mode then true
    when 'country'::public.video_mode then upper(p_left_country_code) = upper(p_right_country_code)
    when 'city'::public.video_mode then
      upper(p_left_country_code) = upper(p_right_country_code)
      and lower(p_left_city_name) = lower(p_right_city_name)
    when 'nearby'::public.video_mode then
      char_length(coalesce(p_left_geohash_prefix, '')) >= 3
      and left(p_left_geohash_prefix, 3) = left(p_right_geohash_prefix, 3)
    when 'same_language'::public.video_mode then
      coalesce(p_left_languages, '{}') && coalesce(p_right_languages, '{}')
    when 'same_interest'::public.video_mode then
      coalesce(p_left_interests, '{}') && coalesce(p_right_interests, '{}')
    else false
  end;
$$;

create or replace function private.expire_video_state(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.video_queue_entries queue_entry
  set status = 'expired'
  where queue_entry.user_id = p_user_id
    and queue_entry.status = 'waiting'
    and queue_entry.expires_at <= now();

  with expired_sessions as (
    update public.video_sessions session
    set status = 'failed',
        ended_at = coalesce(session.ended_at, now()),
        end_reason = coalesce(session.end_reason, 'connection_timeout'),
        last_activity_at = now()
    where session.status = 'connecting'
      and session.connection_expires_at is not null
      and session.connection_expires_at <= now()
      and exists (
        select 1
        from public.video_session_participants participant
        where participant.video_session_id = session.id
          and participant.user_id = p_user_id
      )
    returning session.id
  )
  update public.video_session_participants participant
  set state = 'disconnected',
      left_at = coalesce(participant.left_at, now())
  from expired_sessions
  where participant.video_session_id = expired_sessions.id
    and participant.state in ('matched', 'ready', 'joined');
end;
$$;

create or replace function private.get_video_session_other_user(
  p_actor_user_id uuid,
  p_video_session_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
begin
  perform private.assert_video_account(p_actor_user_id);
  perform private.expire_video_state(p_actor_user_id);

  select other_participant.user_id into v_other_user_id
  from public.video_sessions session
  join public.video_session_participants actor_participant
    on actor_participant.video_session_id = session.id
   and actor_participant.user_id = p_actor_user_id
  join public.video_session_participants other_participant
    on other_participant.video_session_id = session.id
   and other_participant.user_id <> p_actor_user_id
  where session.id = p_video_session_id
    and session.status in ('connecting', 'connected')
  for update of session;

  if v_other_user_id is null then
    raise exception using errcode = 'P0001', message = 'video_session_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = v_other_user_id)
       or (block_row.blocker_user_id = v_other_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) then
    update public.video_sessions session
    set status = 'ended',
        ended_at = coalesce(session.ended_at, now()),
        end_reason = 'blocked',
        last_activity_at = now()
    where session.id = p_video_session_id
      and session.status in ('connecting', 'connected');
    raise exception using errcode = 'P0001', message = 'video_session_unavailable';
  end if;

  if not exists (
    select 1
    from public.app_users account
    join public.profiles profile on profile.user_id = account.id
    where account.id = v_other_user_id
      and account.status = 'active'
      and profile.profile_completed_at is not null
      and not exists (
        select 1
        from public.bans ban_row
        where ban_row.user_id = account.id
          and ban_row.status = 'active'
          and ban_row.starts_at <= now()
          and (ban_row.ends_at is null or ban_row.ends_at > now())
      )
      and not exists (
        select 1
        from public.user_restrictions restriction
        where restriction.user_id = account.id
          and restriction.status = 'active'
          and restriction.starts_at <= now()
          and (restriction.ends_at is null or restriction.ends_at > now())
          and restriction.restriction_type in ('no_video', 'view_only', 'full_suspension')
      )
  ) then
    update public.video_sessions session
    set status = 'failed',
        ended_at = coalesce(session.ended_at, now()),
        end_reason = 'participant_unavailable',
        last_activity_at = now()
    where session.id = p_video_session_id
      and session.status in ('connecting', 'connected');
    raise exception using errcode = 'P0001', message = 'video_session_unavailable';
  end if;

  return v_other_user_id;
end;
$$;

create or replace function public.join_video_queue(
  p_actor_user_id uuid,
  p_mode public.video_mode
)
returns table (
  queue_entry_id uuid,
  queue_status public.video_queue_status,
  video_session_id uuid,
  video_session_status public.video_session_status,
  expires_at timestamptz,
  matched boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_existing public.video_queue_entries%rowtype;
  v_candidate public.video_queue_entries%rowtype;
  v_existing_session_id uuid;
  v_existing_session_status public.video_session_status;
  v_session_id uuid;
begin
  perform private.assert_video_account(p_actor_user_id);
  if p_mode is null then
    raise exception using errcode = '22023', message = 'invalid_video_queue_input';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('video-queue:' || p_actor_user_id::text, 0)
  );
  perform private.expire_video_state(p_actor_user_id);

  select profile.* into v_actor
  from public.profiles profile
  where profile.user_id = p_actor_user_id
    and profile.profile_completed_at is not null
    and profile.visibility = 'public'
    and profile.discoverable = true
    and exists (
      select 1
      from public.profile_photos photo
      where photo.user_id = profile.user_id
        and photo.is_primary = true
        and photo.is_private = false
        and photo.deleted_at is null
        and photo.upload_status = 'confirmed'
        and photo.public_url is not null
        and photo.moderation_status = 'approved'
        and photo.face_check_status in ('passed', 'manual_review')
    );
  if not found then
    raise exception using errcode = 'P0001', message = 'video_unavailable';
  end if;

  select queue_entry.* into v_existing
  from public.video_queue_entries queue_entry
  where queue_entry.user_id = p_actor_user_id
    and queue_entry.status = 'waiting'
    and queue_entry.expires_at > now()
  for update;
  if found then
    return query
    select v_existing.id, v_existing.status, null::uuid, null::public.video_session_status,
      v_existing.expires_at, false;
    return;
  end if;

  select participant.video_session_id, session.status
  into v_existing_session_id, v_existing_session_status
  from public.video_session_participants participant
  join public.video_sessions session on session.id = participant.video_session_id
  where participant.user_id = p_actor_user_id
    and session.status in ('connecting', 'connected')
  order by session.created_at desc
  limit 1;
  if v_existing_session_id is not null then
    return query
    select null::uuid, 'matched'::public.video_queue_status, v_existing_session_id,
      v_existing_session_status, null::timestamptz, true;
    return;
  end if;

  insert into public.video_queue_entries (
    user_id, mode, country_code, city_name, geohash_prefix, languages, interests
  ) values (
    p_actor_user_id, p_mode, upper(v_actor.country_code), v_actor.city_name,
    case when v_actor.public_geohash_prefix is null then null else left(v_actor.public_geohash_prefix, 3) end,
    coalesce(v_actor.languages, '{}'), coalesce(v_actor.interests, '{}')
  ) returning * into v_existing;

  select queue_entry.* into v_candidate
  from public.video_queue_entries queue_entry
  join public.app_users candidate_account on candidate_account.id = queue_entry.user_id
  join public.profiles candidate_profile on candidate_profile.user_id = queue_entry.user_id
  where queue_entry.status = 'waiting'
    and queue_entry.expires_at > now()
    and queue_entry.user_id <> p_actor_user_id
    and candidate_account.status = 'active'
    and candidate_profile.profile_completed_at is not null
    and candidate_profile.visibility = 'public'
    and candidate_profile.discoverable = true
    and exists (
      select 1
      from public.profile_photos photo
      where photo.user_id = candidate_profile.user_id
        and photo.is_primary = true
        and photo.is_private = false
        and photo.deleted_at is null
        and photo.upload_status = 'confirmed'
        and photo.public_url is not null
        and photo.moderation_status = 'approved'
        and photo.face_check_status in ('passed', 'manual_review')
    )
    and private.video_mode_accepts(
      p_mode,
      upper(v_actor.country_code), v_actor.city_name,
      case when v_actor.public_geohash_prefix is null then null else left(v_actor.public_geohash_prefix, 3) end,
      coalesce(v_actor.languages, '{}'), coalesce(v_actor.interests, '{}'),
      queue_entry.country_code, queue_entry.city_name, queue_entry.geohash_prefix,
      queue_entry.languages, queue_entry.interests
    )
    and private.video_mode_accepts(
      queue_entry.mode,
      queue_entry.country_code, queue_entry.city_name, queue_entry.geohash_prefix,
      queue_entry.languages, queue_entry.interests,
      upper(v_actor.country_code), v_actor.city_name,
      case when v_actor.public_geohash_prefix is null then null else left(v_actor.public_geohash_prefix, 3) end,
      coalesce(v_actor.languages, '{}'), coalesce(v_actor.interests, '{}')
    )
    and not exists (
      select 1
      from public.blocks block_row
      where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = queue_entry.user_id)
         or (block_row.blocker_user_id = queue_entry.user_id and block_row.blocked_user_id = p_actor_user_id)
    )
    and not exists (
      select 1
      from public.bans ban_row
      where ban_row.user_id = queue_entry.user_id
        and ban_row.status = 'active'
        and ban_row.starts_at <= now()
        and (ban_row.ends_at is null or ban_row.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions restriction
      where restriction.user_id = queue_entry.user_id
        and restriction.status = 'active'
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
        and restriction.restriction_type in ('no_video', 'view_only', 'full_suspension')
    )
    and not exists (
      select 1
      from public.video_session_participants active_participant
      join public.video_sessions active_session on active_session.id = active_participant.video_session_id
      where active_participant.user_id = queue_entry.user_id
        and active_session.status in ('connecting', 'connected')
    )
    and not exists (
      select 1
      from public.video_session_participants historical_actor
      join public.video_session_participants historical_candidate
        on historical_candidate.video_session_id = historical_actor.video_session_id
      join public.video_sessions historical_session
        on historical_session.id = historical_actor.video_session_id
      where historical_actor.user_id = p_actor_user_id
        and historical_candidate.user_id = queue_entry.user_id
        and historical_session.created_at > now() - interval '12 hours'
    )
  order by queue_entry.joined_at, queue_entry.id
  limit 1
  for update of queue_entry skip locked;

  if v_candidate.id is null then
    return query
    select v_existing.id, v_existing.status, null::uuid, null::public.video_session_status,
      v_existing.expires_at, false;
    return;
  end if;

  insert into public.video_sessions (
    mode, status, country_code, city_name, geohash_prefix, match_scope,
    algorithm_version, connection_expires_at, last_activity_at
  ) values (
    p_mode, 'connecting', upper(v_actor.country_code), v_actor.city_name,
    case when v_actor.public_geohash_prefix is null then null else left(v_actor.public_geohash_prefix, 3) end,
    p_mode::text || ':' || v_candidate.mode::text,
    'random-video-v1', now() + interval '3 minutes', now()
  ) returning id into v_session_id;

  update public.video_queue_entries queue_entry
  set status = 'matched',
      matched_session_id = v_session_id,
      matched_at = now()
  where queue_entry.id in (v_existing.id, v_candidate.id);

  insert into public.video_session_participants (video_session_id, user_id, position)
  values
    (v_session_id, p_actor_user_id, 1),
    (v_session_id, v_candidate.user_id, 2);

  insert into public.video_session_events (video_session_id, event_type, payload)
  values (v_session_id, 'matched', jsonb_build_object(
    'algorithm_version', 'random-video-v1',
    'mode', p_mode,
    'candidate_mode', v_candidate.mode
  ));

  return query
  select v_existing.id, 'matched'::public.video_queue_status, v_session_id,
    'connecting'::public.video_session_status, null::timestamptz, true;
end;
$$;

create or replace function public.get_video_queue_state(p_actor_user_id uuid)
returns table (
  queue_entry_id uuid,
  queue_status public.video_queue_status,
  video_session_id uuid,
  video_session_status public.video_session_status,
  expires_at timestamptz,
  matched_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.assert_video_account(p_actor_user_id);
  perform private.expire_video_state(p_actor_user_id);

  return query
  select null::uuid, 'matched'::public.video_queue_status, session.id, session.status,
    session.connection_expires_at, participant.matched_at
  from public.video_session_participants participant
  join public.video_sessions session on session.id = participant.video_session_id
  where participant.user_id = p_actor_user_id
    and session.status in ('connecting', 'connected')
  order by session.created_at desc
  limit 1;
  if found then
    return;
  end if;

  return query
  select queue_entry.id, queue_entry.status, null::uuid, null::public.video_session_status,
    queue_entry.expires_at, queue_entry.matched_at
  from public.video_queue_entries queue_entry
  where queue_entry.user_id = p_actor_user_id
    and queue_entry.status = 'waiting'
    and queue_entry.expires_at > now()
  order by queue_entry.joined_at desc
  limit 1;
end;
$$;

create or replace function public.cancel_video_queue(p_actor_user_id uuid)
returns table (queue_entry_id uuid, cancelled boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_queue_entry_id uuid;
begin
  perform private.assert_video_account(p_actor_user_id);
  perform private.expire_video_state(p_actor_user_id);

  update public.video_queue_entries queue_entry
  set status = 'cancelled',
      cancelled_at = now()
  where queue_entry.user_id = p_actor_user_id
    and queue_entry.status = 'waiting'
    and queue_entry.expires_at > now()
  returning queue_entry.id into v_queue_entry_id;

  return query select v_queue_entry_id, v_queue_entry_id is not null;
end;
$$;

create or replace function public.get_video_session_state(
  p_actor_user_id uuid,
  p_video_session_id uuid
)
returns table (
  video_session_id uuid,
  video_session_status public.video_session_status,
  mode public.video_mode,
  connection_expires_at timestamptz,
  connected_at timestamptz,
  self_state public.video_participant_state,
  other_state public.video_participant_state,
  is_initiator boolean,
  other_user_id uuid,
  other_display_name text,
  other_age_years integer,
  other_country_code text,
  other_city_name text,
  other_primary_photo_url text,
  other_primary_photo_blur_hash text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
begin
  v_other_user_id := private.get_video_session_other_user(p_actor_user_id, p_video_session_id);

  return query
  select
    session.id,
    session.status,
    session.mode,
    session.connection_expires_at,
    session.connected_at,
    self_participant.state,
    other_participant.state,
    self_participant.position = 1,
    v_other_user_id,
    profile.display_name,
    profile.age_years,
    profile.country_code,
    profile.city_name,
    photo.public_url,
    photo.blur_hash
  from public.video_sessions session
  join public.video_session_participants self_participant
    on self_participant.video_session_id = session.id
   and self_participant.user_id = p_actor_user_id
  join public.video_session_participants other_participant
    on other_participant.video_session_id = session.id
   and other_participant.user_id = v_other_user_id
  join public.profiles profile on profile.user_id = v_other_user_id
  left join lateral (
    select image.public_url, image.blur_hash
    from public.profile_photos image
    where image.user_id = v_other_user_id
      and image.is_primary = true
      and image.is_private = false
      and image.deleted_at is null
      and image.upload_status = 'confirmed'
      and image.public_url is not null
      and image.moderation_status = 'approved'
      and image.face_check_status in ('passed', 'manual_review')
    order by image.sort_order, image.created_at
    limit 1
  ) photo on true
  where session.id = p_video_session_id;
end;
$$;

create or replace function public.mark_video_session_ready(
  p_actor_user_id uuid,
  p_video_session_id uuid
)
returns table (
  video_session_id uuid,
  video_session_status public.video_session_status,
  self_state public.video_participant_state,
  other_state public.video_participant_state,
  is_initiator boolean,
  connection_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
begin
  v_other_user_id := private.get_video_session_other_user(p_actor_user_id, p_video_session_id);

  update public.video_session_participants participant
  set state = case when participant.state = 'matched' then 'ready'::public.video_participant_state else participant.state end,
      ready_at = coalesce(participant.ready_at, now()),
      last_seen_at = now()
  where participant.video_session_id = p_video_session_id
    and participant.user_id = p_actor_user_id;

  update public.video_sessions session
  set last_activity_at = now()
  where session.id = p_video_session_id;

  return query
  select session.id, session.status, self_participant.state, other_participant.state,
    self_participant.position = 1, session.connection_expires_at
  from public.video_sessions session
  join public.video_session_participants self_participant
    on self_participant.video_session_id = session.id and self_participant.user_id = p_actor_user_id
  join public.video_session_participants other_participant
    on other_participant.video_session_id = session.id and other_participant.user_id = v_other_user_id
  where session.id = p_video_session_id;
end;
$$;

create or replace function public.mark_video_session_connected(
  p_actor_user_id uuid,
  p_video_session_id uuid
)
returns table (
  video_session_id uuid,
  video_session_status public.video_session_status,
  connected_at timestamptz,
  self_state public.video_participant_state,
  other_state public.video_participant_state
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
  v_now timestamptz := now();
begin
  v_other_user_id := private.get_video_session_other_user(p_actor_user_id, p_video_session_id);

  update public.video_session_participants participant
  set state = 'joined',
      ready_at = coalesce(participant.ready_at, v_now),
      joined_at = coalesce(participant.joined_at, v_now),
      last_seen_at = v_now
  where participant.video_session_id = p_video_session_id
    and participant.user_id = p_actor_user_id;

  if exists (
    select 1
    from public.video_session_participants participant
    where participant.video_session_id = p_video_session_id
      and participant.user_id = v_other_user_id
      and participant.state = 'joined'
  ) then
    update public.video_sessions session
    set status = 'connected',
        connected_at = coalesce(session.connected_at, v_now),
        last_activity_at = v_now
    where session.id = p_video_session_id
      and session.status = 'connecting';
  else
    update public.video_sessions session
    set last_activity_at = v_now
    where session.id = p_video_session_id;
  end if;

  insert into public.video_session_events (video_session_id, actor_user_id, event_type)
  values (p_video_session_id, p_actor_user_id, 'participant_connected')
  on conflict do nothing;

  return query
  select session.id, session.status, session.connected_at, self_participant.state, other_participant.state
  from public.video_sessions session
  join public.video_session_participants self_participant
    on self_participant.video_session_id = session.id and self_participant.user_id = p_actor_user_id
  join public.video_session_participants other_participant
    on other_participant.video_session_id = session.id and other_participant.user_id = v_other_user_id
  where session.id = p_video_session_id;
end;
$$;

create or replace function public.heartbeat_video_session(
  p_actor_user_id uuid,
  p_video_session_id uuid
)
returns table (video_session_id uuid, video_session_status public.video_session_status, last_seen_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  perform private.get_video_session_other_user(p_actor_user_id, p_video_session_id);

  update public.video_session_participants participant
  set last_seen_at = v_now
  where participant.video_session_id = p_video_session_id
    and participant.user_id = p_actor_user_id;

  update public.video_sessions session
  set last_activity_at = v_now
  where session.id = p_video_session_id;

  return query
  select session.id, session.status, v_now
  from public.video_sessions session
  where session.id = p_video_session_id;
end;
$$;

create or replace function public.send_video_session_signal(
  p_actor_user_id uuid,
  p_video_session_id uuid,
  p_signal_type public.video_signal_type,
  p_payload jsonb,
  p_client_signal_id uuid
)
returns table (signal_id uuid, created_at timestamptz, already_created boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
  v_signal_id uuid;
  v_created_at timestamptz;
begin
  v_other_user_id := private.get_video_session_other_user(p_actor_user_id, p_video_session_id);
  if p_signal_type is null
    or p_client_signal_id is null
    or p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or octet_length(p_payload::text) > 49152
  then
    raise exception using errcode = '22023', message = 'invalid_video_signal_input';
  end if;

  insert into public.video_session_signals (
    video_session_id, sender_user_id, recipient_user_id, signal_type, payload, client_signal_id
  ) values (
    p_video_session_id, p_actor_user_id, v_other_user_id, p_signal_type, p_payload, p_client_signal_id
  ) on conflict (video_session_id, sender_user_id, client_signal_id) do nothing
  returning id, created_at into v_signal_id, v_created_at;

  if v_signal_id is null then
    select signal.id, signal.created_at into v_signal_id, v_created_at
    from public.video_session_signals signal
    where signal.video_session_id = p_video_session_id
      and signal.sender_user_id = p_actor_user_id
      and signal.client_signal_id = p_client_signal_id;
    return query select v_signal_id, v_created_at, true;
    return;
  end if;

  update public.video_sessions session
  set last_activity_at = now()
  where session.id = p_video_session_id;
  return query select v_signal_id, v_created_at, false;
end;
$$;

create or replace function public.get_video_session_signals(
  p_actor_user_id uuid,
  p_video_session_id uuid,
  p_limit integer default 51,
  p_cursor_created_at timestamptz default null,
  p_cursor_signal_id uuid default null
)
returns table (
  signal_id uuid,
  sender_user_id uuid,
  signal_type public.video_signal_type,
  payload jsonb,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 51), 101));
begin
  perform private.get_video_session_other_user(p_actor_user_id, p_video_session_id);
  if (p_cursor_created_at is null) <> (p_cursor_signal_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select signal.id, signal.sender_user_id, signal.signal_type, signal.payload, signal.created_at
  from public.video_session_signals signal
  where signal.video_session_id = p_video_session_id
    and signal.recipient_user_id = p_actor_user_id
    and signal.expires_at > now()
    and (
      p_cursor_created_at is null
      or (signal.created_at, signal.id) > (p_cursor_created_at, p_cursor_signal_id)
    )
  order by signal.created_at, signal.id
  limit v_limit;
end;
$$;

create or replace function public.end_video_session(
  p_actor_user_id uuid,
  p_video_session_id uuid,
  p_end_reason text
)
returns table (
  video_session_id uuid,
  video_session_status public.video_session_status,
  ended_at timestamptz,
  already_ended boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_session public.video_sessions%rowtype;
  v_now timestamptz := now();
begin
  if p_end_reason is null or p_end_reason not in ('completed', 'skipped', 'left', 'failed') then
    raise exception using errcode = '22023', message = 'invalid_video_end_input';
  end if;

  select session.* into v_session
  from public.video_sessions session
  join public.video_session_participants participant
    on participant.video_session_id = session.id
   and participant.user_id = p_actor_user_id
  where session.id = p_video_session_id
  for update of session;
  if not found then
    raise exception using errcode = 'P0001', message = 'video_session_unavailable';
  end if;

  if v_session.status in ('ended', 'failed') then
    return query select v_session.id, v_session.status, v_session.ended_at, true;
    return;
  end if;

  update public.video_sessions session
  set status = case when p_end_reason = 'failed' then 'failed'::public.video_session_status else 'ended'::public.video_session_status end,
      ended_at = v_now,
      end_reason = p_end_reason,
      ended_by_user_id = p_actor_user_id,
      last_activity_at = v_now
  where session.id = p_video_session_id
  returning * into v_session;

  update public.video_session_participants participant
  set state = case
        when participant.user_id = p_actor_user_id then 'left'::public.video_participant_state
        when participant.state in ('matched', 'ready', 'joined') then 'disconnected'::public.video_participant_state
        else participant.state
      end,
      left_at = coalesce(participant.left_at, v_now)
  where participant.video_session_id = p_video_session_id;

  insert into public.video_session_events (video_session_id, actor_user_id, event_type, payload)
  values (p_video_session_id, p_actor_user_id, 'ended', jsonb_build_object('reason', p_end_reason));

  return query select v_session.id, v_session.status, v_session.ended_at, false;
end;
$$;

-- A new block immediately terminates the matching video session. This protects
-- users even when a browser is still connected and has not made another API
-- request yet.
create or replace function private.end_video_sessions_after_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  with ended as (
    update public.video_sessions session
    set status = 'ended',
        ended_at = coalesce(session.ended_at, now()),
        end_reason = 'blocked',
        last_activity_at = now()
    where session.status in ('connecting', 'connected')
      and exists (
        select 1 from public.video_session_participants participant
        where participant.video_session_id = session.id and participant.user_id = new.blocker_user_id
      )
      and exists (
        select 1 from public.video_session_participants participant
        where participant.video_session_id = session.id and participant.user_id = new.blocked_user_id
      )
    returning session.id
  )
  insert into public.video_session_events (video_session_id, event_type, payload)
  select ended.id, 'blocked', jsonb_build_object('blocker_user_id', new.blocker_user_id)
  from ended;

  return new;
end;
$$;

drop trigger if exists blocks_end_video_sessions_after_insert on public.blocks;
create trigger blocks_end_video_sessions_after_insert
after insert on public.blocks
for each row execute function private.end_video_sessions_after_block();

-- Existing report creation now gains participant proof through this trigger.
-- It prevents a caller from naming an arbitrary account as the opponent of an
-- unrelated video session while retaining the existing moderation API shape.
create or replace function private.enforce_video_report_participants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.video_session_id is not null and (
    new.reporter_user_id is null
    or new.reported_user_id is null
    or new.reporter_user_id = new.reported_user_id
    or not exists (
      select 1
      from public.video_session_participants reporter
      join public.video_session_participants reported
        on reported.video_session_id = reporter.video_session_id
      where reporter.video_session_id = new.video_session_id
        and reporter.user_id = new.reporter_user_id
        and reported.user_id = new.reported_user_id
    )
  ) then
    raise exception using errcode = 'P0001', message = 'report_target_unavailable';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_enforce_video_participants on public.reports;
create trigger reports_enforce_video_participants
before insert or update of video_session_id, reporter_user_id, reported_user_id on public.reports
for each row execute function private.enforce_video_report_participants();

revoke all on function private.assert_video_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.video_mode_accepts(
  public.video_mode, text, text, text, text[], text[], text, text, text, text[], text[]
) from public, anon, authenticated, service_role;
revoke all on function private.expire_video_state(uuid) from public, anon, authenticated, service_role;
revoke all on function private.get_video_session_other_user(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.end_video_sessions_after_block() from public, anon, authenticated, service_role;
revoke all on function private.enforce_video_report_participants() from public, anon, authenticated, service_role;
revoke all on function public.join_video_queue(uuid, public.video_mode) from public, anon, authenticated;
revoke all on function public.get_video_queue_state(uuid) from public, anon, authenticated;
revoke all on function public.cancel_video_queue(uuid) from public, anon, authenticated;
revoke all on function public.get_video_session_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_video_session_ready(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_video_session_connected(uuid, uuid) from public, anon, authenticated;
revoke all on function public.heartbeat_video_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_video_session_signal(uuid, uuid, public.video_signal_type, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.get_video_session_signals(uuid, uuid, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.end_video_session(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.join_video_queue(uuid, public.video_mode) to service_role;
grant execute on function public.get_video_queue_state(uuid) to service_role;
grant execute on function public.cancel_video_queue(uuid) to service_role;
grant execute on function public.get_video_session_state(uuid, uuid) to service_role;
grant execute on function public.mark_video_session_ready(uuid, uuid) to service_role;
grant execute on function public.mark_video_session_connected(uuid, uuid) to service_role;
grant execute on function public.heartbeat_video_session(uuid, uuid) to service_role;
grant execute on function public.send_video_session_signal(uuid, uuid, public.video_signal_type, jsonb, uuid)
  to service_role;
grant execute on function public.get_video_session_signals(uuid, uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.end_video_session(uuid, uuid, text) to service_role;

comment on function public.join_video_queue(uuid, public.video_mode)
is 'Server-only, race-safe random video pairing with reciprocal scope matching and block/repeat safety.';
comment on function public.send_video_session_signal(uuid, uuid, public.video_signal_type, jsonb, uuid)
is 'Server-only WebRTC signaling relay between verified video-session participants.';

commit;
