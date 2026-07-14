begin;

-- Moderation is a server-only workflow. The browser talks to Next.js routes,
-- while service-role RPCs perform the authoritative database transitions.
revoke all on table public.blocks from public, anon, authenticated;
revoke all on table public.reports from public, anon, authenticated;
revoke all on table public.moderation_queue from public, anon, authenticated;
revoke all on table public.admin_actions from public, anon, authenticated;
revoke all on table public.user_restrictions from public, anon, authenticated;
revoke all on table public.bans from public, anon, authenticated;
revoke all on table public.photo_moderation_events from public, anon, authenticated;
revoke all on table public.post_moderation_events from public, anon, authenticated;
revoke all on table public.video_report_events from public, anon, authenticated;

grant select, insert, update, delete on table public.blocks to service_role;
grant select, insert, update, delete on table public.reports to service_role;
grant select, insert, update, delete on table public.moderation_queue to service_role;
grant select, insert, update, delete on table public.admin_actions to service_role;
grant select, insert, update, delete on table public.user_restrictions to service_role;
grant select, insert, update, delete on table public.bans to service_role;
grant select, insert, update, delete on table public.photo_moderation_events to service_role;
grant select, insert, update, delete on table public.post_moderation_events to service_role;
grant select, insert, update, delete on table public.video_report_events to service_role;

-- Reports originally supported users, posts, and video sessions. Profile photos
-- need their own durable foreign key so their owner is always derived on the
-- server instead of trusted from the client.
alter table public.reports
  add column if not exists profile_photo_id uuid references public.profile_photos(id) on delete set null;

alter table public.reports
  drop constraint if exists reports_target_present_check;
alter table public.reports
  add constraint reports_target_present_check
  check (num_nonnulls(reported_user_id, post_id, video_session_id, profile_photo_id) >= 1);

create index if not exists reports_reporter_created_idx
  on public.reports (reporter_user_id, created_at desc);
create index if not exists reports_reported_status_created_idx
  on public.reports (reported_user_id, status, created_at desc)
  where reported_user_id is not null;
create index if not exists reports_profile_photo_id_idx
  on public.reports (profile_photo_id)
  where profile_photo_id is not null;
create unique index if not exists moderation_queue_one_report_idx
  on public.moderation_queue (report_id)
  where report_id is not null;
create index if not exists moderation_queue_assignee_status_created_idx
  on public.moderation_queue (assigned_to_user_id, status, created_at desc)
  where assigned_to_user_id is not null;
create index if not exists admin_actions_actor_user_id_idx
  on public.admin_actions (actor_user_id, created_at desc)
  where actor_user_id is not null;
create index if not exists admin_actions_moderation_queue_id_idx
  on public.admin_actions (moderation_queue_id, created_at desc)
  where moderation_queue_id is not null;
create index if not exists admin_actions_report_id_idx
  on public.admin_actions (report_id, created_at desc)
  where report_id is not null;
create index if not exists admin_actions_target_user_id_idx
  on public.admin_actions (target_user_id, created_at desc)
  where target_user_id is not null;
create index if not exists photo_moderation_events_queue_id_idx
  on public.photo_moderation_events (moderation_queue_id, created_at desc)
  where moderation_queue_id is not null;
create index if not exists post_moderation_events_queue_id_idx
  on public.post_moderation_events (moderation_queue_id, created_at desc)
  where moderation_queue_id is not null;
create index if not exists video_report_events_queue_report_idx
  on public.video_report_events (report_id, created_at desc)
  where report_id is not null;

