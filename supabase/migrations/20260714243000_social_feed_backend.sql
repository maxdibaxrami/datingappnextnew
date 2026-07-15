begin;

-- Social is server-owned just like dating. The existing follows/posts tables
-- are retained, but direct browser policies are removed in favor of narrowly
-- scoped service-role RPCs that recheck blocks and account state per action.
alter table public.profiles
  add column if not exists follow_approval_required boolean not null default false;

alter table public.profile_stats
  add column if not exists follower_count integer not null default 0,
  add column if not exists following_count integer not null default 0;

alter table public.profile_stats
  drop constraint if exists profile_stats_follower_count_check;
alter table public.profile_stats
  add constraint profile_stats_follower_count_check check (follower_count >= 0);
alter table public.profile_stats
  drop constraint if exists profile_stats_following_count_check;
alter table public.profile_stats
  add constraint profile_stats_following_count_check check (following_count >= 0);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists follows_following_status_created_idx
  on public.follows (following_user_id, status, created_at desc, follower_user_id);
create index if not exists follows_follower_status_created_idx
  on public.follows (follower_user_id, status, created_at desc, following_user_id);
create index if not exists posts_author_created_idx
  on public.posts (author_user_id, created_at desc, id desc)
  where deleted_at is null;
create index if not exists posts_visibility_created_idx
  on public.posts (visibility, created_at desc, id desc)
  where deleted_at is null and reply_to_post_id is null;
create index if not exists posts_country_created_idx
  on public.posts (country_code, created_at desc, id desc)
  where deleted_at is null and reply_to_post_id is null;
create index if not exists posts_city_created_idx
  on public.posts (country_code, city_name, created_at desc, id desc)
  where deleted_at is null and reply_to_post_id is null;
create index if not exists posts_geohash_created_idx
  on public.posts (geohash_prefix, created_at desc, id desc)
  where deleted_at is null and reply_to_post_id is null;
create index if not exists posts_reply_to_post_id_idx
  on public.posts (reply_to_post_id)
  where reply_to_post_id is not null;
create index if not exists posts_repost_of_post_id_idx
  on public.posts (repost_of_post_id)
  where repost_of_post_id is not null;
create index if not exists post_likes_user_created_idx
  on public.post_likes (user_id, created_at desc, post_id);

alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
revoke all on table public.follows from public, anon, authenticated;
revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.post_likes from public, anon, authenticated;
drop policy if exists follows_read_involved on public.follows;
drop policy if exists posts_read_public_or_own on public.posts;

create or replace function private.assert_social_account(p_user_id uuid)
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

