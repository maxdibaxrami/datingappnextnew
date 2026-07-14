begin;

-- now() is stable for an entire transaction, so created_at cannot totally order
-- multiple actions produced inside the same transaction. An internal identity
-- gives undo a deterministic latest-action order without exposing it publicly.
alter table public.swipe_actions
  add column if not exists action_sequence bigint generated always as identity;

drop index if exists public.swipe_actions_actor_current_created_idx;
create index swipe_actions_actor_current_sequence_idx
  on public.swipe_actions (actor_user_id, action_sequence desc)
  where action_type <> 'undo' and undone_at is null;

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
  order by sa.action_sequence desc
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

revoke all on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) from public, anon, authenticated;

grant execute on function public.undo_latest_swipe(
  uuid,
  uuid,
  uuid,
  integer
) to service_role;

commit;
