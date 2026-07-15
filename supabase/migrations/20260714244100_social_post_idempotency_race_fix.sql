begin;

-- The first idempotency migration handled sequential retries. This replacement
-- also makes two concurrent retries converge on the same post instead of
-- surfacing a unique-constraint error to the caller.
create or replace function public.create_social_post(
  p_actor_user_id uuid,
  p_body text,
  p_post_type public.post_type default 'text',
  p_visibility public.post_visibility default 'public',
  p_client_post_id uuid default null
)
returns table (
  post_id uuid,
  post_type public.post_type,
  visibility public.post_visibility,
  created_at timestamptz,
  already_created boolean
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
    or p_client_post_id is null
  then
    raise exception using errcode = '22023', message = 'invalid_social_post_input';
  end if;

  select post_row.* into v_post
  from public.posts post_row
  where post_row.author_user_id = p_actor_user_id
    and post_row.client_post_id = p_client_post_id
  for update;
  if found then
    return query select v_post.id, v_post.post_type, v_post.visibility, v_post.created_at, true;
    return;
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
    author_user_id, client_post_id, body, post_type, visibility,
    country_code, city_name, geohash_prefix
  ) values (
    p_actor_user_id, p_client_post_id, btrim(p_body), p_post_type, p_visibility,
    upper(v_profile.country_code), v_profile.city_name,
    case when v_profile.public_geohash_prefix is null then null else left(v_profile.public_geohash_prefix, 3) end
  ) on conflict (author_user_id, client_post_id) where client_post_id is not null
    do nothing
  returning * into v_post;

  if found then
    return query select v_post.id, v_post.post_type, v_post.visibility, v_post.created_at, false;
    return;
  end if;

  -- ON CONFLICT DO NOTHING waits for the competing transaction. A fresh
  -- statement can then safely read the post it committed.
  select post_row.* into v_post
  from public.posts post_row
  where post_row.author_user_id = p_actor_user_id
    and post_row.client_post_id = p_client_post_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'social_post_unavailable';
  end if;
  return query select v_post.id, v_post.post_type, v_post.visibility, v_post.created_at, true;
end;
$$;

revoke all on function public.create_social_post(uuid, text, public.post_type, public.post_visibility, uuid)
  from public, anon, authenticated;
grant execute on function public.create_social_post(uuid, text, public.post_type, public.post_visibility, uuid)
  to service_role;

commit;
