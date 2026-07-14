begin;

-- Discovery, swipe, and match writes remain behind the trusted Next.js
-- service-role boundary. These RPCs re-check account and target state inside
-- the same database transaction that records an action.

alter table public.profiles
  drop constraint if exists profiles_public_geohash_prefix_check;
alter table public.profiles
  add constraint profiles_public_geohash_prefix_check
  check (
    public_geohash_prefix is null
    or public_geohash_prefix ~ '^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$'
  );

alter table public.swipe_actions
  add column if not exists idempotency_key uuid,
  add column if not exists undone_at timestamptz,
  add column if not exists undoes_action_id uuid
    references public.swipe_actions(id) on delete restrict;

alter table public.swipe_actions
  drop constraint if exists swipe_actions_undo_shape_check;
alter table public.swipe_actions
  add constraint swipe_actions_undo_shape_check
  check (
    (
      action_type = 'undo'
      and undoes_action_id is not null
      and undone_at is null
    )
    or (
      action_type <> 'undo'
      and undoes_action_id is null
    )
  );

drop index if exists public.swipe_actions_unique_current_idx;
create unique index swipe_actions_one_current_action_per_pair
  on public.swipe_actions (actor_user_id, target_user_id)
  where action_type <> 'undo' and undone_at is null;
create unique index swipe_actions_actor_idempotency_key
  on public.swipe_actions (actor_user_id, idempotency_key)
  where idempotency_key is not null;
create unique index swipe_actions_one_undo_per_action
  on public.swipe_actions (undoes_action_id)
  where undoes_action_id is not null;
create index swipe_actions_actor_current_created_idx
  on public.swipe_actions (actor_user_id, created_at desc, id desc)
  where action_type <> 'undo' and undone_at is null;

create unique index if not exists super_like_ledger_source_event_key
  on public.super_like_ledger (user_id, event_type, source_type, source_id)
  where source_id is not null;

alter table public.super_like_balances
  drop constraint if exists super_like_balances_nonnegative_check;
alter table public.super_like_balances
  add constraint super_like_balances_nonnegative_check
  check (
    available_count >= 0
    and lifetime_granted >= 0
    and lifetime_spent >= 0
    and lifetime_refunded >= 0
  );

create index if not exists profiles_discovery_sort_idx
  on public.profiles (
    (coalesce(last_active_at, profile_completed_at)) desc,
    user_id
  )
  where profile_completed_at is not null
    and discoverable = true
    and visibility = 'public';
create index if not exists profiles_discovery_country_city_ci_idx
  on public.profiles (
    country_code,
    lower(city_name),
    (coalesce(last_active_at, profile_completed_at)) desc,
    user_id
  )
  where profile_completed_at is not null
    and discoverable = true
    and visibility = 'public';
create index if not exists profiles_discovery_geohash_pattern_idx
  on public.profiles (public_geohash_prefix text_pattern_ops)
  where public_geohash_prefix is not null
    and profile_completed_at is not null
    and discoverable = true
    and visibility = 'public';
create index if not exists bans_active_user_window_idx
  on public.bans (user_id, starts_at, ends_at)
  where status = 'active';
create index if not exists user_restrictions_active_user_type_window_idx
  on public.user_restrictions (
    user_id,
    restriction_type,
    starts_at,
    ends_at
  )
  where status = 'active';
drop index if exists public.matches_user_a_idx;
drop index if exists public.matches_user_b_idx;
create index matches_user_a_idx
  on public.matches (user_a_id, status, matched_at desc, id);
create index matches_user_b_idx
  on public.matches (user_b_id, status, matched_at desc, id);

