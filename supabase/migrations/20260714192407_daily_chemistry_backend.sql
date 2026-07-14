begin;

-- Daily Chemistry is backend-only. The browser receives only the narrow card
-- projection returned by service-role RPCs, never the scoring tables.
revoke all on table public.daily_chemistry_cards from anon, authenticated;
revoke all on table public.daily_chemistry_candidates from anon, authenticated;
grant select, insert, update, delete on table public.daily_chemistry_cards to service_role;
grant select, insert, update, delete on table public.daily_chemistry_candidates to service_role;

alter table public.daily_chemistry_cards
  drop constraint if exists daily_chemistry_total_candidates_check,
  drop constraint if exists daily_chemistry_remaining_candidates_check;

alter table public.daily_chemistry_cards
  add constraint daily_chemistry_total_candidates_check
    check (total_candidates between 0 and 3),
  add constraint daily_chemistry_remaining_candidates_check
    check (
      remaining_candidates between 0 and 3
      and remaining_candidates <= total_candidates
    ),
  add constraint daily_chemistry_cards_id_user_id_key unique (id, user_id);

comment on constraint daily_chemistry_cards_user_id_card_date_key
on public.daily_chemistry_cards is
  'Enforces one stored Daily Chemistry card per user and UTC calendar day.';

alter table public.daily_chemistry_candidates
  drop constraint if exists daily_chemistry_candidates_card_id_fkey;

alter table public.daily_chemistry_candidates
  add constraint daily_chemistry_candidates_card_viewer_fkey
    foreign key (card_id, viewer_user_id)
    references public.daily_chemistry_cards (id, user_id)
    on delete cascade;

create index if not exists daily_chemistry_candidates_recent_pair_idx
  on public.daily_chemistry_candidates (
    viewer_user_id,
    target_user_id,
    created_at desc
  );
create unique index if not exists daily_chemistry_candidates_swipe_action_key
  on public.daily_chemistry_candidates (swipe_action_id)
  where swipe_action_id is not null;
create index if not exists daily_chemistry_candidates_match_idx
  on public.daily_chemistry_candidates (match_id)
  where match_id is not null;