create or replace function private.assert_moderation_actor(
  p_actor_user_id uuid,
  p_requires_moderator boolean default false
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status public.user_status;
  v_role public.user_role;
begin
  if p_actor_user_id is null then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;

  select account.status, account.role
  into v_status, v_role
  from public.app_users account
  where account.id = p_actor_user_id;

  if not found or v_status <> 'active' then
    raise exception using errcode = 'P0001', message = 'account_unavailable';
  end if;

  if p_requires_moderator and v_role not in ('admin', 'moderator') then
    raise exception using errcode = '42501', message = 'moderator_required';
  end if;
end;
$$;

create or replace function public.set_user_block(
  p_actor_user_id uuid,
  p_blocked_user_id uuid,
  p_reason text default null
)
returns table (
  blocker_user_id uuid,
  blocked_user_id uuid,
  created_at timestamptz,
  created boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_created_at timestamptz;
  v_created boolean := false;
begin
  perform private.assert_moderation_actor(p_actor_user_id, false);

  if p_blocked_user_id is null
    or p_actor_user_id = p_blocked_user_id
    or (p_reason is not null and char_length(trim(p_reason)) > 500)
  then
    raise exception using errcode = '22023', message = 'invalid_block_input';
  end if;

  if not exists (
    select 1 from public.app_users account where account.id = p_blocked_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'block_target_unavailable';
  end if;

  insert into public.blocks (blocker_user_id, blocked_user_id, reason)
  values (p_actor_user_id, p_blocked_user_id, nullif(trim(p_reason), ''))
  on conflict (blocker_user_id, blocked_user_id) do nothing
  returning public.blocks.created_at into v_created_at;

  if found then
    v_created := true;
  else
    select block.created_at into v_created_at
    from public.blocks block
    where block.blocker_user_id = p_actor_user_id
      and block.blocked_user_id = p_blocked_user_id;
  end if;

  -- A blocked relationship must immediately remove any active match from the
  -- user experience. It stays historically auditable as a blocked match.
  update public.matches match_row
  set status = 'blocked', unmatched_at = coalesce(match_row.unmatched_at, now())
  where match_row.status = 'active'
    and (
      (match_row.user_a_id = p_actor_user_id and match_row.user_b_id = p_blocked_user_id)
      or (match_row.user_a_id = p_blocked_user_id and match_row.user_b_id = p_actor_user_id)
    );

  return query
  select p_actor_user_id, p_blocked_user_id, v_created_at, v_created;
end;
$$;

create or replace function public.remove_user_block(
  p_actor_user_id uuid,
  p_blocked_user_id uuid
)
returns table (blocked_user_id uuid, removed boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_removed boolean := false;
  v_deleted_count bigint := 0;
begin
  perform private.assert_moderation_actor(p_actor_user_id, false);

  if p_blocked_user_id is null or p_actor_user_id = p_blocked_user_id then
    raise exception using errcode = '22023', message = 'invalid_block_input';
  end if;

  delete from public.blocks block
  where block.blocker_user_id = p_actor_user_id
    and block.blocked_user_id = p_blocked_user_id;
  get diagnostics v_deleted_count = row_count;
  v_removed := v_deleted_count > 0;

  return query select p_blocked_user_id, v_removed;
end;
$$;

create or replace function public.get_user_blocks(
  p_actor_user_id uuid,
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_user_id uuid default null
)
returns table (
  blocked_user_id uuid,
  created_at timestamptz,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_moderation_actor(p_actor_user_id, false);

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_user_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select block.blocked_user_id, block.created_at, block.reason
  from public.blocks block
  where block.blocker_user_id = p_actor_user_id
    and (
      p_cursor_created_at is null
      or (block.created_at, block.blocked_user_id) < (p_cursor_created_at, p_cursor_user_id)
    )
  order by block.created_at desc, block.blocked_user_id desc
  limit p_limit;
end;
$$;

create or replace function public.create_moderation_report(
  p_reporter_user_id uuid,
  p_target_type public.moderation_target_type,
  p_target_id uuid,
  p_reason text,
  p_details text default null,
  p_reported_user_id uuid default null,
  p_priority integer default 3
)
returns table (
  report_id uuid,
  moderation_queue_id uuid,
  report_status public.report_status,
  queue_status public.moderation_queue_status,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_queue_id uuid;
  v_reported_user_id uuid;
  v_reported_photo_id uuid;
  v_reported_post_id uuid;
  v_reported_video_session_id uuid;
  v_created_at timestamptz;
begin
  perform private.assert_moderation_actor(p_reporter_user_id, false);

  if p_target_type is null
    or p_target_type not in ('user', 'profile', 'profile_photo', 'post', 'video_session')
    or p_target_id is null
    or p_reason is null
    or char_length(trim(p_reason)) < 2
    or char_length(trim(p_reason)) > 500
    or (p_details is not null and char_length(trim(p_details)) > 4000)
    or p_priority is null
    or p_priority < 1
    or p_priority > 5
  then
    raise exception using errcode = '22023', message = 'invalid_report_input';
  end if;

  case p_target_type
    when 'user', 'profile' then
      select account.id into v_reported_user_id
      from public.app_users account
      where account.id = p_target_id;
    when 'profile_photo' then
      select photo.user_id, photo.id
      into v_reported_user_id, v_reported_photo_id
      from public.profile_photos photo
      where photo.id = p_target_id;
    when 'post' then
      select post_row.author_user_id, post_row.id
      into v_reported_user_id, v_reported_post_id
      from public.posts post_row
      where post_row.id = p_target_id
        and post_row.deleted_at is null;
    when 'video_session' then
      select session.id into v_reported_video_session_id
      from public.video_sessions session
      where session.id = p_target_id;

      if v_reported_video_session_id is not null then
        select account.id into v_reported_user_id
        from public.app_users account
        where account.id = p_reported_user_id;
      end if;
  end case;

  if v_reported_user_id is null
    or (p_target_type = 'video_session' and p_reported_user_id is null)
  then
    raise exception using errcode = 'P0001', message = 'report_target_unavailable';
  end if;
  if v_reported_user_id = p_reporter_user_id then
    raise exception using errcode = '22023', message = 'cannot_report_self';
  end if;

  insert into public.reports (
    reporter_user_id,
    reported_user_id,
    post_id,
    video_session_id,
    profile_photo_id,
    reason,
    details,
    status
  ) values (
    p_reporter_user_id,
    v_reported_user_id,
    v_reported_post_id,
    v_reported_video_session_id,
    v_reported_photo_id,
    trim(p_reason),
    nullif(trim(p_details), ''),
    'pending'
  ) returning id, created_at into v_report_id, v_created_at;

  insert into public.moderation_queue (
    report_id,
    reporter_user_id,
    reported_user_id,
    target_type,
    target_id,
    reason,
    priority,
    status,
    metadata
  ) values (
    v_report_id,
    p_reporter_user_id,
    v_reported_user_id,
    p_target_type,
    p_target_id,
    trim(p_reason),
    p_priority,
    'open',
    jsonb_build_object('source', 'user_report')
  ) returning id into v_queue_id;

  if v_reported_video_session_id is not null then
    insert into public.video_report_events (
      video_session_id,
      reporter_user_id,
      reported_user_id,
      report_id,
      event_type,
      reason,
      metadata
    ) values (
      v_reported_video_session_id,
      p_reporter_user_id,
      v_reported_user_id,
      v_report_id,
      'report_created',
      trim(p_reason),
      jsonb_build_object('moderation_queue_id', v_queue_id)
    );
  end if;

  return query
  select v_report_id, v_queue_id, 'pending'::public.report_status,
    'open'::public.moderation_queue_status, v_created_at;
end;
$$;

create or replace function public.get_my_moderation_reports(
  p_reporter_user_id uuid,
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_report_id uuid default null
)
returns table (
  report_id uuid,
  target_type public.moderation_target_type,
  target_id uuid,
  reason text,
  status public.report_status,
  created_at timestamptz,
  decided_at timestamptz,
  public_message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_moderation_actor(p_reporter_user_id, false);
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_report_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    report.id,
    queue.target_type,
    queue.target_id,
    report.reason,
    report.status,
    report.created_at,
    report.decided_at,
    coalesce(restriction.public_message, ban.public_message)
  from public.reports report
  join public.moderation_queue queue on queue.report_id = report.id
  left join lateral (
    select row.public_message
    from public.user_restrictions row
    where row.report_id = report.id
    order by row.created_at desc
    limit 1
  ) restriction on true
  left join lateral (
    select row.public_message
    from public.bans row
    where row.report_id = report.id
    order by row.created_at desc
    limit 1
  ) ban on true
  where report.reporter_user_id = p_reporter_user_id
    and (
      p_cursor_created_at is null
      or (report.created_at, report.id) < (p_cursor_created_at, p_cursor_report_id)
    )
  order by report.created_at desc, report.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_moderation_queue(
  p_actor_user_id uuid,
  p_limit integer default 50,
  p_cursor_created_at timestamptz default null,
  p_cursor_queue_id uuid default null,
  p_statuses public.moderation_queue_status[] default null,
  p_assigned_to_me boolean default false
)
returns table (
  moderation_queue_id uuid,
  report_id uuid,
  target_type public.moderation_target_type,
  target_id uuid,
  reporter_user_id uuid,
  reported_user_id uuid,
  reason text,
  details text,
  priority integer,
  status public.moderation_queue_status,
  assigned_to_user_id uuid,
  assigned_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_moderation_actor(p_actor_user_id, true);
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_queue_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    queue.id,
    queue.report_id,
    queue.target_type,
    queue.target_id,
    queue.reporter_user_id,
    queue.reported_user_id,
    queue.reason,
    report.details,
    queue.priority,
    queue.status,
    queue.assigned_to_user_id,
    queue.assigned_at,
    queue.opened_at,
    queue.created_at,
    queue.updated_at
  from public.moderation_queue queue
  left join public.reports report on report.id = queue.report_id
  where (p_statuses is null or queue.status = any(p_statuses))
    and (not p_assigned_to_me or queue.assigned_to_user_id = p_actor_user_id)
    and (
      p_cursor_created_at is null
      or (queue.created_at, queue.id) < (p_cursor_created_at, p_cursor_queue_id)
    )
  order by queue.created_at desc, queue.id desc
  limit p_limit;
end;
$$;

create or replace function public.assign_moderation_case(
  p_actor_user_id uuid,
  p_moderation_queue_id uuid,
  p_assignee_user_id uuid default null
)
returns table (
  moderation_queue_id uuid,
  status public.moderation_queue_status,
  assigned_to_user_id uuid,
  assigned_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_assignee uuid := coalesce(p_assignee_user_id, p_actor_user_id);
  v_status public.moderation_queue_status;
  v_assigned_at timestamptz;
begin
  perform private.assert_moderation_actor(p_actor_user_id, true);
  perform private.assert_moderation_actor(v_assignee, true);

  if p_moderation_queue_id is null then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;

  update public.moderation_queue queue
  set assigned_to_user_id = v_assignee,
      assigned_at = now(),
      status = case when queue.status = 'open' then 'assigned'::public.moderation_queue_status else queue.status end,
      updated_at = now()
  where queue.id = p_moderation_queue_id
    and queue.status not in ('resolved', 'dismissed')
  returning queue.status, queue.assigned_at into v_status, v_assigned_at;

  if not found then
    raise exception using errcode = 'P0001', message = 'moderation_case_unavailable';
  end if;

  return query select p_moderation_queue_id, v_status, v_assignee, v_assigned_at;
end;
$$;

create or replace function public.decide_moderation_case(
  p_actor_user_id uuid,
  p_moderation_queue_id uuid,
  p_action_type public.admin_action_type,
  p_note text default null,
  p_restriction_type public.user_restriction_type default null,
  p_ends_at timestamptz default null,
  p_public_message text default null
)
returns table (
  moderation_queue_id uuid,
  report_id uuid,
  queue_status public.moderation_queue_status,
  report_status public.report_status,
  action_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_queue public.moderation_queue%rowtype;
  v_report public.reports%rowtype;
  v_action_id uuid;
  v_queue_status public.moderation_queue_status;
  v_report_status public.report_status;
  v_target_user_id uuid;
  v_previous_photo_status public.moderation_state;
  v_previous_post_status public.moderation_state;
begin
  perform private.assert_moderation_actor(p_actor_user_id, true);

  if p_moderation_queue_id is null
    or p_action_type is null
    or (p_note is not null and char_length(trim(p_note)) > 4000)
    or (p_public_message is not null and char_length(trim(p_public_message)) > 1000)
    or (p_ends_at is not null and p_ends_at <= now())
  then
    raise exception using errcode = '22023', message = 'invalid_moderation_input';
  end if;

  select * into v_queue
  from public.moderation_queue queue
  where queue.id = p_moderation_queue_id
  for update;
  if not found or v_queue.status in ('resolved', 'dismissed') then
    raise exception using errcode = 'P0001', message = 'moderation_case_unavailable';
  end if;

  if v_queue.report_id is not null then
    select * into v_report from public.reports report where report.id = v_queue.report_id for update;
  end if;
  v_target_user_id := v_queue.reported_user_id;

  if p_action_type in ('hide_profile', 'unhide_profile', 'restrict_user', 'lift_restriction', 'ban_user', 'unban_user', 'warn_user', 'verify_user', 'reject_verification')
    and v_target_user_id is null
  then
    raise exception using errcode = '22023', message = 'moderation_target_missing';
  end if;

  if p_action_type = 'hide_profile' then
    update public.profiles profile
    set visibility = 'hidden', discoverable = false, updated_at = now()
    where profile.user_id = v_target_user_id;
  elsif p_action_type = 'unhide_profile' then
    update public.profiles profile
    set visibility = 'public', discoverable = true, updated_at = now()
    where profile.user_id = v_target_user_id
      and profile.profile_completed_at is not null;
  elsif p_action_type = 'remove_photo' then
    if v_queue.target_type <> 'profile_photo' then
      raise exception using errcode = '22023', message = 'invalid_moderation_action_target';
    end if;
    select photo.moderation_status into v_previous_photo_status
    from public.profile_photos photo where photo.id = v_queue.target_id for update;
    if not found then raise exception using errcode = 'P0001', message = 'moderation_target_missing'; end if;
    update public.profile_photos photo
    set moderation_status = 'rejected', deleted_at = now(), is_primary = false
    where photo.id = v_queue.target_id;
    insert into public.photo_moderation_events (
      actor_user_id, moderation_queue_id, photo_id, user_id, previous_status, new_status, reason, metadata
    ) values (
      p_actor_user_id, v_queue.id, v_queue.target_id, v_target_user_id, v_previous_photo_status, 'rejected',
      nullif(trim(p_note), ''), jsonb_build_object('action', p_action_type)
    );
    perform public.refresh_profile_completion(v_target_user_id);
  elsif p_action_type = 'restore_photo' then
    if v_queue.target_type <> 'profile_photo' then
      raise exception using errcode = '22023', message = 'invalid_moderation_action_target';
    end if;
    select photo.moderation_status into v_previous_photo_status
    from public.profile_photos photo where photo.id = v_queue.target_id for update;
    if not found then raise exception using errcode = 'P0001', message = 'moderation_target_missing'; end if;
    update public.profile_photos photo
    set moderation_status = 'approved', deleted_at = null
    where photo.id = v_queue.target_id;
    insert into public.photo_moderation_events (
      actor_user_id, moderation_queue_id, photo_id, user_id, previous_status, new_status, reason, metadata
    ) values (
      p_actor_user_id, v_queue.id, v_queue.target_id, v_target_user_id, v_previous_photo_status, 'approved',
      nullif(trim(p_note), ''), jsonb_build_object('action', p_action_type)
    );
    perform public.refresh_profile_completion(v_target_user_id);
  elsif p_action_type = 'remove_post' then
    if v_queue.target_type <> 'post' then
      raise exception using errcode = '22023', message = 'invalid_moderation_action_target';
    end if;
    select 'approved'::public.moderation_state into v_previous_post_status
    from public.posts post_row where post_row.id = v_queue.target_id for update;
    if not found then raise exception using errcode = 'P0001', message = 'moderation_target_missing'; end if;
    update public.posts post_row set deleted_at = now(), updated_at = now() where post_row.id = v_queue.target_id;
    insert into public.post_moderation_events (
      actor_user_id, moderation_queue_id, post_id, user_id, previous_status, new_status, reason, metadata
    ) values (
      p_actor_user_id, v_queue.id, v_queue.target_id, v_target_user_id, v_previous_post_status, 'rejected',
      nullif(trim(p_note), ''), jsonb_build_object('action', p_action_type)
    );
  elsif p_action_type = 'restore_post' then
    if v_queue.target_type <> 'post' then
      raise exception using errcode = '22023', message = 'invalid_moderation_action_target';
    end if;
    select 'rejected'::public.moderation_state into v_previous_post_status
    from public.posts post_row where post_row.id = v_queue.target_id for update;
    if not found then raise exception using errcode = 'P0001', message = 'moderation_target_missing'; end if;
    update public.posts post_row set deleted_at = null, updated_at = now() where post_row.id = v_queue.target_id;
    insert into public.post_moderation_events (
      actor_user_id, moderation_queue_id, post_id, user_id, previous_status, new_status, reason, metadata
    ) values (
      p_actor_user_id, v_queue.id, v_queue.target_id, v_target_user_id, v_previous_post_status, 'approved',
      nullif(trim(p_note), ''), jsonb_build_object('action', p_action_type)
    );
  elsif p_action_type = 'restrict_user' then
    if p_restriction_type is null then
      raise exception using errcode = '22023', message = 'restriction_type_required';
    end if;
    insert into public.user_restrictions (
      user_id, created_by_user_id, moderation_queue_id, report_id, restriction_type, reason, public_message,
      starts_at, ends_at, status, metadata
    ) values (
      v_target_user_id, p_actor_user_id, v_queue.id, v_queue.report_id, p_restriction_type,
      nullif(trim(p_note), ''), nullif(trim(p_public_message), ''), now(), p_ends_at, 'active',
      jsonb_build_object('action', p_action_type)
    );
  elsif p_action_type = 'lift_restriction' then
    update public.user_restrictions restriction
    set status = 'lifted', lifted_at = now(), lifted_by_user_id = p_actor_user_id, updated_at = now()
    where restriction.user_id = v_target_user_id
      and restriction.status = 'active';
  elsif p_action_type = 'ban_user' then
    insert into public.bans (
      user_id, banned_by_user_id, moderation_queue_id, report_id, ban_type, reason, public_message,
      starts_at, ends_at, status, metadata
    ) values (
      v_target_user_id, p_actor_user_id, v_queue.id, v_queue.report_id,
      case when p_ends_at is null then 'permanent'::public.ban_type else 'temporary'::public.ban_type end,
      coalesce(nullif(trim(p_note), ''), v_queue.reason, 'Moderation action'), nullif(trim(p_public_message), ''),
      now(), p_ends_at, 'active', jsonb_build_object('action', p_action_type)
    );
    update public.app_users account set status = 'banned', updated_at = now() where account.id = v_target_user_id;
  elsif p_action_type = 'unban_user' then
    update public.bans ban
    set status = 'lifted', lifted_at = now(), lifted_by_user_id = p_actor_user_id, updated_at = now()
    where ban.user_id = v_target_user_id and ban.status = 'active';
    update public.app_users account set status = 'active', updated_at = now() where account.id = v_target_user_id;
  elsif p_action_type = 'verify_user' then
    if v_queue.target_type = 'profile_photo' then
      update public.profile_photos photo set face_check_status = 'manual_review', moderation_status = 'approved'
      where photo.id = v_queue.target_id;
    end if;
  elsif p_action_type = 'reject_verification' then
    if v_queue.target_type = 'profile_photo' then
      update public.profile_photos photo set face_check_status = 'failed', moderation_status = 'rejected'
      where photo.id = v_queue.target_id;
    end if;
  elsif p_action_type = 'refund_payment' then
    -- Payment-provider refunds must be initiated and verified by a dedicated
    -- adapter. Recording a refund here would create a false financial state.
    raise exception using errcode = '22023', message = 'refund_requires_payment_adapter';
  elsif p_action_type not in ('warn_user', 'manual_note') then
    raise exception using errcode = '22023', message = 'invalid_moderation_action';
  end if;

  if p_action_type = 'manual_note' then
    v_queue_status := 'needs_more_info';
    v_report_status := case
      when v_queue.report_id is null then 'resolved'::public.report_status
      else 'reviewing'::public.report_status
    end;
  else
    v_queue_status := 'resolved';
    v_report_status := case
      when v_queue.report_id is null then 'resolved'::public.report_status
      else 'action_taken'::public.report_status
    end;
  end if;

  update public.moderation_queue queue
  set status = v_queue_status,
      notes = coalesce(nullif(trim(p_note), ''), queue.notes),
      assigned_to_user_id = coalesce(queue.assigned_to_user_id, p_actor_user_id),
      assigned_at = coalesce(queue.assigned_at, now()),
      resolved_at = case when v_queue_status in ('resolved', 'dismissed') then now() else null end,
      updated_at = now()
  where queue.id = v_queue.id;

  if v_queue.report_id is not null then
    update public.reports report
    set status = v_report_status,
        admin_note = coalesce(nullif(trim(p_note), ''), report.admin_note),
        decided_at = case when v_queue_status = 'resolved' then now() else null end,
        decided_by_user_id = case when v_queue_status = 'resolved' then p_actor_user_id else null end,
        updated_at = now()
    where report.id = v_queue.report_id;
  end if;

  insert into public.admin_actions (
    actor_user_id, moderation_queue_id, report_id, target_type, target_id, target_user_id, action_type, reason, metadata
  ) values (
    p_actor_user_id, v_queue.id, v_queue.report_id, v_queue.target_type, v_queue.target_id, v_target_user_id,
    p_action_type, nullif(trim(p_note), ''),
    jsonb_strip_nulls(jsonb_build_object(
      'restriction_type', p_restriction_type,
      'ends_at', p_ends_at,
      'public_message', nullif(trim(p_public_message), '')
    ))
  ) returning id into v_action_id;

  return query select v_queue.id, v_queue.report_id, v_queue_status, v_report_status, v_action_id;
end;
$$;

-- Every moderation RPC is reachable only from trusted server code.
revoke all on function private.assert_moderation_actor(uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.set_user_block(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.remove_user_block(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_user_blocks(uuid, integer, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.create_moderation_report(uuid, public.moderation_target_type, uuid, text, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_my_moderation_reports(uuid, integer, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.get_moderation_queue(uuid, integer, timestamptz, uuid, public.moderation_queue_status[], boolean) from public, anon, authenticated;
revoke all on function public.assign_moderation_case(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.decide_moderation_case(uuid, uuid, public.admin_action_type, text, public.user_restriction_type, timestamptz, text) from public, anon, authenticated;

grant execute on function public.set_user_block(uuid, uuid, text) to service_role;
grant execute on function public.remove_user_block(uuid, uuid) to service_role;
grant execute on function public.get_user_blocks(uuid, integer, timestamptz, uuid) to service_role;
grant execute on function public.create_moderation_report(uuid, public.moderation_target_type, uuid, text, text, uuid, integer) to service_role;
grant execute on function public.get_my_moderation_reports(uuid, integer, timestamptz, uuid) to service_role;
grant execute on function public.get_moderation_queue(uuid, integer, timestamptz, uuid, public.moderation_queue_status[], boolean) to service_role;
grant execute on function public.assign_moderation_case(uuid, uuid, uuid) to service_role;
grant execute on function public.decide_moderation_case(uuid, uuid, public.admin_action_type, text, public.user_restriction_type, timestamptz, text) to service_role;

commit;