create or replace function private.assert_social_posting_account(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_social_account(p_user_id);
  if exists (
    select 1
    from public.user_restrictions restriction
    where restriction.user_id = p_user_id
      and restriction.status = 'active'
      and restriction.starts_at <= now()
      and (restriction.ends_at is null or restriction.ends_at > now())
      and restriction.restriction_type = 'no_post'
  ) then
    raise exception using errcode = 'P0001', message = 'account_restricted';
  end if;
end;
$$;

-- Accepted and muted are both active relationships. Muting hides a feed for
-- the follower client but must not silently revoke followers-only permissions.
create or replace function private.follow_is_active(p_status public.follow_status)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select p_status in ('accepted'::public.follow_status, 'muted'::public.follow_status);
$$;

create or replace function private.adjust_follow_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_active boolean := false;
  v_new_active boolean := false;
begin
  if tg_op = 'INSERT' then
    v_new_active := private.follow_is_active(new.status);
    if v_new_active then
      update public.profile_stats stats
      set following_count = stats.following_count + 1,
          updated_at = now()
      where stats.user_id = new.follower_user_id;
      update public.profile_stats stats
      set follower_count = stats.follower_count + 1,
          updated_at = now()
      where stats.user_id = new.following_user_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    v_old_active := private.follow_is_active(old.status);
    if v_old_active then
      update public.profile_stats stats
      set following_count = greatest(0, stats.following_count - 1),
          updated_at = now()
      where stats.user_id = old.follower_user_id;
      update public.profile_stats stats
      set follower_count = greatest(0, stats.follower_count - 1),
          updated_at = now()
      where stats.user_id = old.following_user_id;
    end if;
    return old;
  end if;

  if old.follower_user_id <> new.follower_user_id
    or old.following_user_id <> new.following_user_id
  then
    raise exception using errcode = '22023', message = 'follow_identity_immutable';
  end if;

  v_old_active := private.follow_is_active(old.status);
  v_new_active := private.follow_is_active(new.status);
  if v_old_active and not v_new_active then
    update public.profile_stats stats
    set following_count = greatest(0, stats.following_count - 1),
        updated_at = now()
    where stats.user_id = old.follower_user_id;
    update public.profile_stats stats
    set follower_count = greatest(0, stats.follower_count - 1),
        updated_at = now()
    where stats.user_id = old.following_user_id;
  elsif not v_old_active and v_new_active then
    update public.profile_stats stats
    set following_count = stats.following_count + 1,
        updated_at = now()
    where stats.user_id = new.follower_user_id;
    update public.profile_stats stats
    set follower_count = stats.follower_count + 1,
        updated_at = now()
    where stats.user_id = new.following_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists follows_adjust_profile_stats on public.follows;
create trigger follows_adjust_profile_stats
after insert or update or delete on public.follows
for each row execute function private.adjust_follow_counters();

create or replace function private.adjust_post_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is null then
      update public.profile_stats stats
      set posts_count = stats.posts_count + 1,
          updated_at = now()
      where stats.user_id = new.author_user_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.deleted_at is null then
      update public.profile_stats stats
      set posts_count = greatest(0, stats.posts_count - 1),
          updated_at = now()
      where stats.user_id = old.author_user_id;
    end if;
    return old;
  end if;

  if old.deleted_at is null and new.deleted_at is not null then
    update public.profile_stats stats
    set posts_count = greatest(0, stats.posts_count - 1),
        updated_at = now()
    where stats.user_id = new.author_user_id;
  elsif old.deleted_at is not null and new.deleted_at is null then
    update public.profile_stats stats
    set posts_count = stats.posts_count + 1,
        updated_at = now()
    where stats.user_id = new.author_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_adjust_profile_stats on public.posts;
create trigger posts_adjust_profile_stats
after insert or update of deleted_at or delete on public.posts
for each row execute function private.adjust_post_count();

-- Align counters for existing data before incremental triggers own them.
update public.profile_stats stats
set follower_count = coalesce((
      select count(*)::integer
      from public.follows follow_row
      where follow_row.following_user_id = stats.user_id
        and follow_row.status in ('accepted', 'muted')
    ), 0),
    following_count = coalesce((
      select count(*)::integer
      from public.follows follow_row
      where follow_row.follower_user_id = stats.user_id
        and follow_row.status in ('accepted', 'muted')
    ), 0),
    posts_count = coalesce((
      select count(*)::integer
      from public.posts post_row
      where post_row.author_user_id = stats.user_id
        and post_row.deleted_at is null
    ), 0),
    updated_at = now();

create or replace function public.follow_user(
  p_actor_user_id uuid,
  p_target_user_id uuid
)
returns table (
  following_user_id uuid,
  follow_status public.follow_status,
  accepted_at timestamptz,
  already_following boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_target_requires_approval boolean;
  v_follow public.follows%rowtype;
  v_next_status public.follow_status;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_target_user_id is null or p_target_user_id = p_actor_user_id then
    raise exception using errcode = '22023', message = 'invalid_follow_input';
  end if;

  select profile.follow_approval_required into v_target_requires_approval
  from public.app_users account
  join public.profiles profile on profile.user_id = account.id
  where account.id = p_target_user_id
    and account.status = 'active'
    and profile.profile_completed_at is not null
    and profile.visibility = 'public'
    and profile.discoverable = true
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
        and restriction.restriction_type in ('view_only', 'full_suspension')
    );
  if not found then
    raise exception using errcode = 'P0001', message = 'follow_target_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = p_target_user_id)
       or (block_row.blocker_user_id = p_target_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'follow_target_unavailable';
  end if;

  select * into v_follow
  from public.follows follow_row
  where follow_row.follower_user_id = p_actor_user_id
    and follow_row.following_user_id = p_target_user_id
  for update;

  if found and v_follow.status in ('accepted', 'muted', 'requested') then
    return query select v_follow.following_user_id, v_follow.status, v_follow.accepted_at, true;
    return;
  end if;

  if found and v_follow.status = 'rejected' and v_follow.updated_at > now() - interval '7 days' then
    raise exception using errcode = 'P0001', message = 'follow_request_cooldown';
  end if;

  v_next_status := case when v_target_requires_approval then 'requested'::public.follow_status else 'accepted'::public.follow_status end;
  insert into public.follows (
    follower_user_id, following_user_id, status, accepted_at, muted_at, updated_at
  ) values (
    p_actor_user_id, p_target_user_id, v_next_status,
    case when v_next_status = 'accepted' then now() else null end,
    null, now()
  ) on conflict (follower_user_id, following_user_id) do update
    set status = excluded.status,
        accepted_at = excluded.accepted_at,
        muted_at = null,
        updated_at = now()
  returning * into v_follow;

  return query select v_follow.following_user_id, v_follow.status, v_follow.accepted_at, false;
end;
$$;

create or replace function public.unfollow_user(
  p_actor_user_id uuid,
  p_target_user_id uuid
)
returns table (following_user_id uuid, removed boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_removed boolean := false;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_target_user_id is null or p_target_user_id = p_actor_user_id then
    raise exception using errcode = '22023', message = 'invalid_follow_input';
  end if;

  delete from public.follows follow_row
  where follow_row.follower_user_id = p_actor_user_id
    and follow_row.following_user_id = p_target_user_id
  returning true into v_removed;
  return query select p_target_user_id, coalesce(v_removed, false);
end;
$$;

create or replace function public.set_follow_muted(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_muted boolean
)
returns table (following_user_id uuid, follow_status public.follow_status, muted_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_follow public.follows%rowtype;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_target_user_id is null or p_target_user_id = p_actor_user_id or p_muted is null then
    raise exception using errcode = '22023', message = 'invalid_follow_input';
  end if;

  select * into v_follow
  from public.follows follow_row
  where follow_row.follower_user_id = p_actor_user_id
    and follow_row.following_user_id = p_target_user_id
  for update;
  if not found or v_follow.status not in ('accepted', 'muted') then
    raise exception using errcode = 'P0001', message = 'follow_unavailable';
  end if;

  update public.follows follow_row
  set status = case when p_muted then 'muted'::public.follow_status else 'accepted'::public.follow_status end,
      muted_at = case when p_muted then coalesce(follow_row.muted_at, now()) else null end,
      updated_at = now()
  where follow_row.follower_user_id = p_actor_user_id
    and follow_row.following_user_id = p_target_user_id
  returning * into v_follow;

  return query select v_follow.following_user_id, v_follow.status, v_follow.muted_at;
end;
$$;

create or replace function public.decide_follow_request(
  p_actor_user_id uuid,
  p_follower_user_id uuid,
  p_accept boolean
)
returns table (follower_user_id uuid, follow_status public.follow_status, decided_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_follow public.follows%rowtype;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_follower_user_id is null or p_follower_user_id = p_actor_user_id or p_accept is null then
    raise exception using errcode = '22023', message = 'invalid_follow_input';
  end if;

  select * into v_follow
  from public.follows follow_row
  where follow_row.follower_user_id = p_follower_user_id
    and follow_row.following_user_id = p_actor_user_id
    and follow_row.status = 'requested'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'follow_request_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = p_follower_user_id)
       or (block_row.blocker_user_id = p_follower_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) then
    delete from public.follows follow_row
    where follow_row.follower_user_id = p_follower_user_id
      and follow_row.following_user_id = p_actor_user_id;
    raise exception using errcode = 'P0001', message = 'follow_request_unavailable';
  end if;

  update public.follows follow_row
  set status = case when p_accept then 'accepted'::public.follow_status else 'rejected'::public.follow_status end,
      accepted_at = case when p_accept then now() else null end,
      muted_at = null,
      updated_at = now()
  where follow_row.follower_user_id = p_follower_user_id
    and follow_row.following_user_id = p_actor_user_id
  returning * into v_follow;

  return query select v_follow.follower_user_id, v_follow.status, v_follow.updated_at;
end;
$$;

create or replace function public.get_follow_relationships(
  p_actor_user_id uuid,
  p_direction text default 'following',
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_user_id uuid default null
)
returns table (
  relationship_user_id uuid,
  follow_status public.follow_status,
  created_at timestamptz,
  accepted_at timestamptz,
  muted_at timestamptz,
  display_name text,
  age_years integer,
  country_code text,
  city_name text,
  primary_photo_url text,
  primary_photo_blur_hash text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 101));
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_direction is null or p_direction not in ('following', 'followers') then
    raise exception using errcode = '22023', message = 'invalid_follow_list_input';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_user_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select
    case when p_direction = 'following' then follow_row.following_user_id else follow_row.follower_user_id end,
    follow_row.status,
    follow_row.created_at,
    follow_row.accepted_at,
    follow_row.muted_at,
    profile.display_name,
    profile.age_years,
    profile.country_code,
    profile.city_name,
    photo.public_url,
    photo.blur_hash
  from public.follows follow_row
  join public.app_users account
    on account.id = case when p_direction = 'following' then follow_row.following_user_id else follow_row.follower_user_id end
  join public.profiles profile on profile.user_id = account.id
  left join lateral (
    select image.public_url, image.blur_hash
    from public.profile_photos image
    where image.user_id = account.id
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
  where (
      (p_direction = 'following' and follow_row.follower_user_id = p_actor_user_id)
      or (p_direction = 'followers' and follow_row.following_user_id = p_actor_user_id)
    )
    and account.status = 'active'
    and profile.profile_completed_at is not null
    and profile.visibility = 'public'
    and profile.discoverable = true
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
        and restriction.restriction_type in ('shadow_ban', 'view_only', 'full_suspension')
    )
    and not exists (
      select 1
      from public.blocks block_row
      where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = account.id)
         or (block_row.blocker_user_id = account.id and block_row.blocked_user_id = p_actor_user_id)
    )
    and (
      p_cursor_created_at is null
      or (follow_row.created_at, account.id) < (p_cursor_created_at, p_cursor_user_id)
    )
  order by follow_row.created_at desc, account.id
  limit v_limit;
end;
$$;

create or replace function public.get_pending_follow_requests(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_follower_user_id uuid default null
)
returns table (
  follower_user_id uuid,
  requested_at timestamptz,
  display_name text,
  age_years integer,
  country_code text,
  city_name text,
  primary_photo_url text,
  primary_photo_blur_hash text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 101));
begin
  perform private.assert_social_account(p_actor_user_id);
  if (p_cursor_created_at is null) <> (p_cursor_follower_user_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;

  return query
  select follow_row.follower_user_id, follow_row.created_at,
    profile.display_name, profile.age_years, profile.country_code, profile.city_name,
    photo.public_url, photo.blur_hash
  from public.follows follow_row
  join public.app_users account on account.id = follow_row.follower_user_id
  join public.profiles profile on profile.user_id = account.id
  left join lateral (
    select image.public_url, image.blur_hash
    from public.profile_photos image
    where image.user_id = account.id
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
  where follow_row.following_user_id = p_actor_user_id
    and follow_row.status = 'requested'
    and account.status = 'active'
    and profile.profile_completed_at is not null
    and profile.visibility = 'public'
    and profile.discoverable = true
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
      from public.blocks block_row
      where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = account.id)
         or (block_row.blocker_user_id = account.id and block_row.blocked_user_id = p_actor_user_id)
    )
    and (
      p_cursor_created_at is null
      or (follow_row.created_at, follow_row.follower_user_id) < (p_cursor_created_at, p_cursor_follower_user_id)
    )
  order by follow_row.created_at desc, follow_row.follower_user_id
  limit v_limit;
end;
$$;

create or replace function public.create_social_post(
  p_actor_user_id uuid,
  p_body text,
  p_post_type public.post_type default 'text',
  p_visibility public.post_visibility default 'public'
)
returns table (
  post_id uuid,
  post_type public.post_type,
  visibility public.post_visibility,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_post public.posts%rowtype;
begin
  perform private.assert_social_posting_account(p_actor_user_id);
  if p_body is null
    or char_length(btrim(p_body)) not between 1 and 2000
    or p_post_type is null
    or p_post_type not in ('text', 'question', 'confession', 'local_shout')
    or p_visibility is null
  then
    raise exception using errcode = '22023', message = 'invalid_social_post_input';
  end if;

  select profile.* into v_profile
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
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;

  insert into public.posts (
    author_user_id, body, post_type, visibility, country_code, city_name, geohash_prefix
  ) values (
    p_actor_user_id, btrim(p_body), p_post_type, p_visibility,
    upper(v_profile.country_code), v_profile.city_name,
    case when v_profile.public_geohash_prefix is null then null else left(v_profile.public_geohash_prefix, 3) end
  ) returning * into v_post;

  return query select v_post.id, v_post.post_type, v_post.visibility, v_post.created_at;
end;
$$;

create or replace function public.get_social_feed(
  p_actor_user_id uuid,
  p_scope text default 'following',
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_post_id uuid default null
)
returns table (
  post_id uuid,
  author_user_id uuid,
  body text,
  post_type public.post_type,
  visibility public.post_visibility,
  created_at timestamptz,
  updated_at timestamptz,
  like_count integer,
  reply_count integer,
  repost_count integer,
  liked_by_actor boolean,
  display_name text,
  age_years integer,
  country_code text,
  city_name text,
  primary_photo_url text,
  primary_photo_blur_hash text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 101));
  v_actor public.profiles%rowtype;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_scope is null or p_scope not in ('following', 'discover') then
    raise exception using errcode = '22023', message = 'invalid_feed_input';
  end if;
  if (p_cursor_created_at is null) <> (p_cursor_post_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;
  select * into v_actor from public.profiles profile where profile.user_id = p_actor_user_id;

  return query
  select
    post_row.id,
    post_row.author_user_id,
    post_row.body,
    post_row.post_type,
    post_row.visibility,
    post_row.created_at,
    post_row.updated_at,
    post_row.like_count,
    post_row.reply_count,
    post_row.repost_count,
    viewer_like.post_id is not null,
    author_profile.display_name,
    author_profile.age_years,
    author_profile.country_code,
    author_profile.city_name,
    photo.public_url,
    photo.blur_hash
  from public.posts post_row
  join public.app_users author_account on author_account.id = post_row.author_user_id
  join public.profiles author_profile on author_profile.user_id = post_row.author_user_id
  left join public.post_likes viewer_like
    on viewer_like.post_id = post_row.id and viewer_like.user_id = p_actor_user_id
  left join lateral (
    select image.public_url, image.blur_hash
    from public.profile_photos image
    where image.user_id = post_row.author_user_id
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
  where post_row.deleted_at is null
    and post_row.reply_to_post_id is null
    and author_account.status = 'active'
    and author_profile.profile_completed_at is not null
    and author_profile.visibility = 'public'
    and author_profile.discoverable = true
    and not exists (
      select 1
      from public.bans ban_row
      where ban_row.user_id = post_row.author_user_id
        and ban_row.status = 'active'
        and ban_row.starts_at <= now()
        and (ban_row.ends_at is null or ban_row.ends_at > now())
    )
    and not exists (
      select 1
      from public.user_restrictions restriction
      where restriction.user_id = post_row.author_user_id
        and restriction.status = 'active'
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
        and restriction.restriction_type in ('shadow_ban', 'view_only', 'full_suspension')
    )
    and not exists (
      select 1
      from public.blocks block_row
      where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = post_row.author_user_id)
         or (block_row.blocker_user_id = post_row.author_user_id and block_row.blocked_user_id = p_actor_user_id)
    )
    and (
      post_row.author_user_id = p_actor_user_id
      or post_row.visibility in ('public', 'global')
      or (
        post_row.visibility = 'followers'
        and exists (
          select 1
          from public.follows follow_row
          where follow_row.follower_user_id = p_actor_user_id
            and follow_row.following_user_id = post_row.author_user_id
            and follow_row.status in ('accepted', 'muted')
        )
      )
      or (post_row.visibility = 'country' and post_row.country_code = upper(v_actor.country_code))
      or (
        post_row.visibility = 'city'
        and post_row.country_code = upper(v_actor.country_code)
        and lower(post_row.city_name) = lower(v_actor.city_name)
      )
      or (
        post_row.visibility = 'nearby'
        and post_row.geohash_prefix is not null
        and left(post_row.geohash_prefix, 3) = left(v_actor.public_geohash_prefix, 3)
      )
    )
    and (
      p_scope = 'discover'
      or post_row.author_user_id = p_actor_user_id
      or exists (
        select 1
        from public.follows follow_row
        where follow_row.follower_user_id = p_actor_user_id
          and follow_row.following_user_id = post_row.author_user_id
          and follow_row.status in ('accepted', 'muted')
      )
    )
    and (
      p_cursor_created_at is null
      or (post_row.created_at, post_row.id) < (p_cursor_created_at, p_cursor_post_id)
    )
  order by post_row.created_at desc, post_row.id desc
  limit v_limit;
end;
$$;

create or replace function public.delete_own_social_post(
  p_actor_user_id uuid,
  p_post_id uuid
)
returns table (post_id uuid, deleted_at timestamptz, already_deleted boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_post public.posts%rowtype;
begin
  perform private.assert_social_account(p_actor_user_id);
  select post_row.* into v_post
  from public.posts post_row
  where post_row.id = p_post_id
    and post_row.author_user_id = p_actor_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;
  if v_post.deleted_at is not null then
    return query select v_post.id, v_post.deleted_at, true;
    return;
  end if;
  update public.posts post_row
  set deleted_at = now(), updated_at = now()
  where post_row.id = p_post_id
  returning * into v_post;
  return query select v_post.id, v_post.deleted_at, false;
end;
$$;

create or replace function public.set_social_post_like(
  p_actor_user_id uuid,
  p_post_id uuid,
  p_liked boolean
)
returns table (post_id uuid, liked boolean, like_count integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_post public.posts%rowtype;
  v_actor public.profiles%rowtype;
  v_liked boolean := false;
begin
  perform private.assert_social_account(p_actor_user_id);
  if p_post_id is null or p_liked is null then
    raise exception using errcode = '22023', message = 'invalid_social_post_input';
  end if;
  select * into v_actor from public.profiles profile where profile.user_id = p_actor_user_id;
  select post_row.* into v_post
  from public.posts post_row
  join public.app_users author_account on author_account.id = post_row.author_user_id and author_account.status = 'active'
  where post_row.id = p_post_id
    and post_row.deleted_at is null
  for update of post_row;
  if not found or v_post.author_user_id = p_actor_user_id then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;
  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = v_post.author_user_id)
       or (block_row.blocker_user_id = v_post.author_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;
  if not (
    v_post.visibility in ('public', 'global')
    or (v_post.visibility = 'followers' and exists (
      select 1 from public.follows follow_row
      where follow_row.follower_user_id = p_actor_user_id
        and follow_row.following_user_id = v_post.author_user_id
        and follow_row.status in ('accepted', 'muted')
    ))
    or (v_post.visibility = 'country' and v_post.country_code = upper(v_actor.country_code))
    or (v_post.visibility = 'city' and v_post.country_code = upper(v_actor.country_code) and lower(v_post.city_name) = lower(v_actor.city_name))
    or (v_post.visibility = 'nearby' and v_post.geohash_prefix is not null and left(v_post.geohash_prefix, 3) = left(v_actor.public_geohash_prefix, 3))
  ) then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('post-like:' || p_post_id::text || ':' || p_actor_user_id::text, 0)
  );
  if p_liked then
    insert into public.post_likes (post_id, user_id)
    values (p_post_id, p_actor_user_id)
    on conflict do nothing;
    if found then
      update public.posts post_row
      set like_count = post_row.like_count + 1,
          updated_at = now()
      where post_row.id = p_post_id
      returning * into v_post;
    end if;
    v_liked := true;
  else
    delete from public.post_likes like_row
    where like_row.post_id = p_post_id
      and like_row.user_id = p_actor_user_id;
    if found then
      update public.posts post_row
      set like_count = greatest(0, post_row.like_count - 1),
          updated_at = now()
      where post_row.id = p_post_id
      returning * into v_post;
    end if;
  end if;

  return query select p_post_id, v_liked, v_post.like_count;
end;
$$;

-- A block removes both directional social relationships immediately. Feed and
-- post interactions also independently check blocks to cover race conditions.
create or replace function private.remove_follows_after_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows follow_row
  where (follow_row.follower_user_id = new.blocker_user_id and follow_row.following_user_id = new.blocked_user_id)
     or (follow_row.follower_user_id = new.blocked_user_id and follow_row.following_user_id = new.blocker_user_id);
  return new;
end;
$$;

drop trigger if exists blocks_remove_follows_after_insert on public.blocks;
create trigger blocks_remove_follows_after_insert
after insert on public.blocks
for each row execute function private.remove_follows_after_block();

revoke all on function private.assert_social_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.assert_social_posting_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.follow_is_active(public.follow_status) from public, anon, authenticated, service_role;
revoke all on function private.adjust_follow_counters() from public, anon, authenticated, service_role;
revoke all on function private.adjust_post_count() from public, anon, authenticated, service_role;
revoke all on function private.remove_follows_after_block() from public, anon, authenticated, service_role;
revoke all on function public.follow_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.unfollow_user(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_follow_muted(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.decide_follow_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.get_follow_relationships(uuid, text, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.get_pending_follow_requests(uuid, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.create_social_post(uuid, text, public.post_type, public.post_visibility)
  from public, anon, authenticated;
revoke all on function public.get_social_feed(uuid, text, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.delete_own_social_post(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_social_post_like(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.follow_user(uuid, uuid) to service_role;
grant execute on function public.unfollow_user(uuid, uuid) to service_role;
grant execute on function public.set_follow_muted(uuid, uuid, boolean) to service_role;
grant execute on function public.decide_follow_request(uuid, uuid, boolean) to service_role;
grant execute on function public.get_follow_relationships(uuid, text, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.get_pending_follow_requests(uuid, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.create_social_post(uuid, text, public.post_type, public.post_visibility)
  to service_role;
grant execute on function public.get_social_feed(uuid, text, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.delete_own_social_post(uuid, uuid) to service_role;
grant execute on function public.set_social_post_like(uuid, uuid, boolean) to service_role;

comment on function public.follow_user(uuid, uuid)
is 'Creates an accepted follow or private-profile request without trusting client relationship state.';
comment on function public.get_social_feed(uuid, text, integer, timestamptz, uuid)
is 'Returns a safe cursor-paginated social feed with follower and location visibility enforced server-side.';

commit;