create or replace function private.refresh_daily_chemistry_card(
  p_card_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_total smallint;
  v_remaining smallint;
begin
  select
    count(*)::smallint,
    count(*) filter (where dc.status in ('pending', 'viewed'))::smallint
  into v_total, v_remaining
  from public.daily_chemistry_candidates dc
  where dc.card_id = p_card_id;

  update public.daily_chemistry_cards as chemistry_card
  set
    total_candidates = coalesce(v_total, 0),
    remaining_candidates = coalesce(v_remaining, 0),
    status = case
      when chemistry_card.status = 'dismissed'
        then 'dismissed'::public.daily_chemistry_card_status
      when chemistry_card.expires_at <= now()
        then 'expired'::public.daily_chemistry_card_status
      when coalesce(v_remaining, 0) = 0
        then 'completed'::public.daily_chemistry_card_status
      when chemistry_card.seen_at is not null
        then 'seen'::public.daily_chemistry_card_status
      else 'generated'::public.daily_chemistry_card_status
    end,
    completed_at = case
      when chemistry_card.expires_at > now()
        and coalesce(v_remaining, 0) = 0
      then coalesce(chemistry_card.completed_at, now())
      else null
    end,
    summary = case
      when coalesce(v_total, 0) = 0 then 'No safe chemistry picks are available today.'
      when coalesce(v_total, 0) = 1 then 'One compatibility pick for today.'
      else coalesce(v_total, 0)::text || ' compatibility picks for today.'
    end,
    updated_at = now()
  where chemistry_card.id = p_card_id;
end;
$$;

create or replace function public.get_or_create_daily_chemistry_card(
  p_actor_user_id uuid
)
returns table (
  card_id uuid,
  card_date date,
  card_status public.daily_chemistry_card_status,
  algorithm_version text,
  generated_at timestamptz,
  expires_at timestamptz,
  total_candidates smallint,
  remaining_candidates smallint,
  card_summary text,
  candidate_id uuid,
  rank_position smallint,
  compatibility_score numeric,
  reason_tags text[],
  reasons jsonb,
  shared_interests text[],
  shared_languages text[],
  shared_goals text[],
  candidate_status public.daily_chemistry_candidate_status,
  candidate_viewed_at timestamptz,
  candidate_acted_at timestamptz,
  target_user_id uuid,
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
volatile
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_card_id uuid;
  v_today date := (statement_timestamp() at time zone 'UTC')::date;
  v_expires_at timestamptz := (
    ((statement_timestamp() at time zone 'UTC')::date + 1)::timestamp
    at time zone 'UTC'
  );
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'missing_daily_chemistry_actor';
  end if;

  perform private.assert_dating_account(p_actor_user_id, false);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'daily-chemistry:' || p_actor_user_id::text,
      0
    )
  );

  select actor_profile.*
  into v_actor
  from public.profiles as actor_profile
  where actor_profile.user_id = p_actor_user_id;

  update public.daily_chemistry_candidates as stale_candidate
  set
    status = 'expired',
    updated_at = now()
  from public.daily_chemistry_cards as stale_card
  where stale_card.id = stale_candidate.card_id
    and stale_card.user_id = p_actor_user_id
    and stale_card.expires_at <= now()
    and stale_candidate.status in ('pending', 'viewed');

  update public.daily_chemistry_cards as stale_card
  set
    status = 'expired',
    remaining_candidates = 0,
    completed_at = null,
    updated_at = now()
  where stale_card.user_id = p_actor_user_id
    and stale_card.expires_at <= now()
    and stale_card.status not in ('expired', 'dismissed');

  select chemistry_card.id
  into v_card_id
  from public.daily_chemistry_cards as chemistry_card
  where chemistry_card.user_id = p_actor_user_id
    and chemistry_card.card_date = v_today
  for update;

  if not found then
    insert into public.daily_chemistry_cards as inserted_card (
      user_id,
      card_date,
      status,
      algorithm_version,
      generated_at,
      expires_at,
      total_candidates,
      remaining_candidates,
      metadata
    )
    values (
      p_actor_user_id,
      v_today,
      'generated',
      'v1',
      now(),
      v_expires_at,
      0,
      0,
      jsonb_build_object(
        'generated_on_demand', true,
        'pool_scope', 'same_country',
        'history_window_days', 30
      )
    )
    returning inserted_card.id into v_card_id;

    with profile_seed as materialized (
      (
        select target_profile.*, 0::smallint as pool_priority
        from public.profiles as target_profile
        join public.app_users as target_account
          on target_account.id = target_profile.user_id
        where target_profile.user_id <> p_actor_user_id
          and target_account.status = 'active'
          and target_profile.profile_completed_at is not null
          and target_profile.visibility = 'public'
          and target_profile.discoverable = true
          and target_profile.country_code = v_actor.country_code
          and lower(target_profile.city_name) = lower(v_actor.city_name)
        order by
          coalesce(
            target_profile.last_active_at,
            target_profile.profile_completed_at
          ) desc,
          target_profile.user_id
        limit 400
      )
      union all
      (
        select target_profile.*, 1::smallint as pool_priority
        from public.profiles as target_profile
        join public.app_users as target_account
          on target_account.id = target_profile.user_id
        where target_profile.user_id <> p_actor_user_id
          and target_account.status = 'active'
          and target_profile.profile_completed_at is not null
          and target_profile.visibility = 'public'
          and target_profile.discoverable = true
          and target_profile.country_code = v_actor.country_code
          and lower(target_profile.city_name) <> lower(v_actor.city_name)
        order by
          lower(target_profile.city_name),
          coalesce(
            target_profile.last_active_at,
            target_profile.profile_completed_at
          ) desc,
          target_profile.user_id
        limit 800
      )
    ),
    eligible_pool as materialized (
      select target_profile.*
      from profile_seed as target_profile
      where exists (
          select 1
          from public.profile_photos as safe_photo
          where safe_photo.user_id = target_profile.user_id
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
            and blocked_pair.blocked_user_id = target_profile.user_id
          ) or (
            blocked_pair.blocker_user_id = target_profile.user_id
            and blocked_pair.blocked_user_id = p_actor_user_id
          )
        )
        and not exists (
          select 1
          from public.swipe_actions as current_swipe
          where current_swipe.actor_user_id = p_actor_user_id
            and current_swipe.target_user_id = target_profile.user_id
            and current_swipe.action_type <> 'undo'
            and current_swipe.undone_at is null
        )
        and not exists (
          select 1
          from public.matches as active_match
          where active_match.user_a_id = least(
              p_actor_user_id,
              target_profile.user_id
            )
            and active_match.user_b_id = greatest(
              p_actor_user_id,
              target_profile.user_id
            )
            and active_match.status = 'active'
        )
        and not exists (
          select 1
          from public.bans as target_ban
          where target_ban.user_id = target_profile.user_id
            and target_ban.status = 'active'
            and target_ban.starts_at <= now()
            and (target_ban.ends_at is null or target_ban.ends_at > now())
        )
        and not exists (
          select 1
          from public.user_restrictions as target_restriction
          where target_restriction.user_id = target_profile.user_id
            and target_restriction.status = 'active'
            and target_restriction.starts_at <= now()
            and (
              target_restriction.ends_at is null
              or target_restriction.ends_at > now()
            )
            and target_restriction.restriction_type in (
              'shadow_ban',
              'full_suspension'
            )
        )
        and not exists (
          select 1
          from public.daily_chemistry_candidates as recent_candidate
          where recent_candidate.viewer_user_id = p_actor_user_id
            and recent_candidate.target_user_id = target_profile.user_id
            and recent_candidate.created_at >= now() - interval '30 days'
        )
      order by
        target_profile.pool_priority,
        coalesce(
          target_profile.last_active_at,
          target_profile.profile_completed_at
        ) desc,
        target_profile.user_id
      limit 500
    ),
    compatibility_features as (
      select
        pool.*,
        array(
          select shared_interest.value
          from (
            select unnest(v_actor.interests) as value
            intersect
            select unnest(pool.interests) as value
          ) as shared_interest
          order by shared_interest.value
        ) as calculated_shared_interests,
        array(
          select shared_language.value
          from (
            select unnest(v_actor.languages) as value
            intersect
            select unnest(pool.languages) as value
          ) as shared_language
          order by shared_language.value
        ) as calculated_shared_languages,
        array(
          select shared_goal.value
          from (
            select unnest(v_actor.relationship_goals) as value
            intersect
            select unnest(pool.relationship_goals) as value
          ) as shared_goal
          order by shared_goal.value
        ) as calculated_shared_goals,
        array(
          select shared_intent.value
          from (
            select unnest(v_actor.intents) as value
            intersect
            select unnest(pool.intents) as value
          ) as shared_intent
          order by shared_intent.value
        ) as calculated_shared_intents,
        lower(pool.city_name) = lower(v_actor.city_name) as same_city,
        (
          pool.public_geohash_prefix is not null
          and v_actor.public_geohash_prefix is not null
          and left(pool.public_geohash_prefix, 3)
            = left(v_actor.public_geohash_prefix, 3)
        ) as coarse_nearby,
        pool.last_active_at >= now() - interval '7 days' as recently_active
      from eligible_pool as pool
    ),
    scored_candidates as (
      select
        features.*,
        least(
          100,
          15
          + least(cardinality(features.calculated_shared_interests), 3) * 12
          + least(cardinality(features.calculated_shared_languages), 2) * 8
          + least(cardinality(features.calculated_shared_goals), 2) * 14
          + least(cardinality(features.calculated_shared_intents), 2) * 6
          + case when features.same_city then 15 else 0 end
          + case
              when not features.same_city and features.coarse_nearby then 8
              else 0
            end
          + case when features.recently_active then 5 else 0 end
          + 5
        )::numeric as calculated_score,
        array_remove(
          array[
            case
              when cardinality(features.calculated_shared_interests) > 0
                then 'shared_interests'
            end,
            case
              when cardinality(features.calculated_shared_languages) > 0
                then 'shared_language'
            end,
            case
              when cardinality(features.calculated_shared_goals) > 0
                then 'same_relationship_goal'
            end,
            case
              when cardinality(features.calculated_shared_intents) > 0
                then 'shared_lifestyle'
            end,
            case when features.same_city then 'same_city' end,
            case
              when not features.same_city and features.coarse_nearby
                then 'nearby'
            end,
            case when features.recently_active then 'recently_active' end,
            'same_country'
          ]::text[],
          null
        ) as calculated_reason_tags,
        jsonb_strip_nulls(jsonb_build_object(
          'sharedInterests', case
            when cardinality(features.calculated_shared_interests) > 0
              then to_jsonb(features.calculated_shared_interests)
          end,
          'sharedLanguages', case
            when cardinality(features.calculated_shared_languages) > 0
              then to_jsonb(features.calculated_shared_languages)
          end,
          'sharedRelationshipGoals', case
            when cardinality(features.calculated_shared_goals) > 0
              then to_jsonb(features.calculated_shared_goals)
          end,
          'sharedLifestyle', case
            when cardinality(features.calculated_shared_intents) > 0
              then to_jsonb(features.calculated_shared_intents)
          end,
          'location', case
            when features.same_city then jsonb_build_object(
              'kind', 'same_city',
              'city', features.city_name,
              'countryCode', features.country_code
            )
            when features.coarse_nearby then jsonb_build_object(
              'kind', 'nearby',
              'countryCode', features.country_code
            )
            else jsonb_build_object(
              'kind', 'same_country',
              'countryCode', features.country_code
            )
          end,
          'recentlyActive', case
            when features.recently_active then true
          end
        )) as calculated_reasons
      from compatibility_features as features
    ),
    ranked_candidates as (
      select
        scored.*,
        row_number() over (
          order by
            scored.calculated_score desc,
            cardinality(scored.calculated_shared_goals) desc,
            cardinality(scored.calculated_shared_interests) desc,
            pg_catalog.hashtextextended(
              p_actor_user_id::text
              || ':' || scored.user_id::text
              || ':' || v_today::text,
              0
            )
        ) as calculated_rank
      from scored_candidates as scored
    )
    insert into public.daily_chemistry_candidates (
      card_id,
      viewer_user_id,
      target_user_id,
      rank_position,
      compatibility_score,
      reasons,
      reason_tags,
      shared_interests,
      shared_languages,
      shared_goals,
      city_name,
      country_code,
      metadata
    )
    select
      v_card_id,
      p_actor_user_id,
      ranked.user_id,
      ranked.calculated_rank::smallint,
      ranked.calculated_score,
      ranked.calculated_reasons,
      ranked.calculated_reason_tags,
      ranked.calculated_shared_interests,
      ranked.calculated_shared_languages,
      ranked.calculated_shared_goals,
      ranked.city_name,
      ranked.country_code,
      jsonb_build_object(
        'shared_intents', ranked.calculated_shared_intents,
        'coarse_nearby', ranked.coarse_nearby
      )
    from ranked_candidates as ranked
    where ranked.calculated_rank <= 3
    order by ranked.calculated_rank;
  end if;

  -- Reconcile undo, alternate-surface swipes, reciprocal matches, and safety
  -- changes before returning the stored card.
  update public.daily_chemistry_candidates as undone_candidate
  set
    status = 'viewed',
    acted_at = null,
    swipe_action_id = null,
    match_id = null,
    updated_at = now()
  from public.swipe_actions as undone_swipe,
       public.daily_chemistry_cards as active_card
  where undone_candidate.card_id = v_card_id
    and active_card.id = undone_candidate.card_id
    and active_card.expires_at > now()
    and undone_swipe.id = undone_candidate.swipe_action_id
    and undone_swipe.undone_at is not null;

  update public.daily_chemistry_candidates as acted_candidate
  set
    status = case
      when current_swipe.action_type = 'pass'
        then 'passed'::public.daily_chemistry_candidate_status
      when current_swipe.action_type = 'super_like'
        then 'super_liked'::public.daily_chemistry_candidate_status
      else 'liked'::public.daily_chemistry_candidate_status
    end,
    acted_at = coalesce(acted_candidate.acted_at, current_swipe.created_at),
    swipe_action_id = current_swipe.id,
    updated_at = now()
  from public.swipe_actions as current_swipe
  where acted_candidate.card_id = v_card_id
    and acted_candidate.viewer_user_id = p_actor_user_id
    and current_swipe.actor_user_id = acted_candidate.viewer_user_id
    and current_swipe.target_user_id = acted_candidate.target_user_id
    and current_swipe.action_type <> 'undo'
    and current_swipe.undone_at is null
    and acted_candidate.status in ('pending', 'viewed');

  update public.daily_chemistry_candidates as matched_candidate
  set
    status = 'matched',
    match_id = active_match.id,
    acted_at = coalesce(matched_candidate.acted_at, active_match.matched_at),
    updated_at = now()
  from public.matches as active_match
  where matched_candidate.card_id = v_card_id
    and matched_candidate.status in ('liked', 'super_liked', 'matched')
    and active_match.user_a_id = least(
      matched_candidate.viewer_user_id,
      matched_candidate.target_user_id
    )
    and active_match.user_b_id = greatest(
      matched_candidate.viewer_user_id,
      matched_candidate.target_user_id
    )
    and active_match.status = 'active';

  update public.daily_chemistry_candidates as unavailable_candidate
  set
    status = 'expired',
    updated_at = now()
  where unavailable_candidate.card_id = v_card_id
    and unavailable_candidate.status in ('pending', 'viewed')
    and not exists (
      select 1
      from public.profiles as safe_profile
      join public.app_users as safe_account
        on safe_account.id = safe_profile.user_id
      where safe_profile.user_id = unavailable_candidate.target_user_id
        and safe_account.status = 'active'
        and safe_profile.profile_completed_at is not null
        and safe_profile.visibility = 'public'
        and safe_profile.discoverable = true
        and exists (
          select 1
          from public.profile_photos as safe_photo
          where safe_photo.user_id = safe_profile.user_id
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
            and blocked_pair.blocked_user_id = safe_profile.user_id
          ) or (
            blocked_pair.blocker_user_id = safe_profile.user_id
            and blocked_pair.blocked_user_id = p_actor_user_id
          )
        )
        and not exists (
          select 1
          from public.bans as target_ban
          where target_ban.user_id = safe_profile.user_id
            and target_ban.status = 'active'
            and target_ban.starts_at <= now()
            and (target_ban.ends_at is null or target_ban.ends_at > now())
        )
        and not exists (
          select 1
          from public.user_restrictions as target_restriction
          where target_restriction.user_id = safe_profile.user_id
            and target_restriction.status = 'active'
            and target_restriction.starts_at <= now()
            and (
              target_restriction.ends_at is null
              or target_restriction.ends_at > now()
            )
            and target_restriction.restriction_type in (
              'shadow_ban',
              'full_suspension'
            )
        )
    );

  perform private.refresh_daily_chemistry_card(v_card_id);

  update public.daily_chemistry_cards as seen_card
  set
    seen_at = coalesce(seen_card.seen_at, now()),
    status = case
      when seen_card.status = 'generated'
        and seen_card.remaining_candidates > 0
      then 'seen'::public.daily_chemistry_card_status
      else seen_card.status
    end,
    updated_at = now()
  where seen_card.id = v_card_id;

  return query
  select
    chemistry_card.id,
    chemistry_card.card_date,
    chemistry_card.status,
    chemistry_card.algorithm_version,
    chemistry_card.generated_at,
    chemistry_card.expires_at,
    chemistry_card.total_candidates,
    chemistry_card.remaining_candidates,
    chemistry_card.summary,
    safe_candidate.id,
    safe_candidate.rank_position,
    safe_candidate.compatibility_score,
    safe_candidate.reason_tags,
    safe_candidate.reasons,
    safe_candidate.shared_interests,
    safe_candidate.shared_languages,
    safe_candidate.shared_goals,
    safe_candidate.status,
    safe_candidate.viewed_at,
    safe_candidate.acted_at,
    safe_candidate.target_user_id,
    safe_candidate.display_name,
    safe_candidate.age_years,
    safe_candidate.gender,
    safe_candidate.country_code,
    safe_candidate.city_name,
    safe_candidate.headline,
    safe_candidate.bio,
    safe_candidate.languages,
    safe_candidate.interests,
    safe_candidate.relationship_goals,
    safe_candidate.mood,
    safe_candidate.online_state,
    safe_candidate.last_active_at,
    safe_candidate.public_geohash_prefix,
    safe_candidate.primary_photo_url,
    safe_candidate.primary_photo_blur_hash,
    safe_candidate.primary_photo_width,
    safe_candidate.primary_photo_height
  from public.daily_chemistry_cards as chemistry_card
  left join lateral (
    select
      chemistry_candidate.id,
      chemistry_candidate.rank_position,
      chemistry_candidate.compatibility_score,
      chemistry_candidate.reason_tags,
      chemistry_candidate.reasons,
      chemistry_candidate.shared_interests,
      chemistry_candidate.shared_languages,
      chemistry_candidate.shared_goals,
      chemistry_candidate.status,
      chemistry_candidate.viewed_at,
      chemistry_candidate.acted_at,
      target_profile.user_id as target_user_id,
      target_profile.display_name,
      target_profile.age_years,
      target_profile.gender,
      target_profile.country_code,
      target_profile.city_name,
      target_profile.headline,
      target_profile.bio,
      target_profile.languages,
      target_profile.interests,
      target_profile.relationship_goals,
      target_profile.mood,
      target_profile.online_state,
      target_profile.last_active_at,
      target_profile.public_geohash_prefix,
      safe_photo.public_url as primary_photo_url,
      safe_photo.blur_hash as primary_photo_blur_hash,
      safe_photo.width as primary_photo_width,
      safe_photo.height as primary_photo_height
    from public.daily_chemistry_candidates as chemistry_candidate
    join public.profiles as target_profile
      on target_profile.user_id = chemistry_candidate.target_user_id
    join public.app_users as target_account
      on target_account.id = target_profile.user_id
      and target_account.status = 'active'
    join lateral (
      select
        profile_photo.public_url,
        profile_photo.blur_hash,
        profile_photo.width,
        profile_photo.height
      from public.profile_photos as profile_photo
      where profile_photo.user_id = target_profile.user_id
        and profile_photo.is_primary = true
        and profile_photo.is_private = false
        and profile_photo.deleted_at is null
        and profile_photo.upload_status = 'confirmed'
        and profile_photo.public_url is not null
        and profile_photo.moderation_status = 'approved'
        and profile_photo.face_check_status in ('passed', 'manual_review')
      order by profile_photo.sort_order, profile_photo.created_at
      limit 1
    ) as safe_photo on true
    where chemistry_candidate.card_id = chemistry_card.id
      and chemistry_candidate.status <> 'expired'
      and target_profile.profile_completed_at is not null
      and target_profile.visibility = 'public'
      and target_profile.discoverable = true
      and not exists (
        select 1
        from public.blocks as blocked_pair
        where (
          blocked_pair.blocker_user_id = p_actor_user_id
          and blocked_pair.blocked_user_id = target_profile.user_id
        ) or (
          blocked_pair.blocker_user_id = target_profile.user_id
          and blocked_pair.blocked_user_id = p_actor_user_id
        )
      )
      and not exists (
        select 1
        from public.bans as target_ban
        where target_ban.user_id = target_profile.user_id
          and target_ban.status = 'active'
          and target_ban.starts_at <= now()
          and (target_ban.ends_at is null or target_ban.ends_at > now())
      )
      and not exists (
        select 1
        from public.user_restrictions as target_restriction
        where target_restriction.user_id = target_profile.user_id
          and target_restriction.status = 'active'
          and target_restriction.starts_at <= now()
          and (
            target_restriction.ends_at is null
            or target_restriction.ends_at > now()
          )
          and target_restriction.restriction_type in (
            'shadow_ban',
            'full_suspension'
          )
      )
    order by chemistry_candidate.rank_position
  ) as safe_candidate on true
  where chemistry_card.id = v_card_id
  order by safe_candidate.rank_position nulls last;
