begin;

-- Boosts and the premium priority-discovery benefit affect only the private
-- discovery ranking. They are deliberately not exposed on a public profile
-- card, and the existing cursor shape remains valid because it is based on the
-- resulting stable sort timestamp plus profile ID.
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
  with eligible_profiles as (
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
      photo.public_url as primary_photo_url,
      photo.blur_hash as primary_photo_blur_hash,
      photo.width as primary_photo_width,
      photo.height as primary_photo_height,
      coalesce(p.last_active_at, p.profile_completed_at) as base_sort_at,
      greatest(
        coalesce(active_boost.multiplier, 1.00::numeric),
        case when premium_priority.has_priority then 1.15::numeric else 1.00::numeric end
      ) as exposure_multiplier
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
    left join lateral (
      -- A scheduled boost becomes effective at its scheduled start even if the
      -- owner has not refreshed their boosts screen yet. Metric recording
      -- promotes it to active and records its first impression transactionally.
      select boost.multiplier
      from public.boosts boost
      where boost.user_id = p.user_id
        and boost.status in ('active', 'scheduled')
        and boost.starts_at <= now()
        and boost.ends_at > now()
      order by boost.multiplier desc, boost.ends_at desc, boost.id
      limit 1
    ) active_boost on true
    left join lateral (
      select true as has_priority
      from public.user_premium_subscriptions subscription
      join public.premium_plans plan on plan.id = subscription.plan_id
      where subscription.user_id = p.user_id
        and subscription.status in ('trialing', 'active', 'grace_period')
        and subscription.current_period_end > now()
        and coalesce((plan.features ->> 'priority_discovery')::boolean, false)
      limit 1
    ) premium_priority on true
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
      and (p_country_code is null or p.country_code = upper(p_country_code))
      and (p_city_name is null or lower(p.city_name) = lower(p_city_name))
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
  ), ranked_profiles as (
    select
      eligible_profiles.*,
      eligible_profiles.base_sort_at + make_interval(
        secs => ((eligible_profiles.exposure_multiplier - 1.00) * 43200)::integer
      ) as computed_sort_at
    from eligible_profiles
  )
  select
    ranked_profiles.user_id,
    ranked_profiles.display_name,
    ranked_profiles.age_years,
    ranked_profiles.gender,
    ranked_profiles.country_code,
    ranked_profiles.city_name,
    ranked_profiles.headline,
    ranked_profiles.bio,
    ranked_profiles.intents,
    ranked_profiles.languages,
    ranked_profiles.interests,
    ranked_profiles.badges,
    ranked_profiles.relationship_goals,
    ranked_profiles.mood,
    ranked_profiles.online_state,
    ranked_profiles.last_active_at,
    ranked_profiles.public_geohash_prefix,
    ranked_profiles.profile_completion_score,
    ranked_profiles.popularity_score,
    ranked_profiles.likes_received,
    ranked_profiles.gifts_received,
    ranked_profiles.primary_photo_url,
    ranked_profiles.primary_photo_blur_hash,
    ranked_profiles.primary_photo_width,
    ranked_profiles.primary_photo_height,
    ranked_profiles.computed_sort_at as sort_at
  from ranked_profiles
  where p_cursor_sort_at is null
    or ranked_profiles.computed_sort_at < p_cursor_sort_at
    or (
      ranked_profiles.computed_sort_at = p_cursor_sort_at
      and ranked_profiles.user_id > p_cursor_user_id
    )
  order by ranked_profiles.computed_sort_at desc, ranked_profiles.user_id
  limit v_limit;
end;
$$;

-- A discovery response is the natural point at which to account for boost
-- impressions. Refresh the small returned target set first so a due scheduled
-- boost can start without a separate worker or a heavyweight discovery query.
create or replace function public.record_boost_impressions(
  p_actor_user_id uuid,
  p_target_user_ids uuid[]
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_target_user_id uuid;
begin
  perform private.assert_premium_account(p_actor_user_id);
  if p_target_user_ids is null or cardinality(p_target_user_ids) > 51 then
    raise exception using errcode = '22023', message = 'invalid_boost_metric_input';
  end if;

  for v_target_user_id in
    select distinct target_id
    from unnest(p_target_user_ids) as target_id
    where target_id is not null and target_id <> p_actor_user_id
  loop
    perform private.expire_user_boosts(v_target_user_id);
  end loop;

  with targets as (
    select distinct target_id
    from unnest(p_target_user_ids) as target_id
    where target_id is not null and target_id <> p_actor_user_id
  ), updated as (
    update public.boosts boost
    set impression_count = boost.impression_count + 1,
        updated_at = now()
    from targets
    where boost.user_id = targets.target_id
      and boost.status = 'active'
      and boost.starts_at <= now()
      and boost.ends_at > now()
    returning boost.id, boost.user_id
  ), inserted as (
    insert into public.boost_events (boost_id, user_id, event_type, payload)
    select updated.id, updated.user_id, 'impression', jsonb_build_object('source', 'discovery')
    from updated
    returning 1
  )
  select count(*)::integer into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function public.get_discovery_cards(
  uuid, integer, timestamptz, uuid, integer, integer, public.gender_type[], text,
  text, text, text[], text[], text[]
) from public, anon, authenticated;
revoke all on function public.record_boost_impressions(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.get_discovery_cards(
  uuid, integer, timestamptz, uuid, integer, integer, public.gender_type[], text,
  text, text, text[], text[], text[]
) to service_role;
grant execute on function public.record_boost_impressions(uuid, uuid[]) to service_role;

comment on function public.get_discovery_cards(
  uuid, integer, timestamptz, uuid, integer, integer, public.gender_type[], text,
  text, text, text[], text[], text[]
) is 'Server-only discovery cards with privacy filters, cursor pagination, and non-public boost/premium ranking.';

commit;
