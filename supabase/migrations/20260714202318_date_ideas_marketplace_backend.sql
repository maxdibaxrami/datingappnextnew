begin;

-- Date Ideas are served only through the trusted Next.js backend. Existing
-- RLS policies remain defense in depth, but browser roles receive no table
-- privileges and no write-capable RPCs.
revoke all on table public.date_ideas from anon, authenticated;
revoke all on table public.date_idea_requests from anon, authenticated;
revoke all on table public.date_idea_bookmarks from anon, authenticated;
revoke all on table public.date_idea_impressions from anon, authenticated;

grant select, insert, update, delete on table public.date_ideas to service_role;
grant select, insert, update, delete on table public.date_idea_requests to service_role;
grant select, insert, update, delete on table public.date_idea_bookmarks to service_role;
grant select, insert, update, delete on table public.date_idea_impressions to service_role;

alter table public.date_idea_requests
  add column if not exists idempotency_key uuid;

create unique index if not exists date_idea_requests_requester_idempotency_key
  on public.date_idea_requests (requester_user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists date_idea_bookmarks_user_created_idx
  on public.date_idea_bookmarks (user_id, created_at desc, date_idea_id);

create index if not exists date_ideas_open_city_created_idx
  on public.date_ideas (
    country_code,
    lower(city_name),
    created_at desc,
    id desc
  )
  where status = 'open';

create index if not exists date_ideas_open_country_created_idx
  on public.date_ideas (country_code, created_at desc, id desc)
  where status = 'open';

create index if not exists date_ideas_open_geohash_created_idx
  on public.date_ideas (
    geohash_prefix text_pattern_ops,
    created_at desc,
    id desc
  )
  where status = 'open'
    and geohash_prefix is not null;

create index if not exists date_ideas_open_relationship_goals_gin_idx
  on public.date_ideas using gin (relationship_goals)
  where status = 'open';

create index if not exists date_ideas_open_interest_tags_gin_idx
  on public.date_ideas using gin (interest_tags)
  where status = 'open';

create index if not exists date_ideas_open_language_codes_gin_idx
  on public.date_ideas using gin (language_codes)
  where status = 'open';

create or replace function public.create_date_idea(
  p_actor_user_id uuid,
  p_idea_type public.date_idea_type,
  p_title text,
  p_body text default null,
  p_scheduled_for timestamptz default null,
  p_expires_at timestamptz default null,
  p_visibility public.date_idea_visibility default 'city',
  p_min_age integer default null,
  p_max_age integer default null,
  p_looking_for_genders text[] default '{}',
  p_relationship_goals text[] default '{}',
  p_interest_tags text[] default '{}',
  p_language_codes text[] default '{}',
  p_max_requests integer default 20
)
returns table (
  date_idea_id uuid,
  date_idea_status public.date_idea_status,
  created_at timestamptz,
  scheduled_for timestamptz,
  expires_at timestamptz,
  max_requests integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_expires_at timestamptz;
  v_date_idea public.date_ideas%rowtype;
begin
  if p_actor_user_id is null
    or p_idea_type is null
    or p_title is null
    or p_visibility is null
  then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);

  select actor_profile.*
  into v_actor
  from public.profiles as actor_profile
  where actor_profile.user_id = p_actor_user_id;

  if char_length(btrim(p_title)) not between 3 and 120
    or (p_body is not null and char_length(btrim(p_body)) > 1000)
    or (p_min_age is not null and (p_min_age < 18 or p_min_age > 100))
    or (p_max_age is not null and (p_max_age < 18 or p_max_age > 100))
    or (
      p_min_age is not null
      and p_max_age is not null
      and p_min_age > p_max_age
    )
    or p_max_requests not between 1 and 20
  then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  if p_scheduled_for is not null and p_scheduled_for <= now() then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  v_expires_at := coalesce(
    p_expires_at,
    coalesce(p_scheduled_for + interval '12 hours', now() + interval '24 hours')
  );

  if v_expires_at <= now()
    or v_expires_at > now() + interval '30 days'
    or (p_scheduled_for is not null and p_scheduled_for > v_expires_at)
  then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  insert into public.date_ideas (
    author_user_id,
    idea_type,
    status,
    visibility,
    title,
    body,
    scheduled_for,
    expires_at,
    city_name,
    country_code,
    geohash_prefix,
    is_exact_location_hidden,
    min_age,
    max_age,
    looking_for_genders,
    relationship_goals,
    interest_tags,
    language_codes,
    max_requests,
    premium_only,
    verified_only,
    metadata
  )
  values (
    p_actor_user_id,
    p_idea_type,
    'open',
    p_visibility,
    btrim(p_title),
    nullif(btrim(p_body), ''),
    p_scheduled_for,
    v_expires_at,
    v_actor.city_name,
    v_actor.country_code,
    v_actor.public_geohash_prefix,
    true,
    p_min_age,
    p_max_age,
    coalesce(p_looking_for_genders, '{}'),
    coalesce(p_relationship_goals, '{}'),
    coalesce(p_interest_tags, '{}'),
    coalesce(p_language_codes, '{}'),
    p_max_requests,
    false,
    false,
    jsonb_build_object(
      'created_through', 'backend',
      'location_source', 'author_profile'
    )
  )
  returning * into v_date_idea;

  return query
  select
    v_date_idea.id,
    v_date_idea.status,
    v_date_idea.created_at,
    v_date_idea.scheduled_for,
    v_date_idea.expires_at,
    v_date_idea.max_requests;
end;
$$;

create or replace function public.get_date_idea_cards(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_date_idea_id uuid default null,
  p_country_code text default null,
  p_city_name text default null,
  p_geohash_prefix text default null,
  p_idea_types public.date_idea_type[] default null
)
returns table (
  date_idea_id uuid,
  idea_type public.date_idea_type,
  visibility public.date_idea_visibility,
  title text,
  body text,
  scheduled_for timestamptz,
  expires_at timestamptz,
  city_name text,
  country_code text,
  geohash_prefix text,
  venue_name text,
  venue_hint text,
  min_age integer,
  max_age integer,
  looking_for_genders text[],
  relationship_goals text[],
  interest_tags text[],
  language_codes text[],
  max_requests integer,
  accepted_count integer,
  request_count integer,
  author_user_id uuid,
  author_display_name text,
  author_age_years integer,
  author_gender public.gender_type,
  author_headline text,
  author_bio text,
  author_languages text[],
  author_interests text[],
  author_relationship_goals text[],
  author_online_state public.online_state,
  author_last_active_at timestamptz,
  author_photo_url text,
  author_photo_blur_hash text,
  author_photo_width integer,
  author_photo_height integer,
  bookmarked boolean,
  my_request_status public.date_idea_request_status,
  sort_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 51));
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'missing_date_idea_actor';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_date_idea_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;
  if p_geohash_prefix is not null
    and p_geohash_prefix !~ '^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$'
  then
    raise exception using errcode = '22023', message = 'invalid_geohash_prefix';
  end if;

  perform private.assert_dating_account(p_actor_user_id, false);

  select actor_profile.*
  into v_actor
  from public.profiles as actor_profile
  where actor_profile.user_id = p_actor_user_id;

  return query
  select
    idea.id,
    idea.idea_type,
    idea.visibility,
    idea.title,
    idea.body,
    idea.scheduled_for,
    idea.expires_at,
    idea.city_name,
    idea.country_code,
    idea.geohash_prefix,
    idea.venue_name,
    idea.venue_hint,
    idea.min_age,
    idea.max_age,
    idea.looking_for_genders,
    idea.relationship_goals,
    idea.interest_tags,
    idea.language_codes,
    idea.max_requests,
    idea.accepted_count,
    idea.request_count,
    author_profile.user_id,
    author_profile.display_name,
    author_profile.age_years,
    author_profile.gender,
    author_profile.headline,
    author_profile.bio,
    author_profile.languages,
    author_profile.interests,
    author_profile.relationship_goals,
    author_profile.online_state,
    author_profile.last_active_at,
    safe_photo.public_url,
    safe_photo.blur_hash,
    safe_photo.width,
    safe_photo.height,
    exists (
      select 1
      from public.date_idea_bookmarks as bookmark
      where bookmark.date_idea_id = idea.id
        and bookmark.user_id = p_actor_user_id
    ),
    own_request.status,
    idea.created_at
  from public.date_ideas as idea
  join public.app_users as author_account
    on author_account.id = idea.author_user_id
    and author_account.status = 'active'
  join public.profiles as author_profile
    on author_profile.user_id = idea.author_user_id
    and author_profile.profile_completed_at is not null
    and author_profile.visibility = 'public'
    and author_profile.discoverable = true
  join lateral (
    select
      photo.public_url,
      photo.blur_hash,
      photo.width,
      photo.height
    from public.profile_photos as photo
    where photo.user_id = author_profile.user_id
      and photo.is_primary = true
      and photo.is_private = false
      and photo.deleted_at is null
      and photo.upload_status = 'confirmed'
      and photo.public_url is not null
      and photo.moderation_status = 'approved'
      and photo.face_check_status in ('passed', 'manual_review')
    order by photo.sort_order, photo.created_at
    limit 1
  ) as safe_photo on true
  left join public.date_idea_requests as own_request
    on own_request.date_idea_id = idea.id
    and own_request.requester_user_id = p_actor_user_id
  where idea.author_user_id <> p_actor_user_id
    and idea.status = 'open'
    and idea.expires_at > now()
    and (
      p_cursor_created_at is null
      or (idea.created_at, idea.id) < (p_cursor_created_at, p_cursor_date_idea_id)
    )
    and (p_country_code is null or idea.country_code = upper(p_country_code))
    and (
      p_city_name is null
      or lower(idea.city_name) = lower(p_city_name)
    )
    and (
      p_geohash_prefix is null
      or idea.geohash_prefix like p_geohash_prefix || '%'
    )
    and (
      p_idea_types is null
      or cardinality(p_idea_types) = 0
      or idea.idea_type = any(p_idea_types)
    )
    and (
      cardinality(idea.looking_for_genders) = 0
      or v_actor.gender::text = any(idea.looking_for_genders)
    )
    and (idea.min_age is null or v_actor.age_years >= idea.min_age)
    and (idea.max_age is null or v_actor.age_years <= idea.max_age)
    and (
      cardinality(idea.relationship_goals) = 0
      or idea.relationship_goals && v_actor.relationship_goals
    )
    and (
      cardinality(idea.interest_tags) = 0
      or idea.interest_tags && v_actor.interests
    )
    and (
      cardinality(idea.language_codes) = 0
      or idea.language_codes && v_actor.languages
    )
    and (
      idea.visibility = 'global'
      or (
        idea.visibility = 'country'
        and idea.country_code = v_actor.country_code
      )
      or (
        idea.visibility = 'city'
        and idea.country_code = v_actor.country_code
        and lower(idea.city_name) = lower(v_actor.city_name)
      )
      or (
        idea.visibility = 'nearby'
        and idea.country_code = v_actor.country_code
        and idea.geohash_prefix is not null
        and v_actor.public_geohash_prefix is not null
        and left(idea.geohash_prefix, 3)
          = left(v_actor.public_geohash_prefix, 3)
      )
      or (
        idea.visibility = 'followers'
        and exists (
          select 1
          from public.follows as follow
          where follow.follower_user_id = p_actor_user_id
            and follow.following_user_id = idea.author_user_id
            and follow.status = 'accepted'
        )
      )
      or (
        idea.visibility = 'matches_only'
        and exists (
          select 1
          from public.matches as match
          where match.user_a_id = least(p_actor_user_id, idea.author_user_id)
            and match.user_b_id = greatest(p_actor_user_id, idea.author_user_id)
            and match.status = 'active'
        )
      )
    )
    and not exists (
      select 1
      from public.blocks as blocked_pair
      where (
        blocked_pair.blocker_user_id = p_actor_user_id
        and blocked_pair.blocked_user_id = idea.author_user_id
      ) or (
        blocked_pair.blocker_user_id = idea.author_user_id
        and blocked_pair.blocked_user_id = p_actor_user_id
      )
    )
    and not exists (
      select 1
      from public.bans as author_ban
      where author_ban.user_id = idea.author_user_id
        and author_ban.status = 'active'
        and author_ban.starts_at <= now()
        and (author_ban.ends_at is null or author_ban.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions as author_restriction
      where author_restriction.user_id = idea.author_user_id
        and author_restriction.status = 'active'
        and author_restriction.starts_at <= now()
        and (
          author_restriction.ends_at is null
          or author_restriction.ends_at > now()
        )
        and author_restriction.restriction_type in (
          'shadow_ban',
          'full_suspension'
        )
    )
  order by idea.created_at desc, idea.id desc
  limit v_limit;
end;
$$;

create or replace function public.set_date_idea_bookmark(
  p_actor_user_id uuid,
  p_date_idea_id uuid,
  p_bookmarked boolean
)
returns table (
  date_idea_id uuid,
  bookmarked boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_idea public.date_ideas%rowtype;
begin
  if p_actor_user_id is null or p_date_idea_id is null or p_bookmarked is null then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  perform private.assert_dating_account(p_actor_user_id, false);

  select actor_profile.*
  into v_actor
  from public.profiles as actor_profile
  where actor_profile.user_id = p_actor_user_id;

  select idea.*
  into v_idea
  from public.date_ideas as idea
  where idea.id = p_date_idea_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'date_idea_unavailable';
  end if;
  if v_idea.author_user_id = p_actor_user_id
    or v_idea.status <> 'open'
    or v_idea.expires_at <= now()
  then
    raise exception using errcode = 'P0001', message = 'date_idea_unavailable';
  end if;

  if not exists (
    select 1
    from public.app_users as author_account
    join public.profiles as author_profile
      on author_profile.user_id = author_account.id
    where author_account.id = v_idea.author_user_id
      and author_account.status = 'active'
      and author_profile.profile_completed_at is not null
      and author_profile.visibility = 'public'
      and author_profile.discoverable = true
      and (
        cardinality(v_idea.looking_for_genders) = 0
        or v_actor.gender::text = any(v_idea.looking_for_genders)
      )
      and (v_idea.min_age is null or v_actor.age_years >= v_idea.min_age)
      and (v_idea.max_age is null or v_actor.age_years <= v_idea.max_age)
      and (
        cardinality(v_idea.relationship_goals) = 0
        or v_idea.relationship_goals && v_actor.relationship_goals
      )
      and (
        cardinality(v_idea.interest_tags) = 0
        or v_idea.interest_tags && v_actor.interests
      )
      and (
        cardinality(v_idea.language_codes) = 0
        or v_idea.language_codes && v_actor.languages
      )
      and (
        v_idea.visibility = 'global'
        or (
          v_idea.visibility = 'country'
          and v_idea.country_code = v_actor.country_code
        )
        or (
          v_idea.visibility = 'city'
          and v_idea.country_code = v_actor.country_code
          and lower(v_idea.city_name) = lower(v_actor.city_name)
        )
        or (
          v_idea.visibility = 'nearby'
          and v_idea.country_code = v_actor.country_code
          and v_idea.geohash_prefix is not null
          and v_actor.public_geohash_prefix is not null
          and left(v_idea.geohash_prefix, 3)
            = left(v_actor.public_geohash_prefix, 3)
        )
        or (
          v_idea.visibility = 'followers'
          and exists (
            select 1
            from public.follows as follow
            where follow.follower_user_id = p_actor_user_id
              and follow.following_user_id = v_idea.author_user_id
              and follow.status = 'accepted'
          )
        )
        or (
          v_idea.visibility = 'matches_only'
          and exists (
            select 1
            from public.matches as match
            where match.user_a_id = least(p_actor_user_id, v_idea.author_user_id)
              and match.user_b_id = greatest(p_actor_user_id, v_idea.author_user_id)
              and match.status = 'active'
          )
        )
      )
      and exists (
        select 1
        from public.profile_photos as safe_photo
        where safe_photo.user_id = author_profile.user_id
          and safe_photo.is_primary = true
          and safe_photo.is_private = false
          and safe_photo.deleted_at is null
          and safe_photo.upload_status = 'confirmed'
          and safe_photo.public_url is not null
          and safe_photo.moderation_status = 'approved'
          and safe_photo.face_check_status in ('passed', 'manual_review')
      )
      and not exists (
        select 1
        from public.blocks as blocked_pair
        where (
          blocked_pair.blocker_user_id = p_actor_user_id
          and blocked_pair.blocked_user_id = v_idea.author_user_id
        ) or (
          blocked_pair.blocker_user_id = v_idea.author_user_id
          and blocked_pair.blocked_user_id = p_actor_user_id
        )
      )
  ) then
    raise exception using errcode = 'P0001', message = 'date_idea_unavailable';
  end if;

  if p_bookmarked then
    insert into public.date_idea_bookmarks (date_idea_id, user_id)
    values (p_date_idea_id, p_actor_user_id)
    on conflict (date_idea_id, user_id) do nothing;
  else
    delete from public.date_idea_bookmarks
    where date_idea_id = p_date_idea_id
      and user_id = p_actor_user_id;
  end if;

  return query select p_date_idea_id, p_bookmarked;
end;
$$;

create or replace function public.create_date_idea_request(
  p_actor_user_id uuid,
  p_date_idea_id uuid,
  p_message text,
  p_idempotency_key uuid
)
returns table (
  date_idea_request_id uuid,
  request_status public.date_idea_request_status,
  requested_at timestamptz,
  date_idea_status public.date_idea_status
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_idea public.date_ideas%rowtype;
  v_existing public.date_idea_requests%rowtype;
  v_request public.date_idea_requests%rowtype;
begin
  if p_actor_user_id is null
    or p_date_idea_id is null
    or p_idempotency_key is null
    or (p_message is not null and char_length(btrim(p_message)) > 500)
  then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);

  select actor_profile.*
  into v_actor
  from public.profiles as actor_profile
  where actor_profile.user_id = p_actor_user_id;

  select existing_request.*
  into v_existing
  from public.date_idea_requests as existing_request
  where existing_request.requester_user_id = p_actor_user_id
    and existing_request.idempotency_key = p_idempotency_key;

  if found then
    if v_existing.date_idea_id <> p_date_idea_id
      or v_existing.message is distinct from nullif(btrim(p_message), '')
    then
      raise exception using errcode = '22023', message = 'idempotency_conflict';
    end if;

    select idea.status
    into v_idea.status
    from public.date_ideas as idea
    where idea.id = p_date_idea_id;

    return query
    select
      v_existing.id,
      v_existing.status,
      v_existing.requested_at,
      v_idea.status;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('date-idea:' || p_date_idea_id::text, 0)
  );

  update public.date_ideas as expired_idea
  set status = 'expired', updated_at = now()
  where expired_idea.id = p_date_idea_id
    and expired_idea.status in ('open', 'full')
    and expired_idea.expires_at <= now();

  select idea.*
  into v_idea
  from public.date_ideas as idea
  where idea.id = p_date_idea_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'date_idea_unavailable';
  end if;
  if v_idea.author_user_id = p_actor_user_id then
    raise exception using errcode = '22023', message = 'cannot_request_own_date_idea';
  end if;
  if v_idea.status = 'expired' or v_idea.expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'date_idea_expired';
  end if;
  if v_idea.status <> 'open' or v_idea.request_count >= v_idea.max_requests then
    raise exception using errcode = 'P0001', message = 'date_idea_full';
  end if;

  if exists (
    select 1
    from public.date_idea_requests as existing_idea_request
    where existing_idea_request.date_idea_id = p_date_idea_id
      and existing_idea_request.requester_user_id = p_actor_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'already_requested_date_idea';
  end if;

  if not exists (
    select 1
    from public.app_users as author_account
    join public.profiles as author_profile
      on author_profile.user_id = author_account.id
    where author_account.id = v_idea.author_user_id
      and author_account.status = 'active'
      and author_profile.profile_completed_at is not null
      and author_profile.visibility = 'public'
      and author_profile.discoverable = true
      and (
        cardinality(v_idea.looking_for_genders) = 0
        or v_actor.gender::text = any(v_idea.looking_for_genders)
      )
      and (v_idea.min_age is null or v_actor.age_years >= v_idea.min_age)
      and (v_idea.max_age is null or v_actor.age_years <= v_idea.max_age)
      and (
        cardinality(v_idea.relationship_goals) = 0
        or v_idea.relationship_goals && v_actor.relationship_goals
      )
      and (
        cardinality(v_idea.interest_tags) = 0
        or v_idea.interest_tags && v_actor.interests
      )
      and (
        cardinality(v_idea.language_codes) = 0
        or v_idea.language_codes && v_actor.languages
      )
      and (
        v_idea.visibility = 'global'
        or (
          v_idea.visibility = 'country'
          and v_idea.country_code = v_actor.country_code
        )
        or (
          v_idea.visibility = 'city'
          and v_idea.country_code = v_actor.country_code
          and lower(v_idea.city_name) = lower(v_actor.city_name)
        )
        or (
          v_idea.visibility = 'nearby'
          and v_idea.country_code = v_actor.country_code
          and v_idea.geohash_prefix is not null
          and v_actor.public_geohash_prefix is not null
          and left(v_idea.geohash_prefix, 3)
            = left(v_actor.public_geohash_prefix, 3)
        )
        or (
          v_idea.visibility = 'followers'
          and exists (
            select 1
            from public.follows as follow
            where follow.follower_user_id = p_actor_user_id
              and follow.following_user_id = v_idea.author_user_id
              and follow.status = 'accepted'
          )
        )
        or (
          v_idea.visibility = 'matches_only'
          and exists (
            select 1
            from public.matches as match
            where match.user_a_id = least(p_actor_user_id, v_idea.author_user_id)
              and match.user_b_id = greatest(p_actor_user_id, v_idea.author_user_id)
              and match.status = 'active'
          )
        )
      )
      and exists (
        select 1
        from public.profile_photos as safe_photo
        where safe_photo.user_id = author_profile.user_id
          and safe_photo.is_primary = true
          and safe_photo.is_private = false
          and safe_photo.deleted_at is null
          and safe_photo.upload_status = 'confirmed'
          and safe_photo.public_url is not null
          and safe_photo.moderation_status = 'approved'
          and safe_photo.face_check_status in ('passed', 'manual_review')
      )
      and not exists (
        select 1
        from public.blocks as blocked_pair
        where (
          blocked_pair.blocker_user_id = p_actor_user_id
          and blocked_pair.blocked_user_id = v_idea.author_user_id
        ) or (
          blocked_pair.blocker_user_id = v_idea.author_user_id
          and blocked_pair.blocked_user_id = p_actor_user_id
        )
      )
      and not exists (
        select 1
        from public.bans as author_ban
        where author_ban.user_id = v_idea.author_user_id
          and author_ban.status = 'active'
          and author_ban.starts_at <= now()
          and (author_ban.ends_at is null or author_ban.ends_at > now())
      )
      and not exists (
        select 1
        from public.user_restrictions as author_restriction
        where author_restriction.user_id = v_idea.author_user_id
          and author_restriction.status = 'active'
          and author_restriction.starts_at <= now()
          and (
            author_restriction.ends_at is null
            or author_restriction.ends_at > now()
          )
          and author_restriction.restriction_type in (
            'shadow_ban',
            'full_suspension'
          )
      )
  ) then
    raise exception using errcode = 'P0001', message = 'date_idea_unavailable';
  end if;

  insert into public.date_idea_requests (
    date_idea_id,
    requester_user_id,
    author_user_id,
    status,
    message,
    idempotency_key,
    metadata
  )
  values (
    p_date_idea_id,
    p_actor_user_id,
    v_idea.author_user_id,
    'requested',
    nullif(btrim(p_message), ''),
    p_idempotency_key,
    jsonb_build_object('created_through', 'backend')
  )
  returning * into v_request;

  update public.date_ideas as requested_idea
  set
    request_count = requested_idea.request_count + 1,
    status = case
      when requested_idea.request_count + 1 >= requested_idea.max_requests
        then 'full'::public.date_idea_status
      else requested_idea.status
    end,
    updated_at = now()
  where requested_idea.id = p_date_idea_id
  returning * into v_idea;

  return query
  select
    v_request.id,
    v_request.status,
    v_request.requested_at,
    v_idea.status;
end;
$$;

create or replace function public.get_date_idea_requests(
  p_actor_user_id uuid,
  p_date_idea_id uuid,
  p_limit integer default 21,
  p_cursor_requested_at timestamptz default null,
  p_cursor_request_id uuid default null,
  p_statuses public.date_idea_request_status[] default null
)
returns table (
  date_idea_request_id uuid,
  request_status public.date_idea_request_status,
  message text,
  response_note text,
  requested_at timestamptz,
  decided_at timestamptz,
  requester_user_id uuid,
  requester_display_name text,
  requester_age_years integer,
  requester_gender public.gender_type,
  requester_headline text,
  requester_bio text,
  requester_languages text[],
  requester_interests text[],
  requester_relationship_goals text[],
  requester_photo_url text,
  requester_photo_blur_hash text,
  requester_photo_width integer,
  requester_photo_height integer,
  sort_requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 51));
begin
  if p_actor_user_id is null or p_date_idea_id is null then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;
  if (p_cursor_requested_at is null) <> (p_cursor_request_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);

  if not exists (
    select 1
    from public.date_ideas as idea
    where idea.id = p_date_idea_id
      and idea.author_user_id = p_actor_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'date_idea_not_author';
  end if;

  return query
  select
    request.id,
    request.status,
    request.message,
    request.response_note,
    request.requested_at,
    request.decided_at,
    requester_profile.user_id,
    requester_profile.display_name,
    requester_profile.age_years,
    requester_profile.gender,
    requester_profile.headline,
    requester_profile.bio,
    requester_profile.languages,
    requester_profile.interests,
    requester_profile.relationship_goals,
    safe_photo.public_url,
    safe_photo.blur_hash,
    safe_photo.width,
    safe_photo.height,
    request.requested_at
  from public.date_idea_requests as request
  join public.app_users as requester_account
    on requester_account.id = request.requester_user_id
    and requester_account.status = 'active'
  join public.profiles as requester_profile
    on requester_profile.user_id = request.requester_user_id
    and requester_profile.profile_completed_at is not null
  left join lateral (
    select
      photo.public_url,
      photo.blur_hash,
      photo.width,
      photo.height
    from public.profile_photos as photo
    where photo.user_id = requester_profile.user_id
      and photo.is_primary = true
      and photo.is_private = false
      and photo.deleted_at is null
      and photo.upload_status = 'confirmed'
      and photo.public_url is not null
      and photo.moderation_status = 'approved'
      and photo.face_check_status in ('passed', 'manual_review')
    order by photo.sort_order, photo.created_at
    limit 1
  ) as safe_photo on true
  where request.date_idea_id = p_date_idea_id
    and request.author_user_id = p_actor_user_id
    and (
      p_cursor_requested_at is null
      or (request.requested_at, request.id)
        < (p_cursor_requested_at, p_cursor_request_id)
    )
    and (
      p_statuses is null
      or cardinality(p_statuses) = 0
      or request.status = any(p_statuses)
    )
    and not exists (
      select 1
      from public.blocks as blocked_pair
      where (
        blocked_pair.blocker_user_id = p_actor_user_id
        and blocked_pair.blocked_user_id = request.requester_user_id
      ) or (
        blocked_pair.blocker_user_id = request.requester_user_id
        and blocked_pair.blocked_user_id = p_actor_user_id
      )
    )
  order by request.requested_at desc, request.id desc
  limit v_limit;
end;
$$;

create or replace function public.decide_date_idea_request(
  p_actor_user_id uuid,
  p_date_idea_id uuid,
  p_date_idea_request_id uuid,
  p_accept boolean,
  p_response_note text default null
)
returns table (
  date_idea_request_id uuid,
  request_status public.date_idea_request_status,
  decided_at timestamptz,
  date_idea_status public.date_idea_status,
  accepted_count integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_idea public.date_ideas%rowtype;
  v_request public.date_idea_requests%rowtype;
  v_decision public.date_idea_request_status := case
    when p_accept then 'accepted'::public.date_idea_request_status
    else 'rejected'::public.date_idea_request_status
  end;
begin
  if p_actor_user_id is null
    or p_date_idea_id is null
    or p_date_idea_request_id is null
    or p_accept is null
    or (
      p_response_note is not null
      and char_length(btrim(p_response_note)) > 500
    )
  then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('date-idea:' || p_date_idea_id::text, 0)
  );

  update public.date_ideas as expired_idea
  set status = 'expired', updated_at = now()
  where expired_idea.id = p_date_idea_id
    and expired_idea.status in ('open', 'full')
    and expired_idea.expires_at <= now();

  select idea.*
  into v_idea
  from public.date_ideas as idea
  where idea.id = p_date_idea_id
    and idea.author_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'date_idea_not_author';
  end if;
  if v_idea.status in ('expired', 'cancelled', 'removed') then
    raise exception using errcode = 'P0001', message = 'date_idea_request_unavailable';
  end if;

  select request.*
  into v_request
  from public.date_idea_requests as request
  where request.id = p_date_idea_request_id
    and request.date_idea_id = p_date_idea_id
    and request.author_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'date_idea_request_not_found';
  end if;

  if v_request.status <> 'requested' then
    if v_request.status = v_decision then
      return query
      select
        v_request.id,
        v_request.status,
        v_request.decided_at,
        v_idea.status,
        v_idea.accepted_count;
      return;
    end if;
    raise exception using errcode = 'P0001', message = 'date_idea_request_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks as blocked_pair
    where (
      blocked_pair.blocker_user_id = p_actor_user_id
      and blocked_pair.blocked_user_id = v_request.requester_user_id
    ) or (
      blocked_pair.blocker_user_id = v_request.requester_user_id
      and blocked_pair.blocked_user_id = p_actor_user_id
    )
  ) then
    raise exception using errcode = 'P0001', message = 'date_idea_request_unavailable';
  end if;

  update public.date_idea_requests as decided_request
  set
    status = v_decision,
    response_note = nullif(btrim(p_response_note), ''),
    decided_at = now(),
    updated_at = now()
  where decided_request.id = v_request.id
  returning * into v_request;

  if p_accept then
    update public.date_ideas as decided_idea
    set
      accepted_count = decided_idea.accepted_count + 1,
      updated_at = now()
    where decided_idea.id = p_date_idea_id
    returning * into v_idea;
  end if;

  return query
  select
    v_request.id,
    v_request.status,
    v_request.decided_at,
    v_idea.status,
    v_idea.accepted_count;
end;
$$;

create or replace function public.close_date_idea(
  p_actor_user_id uuid,
  p_date_idea_id uuid
)
returns table (
  date_idea_id uuid,
  date_idea_status public.date_idea_status,
  closed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_idea public.date_ideas%rowtype;
begin
  if p_actor_user_id is null or p_date_idea_id is null then
    raise exception using errcode = '22023', message = 'invalid_date_idea_input';
  end if;

  perform private.assert_dating_account(p_actor_user_id, true);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('date-idea:' || p_date_idea_id::text, 0)
  );

  select idea.*
  into v_idea
  from public.date_ideas as idea
  where idea.id = p_date_idea_id
    and idea.author_user_id = p_actor_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'date_idea_not_author';
  end if;

  if v_idea.status in ('cancelled', 'expired', 'removed') then
    return query select v_idea.id, v_idea.status, v_idea.updated_at;
    return;
  end if;

  update public.date_ideas as closed_idea
  set status = 'cancelled', updated_at = now()
  where closed_idea.id = v_idea.id
  returning * into v_idea;

  update public.date_idea_requests as pending_request
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where pending_request.date_idea_id = v_idea.id
    and pending_request.status = 'requested';

  return query select v_idea.id, v_idea.status, v_idea.updated_at;
end;
$$;

revoke all on function public.create_date_idea(
  uuid,
  public.date_idea_type,
  text,
  text,
  timestamptz,
  timestamptz,
  public.date_idea_visibility,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[],
  integer
) from public, anon, authenticated;
revoke all on function public.get_date_idea_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  text,
  text,
  text,
  public.date_idea_type[]
) from public, anon, authenticated;
revoke all on function public.set_date_idea_bookmark(uuid, uuid, boolean)
from public, anon, authenticated;
revoke all on function public.create_date_idea_request(uuid, uuid, text, uuid)
from public, anon, authenticated;
revoke all on function public.get_date_idea_requests(
  uuid,
  uuid,
  integer,
  timestamptz,
  uuid,
  public.date_idea_request_status[]
) from public, anon, authenticated;
revoke all on function public.decide_date_idea_request(
  uuid,
  uuid,
  uuid,
  boolean,
  text
) from public, anon, authenticated;
revoke all on function public.close_date_idea(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.create_date_idea(
  uuid,
  public.date_idea_type,
  text,
  text,
  timestamptz,
  timestamptz,
  public.date_idea_visibility,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[],
  integer
) to service_role;
grant execute on function public.get_date_idea_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  text,
  text,
  text,
  public.date_idea_type[]
) to service_role;
grant execute on function public.set_date_idea_bookmark(uuid, uuid, boolean)
to service_role;
grant execute on function public.create_date_idea_request(uuid, uuid, text, uuid)
to service_role;
grant execute on function public.get_date_idea_requests(
  uuid,
  uuid,
  integer,
  timestamptz,
  uuid,
  public.date_idea_request_status[]
) to service_role;
grant execute on function public.decide_date_idea_request(
  uuid,
  uuid,
  uuid,
  boolean,
  text
) to service_role;
grant execute on function public.close_date_idea(uuid, uuid)
to service_role;