end;
$$;

create or replace function public.mark_daily_chemistry_candidate_viewed(
  p_actor_user_id uuid,
  p_candidate_id uuid
)
returns table (
  candidate_id uuid,
  candidate_status public.daily_chemistry_candidate_status,
  viewed_at timestamptz,
  card_remaining_candidates smallint,
  card_status public.daily_chemistry_card_status
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_candidate public.daily_chemistry_candidates%rowtype;
  v_card public.daily_chemistry_cards%rowtype;
begin
  if p_actor_user_id is null or p_candidate_id is null then
    raise exception using errcode = '22023', message = 'missing_daily_chemistry_candidate';
  end if;

  perform private.assert_dating_account(p_actor_user_id, false);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'daily-chemistry:' || p_actor_user_id::text,
      0
    )
  );

  select chemistry_candidate.*
  into v_candidate
  from public.daily_chemistry_candidates as chemistry_candidate
  where chemistry_candidate.id = p_candidate_id
    and chemistry_candidate.viewer_user_id = p_actor_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_unavailable';
  end if;

  select chemistry_card.*
  into v_card
  from public.daily_chemistry_cards as chemistry_card
  where chemistry_card.id = v_candidate.card_id
  for update;

  select chemistry_candidate.*
  into v_candidate
  from public.daily_chemistry_candidates as chemistry_candidate
  where chemistry_candidate.id = p_candidate_id
  for update;

  if v_card.expires_at <= now() or v_candidate.status = 'expired' then
    raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_expired';
  end if;

  if v_candidate.status = 'pending' then
    update public.daily_chemistry_candidates as viewed_candidate
    set
      status = 'viewed',
      viewed_at = coalesce(viewed_candidate.viewed_at, now()),
      updated_at = now()
    where viewed_candidate.id = v_candidate.id
    returning viewed_candidate.* into v_candidate;
  end if;

  update public.daily_chemistry_cards as seen_card
  set
    seen_at = coalesce(seen_card.seen_at, now()),
    status = case
      when seen_card.status = 'generated'
        then 'seen'::public.daily_chemistry_card_status
      else seen_card.status
    end,
    updated_at = now()
  where seen_card.id = v_card.id;

  perform private.refresh_daily_chemistry_card(v_card.id);

  return query
  select
    v_candidate.id,
    v_candidate.status,
    v_candidate.viewed_at,
    refreshed_card.remaining_candidates,
    refreshed_card.status
  from public.daily_chemistry_cards as refreshed_card
  where refreshed_card.id = v_card.id;
