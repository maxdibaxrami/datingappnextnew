begin;

-- A muted relationship remains accepted for followers-only permission checks,
-- but it must not keep surfacing an author's posts in either social feed scope.
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
    and not exists (
      select 1
      from public.follows muted_follow
      where muted_follow.follower_user_id = p_actor_user_id
        and muted_follow.following_user_id = post_row.author_user_id
        and muted_follow.status = 'muted'
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
          and follow_row.status = 'accepted'
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

-- A post cannot be liked merely because its row still exists. Its author must
-- pass the same public safety checks used by the feed, and muting suppresses
-- interactions as well as feed cards.
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
  join public.app_users author_account
    on author_account.id = post_row.author_user_id
    and author_account.status = 'active'
  join public.profiles author_profile
    on author_profile.user_id = post_row.author_user_id
    and author_profile.profile_completed_at is not null
    and author_profile.visibility = 'public'
    and author_profile.discoverable = true
  where post_row.id = p_post_id
    and post_row.deleted_at is null
    and not exists (
      select 1 from public.bans ban_row
      where ban_row.user_id = post_row.author_user_id
        and ban_row.status = 'active'
        and ban_row.starts_at <= now()
        and (ban_row.ends_at is null or ban_row.ends_at > now())
    )
    and not exists (
      select 1 from public.user_restrictions restriction
      where restriction.user_id = post_row.author_user_id
        and restriction.status = 'active'
        and restriction.starts_at <= now()
        and (restriction.ends_at is null or restriction.ends_at > now())
        and restriction.restriction_type in ('shadow_ban', 'view_only', 'full_suspension')
    )
  for update of post_row;
  if not found or v_post.author_user_id = p_actor_user_id then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;
  if exists (
    select 1
    from public.blocks block_row
    where (block_row.blocker_user_id = p_actor_user_id and block_row.blocked_user_id = v_post.author_user_id)
       or (block_row.blocker_user_id = v_post.author_user_id and block_row.blocked_user_id = p_actor_user_id)
  ) or exists (
    select 1
    from public.follows muted_follow
    where muted_follow.follower_user_id = p_actor_user_id
      and muted_follow.following_user_id = v_post.author_user_id
      and muted_follow.status = 'muted'
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

revoke all on function public.get_social_feed(uuid, text, integer, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.set_social_post_like(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.get_social_feed(uuid, text, integer, timestamptz, uuid)
  to service_role;
grant execute on function public.set_social_post_like(uuid, uuid, boolean)
  to service_role;

commit;