create or replace function private.assert_dating_account(
  p_user_id uuid,
  p_require_swipe boolean default false
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.app_users au
    where au.id = p_user_id
      and au.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'account_unavailable';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = p_user_id
      and p.profile_completed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'profile_incomplete';
  end if;

  if exists (
    select 1
    from public.bans b
    where b.user_id = p_user_id
      and b.status = 'active'
      and b.starts_at <= now()
      and (b.ends_at is null or b.ends_at > now())
  ) then
    raise exception using errcode = 'P0001', message = 'account_unavailable';
  end if;

  if exists (
    select 1
    from public.user_restrictions ur
    where ur.user_id = p_user_id
      and ur.status = 'active'
      and ur.starts_at <= now()
      and (ur.ends_at is null or ur.ends_at > now())
      and (
        ur.restriction_type in ('view_only', 'full_suspension')
        or (p_require_swipe and ur.restriction_type = 'no_swipe')
      )
  ) then
    raise exception using errcode = 'P0001', message = 'account_restricted';
  end if;
end;
$$;

create or replace function public.get_discovery_cards(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_sort_at timestamptz default null,
  p_cursor_user_id uuid default null,
  p_min_age integer default null,
  p_max_age integer default null,
  p_genders public.gender_type[] default null,
  p_country_code text default null,
  p_city_name text default null,
  p_geohash_prefix text default null,
  p_relationship_goals text[] default null,
  p_languages text[] default null,
  p_interests text[] default null
)
returns table (
  user_id uuid,
  display_name text,
  age_years integer,
  gender public.gender_type,
  country_code text,
  city_name text,
  headline text,
  bio text,
  intents text[],
  languages text[],
  interests text[],
  badges text[],
  relationship_goals text[],
  mood text,
  online_state public.online_state,
  last_active_at timestamptz,
  public_geohash_prefix text,
  profile_completion_score numeric,
  popularity_score numeric,
  likes_received integer,
  gifts_received integer,
  primary_photo_url text,
  primary_photo_blur_hash text,
  primary_photo_width integer,
  primary_photo_height integer,
  sort_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 51));