end;
$$;

create or replace function public.record_dating_swipe(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action_type public.swipe_action_type,
  p_source_surface public.discovery_surface,
  p_idempotency_key uuid,
  p_daily_chemistry_candidate_id uuid default null
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
  v_candidate public.daily_chemistry_candidates%rowtype;
  v_card public.daily_chemistry_cards%rowtype;
  v_action_id uuid;
  v_action_type public.swipe_action_type;
  v_target_user_id uuid;
  v_source_surface public.discovery_surface;
  v_action_created_at timestamptz;
  v_match_id uuid;
  v_match_status public.match_status;
  v_matched_at timestamptz;
  v_match_created boolean;
  v_candidate_status public.daily_chemistry_candidate_status;
  v_related_card_id uuid;
begin
  if p_source_surface = 'daily_chemistry'
    and p_daily_chemistry_candidate_id is null
  then
    raise exception using errcode = '22023', message = 'daily_chemistry_candidate_required';
  end if;
  if p_source_surface <> 'daily_chemistry'
    and p_daily_chemistry_candidate_id is not null
  then
    raise exception using errcode = '22023', message = 'unexpected_daily_chemistry_candidate';
  end if;

  if p_source_surface = 'daily_chemistry' then
    select chemistry_candidate.*
    into v_candidate
    from public.daily_chemistry_candidates as chemistry_candidate
    where chemistry_candidate.id = p_daily_chemistry_candidate_id
      and chemistry_candidate.viewer_user_id = p_actor_user_id
      and chemistry_candidate.target_user_id = p_target_user_id;

    if not found then
      raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_unavailable';
    end if;

    select chemistry_card.*
    into v_card
    from public.daily_chemistry_cards as chemistry_card
    where chemistry_card.id = v_candidate.card_id;

    if v_candidate.swipe_action_id is null and (
      v_card.expires_at <= now()
      or v_card.status not in ('generated', 'seen')
      or v_candidate.status not in ('pending', 'viewed')
    ) then
      raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_unavailable';
    end if;
  end if;

  select
    core_action.action_id,
    core_action.action_type,
    core_action.target_user_id,
    core_action.source_surface,
    core_action.action_created_at,
    core_action.match_id,
    core_action.match_status,
    core_action.matched_at,
    core_action.match_created
  into
    v_action_id,
    v_action_type,
    v_target_user_id,
    v_source_surface,
    v_action_created_at,
    v_match_id,
    v_match_status,
    v_matched_at,
    v_match_created
  from public.record_swipe_action(
    p_actor_user_id,
    p_target_user_id,
    p_action_type,
    p_source_surface,
    p_idempotency_key
  ) as core_action;

  if p_source_surface = 'daily_chemistry' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'daily-chemistry:' || p_actor_user_id::text,
        0
      )
    );

    select chemistry_card.*
    into v_card
    from public.daily_chemistry_cards as chemistry_card
    where chemistry_card.id = v_candidate.card_id
    for update;

    select chemistry_candidate.*
    into v_candidate
    from public.daily_chemistry_candidates as chemistry_candidate
    where chemistry_candidate.id = p_daily_chemistry_candidate_id
      and chemistry_candidate.viewer_user_id = p_actor_user_id
      and chemistry_candidate.target_user_id = p_target_user_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_unavailable';
    end if;
    if v_candidate.swipe_action_id is not null
      and v_candidate.swipe_action_id <> v_action_id
    then
      raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_already_acted';
    end if;
    if v_candidate.swipe_action_id is null and (
      v_card.expires_at <= now()
      or v_card.status not in ('generated', 'seen')
      or v_candidate.status not in ('pending', 'viewed')
    ) then
      raise exception using errcode = 'P0001', message = 'daily_chemistry_candidate_unavailable';
    end if;

    v_candidate_status := case
      when v_match_id is not null
        then 'matched'::public.daily_chemistry_candidate_status
      when p_action_type = 'pass'
        then 'passed'::public.daily_chemistry_candidate_status
      when p_action_type = 'super_like'
        then 'super_liked'::public.daily_chemistry_candidate_status
      else 'liked'::public.daily_chemistry_candidate_status
    end;

    update public.daily_chemistry_candidates as acted_candidate
    set
      status = v_candidate_status,
      viewed_at = coalesce(acted_candidate.viewed_at, now()),
      acted_at = coalesce(acted_candidate.acted_at, now()),
      swipe_action_id = v_action_id,
      match_id = v_match_id,
      metadata = acted_candidate.metadata || jsonb_build_object(
        'swipe_action_type', p_action_type
      ),
      updated_at = now()
    where acted_candidate.id = v_candidate.id;

    perform private.refresh_daily_chemistry_card(v_candidate.card_id);

    if v_match_id is not null then
      for v_related_card_id in
        update public.daily_chemistry_candidates as reciprocal_candidate
        set
          status = 'matched',
          match_id = v_match_id,
          acted_at = coalesce(reciprocal_candidate.acted_at, now()),
          updated_at = now()
        where reciprocal_candidate.viewer_user_id = p_target_user_id
          and reciprocal_candidate.target_user_id = p_actor_user_id
          and reciprocal_candidate.status in ('liked', 'super_liked')
        returning reciprocal_candidate.card_id
      loop
        perform private.refresh_daily_chemistry_card(v_related_card_id);
      end loop;
    end if;
  end if;

  return query
  select
    v_action_id,
    v_action_type,
    v_target_user_id,
    v_source_surface,
    v_action_created_at,
    v_match_id,
    v_match_status,
    v_matched_at,
    v_match_created;
