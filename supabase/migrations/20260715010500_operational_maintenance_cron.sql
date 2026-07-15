begin;

-- One bounded database-local worker prevents short-lived operational rows from
-- accumulating and advances boost/video state even when the user is offline.
-- pg_cron runs this SQL in Postgres; it does not expose a browser endpoint.
create extension if not exists pg_cron;

create index if not exists video_queue_entries_waiting_expiry_idx
  on public.video_queue_entries (expires_at, id)
  where status = 'waiting'::public.video_queue_status;
create index if not exists video_session_signals_expiry_idx
  on public.video_session_signals (expires_at, id);
create index if not exists boosts_active_end_idx
  on public.boosts (ends_at, user_id)
  where status = 'active'::public.boost_status;
create index if not exists boosts_scheduled_start_idx
  on public.boosts (starts_at, user_id)
  where status = 'scheduled'::public.boost_status;

create or replace function private.run_operational_maintenance(
  p_batch_size integer default 250
)
returns table (
  expired_rate_limit_rows integer,
  expired_video_queue_rows integer,
  expired_video_session_rows integer,
  deleted_video_signal_rows integer,
  refreshed_boost_users integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_batch_size integer := greatest(1, least(coalesce(p_batch_size, 250), 1000));
  v_rate_limit_rows integer := 0;
  v_video_queue_rows integer := 0;
  v_video_session_rows integer := 0;
  v_video_signal_rows integer := 0;
  v_boost_users integer := 0;
  v_boost_user_id uuid;
begin
  with candidates as (
    select row.ctid
    from private.api_rate_limits row
    where row.expires_at <= clock_timestamp()
    order by row.expires_at, row.ctid
    limit v_batch_size
  ), deleted as (
    delete from private.api_rate_limits row
    using candidates
    where row.ctid = candidates.ctid
    returning 1
  )
  select count(*)::integer into v_rate_limit_rows from deleted;

  with candidates as (
    select entry.id
    from public.video_queue_entries entry
    where entry.status = 'waiting'
      and entry.expires_at <= now()
    order by entry.expires_at, entry.id
    limit v_batch_size
  ), expired as (
    update public.video_queue_entries entry
    set status = 'expired'
    from candidates
    where entry.id = candidates.id
    returning 1
  )
  select count(*)::integer into v_video_queue_rows from expired;

  with candidates as (
    select session.id
    from public.video_sessions session
    where session.status = 'connecting'
      and session.connection_expires_at is not null
      and session.connection_expires_at <= now()
    order by session.connection_expires_at, session.id
    limit v_batch_size
  ), expired as (
    update public.video_sessions session
    set status = 'failed',
        ended_at = coalesce(session.ended_at, now()),
        end_reason = coalesce(session.end_reason, 'connection_timeout'),
        last_activity_at = now()
    from candidates
    where session.id = candidates.id
    returning session.id
  ), disconnected as (
    update public.video_session_participants participant
    set state = 'disconnected',
        left_at = coalesce(participant.left_at, now())
    from expired
    where participant.video_session_id = expired.id
      and participant.state in ('matched', 'ready', 'joined')
    returning participant.video_session_id
  )
  select count(*)::integer into v_video_session_rows from expired;

  with candidates as (
    select signal.ctid
    from public.video_session_signals signal
    where signal.expires_at <= now()
    order by signal.expires_at, signal.ctid
    limit v_batch_size
  ), deleted as (
    delete from public.video_session_signals signal
    using candidates
    where signal.ctid = candidates.ctid
    returning 1
  )
  select count(*)::integer into v_video_signal_rows from deleted;

  for v_boost_user_id in
    with due_users as (
      select boost.user_id, min(boost.due_at) as due_at
      from (
        select active_boost.user_id, active_boost.ends_at as due_at
        from public.boosts active_boost
        where active_boost.status = 'active'
          and active_boost.ends_at <= now()
        union all
        select scheduled_boost.user_id, scheduled_boost.starts_at as due_at
        from public.boosts scheduled_boost
        where scheduled_boost.status = 'scheduled'
          and scheduled_boost.starts_at <= now()
      ) boost
      group by boost.user_id
      order by min(boost.due_at), boost.user_id
      limit v_batch_size
    )
    select due_users.user_id from due_users
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('boost-schedule:' || v_boost_user_id::text, 0)
    );
    perform private.expire_user_boosts(v_boost_user_id);
    v_boost_users := v_boost_users + 1;
  end loop;

  return query select
    v_rate_limit_rows,
    v_video_queue_rows,
    v_video_session_rows,
    v_video_signal_rows,
    v_boost_users;
end;
$$;

revoke all on function private.run_operational_maintenance(integer)
  from public, anon, authenticated, service_role;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'dating-operational-maintenance'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'dating-operational-maintenance',
    '* * * * *',
    'select private.run_operational_maintenance(250);'
  );
end;
$$;

commit;
