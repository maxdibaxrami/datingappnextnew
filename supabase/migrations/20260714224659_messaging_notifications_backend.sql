begin;

-- Conversations are created only from an active match. The browser cannot read
-- or mutate these tables directly; all access goes through server-only RPCs.
do $$
begin
  create type public.conversation_status as enum ('active', 'closed', 'blocked');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.message_type as enum ('text');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.notification_type as enum (
    'message',
    'match',
    'date_idea',
    'gift',
    'payment',
    'moderation',
    'video'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete restrict,
  user_a_id uuid not null references public.app_users(id) on delete restrict,
  user_b_id uuid not null references public.app_users(id) on delete restrict,
  status public.conversation_status not null default 'active',
  last_message_sequence bigint not null default 0 check (last_message_sequence >= 0),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_canonical_order_check check (user_a_id < user_b_id)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete restrict,
  joined_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  last_read_message_id uuid,
  last_read_sequence bigint not null default 0 check (last_read_sequence >= 0),
  last_read_at timestamptz,
  unread_count integer not null default 0 check (unread_count >= 0),
  notifications_muted_until timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  sender_user_id uuid not null references public.app_users(id) on delete restrict,
  message_type public.message_type not null default 'text',
  body text not null,
  sequence bigint not null check (sequence > 0),
  client_message_id uuid not null,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_text_body_check check (
    message_type = 'text'
    and char_length(btrim(body)) between 1 and 4000
  ),
  constraint messages_metadata_object_check check (jsonb_typeof(metadata) = 'object'),
  constraint messages_conversation_sequence_key unique (conversation_id, sequence),
  constraint messages_sender_client_message_key unique (sender_user_id, client_message_id)
);

alter table public.conversation_members
  drop constraint if exists conversation_members_last_read_message_id_fkey;
alter table public.conversation_members
  add constraint conversation_members_last_read_message_id_fkey
  foreign key (last_read_message_id) references public.messages(id) on delete set null;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete restrict,
  notification_type public.notification_type not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  constraint user_notifications_title_check check (char_length(btrim(title)) between 1 and 160),
  constraint user_notifications_body_check check (body is null or char_length(btrim(body)) between 1 and 500),
  constraint user_notifications_entity_type_check check (
    entity_type is null or entity_type ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  constraint user_notifications_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists conversations_status_match_idx
  on public.conversations (status, match_id);
create index if not exists conversation_members_user_activity_idx
  on public.conversation_members (user_id, last_activity_at desc, conversation_id desc);
create index if not exists messages_conversation_sent_idx
  on public.messages (conversation_id, sent_at desc, id desc)
  where deleted_at is null;
create index if not exists messages_conversation_latest_idx
  on public.messages (conversation_id, sequence desc)
  where deleted_at is null;
create index if not exists messages_conversation_sender_sequence_idx
  on public.messages (conversation_id, sender_user_id, sequence)
  where deleted_at is null;
create index if not exists messages_reply_to_message_id_idx
  on public.messages (reply_to_message_id)
  where reply_to_message_id is not null;
create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc, id desc);
create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc, id desc)
  where read_at is null;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_notifications enable row level security;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.conversation_members from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;
revoke all on table public.user_notifications from public, anon, authenticated;

create or replace function private.sync_match_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.conversation_status;
begin
  if new.status = 'active' then
    insert into public.conversations (
      match_id, user_a_id, user_b_id, status, last_message_at
    ) values (
      new.id, new.user_a_id, new.user_b_id, 'active', new.last_interaction_at
    )
    on conflict (match_id) do update
      set status = 'active',
          user_a_id = excluded.user_a_id,
          user_b_id = excluded.user_b_id,
          updated_at = now();

    insert into public.conversation_members (
      conversation_id, user_id, joined_at, last_activity_at
    )
    select conversation.id, member.user_id, new.matched_at, new.last_interaction_at
    from public.conversations conversation
    cross join lateral (
      values (new.user_a_id), (new.user_b_id)
    ) as member(user_id)
    where conversation.match_id = new.id
    on conflict (conversation_id, user_id) do nothing;

    if tg_op = 'INSERT' then
      insert into public.user_notifications (
        user_id, notification_type, title, body, entity_type, entity_id, payload
      ) values
        (
          new.user_a_id,
          'match',
          'New match',
          'You have a new match. Start a conversation when you are ready.',
          'match',
          new.id,
          jsonb_build_object('match_id', new.id, 'other_user_id', new.user_b_id)
        ),
        (
          new.user_b_id,
          'match',
          'New match',
          'You have a new match. Start a conversation when you are ready.',
          'match',
          new.id,
          jsonb_build_object('match_id', new.id, 'other_user_id', new.user_a_id)
        );
    end if;
  else
    v_status := case new.status
      when 'blocked' then 'blocked'::public.conversation_status
      else 'closed'::public.conversation_status
    end;

    update public.conversations conversation
    set status = v_status,
        updated_at = now()
    where conversation.match_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_match_conversation_after_change on public.matches;