comment on function public.create_date_idea(
  uuid,
  public.date_idea_type,
  text,
  text,
  timestamptz,
  timestamptz,
  public.date_idea_visibility,
  integer,
  integer,
  text[],
  text[],
  text[],
  text[],
  integer
) is
  'Creates a profile-gated Date Idea using only the author profile coarse location.';
comment on function public.get_date_idea_cards(
  uuid,
  integer,
  timestamptz,
  uuid,
  text,
  text,
  text,
  public.date_idea_type[]
) is
  'Lists safe, block-aware, audience-compatible open Date Ideas with keyset pagination.';
comment on function public.set_date_idea_bookmark(uuid, uuid, boolean) is
  'Sets an actor-owned bookmark only when the Date Idea is currently visible and requestable.';
comment on function public.create_date_idea_request(uuid, uuid, text, uuid) is
  'Creates one idempotent, profile-gated request for a currently eligible Date Idea.';
comment on function public.get_date_idea_requests(
  uuid,
  uuid,
  integer,
  timestamptz,
  uuid,
  public.date_idea_request_status[]
) is
  'Lists requests only for the Date Idea author with keyset pagination.';
comment on function public.decide_date_idea_request(uuid, uuid, uuid, boolean, text) is
  'Accepts or rejects a pending Date Idea request atomically for its author.';
comment on function public.close_date_idea(uuid, uuid) is
  'Closes an author-owned Date Idea and cancels pending requests.';

commit;
