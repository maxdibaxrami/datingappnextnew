begin;

-- Qualify MATCHES columns returned from PL/pgSQL statements. The function's
-- RETURNS TABLE output also defines a matched_at variable, so unqualified
-- RETURNING names are ambiguous at runtime.
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
        insert into public.matches as inserted_match (
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
        returning
          inserted_match.id,
          inserted_match.status,
          inserted_match.matched_at
        into v_match_id, v_match_status, v_matched_at;
        v_match_created := true;
      elsif v_match_status in ('unmatched', 'expired') then
        update public.matches as updated_match
        set
          status = 'active',
          source = v_match_source,
          matched_at = now(),
          unmatched_at = null,
          last_interaction_at = now()
        where id = v_match_id
        returning
          updated_match.status,
          updated_match.matched_at
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

revoke all on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) from public, anon, authenticated;

grant execute on function public.record_swipe_action(
  uuid,
  uuid,
  public.swipe_action_type,
  public.discovery_surface,
  uuid
) to service_role;

commit;