begin
  perform private.assert_dating_account(p_actor_user_id, false);

  if (p_cursor_sort_at is null) <> (p_cursor_user_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;
  if p_min_age is not null and (p_min_age < 18 or p_min_age > 100) then
    raise exception using errcode = '22023', message = 'invalid_age_range';
  end if;
  if p_max_age is not null and (p_max_age < 18 or p_max_age > 100) then
    raise exception using errcode = '22023', message = 'invalid_age_range';
  end if;
  if p_min_age is not null and p_max_age is not null and p_min_age > p_max_age then
    raise exception using errcode = '22023', message = 'invalid_age_range';
  end if;
  if p_geohash_prefix is not null
    and p_geohash_prefix !~ '^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$'
  then
    raise exception using errcode = '22023', message = 'invalid_geohash_prefix';
  end if;

  return query
  select
    p.user_id,
    p.display_name,
    p.age_years,
    p.gender,
    p.country_code,
    p.city_name,
    p.headline,
    p.bio,
    p.intents,
    p.languages,
    p.interests,
    p.badges,
    p.relationship_goals,
    p.mood,
    p.online_state,
    p.last_active_at,
    p.public_geohash_prefix,
    ps.profile_completion_score,
    ps.popularity_score,
    ps.likes_received,
    ps.gifts_received,
    photo.public_url,
    photo.blur_hash,
    photo.width,
    photo.height,
    coalesce(p.last_active_at, p.profile_completed_at) as sort_at
  from public.profiles p
  join public.app_users au on au.id = p.user_id
  left join public.profile_stats ps on ps.user_id = p.user_id
  join lateral (
    select
      pp.public_url,
      pp.blur_hash,
      pp.width,
      pp.height
    from public.profile_photos pp
    where pp.user_id = p.user_id
      and pp.is_primary = true
      and pp.is_private = false
      and pp.deleted_at is null
      and pp.upload_status = 'confirmed'
      and pp.public_url is not null
      and pp.moderation_status = 'approved'
      and pp.face_check_status in ('passed', 'manual_review')
    order by pp.sort_order, pp.created_at
    limit 1
  ) photo on true
  where p.user_id <> p_actor_user_id
    and au.status = 'active'
    and p.profile_completed_at is not null
    and p.visibility = 'public'
    and p.discoverable = true
    and (p_min_age is null or p.age_years >= p_min_age)
    and (p_max_age is null or p.age_years <= p_max_age)
    and (
      p_genders is null
      or cardinality(p_genders) = 0
      or p.gender = any(p_genders)
    )
    and (
      p_country_code is null
      or p.country_code = upper(p_country_code)
    )
    and (
      p_city_name is null
      or lower(p.city_name) = lower(p_city_name)
    )
    and (
      p_geohash_prefix is null
      or p.public_geohash_prefix like p_geohash_prefix || '%'
    )
    and (
      p_relationship_goals is null
      or cardinality(p_relationship_goals) = 0
      or p.relationship_goals && p_relationship_goals
    )
    and (
      p_languages is null
      or cardinality(p_languages) = 0
      or p.languages && p_languages
    )
    and (
      p_interests is null
      or cardinality(p_interests) = 0
      or p.interests && p_interests
    )
    and not exists (
      select 1
      from public.blocks b
      where (
        b.blocker_user_id = p_actor_user_id
        and b.blocked_user_id = p.user_id
      ) or (
        b.blocker_user_id = p.user_id
        and b.blocked_user_id = p_actor_user_id
      )
    )
    and not exists (
      select 1
      from public.swipe_actions sa
      where sa.actor_user_id = p_actor_user_id
        and sa.target_user_id = p.user_id
        and sa.action_type <> 'undo'
        and sa.undone_at is null
    )
    and not exists (
      select 1
      from public.matches m
      where m.user_a_id = least(p_actor_user_id, p.user_id)
        and m.user_b_id = greatest(p_actor_user_id, p.user_id)
        and m.status = 'active'
    )
    and not exists (
      select 1
      from public.bans b
      where b.user_id = p.user_id
        and b.status = 'active'
        and b.starts_at <= now()
        and (b.ends_at is null or b.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions ur
      where ur.user_id = p.user_id
        and ur.status = 'active'
        and ur.starts_at <= now()
        and (ur.ends_at is null or ur.ends_at > now())
        and ur.restriction_type in ('shadow_ban', 'full_suspension')
    )
    and (
      p_cursor_sort_at is null
      or coalesce(p.last_active_at, p.profile_completed_at) < p_cursor_sort_at
      or (
        coalesce(p.last_active_at, p.profile_completed_at) = p_cursor_sort_at
        and p.user_id > p_cursor_user_id
      )
    )
  order by
    coalesce(p.last_active_at, p.profile_completed_at) desc,
    p.user_id
  limit v_limit;
end;
$$;

create or replace function public.record_swipe_action(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action_type public.swipe_action_type,
  p_source_surface public.discovery_surface,
  p_idempotency_key uuid
)
returns table (
  action_id uuid,
  action_type public.swipe_action_type,
  target_user_id uuid,
  source_surface public.discovery_surface,
  action_created_at timestamptz,
  match_id uuid,
  match_status public.match_status,
  matched_at timestamptz,
  match_created boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_action public.swipe_actions%rowtype;
  v_existing_action public.swipe_actions%rowtype;
  v_reciprocal_action public.swipe_action_type;
  v_match_id uuid;
  v_match_status public.match_status;
  v_matched_at timestamptz;
  v_match_created boolean := false;
  v_user_a uuid;
  v_user_b uuid;
  v_match_source public.match_source;
  v_balance_after integer;
begin
  if p_actor_user_id is null
    or p_target_user_id is null
    or p_action_type is null
    or p_source_surface is null
    or p_idempotency_key is null
  then
    raise exception using errcode = '22023', message = 'missing_swipe_input';
  end if;
  if p_actor_user_id = p_target_user_id then
    raise exception using errcode = '22023', message = 'cannot_swipe_self';
  end if;
  if p_action_type not in ('like', 'pass', 'super_like', 'secret_crush') then
    raise exception using errcode = '22023', message = 'invalid_swipe_action';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'swipe-idempotency:' || p_actor_user_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  select sa.*
  into v_action
  from public.swipe_actions sa
  where sa.actor_user_id = p_actor_user_id
    and sa.idempotency_key = p_idempotency_key;

  if found then
    if v_action.target_user_id <> p_target_user_id
      or v_action.action_type <> p_action_type
      or v_action.source_surface <> p_source_surface
    then
      raise exception using errcode = '22023', message = 'idempotency_conflict';
    end if;

    select m.id, m.status, m.matched_at
    into v_match_id, v_match_status, v_matched_at
    from public.matches m
    where m.user_a_id = least(p_actor_user_id, p_target_user_id)
      and m.user_b_id = greatest(p_actor_user_id, p_target_user_id)
      and m.status = 'active';

    return query
    select
      v_action.id,
      v_action.action_type,
      v_action.target_user_id,
      v_action.source_surface,
      v_action.created_at,
      v_match_id,
      v_match_status,
      v_matched_at,
      false;
    return;
  end if;

  v_user_a := least(p_actor_user_id, p_target_user_id);
  v_user_b := greatest(p_actor_user_id, p_target_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'match-pair:' || v_user_a::text || ':' || v_user_b::text,
      0
    )
  );

  select sa.*
  into v_existing_action
  from public.swipe_actions sa
  where sa.actor_user_id = p_actor_user_id
    and sa.target_user_id = p_target_user_id
    and sa.action_type <> 'undo'
    and sa.undone_at is null;

  if found then
    raise exception using errcode = 'P0001', message = 'already_swiped';
  end if;

  if exists (
    select 1
    from public.matches m
    where m.user_a_id = v_user_a
      and m.user_b_id = v_user_b
      and m.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'already_matched';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.app_users au on au.id = p.user_id
    where p.user_id = p_target_user_id
      and au.status = 'active'
      and p.profile_completed_at is not null
      and p.visibility = 'public'
      and p.discoverable = true
      and exists (
        select 1
        from public.profile_photos pp
        where pp.user_id = p.user_id
          and pp.is_primary = true
          and pp.is_private = false
          and pp.deleted_at is null
          and pp.upload_status = 'confirmed'
          and pp.public_url is not null
          and pp.moderation_status = 'approved'
          and pp.face_check_status in ('passed', 'manual_review')
      )
      and not exists (
        select 1
        from public.bans b
        where b.user_id = p.user_id
          and b.status = 'active'
          and b.starts_at <= now()
          and (b.ends_at is null or b.ends_at > now())
      )
      and not exists (
        select 1
        from public.user_restrictions ur
        where ur.user_id = p.user_id
          and ur.status = 'active'
          and ur.starts_at <= now()
          and (ur.ends_at is null or ur.ends_at > now())
          and ur.restriction_type in ('shadow_ban', 'full_suspension')
      )
      and not exists (
        select 1
        from public.blocks b
        where (
          b.blocker_user_id = p_actor_user_id
          and b.blocked_user_id = p.user_id
        ) or (
          b.blocker_user_id = p.user_id
          and b.blocked_user_id = p_actor_user_id
        )
      )
  ) then
    raise exception using errcode = 'P0001', message = 'target_unavailable';
  end if;

  insert into public.swipe_actions (
    actor_user_id,
    target_user_id,
    action_type,
    source_surface,
    idempotency_key
  )
  values (
    p_actor_user_id,
    p_target_user_id,
    p_action_type,
    p_source_surface,
    p_idempotency_key
  )
  returning * into v_action;

  if p_action_type = 'super_like' then
    insert into public.super_like_balances (user_id)
    values (p_actor_user_id)
    on conflict (user_id) do nothing;

    update public.super_like_balances
    set
      available_count = available_count - 1,
      lifetime_spent = lifetime_spent + 1,
      updated_at = now()
    where user_id = p_actor_user_id
      and available_count > 0
    returning available_count into v_balance_after;

    if not found then
      raise exception using errcode = 'P0001', message = 'insufficient_super_likes';
    end if;

    insert into public.super_like_ledger (
      user_id,
      event_type,
      delta,
      balance_after,
      source_type,
      source_id,
      metadata
    )
    values (
      p_actor_user_id,
      'spend',
      -1,
      v_balance_after,
      'swipe_action',
      v_action.id,
      jsonb_build_object('target_user_id', p_target_user_id)
    );
  end if;

  if p_action_type in ('like', 'super_like', 'secret_crush') then
    insert into public.profile_stats (user_id, likes_received)
    values (p_target_user_id, 1)
    on conflict (user_id) do update
    set
      likes_received = public.profile_stats.likes_received + 1,
      updated_at = now();

    select sa.action_type
    into v_reciprocal_action
    from public.swipe_actions sa
    where sa.actor_user_id = p_target_user_id
      and sa.target_user_id = p_actor_user_id
      and sa.action_type in ('like', 'super_like', 'secret_crush')
      and sa.undone_at is null
    order by sa.created_at desc
    limit 1;

    if found then
      v_match_source := case
        when p_action_type = 'secret_crush' or v_reciprocal_action = 'secret_crush'
          then 'secret_crush'::public.match_source
        when p_source_surface = 'explore'
          then 'explore'::public.match_source
        when p_source_surface = 'nearby'
          then 'nearby'::public.match_source
        when p_source_surface = 'date_ideas'
          then 'date_idea'::public.match_source
        else 'cards'::public.match_source
      end;

      select m.id, m.status, m.matched_at
      into v_match_id, v_match_status, v_matched_at
      from public.matches m
      where m.user_a_id = v_user_a
        and m.user_b_id = v_user_b
      for update;

      if not found then
        insert into public.matches (
          user_a_id,
          user_b_id,
          status,
          source
        )
        values (
          v_user_a,
          v_user_b,
          'active',
          v_match_source
        )
        returning id, status, matched_at
        into v_match_id, v_match_status, v_matched_at;
        v_match_created := true;
      elsif v_match_status in ('unmatched', 'expired') then
        update public.matches
        set
          status = 'active',
          source = v_match_source,
          matched_at = now(),
          unmatched_at = null,
          last_interaction_at = now()
        where id = v_match_id
        returning status, matched_at
        into v_match_status, v_matched_at;
        v_match_created := true;
      elsif v_match_status = 'blocked' then
        raise exception using errcode = 'P0001', message = 'target_unavailable';
      end if;

      if v_match_created then
        insert into public.profile_stats (user_id, matches_count)
        values (v_user_a, 1), (v_user_b, 1)
        on conflict (user_id) do update
        set
          matches_count = public.profile_stats.matches_count + 1,
          updated_at = now();
      end if;
    end if;
  end if;

  return query
  select
    v_action.id,
    v_action.action_type,
    v_action.target_user_id,
    v_action.source_surface,
    v_action.created_at,
    v_match_id,
    v_match_status,
    v_matched_at,
    v_match_created;
end;
$$;

create or replace function public.undo_latest_swipe(
  p_actor_user_id uuid,
  p_idempotency_key uuid,
  p_target_user_id uuid default null,
  p_window_seconds integer default 300
)
returns table (
  action_id uuid,
  action_type public.swipe_action_type,
  target_user_id uuid,
  source_surface public.discovery_surface,
  action_created_at timestamptz,
  undone_action_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_original public.swipe_actions%rowtype;
  v_undo public.swipe_actions%rowtype;
  v_existing_undo public.swipe_actions%rowtype;
  v_user_a uuid;
  v_user_b uuid;
  v_balance_after integer;
begin
  if p_actor_user_id is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'missing_undo_input';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 300 then
    raise exception using errcode = '22023', message = 'invalid_undo_window';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'swipe-idempotency:' || p_actor_user_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  select sa.*
  into v_existing_undo
  from public.swipe_actions sa
  where sa.actor_user_id = p_actor_user_id
    and sa.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_undo.action_type <> 'undo'
      or (
        p_target_user_id is not null
        and v_existing_undo.target_user_id <> p_target_user_id
      )
    then
      raise exception using errcode = '22023', message = 'idempotency_conflict';
    end if;

    return query
    select
      v_existing_undo.id,
      v_existing_undo.action_type,
      v_existing_undo.target_user_id,
      v_existing_undo.source_surface,
      v_existing_undo.created_at,
      v_existing_undo.undoes_action_id;
    return;
  end if;

  select sa.*
  into v_original
  from public.swipe_actions sa
  where sa.actor_user_id = p_actor_user_id
    and sa.action_type <> 'undo'
    and sa.undone_at is null
  order by sa.created_at desc, sa.id desc
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'no_swipe_to_undo';
  end if;
  if p_target_user_id is not null
    and v_original.target_user_id <> p_target_user_id
  then
    raise exception using errcode = 'P0001', message = 'no_swipe_to_undo';
  end if;

  if v_original.created_at < now() - make_interval(secs => p_window_seconds) then
    raise exception using errcode = 'P0001', message = 'undo_window_expired';
  end if;

  v_user_a := least(p_actor_user_id, v_original.target_user_id);
  v_user_b := greatest(p_actor_user_id, v_original.target_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'match-pair:' || v_user_a::text || ':' || v_user_b::text,
      0
    )
  );

  select sa.*
  into v_original
  from public.swipe_actions sa
  where sa.id = v_original.id
    and sa.undone_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'no_swipe_to_undo';
  end if;
  if v_original.created_at < now() - make_interval(secs => p_window_seconds) then
    raise exception using errcode = 'P0001', message = 'undo_window_expired';
  end if;

  if exists (
    select 1
    from public.matches m
    where m.user_a_id = v_user_a
      and m.user_b_id = v_user_b
      and m.status = 'active'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'matched_swipe_cannot_be_undone';
  end if;

  update public.swipe_actions
  set undone_at = now()
  where id = v_original.id;

  insert into public.swipe_actions (
    actor_user_id,
    target_user_id,
    action_type,
    source_surface,
    idempotency_key,
    undoes_action_id
  )
  values (
    p_actor_user_id,
    v_original.target_user_id,
    'undo',
    v_original.source_surface,
    p_idempotency_key,
    v_original.id
  )
  returning * into v_undo;

  if v_original.action_type in ('like', 'super_like', 'secret_crush') then
    update public.profile_stats
    set
      likes_received = greatest(likes_received - 1, 0),
      updated_at = now()
    where user_id = v_original.target_user_id;
  end if;

  if v_original.action_type = 'super_like' then
    update public.super_like_balances
    set
      available_count = available_count + 1,
      lifetime_refunded = lifetime_refunded + 1,
      updated_at = now()
    where user_id = p_actor_user_id
    returning available_count into v_balance_after;

    if not found then
      raise exception using errcode = 'P0001', message = 'super_like_balance_missing';
    end if;

    insert into public.super_like_ledger (
      user_id,
      event_type,
      delta,
      balance_after,
      source_type,
      source_id,
      metadata
    )
    values (
      p_actor_user_id,
      'refund',
      1,
      v_balance_after,
      'swipe_action',
      v_original.id,
      jsonb_build_object('undo_action_id', v_undo.id)
    );
  end if;

  return query
  select
    v_undo.id,
    v_undo.action_type,
    v_undo.target_user_id,
    v_undo.source_surface,
    v_undo.created_at,
    v_undo.undoes_action_id;
end;
$$;

create or replace function public.get_user_matches(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_matched_at timestamptz default null,
  p_cursor_match_id uuid default null
)
returns table (
  match_id uuid,
  match_status public.match_status,
  match_source public.match_source,
  matched_at timestamptz,
  last_interaction_at timestamptz,
  other_user_id uuid,
  display_name text,
  age_years integer,
  gender public.gender_type,
  country_code text,
  city_name text,
  headline text,
  bio text,
  languages text[],
  interests text[],
  relationship_goals text[],
  mood text,
  online_state public.online_state,
  last_active_at timestamptz,
  public_geohash_prefix text,
  primary_photo_url text,
  primary_photo_blur_hash text,
  primary_photo_width integer,
  primary_photo_height integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 51));
begin
  perform private.assert_dating_account(p_actor_user_id, false);

  if (p_cursor_matched_at is null) <> (p_cursor_match_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    m.id,
    m.status,
    m.source,
    m.matched_at,
    m.last_interaction_at,
    other_user.id,
    p.display_name,
    p.age_years,
    p.gender,
    p.country_code,
    p.city_name,
    p.headline,
    p.bio,
    p.languages,
    p.interests,
    p.relationship_goals,
    p.mood,
    p.online_state,
    p.last_active_at,
    p.public_geohash_prefix,
    photo.public_url,
    photo.blur_hash,
    photo.width,
    photo.height
  from public.matches m
  join lateral (
    select case
      when m.user_a_id = p_actor_user_id then m.user_b_id
      else m.user_a_id
    end as id
  ) other_user on true
  join public.app_users au on au.id = other_user.id
  join public.profiles p on p.user_id = other_user.id
  left join lateral (
    select
      pp.public_url,
      pp.blur_hash,
      pp.width,
      pp.height
    from public.profile_photos pp
    where pp.user_id = other_user.id
      and pp.is_primary = true
      and pp.is_private = false
      and pp.deleted_at is null
      and pp.upload_status = 'confirmed'
      and pp.public_url is not null
      and pp.moderation_status = 'approved'
      and pp.face_check_status in ('passed', 'manual_review')
    order by pp.sort_order, pp.created_at
    limit 1
  ) photo on true
  where (m.user_a_id = p_actor_user_id or m.user_b_id = p_actor_user_id)
    and m.status = 'active'
    and au.status = 'active'
    and p.profile_completed_at is not null
    and not exists (
      select 1
      from public.blocks b
      where (
        b.blocker_user_id = p_actor_user_id
        and b.blocked_user_id = other_user.id
      ) or (
        b.blocker_user_id = other_user.id
        and b.blocked_user_id = p_actor_user_id
      )
    )
    and not exists (
      select 1
      from public.bans b
      where b.user_id = other_user.id
        and b.status = 'active'
        and b.starts_at <= now()
        and (b.ends_at is null or b.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions ur
      where ur.user_id = other_user.id
        and ur.status = 'active'
        and ur.starts_at <= now()
        and (ur.ends_at is null or ur.ends_at > now())
        and ur.restriction_type in ('shadow_ban', 'full_suspension')
    )
    and (
      p_cursor_matched_at is null
      or m.matched_at < p_cursor_matched_at
      or (
        m.matched_at = p_cursor_matched_at
        and m.id > p_cursor_match_id
      )
    )
  order by m.matched_at desc, m.id
  limit v_limit;
end;
$$;

revoke all on function private.assert_dating_account(uuid, boolean)
from public, anon, authenticated, service_role;
revoke all on function public.get_discovery_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  integer,
  integer,
  public.gender_type[],
  text,
  text,
  text,
  text[],
  text[],
  text[]
) from public, anon, authenticated;
revoke all on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) from public, anon, authenticated;
revoke all on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) from public, anon, authenticated;
revoke all on function public.get_user_matches(
  uuid,
  integer,
  timestamptz,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_discovery_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  integer,
  integer,
  public.gender_type[],
  text,
  text,
  text,
  text[],
  text[],
  text[]
) to service_role;
grant execute on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) to service_role;
grant execute on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) to service_role;
grant execute on function public.get_user_matches(
  uuid,
  integer,
  timestamptz,
  uuid
) to service_role;

comment on function public.get_discovery_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  integer,
  integer,
  public.gender_type[],
  text,
  text,
  text,
  text[],
  text[],
  text[]
) is 'Returns safe, filtered, cursor-paginated discovery cards for a trusted backend actor.';
comment on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) is 'Atomically records an idempotent swipe, spends super-like balance, and creates a canonical reciprocal match.';
comment on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) is 'Undoes the most recent eligible swipe within a bounded window while preserving action history.';
comment on function public.get_user_matches(
  uuid,
  integer,
  timestamptz,
  uuid
) is 'Returns active, unblocked matches with safe opponent profile fields using cursor pagination.';

commit;