end;
$$;

create or replace function public.undo_dating_swipe(
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
  v_action_id uuid;
  v_action_type public.swipe_action_type;
  v_target_user_id uuid;
  v_source_surface public.discovery_surface;
  v_action_created_at timestamptz;
  v_undone_action_id uuid;
  v_card_id uuid;
begin
  select
    core_undo.action_id,
    core_undo.action_type,
    core_undo.target_user_id,
    core_undo.source_surface,
    core_undo.action_created_at,
    core_undo.undone_action_id
  into
    v_action_id,
    v_action_type,
    v_target_user_id,
    v_source_surface,
    v_action_created_at,
    v_undone_action_id
  from public.undo_latest_swipe(
    p_actor_user_id,
    p_idempotency_key,
    p_target_user_id,
    p_window_seconds
  ) as core_undo;

  select chemistry_candidate.card_id
  into v_card_id
  from public.daily_chemistry_candidates as chemistry_candidate
  where chemistry_candidate.viewer_user_id = p_actor_user_id
    and chemistry_candidate.swipe_action_id = v_undone_action_id;

  if found then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'daily-chemistry:' || p_actor_user_id::text,
        0
      )
    );

    update public.daily_chemistry_candidates as reverted_candidate
    set
      status = case
        when chemistry_card.expires_at > now()
          then 'viewed'::public.daily_chemistry_candidate_status
        else 'expired'::public.daily_chemistry_candidate_status
      end,
      acted_at = null,
      swipe_action_id = null,
      match_id = null,
      updated_at = now()
    from public.daily_chemistry_cards as chemistry_card
    where reverted_candidate.card_id = v_card_id
      and chemistry_card.id = reverted_candidate.card_id
      and reverted_candidate.viewer_user_id = p_actor_user_id
      and reverted_candidate.swipe_action_id = v_undone_action_id;

    perform private.refresh_daily_chemistry_card(v_card_id);
  end if;

  return query
  select
    v_action_id,
    v_action_type,
    v_target_user_id,
    v_source_surface,
    v_action_created_at,
    v_undone_action_id;