create trigger sync_match_conversation_after_change
after insert or update of status on public.matches
for each row execute function private.sync_match_conversation();

-- Existing active matches are brought forward without producing historical push
-- notifications. New matches are handled by the trigger above.
insert into public.conversations (
  match_id, user_a_id, user_b_id, status, last_message_at
)
select match_row.id, match_row.user_a_id, match_row.user_b_id,
  'active'::public.conversation_status, match_row.last_interaction_at
from public.matches match_row
where match_row.status = 'active'
on conflict (match_id) do nothing;

insert into public.conversation_members (
  conversation_id, user_id, joined_at, last_activity_at
)
select conversation.id, member.user_id, match_row.matched_at, match_row.last_interaction_at
from public.conversations conversation
join public.matches match_row on match_row.id = conversation.match_id
cross join lateral (
  values (conversation.user_a_id), (conversation.user_b_id)
) as member(user_id)
on conflict (conversation_id, user_id) do nothing;

create or replace function private.assert_messaging_account(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_dating_account(p_user_id, false);
end;
$$;

create or replace function private.get_active_conversation_other_user(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_lock_conversation boolean default false
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_other_user_id uuid;
begin
  if p_actor_user_id is null or p_conversation_id is null then
    raise exception using errcode = '22023', message = 'invalid_conversation_input';
  end if;

  if p_lock_conversation then
    select * into v_conversation
    from public.conversations conversation
    where conversation.id = p_conversation_id
    for update;
  else
    select * into v_conversation
    from public.conversations conversation
    where conversation.id = p_conversation_id;
  end if;

  if not found
    or v_conversation.status <> 'active'
    or not exists (
      select 1
      from public.matches match_row
      where match_row.id = v_conversation.match_id
        and match_row.status = 'active'
        and match_row.user_a_id = v_conversation.user_a_id
        and match_row.user_b_id = v_conversation.user_b_id
    )
  then
    raise exception using errcode = 'P0001', message = 'conversation_unavailable';
  end if;

  if p_actor_user_id = v_conversation.user_a_id then
    v_other_user_id := v_conversation.user_b_id;
  elsif p_actor_user_id = v_conversation.user_b_id then
    v_other_user_id := v_conversation.user_a_id;
  else
    raise exception using errcode = 'P0001', message = 'conversation_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = v_other_user_id)
      or (block_row.blocker_user_id = v_other_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'conversation_unavailable';
  end if;

  perform private.assert_messaging_account(p_actor_user_id);
  perform private.assert_messaging_account(v_other_user_id);
  return v_other_user_id;
end;
$$;

create or replace function public.get_user_conversations(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_activity_at timestamptz default null,
  p_cursor_conversation_id uuid default null
)
returns table (
  conversation_id uuid,
  match_id uuid,
  other_user_id uuid,
  last_activity_at timestamptz,
  last_message_at timestamptz,
  last_message_id uuid,
  last_message_preview text,
  last_message_sender_user_id uuid,
  unread_count integer,
  notifications_muted_until timestamptz,
  display_name text,
  age_years integer,
  country_code text,
  city_name text,
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
  perform private.assert_messaging_account(p_actor_user_id);
  if (p_cursor_activity_at is null) <> (p_cursor_conversation_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    conversation.id,
    conversation.match_id,
    other_user.id,
    member.last_activity_at,
    conversation.last_message_at,
    latest_message.id,
    case
      when latest_message.body is null then null
      else left(latest_message.body, 160)
    end,
    latest_message.sender_user_id,
    member.unread_count,
    member.notifications_muted_until,
    profile.display_name,
    profile.age_years,
    profile.country_code,
    profile.city_name,
    photo.public_url,
    photo.blur_hash,
    photo.width,
    photo.height
  from public.conversation_members member
  join public.conversations conversation on conversation.id = member.conversation_id
  join public.matches match_row on match_row.id = conversation.match_id
  join lateral (
    select case
      when conversation.user_a_id = p_actor_user_id then conversation.user_b_id
      else conversation.user_a_id
    end as id
  ) other_user on true
  join public.app_users account on account.id = other_user.id
  join public.profiles profile on profile.user_id = other_user.id
  left join lateral (
    select message.id, message.body, message.sender_user_id
    from public.messages message
    where message.conversation_id = conversation.id
      and message.deleted_at is null
    order by message.sequence desc
    limit 1
  ) latest_message on true
  left join lateral (
    select image.public_url, image.blur_hash, image.width, image.height
    from public.profile_photos image
    where image.user_id = other_user.id
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
  where member.user_id = p_actor_user_id
    and conversation.status = 'active'
    and match_row.status = 'active'
    and account.status = 'active'
    and profile.profile_completed_at is not null
    and not exists (
      select 1
      from public.blocks block_row
      where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = other_user.id)
        or (block_row.blocker_user_id = other_user.id and block_row.blocked_user_id = p_actor_user_id)
    )
    and not exists (
      select 1
      from public.bans ban_row
      where ban_row.user_id = other_user.id
        and ban_row.status = 'active'
        and ban_row.starts_at <= now()
        and (ban_row.ends_at is null or ban_row.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions restriction
      where restriction.user_id = other_user.id
        and restriction.status = 'active'
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
        and restriction.restriction_type in ('shadow_ban', 'view_only', 'full_suspension')
    )
    and (
      p_cursor_activity_at is null
      or (member.last_activity_at, conversation.id) < (p_cursor_activity_at, p_cursor_conversation_id)
    )
  order by member.last_activity_at desc, conversation.id desc
  limit v_limit;
end;
$$;

create or replace function public.get_conversation_messages(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_limit integer default 51,
  p_cursor_sent_at timestamptz default null,
  p_cursor_message_id uuid default null
)
returns table (
  message_id uuid,
  sender_user_id uuid,
  message_type public.message_type,
  body text,
  sequence bigint,
  reply_to_message_id uuid,
  sent_at timestamptz,
  edited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 51), 101));
begin
  perform private.get_active_conversation_other_user(p_actor_user_id, p_conversation_id, false);
  if (p_cursor_sent_at is null) <> (p_cursor_message_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    message.id,
    message.sender_user_id,
    message.message_type,
    message.body,
    message.sequence,
    message.reply_to_message_id,
    message.sent_at,
    message.edited_at
  from public.messages message
  where message.conversation_id = p_conversation_id
    and message.deleted_at is null
    and (
      p_cursor_sent_at is null
      or (message.sent_at, message.id) < (p_cursor_sent_at, p_cursor_message_id)
    )
  order by message.sent_at desc, message.id desc
  limit v_limit;
end;
$$;

create or replace function public.send_conversation_message(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_body text,
  p_client_message_id uuid,
  p_reply_to_message_id uuid default null
)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_user_id uuid,
  message_type public.message_type,
  body text,
  sequence bigint,
  reply_to_message_id uuid,
  sent_at timestamptz,
  notification_id uuid,
  already_created boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_other_user_id uuid;
  v_conversation public.conversations%rowtype;
  v_existing public.messages%rowtype;
  v_message public.messages%rowtype;
  v_sequence bigint;
  v_sent_at timestamptz := now();
  v_notification_id uuid;
  v_muted_until timestamptz;
begin
  if p_body is null
    or char_length(btrim(p_body)) not between 1 and 4000
    or p_client_message_id is null
  then
    raise exception using errcode = '22023', message = 'invalid_message_input';
  end if;

  v_other_user_id := private.get_active_conversation_other_user(
    p_actor_user_id,
    p_conversation_id,
    true
  );

  select * into v_conversation
  from public.conversations conversation
  where conversation.id = p_conversation_id;

  select * into v_existing
  from public.messages message
  where message.sender_user_id = p_actor_user_id
    and message.client_message_id = p_client_message_id;

  if found then
    if v_existing.conversation_id <> p_conversation_id then
      raise exception using errcode = 'P0001', message = 'idempotency_conflict';
    end if;
    return query
    select v_existing.id, v_existing.conversation_id, v_existing.sender_user_id,
      v_existing.message_type, v_existing.body, v_existing.sequence,
      v_existing.reply_to_message_id, v_existing.sent_at, null::uuid, true;
    return;
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1
    from public.messages reply
    where reply.id = p_reply_to_message_id
      and reply.conversation_id = p_conversation_id
      and reply.deleted_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'reply_message_unavailable';
  end if;

  update public.conversations conversation
  set last_message_sequence = conversation.last_message_sequence + 1,
      last_message_at = v_sent_at,
      updated_at = v_sent_at
  where conversation.id = p_conversation_id
  returning conversation.last_message_sequence into v_sequence;

  insert into public.messages (
    conversation_id, sender_user_id, message_type, body, sequence,
    client_message_id, reply_to_message_id, sent_at
  ) values (
    p_conversation_id, p_actor_user_id, 'text', btrim(p_body), v_sequence,
    p_client_message_id, p_reply_to_message_id, v_sent_at
  ) returning * into v_message;

  update public.conversation_members member
  set last_activity_at = v_sent_at
  where member.conversation_id = p_conversation_id
    and member.user_id = p_actor_user_id;

  update public.conversation_members member
  set last_activity_at = v_sent_at,
      unread_count = member.unread_count + 1
  where member.conversation_id = p_conversation_id
    and member.user_id = v_other_user_id
  returning member.notifications_muted_until into v_muted_until;

  if v_muted_until is null or v_muted_until <= v_sent_at then
    insert into public.user_notifications (
      user_id, notification_type, title, body, entity_type, entity_id, payload
    ) values (
      v_other_user_id,
      'message',
      'New message',
      'You received a new message from a match.',
      'conversation',
      p_conversation_id,
      jsonb_build_object(
        'conversation_id', p_conversation_id,
        'message_id', v_message.id,
        'sender_user_id', p_actor_user_id
      )
    ) returning id into v_notification_id;
  end if;

  return query
  select v_message.id, v_message.conversation_id, v_message.sender_user_id,
    v_message.message_type, v_message.body, v_message.sequence,
    v_message.reply_to_message_id, v_message.sent_at, v_notification_id, false;
end;
$$;

create or replace function public.mark_conversation_read(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_through_message_id uuid default null
)
returns table (
  conversation_id uuid,
  last_read_message_id uuid,
  last_read_sequence bigint,
  unread_count integer,
  read_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_target public.messages%rowtype;
  v_remaining_unread integer;
  v_read_at timestamptz := now();
begin
  perform private.get_active_conversation_other_user(
    p_actor_user_id,
    p_conversation_id,
    true
  );

  if p_through_message_id is null then
    select * into v_target
    from public.messages message
    where message.conversation_id = p_conversation_id
      and message.deleted_at is null
    order by message.sequence desc
    limit 1;
  else
    select * into v_target
    from public.messages message
    where message.id = p_through_message_id
      and message.conversation_id = p_conversation_id
      and message.deleted_at is null;
  end if;

  if not found and p_through_message_id is not null then
    raise exception using errcode = 'P0001', message = 'message_unavailable';
  end if;

  if not found then
    return query
    select p_conversation_id, null::uuid, 0::bigint, 0::integer, v_read_at;
    return;
  end if;

  select count(*)::integer into v_remaining_unread
  from public.messages message
  where message.conversation_id = p_conversation_id
    and message.sender_user_id <> p_actor_user_id
    and message.sequence > v_target.sequence
    and message.deleted_at is null;

  update public.conversation_members member
  set last_read_message_id = v_target.id,
      last_read_sequence = greatest(member.last_read_sequence, v_target.sequence),
      last_read_at = v_read_at,
      unread_count = v_remaining_unread
  where member.conversation_id = p_conversation_id
    and member.user_id = p_actor_user_id;

  return query
  select p_conversation_id, v_target.id, v_target.sequence, v_remaining_unread, v_read_at;
end;
$$;

create or replace function public.set_conversation_notification_settings(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_muted_until timestamptz default null
)
returns table (
  conversation_id uuid,
  notifications_muted_until timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_muted_until timestamptz;
begin
  perform private.get_active_conversation_other_user(p_actor_user_id, p_conversation_id, false);
  if p_muted_until is not null
    and (p_muted_until <= now() or p_muted_until > now() + interval '366 days')
  then
    raise exception using errcode = '22023', message = 'invalid_notification_settings';
  end if;

  update public.conversation_members member
  set notifications_muted_until = p_muted_until
  where member.conversation_id = p_conversation_id
    and member.user_id = p_actor_user_id
  returning member.notifications_muted_until into v_muted_until;

  return query select p_conversation_id, v_muted_until;
end;
$$;

create or replace function public.get_user_notifications(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_notification_id uuid default null,
  p_unread_only boolean default false
)
returns table (
  notification_id uuid,
  notification_type public.notification_type,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz,
  seen_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 101));
begin
  perform private.assert_messaging_account(p_actor_user_id);
  if (p_cursor_created_at is null) <> (p_cursor_notification_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    notification.id,
    notification.notification_type,
    notification.title,
    notification.body,
    notification.entity_type,
    notification.entity_id,
    notification.payload,
    notification.created_at,
    notification.seen_at,
    notification.read_at,
    notification.expires_at
  from public.user_notifications notification
  where notification.user_id = p_actor_user_id
    and (notification.expires_at is null or notification.expires_at > now())
    and (not coalesce(p_unread_only, false) or notification.read_at is null)
    and (
      p_cursor_created_at is null
      or (notification.created_at, notification.id) < (p_cursor_created_at, p_cursor_notification_id)
    )
  order by notification.created_at desc, notification.id desc
  limit v_limit;
end;
$$;

create or replace function public.mark_user_notification_read(
  p_actor_user_id uuid,
  p_notification_id uuid
)
returns table (
  notification_id uuid,
  read_at timestamptz,
  already_read boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_notification public.user_notifications%rowtype;
  v_already_read boolean;
begin
  perform private.assert_messaging_account(p_actor_user_id);
  select * into v_notification
  from public.user_notifications notification
  where notification.id = p_notification_id
    and notification.user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'notification_unavailable';
  end if;

  v_already_read := v_notification.read_at is not null;
  update public.user_notifications notification
  set seen_at = coalesce(notification.seen_at, now()),
      read_at = coalesce(notification.read_at, now())
  where notification.id = p_notification_id
  returning * into v_notification;

  return query select v_notification.id, v_notification.read_at, v_already_read;
end;
$$;

create or replace function public.mark_all_user_notifications_read(p_actor_user_id uuid)
returns table (marked_count integer, read_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_read_at timestamptz := now();
  v_marked_count integer;
begin
  perform private.assert_messaging_account(p_actor_user_id);
  with marked as (
    update public.user_notifications notification
    set seen_at = coalesce(notification.seen_at, v_read_at),
        read_at = coalesce(notification.read_at, v_read_at)
    where notification.user_id = p_actor_user_id
      and notification.read_at is null
      and (notification.expires_at is null or notification.expires_at > v_read_at)
    returning 1
  )
  select count(*)::integer into v_marked_count from marked;

  return query select v_marked_count, v_read_at;
end;
$$;

revoke all on function private.sync_match_conversation() from public, anon, authenticated, service_role;
revoke all on function private.assert_messaging_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.get_active_conversation_other_user(uuid, uuid, boolean)
from public, anon, authenticated, service_role;
revoke all on function public.get_user_conversations(uuid, integer, timestamptz, uuid)
from public, anon, authenticated;
revoke all on function public.get_conversation_messages(uuid, uuid, integer, timestamptz, uuid)
from public, anon, authenticated;
revoke all on function public.send_conversation_message(uuid, uuid, text, uuid, uuid)
from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid, uuid, uuid)
from public, anon, authenticated;
revoke all on function public.set_conversation_notification_settings(uuid, uuid, timestamptz)
from public, anon, authenticated;
revoke all on function public.get_user_notifications(uuid, integer, timestamptz, uuid, boolean)
from public, anon, authenticated;
revoke all on function public.mark_user_notification_read(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.mark_all_user_notifications_read(uuid)
from public, anon, authenticated;

grant execute on function public.get_user_conversations(uuid, integer, timestamptz, uuid)
to service_role;
grant execute on function public.get_conversation_messages(uuid, uuid, integer, timestamptz, uuid)
to service_role;
grant execute on function public.send_conversation_message(uuid, uuid, text, uuid, uuid)
to service_role;
grant execute on function public.mark_conversation_read(uuid, uuid, uuid)
to service_role;
grant execute on function public.set_conversation_notification_settings(uuid, uuid, timestamptz)
to service_role;
grant execute on function public.get_user_notifications(uuid, integer, timestamptz, uuid, boolean)
to service_role;
grant execute on function public.mark_user_notification_read(uuid, uuid)
to service_role;
grant execute on function public.mark_all_user_notifications_read(uuid)
to service_role;

comment on function public.send_conversation_message(uuid, uuid, text, uuid, uuid)
is 'Sends one idempotent text message only within an active, unblocked match conversation.';
comment on function public.get_user_notifications(uuid, integer, timestamptz, uuid, boolean)
is 'Returns only the authenticated account notification inbox through the server boundary.';

commit;