end;
$$;

-- Keep the low-level swipe RPCs callable only from the contextual wrappers.
revoke all on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) from public, anon, authenticated, service_role;
revoke all on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) from public, anon, authenticated, service_role;
revoke all on function private.refresh_daily_chemistry_card(uuid)
from public, anon, authenticated, service_role;

revoke all on function public.get_or_create_daily_chemistry_card(uuid)
from public, anon, authenticated;
revoke all on function public.mark_daily_chemistry_candidate_viewed(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.record_dating_swipe(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.undo_dating_swipe(uuid, uuid, uuid, integer)
from public, anon, authenticated;

grant execute on function public.get_or_create_daily_chemistry_card(uuid)
to service_role;
grant execute on function public.mark_daily_chemistry_candidate_viewed(uuid, uuid)
to service_role;
grant execute on function public.record_dating_swipe(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid,
  uuid
) to service_role;
grant execute on function public.undo_dating_swipe(uuid, uuid, uuid, integer)
to service_role;

comment on function public.get_or_create_daily_chemistry_card(uuid) is
  'Creates at most one UTC Daily Chemistry card with up to three explainable, safe candidates and returns its backend-only projection.';
comment on function public.mark_daily_chemistry_candidate_viewed(uuid, uuid) is
  'Idempotently marks one actor-owned Daily Chemistry candidate as viewed.';
comment on function public.record_dating_swipe(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid,
  uuid
) is
  'Records a swipe through the contextual backend boundary and atomically consumes a Daily Chemistry candidate when supplied.';
comment on function public.undo_dating_swipe(uuid, uuid, uuid, integer) is
  'Undoes the latest swipe and restores its Daily Chemistry candidate when the card remains active.';

commit;
