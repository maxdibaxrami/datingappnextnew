begin;

-- This application uses Next.js as its trusted write boundary. Browser clients
-- receive no Supabase access token, and all mutations go through validated API
-- services or narrowly scoped service-role RPCs.
revoke insert, update, delete, truncate, references, trigger
on all tables in schema public
from anon, authenticated;

alter default privileges in schema public
revoke insert, update, delete, truncate, references, trigger
on tables from anon, authenticated;

alter table private.telegram_identities enable row level security;
revoke all on table private.telegram_identities from public, anon, authenticated;

drop index if exists private.telegram_identities_telegram_user_id_idx;
drop index if exists private.telegram_identities_user_id_idx;

alter function public.set_current_timestamp_updated_at() set search_path = '';
alter function private.current_user_is_admin() set search_path = '';
alter function private.set_updated_at() set search_path = '';
alter function public.unlock_profile_auras_from_sent_gift() set search_path = '';

-- Remove user-write policies that bypass server-side validation and business
-- rules. SELECT policies remain as a second layer of protection.
drop policy if exists app_users_insert_own on public.app_users;
drop policy if exists app_users_update_own_or_admin on public.app_users;
drop policy if exists blocks_insert_own on public.blocks;
drop policy if exists blocks_delete_own on public.blocks;
drop policy if exists daily_chemistry_candidates_update_own_status on public.daily_chemistry_candidates;
drop policy if exists daily_chemistry_cards_update_own_status on public.daily_chemistry_cards;
drop policy if exists date_idea_bookmarks_insert_own on public.date_idea_bookmarks;
drop policy if exists date_idea_bookmarks_delete_own on public.date_idea_bookmarks;
drop policy if exists date_idea_impressions_insert_own on public.date_idea_impressions;
drop policy if exists date_idea_requests_insert_own on public.date_idea_requests;
drop policy if exists date_idea_requests_update_involved on public.date_idea_requests;
drop policy if exists date_ideas_insert_own on public.date_ideas;
drop policy if exists date_ideas_update_own on public.date_ideas;
drop policy if exists date_ideas_delete_own on public.date_ideas;
drop policy if exists follows_insert_own on public.follows;
drop policy if exists follows_update_involved on public.follows;
drop policy if exists follows_delete_own on public.follows;
drop policy if exists posts_insert_own on public.posts;
drop policy if exists posts_update_own on public.posts;
drop policy if exists profile_photos_insert_own on public.profile_photos;
drop policy if exists profile_photos_update_own on public.profile_photos;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists sent_gifts_insert_own on public.sent_gifts;
drop policy if exists swipe_actions_insert_own on public.swipe_actions;
drop policy if exists user_profile_auras_update_own on public.user_profile_auras;
drop policy if exists user_wallets_insert_own on public.user_wallets;
drop policy if exists user_wallets_update_own on public.user_wallets;

drop policy if exists profiles_read_public_or_own on public.profiles;
create policy profiles_read_public_or_own
on public.profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_is_admin())
  or (
    visibility = 'public'
    and discoverable = true
    and profile_completed_at is not null
    and exists (
      select 1
      from public.app_users au
      where au.id = profiles.user_id
        and au.status = 'active'
    )
  )
);

-- A completed profile is a state reached after onboarding, so the required
-- fields must be nullable while a user is still saving a draft.
alter table public.profiles alter column display_name drop not null;
alter table public.profiles alter column age_years drop not null;
alter table public.profiles alter column gender drop not null;
alter table public.profiles alter column country_code drop not null;
alter table public.profiles alter column city_name drop not null;

alter table public.profiles
  add column if not exists city_id uuid references public.cities(id) on delete set null,
  add column if not exists interests text[] not null default '{}'::text[];

alter table public.profiles
  drop constraint if exists profiles_country_code_format_check;
alter table public.profiles
  add constraint profiles_country_code_format_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create index if not exists profiles_age_gender_discovery_idx
  on public.profiles (gender, age_years, last_active_at desc)
  where profile_completed_at is not null
    and discoverable = true
    and visibility = 'public';

create index if not exists profiles_languages_gin_idx
  on public.profiles using gin (languages);
create index if not exists profiles_relationship_goals_gin_idx
  on public.profiles using gin (relationship_goals);
create index if not exists profiles_interests_gin_idx
  on public.profiles using gin (interests);
create index if not exists profiles_city_id_idx
  on public.profiles (city_id)
  where city_id is not null;

alter table public.profile_photos alter column public_url drop not null;
alter table public.profile_photos
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists upload_status text not null default 'confirmed',
  add column if not exists upload_expires_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.profile_photos
  drop constraint if exists profile_photos_mime_type_check;
alter table public.profile_photos
  add constraint profile_photos_mime_type_check
  check (
    mime_type is null
    or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')
  );

alter table public.profile_photos
  drop constraint if exists profile_photos_file_size_check;
alter table public.profile_photos
  add constraint profile_photos_file_size_check
  check (file_size_bytes is null or (file_size_bytes > 0 and file_size_bytes <= 8388608));

alter table public.profile_photos
  drop constraint if exists profile_photos_upload_status_check;
alter table public.profile_photos
  add constraint profile_photos_upload_status_check
  check (upload_status in ('pending', 'confirmed', 'failed', 'deleted'));

alter table public.profile_photos
  drop constraint if exists profile_photos_public_url_https_check;
alter table public.profile_photos
  add constraint profile_photos_public_url_https_check
  check (public_url is null or public_url ~ '^https://');

create unique index if not exists profile_photos_storage_path_key
  on public.profile_photos (storage_path);
drop index if exists public.profile_photos_one_primary_idx;
create unique index if not exists profile_photos_one_active_primary_per_user
  on public.profile_photos (user_id)
  where is_primary = true and deleted_at is null;
create index if not exists profile_photos_pending_upload_idx
  on public.profile_photos (upload_expires_at)
  where upload_status = 'pending';

drop policy if exists profile_photos_read_public_or_own on public.profile_photos;
create policy profile_photos_read_public_or_own
on public.profile_photos for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.current_user_is_admin())
  or (
    is_private = false
    and deleted_at is null
    and upload_status = 'confirmed'
    and public_url is not null
    and moderation_status = 'approved'
    and face_check_status in ('passed', 'manual_review')
    and exists (
      select 1
      from public.app_users au
      where au.id = profile_photos.user_id
        and au.status = 'active'
    )
  )
);

alter table public.matches
  drop constraint if exists matches_canonical_order_check;
alter table public.matches
  add constraint matches_canonical_order_check check (user_a_id < user_b_id);

create unique index if not exists payments_provider_payment_id_key
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create unique index if not exists payments_provider_invoice_payload_key
  on public.payments (provider, invoice_payload);
create unique index if not exists sent_gifts_payment_id_key
  on public.sent_gifts (payment_id)
  where payment_id is not null;

create or replace function private.validate_sent_gift_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_valid boolean;
begin
  select exists (
    select 1
    from public.payments p
    join public.gifts g on g.id = new.gift_id
    where p.id = new.payment_id
      and p.user_id = new.sender_user_id
      and p.product_type = 'gift'
      and p.product_id = new.gift_id::text
      and p.status = 'verified'
      and p.verified_at is not null
      and (
        (
          p.provider = 'telegram_stars'
          and p.amount_stars is not null
          and p.amount_stars >= g.price_stars
        )
        or (
          p.provider = 'ton'
          and g.price_ton is not null
          and p.amount_ton is not null
          and p.amount_ton >= g.price_ton
        )
      )
  ) into v_is_valid;

  if not coalesce(v_is_valid, false) then
    raise exception 'a verified matching payment is required for a gift'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_sent_gift_payment()
from public, anon, authenticated, service_role;

drop trigger if exists sent_gifts_validate_payment_before_insert on public.sent_gifts;
create trigger sent_gifts_validate_payment_before_insert
before insert on public.sent_gifts
for each row execute function private.validate_sent_gift_payment();

-- Public-card access is deliberately column-limited. Private birthday and
-- onboarding fields remain available only through the trusted backend.
drop policy if exists app_users_read_active_public on public.app_users;
create policy app_users_read_active_public
on public.app_users for select to authenticated
using (status = 'active');

revoke select on public.app_users from anon, authenticated;
grant select (id, status) on public.app_users to authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (
  user_id,
  display_name,
  age_years,
  gender,
  country_code,
  city_name,
  headline,
  bio,
  intents,
  languages,
  interests,
  badges,
  relationship_goals,
  mood,
  online_state,
  last_active_at,
  public_geohash_prefix,
  discoverable,
  visibility,
  profile_completed_at
) on public.profiles to authenticated;

revoke select on public.profile_stats from anon, authenticated;
grant select (
  user_id,
  profile_completion_score,
  popularity_score,
  likes_received,
  gifts_received
) on public.profile_stats to authenticated;

revoke select on public.profile_photos from anon, authenticated;
grant select (
  user_id,
  public_url,
  is_primary,
  is_private,
  moderation_status,
  face_check_status,
  sort_order,
  created_at,
  deleted_at,
  upload_status
) on public.profile_photos to authenticated;

drop view if exists public.public_profile_cards;
create view public.public_profile_cards
with (security_invoker = true)
as
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
  p.discoverable,
  s.profile_completion_score,
  s.popularity_score,
  s.likes_received,
  s.gifts_received,
  ph.public_url as primary_photo_url
from public.profiles p
join public.app_users u on u.id = p.user_id
left join public.profile_stats s on s.user_id = p.user_id
left join lateral (
  select pp.public_url
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
) ph on true
where u.status = 'active'
  and p.visibility = 'public'
  and p.discoverable = true
  and p.profile_completed_at is not null
  and ph.public_url is not null;

revoke all on public.public_profile_cards from public, anon;
grant select on public.public_profile_cards to authenticated;

create table if not exists private.api_rate_limits (
  bucket_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  primary key (bucket_key, window_started_at)
);
alter table private.api_rate_limits enable row level security;
revoke all on private.api_rate_limits from public, anon, authenticated;
create index if not exists api_rate_limits_expiry_idx
  on private.api_rate_limits (expires_at);

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_window_seconds integer,
  p_request_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_started_at timestamptz;
  v_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) < 16 or length(p_bucket_key) > 200 then
    raise exception 'invalid rate-limit bucket key' using errcode = '22023';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit window' using errcode = '22023';
  end if;
  if p_request_limit < 1 or p_request_limit > 10000 then
    raise exception 'invalid rate-limit limit' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  delete from private.api_rate_limits
  where bucket_key = p_bucket_key
    and expires_at < clock_timestamp();

  insert into private.api_rate_limits (
    bucket_key,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    p_bucket_key,
    v_window_started_at,
    1,
    v_window_started_at + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (bucket_key, window_started_at) do update
    set request_count = private.api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_request_limit;
end;
$$;

create or replace function public.find_user_id_by_telegram_id(
  p_telegram_user_id text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_telegram_user_id bigint;
  v_user_id uuid;
begin
  if p_telegram_user_id !~ '^[1-9][0-9]{0,15}$' then
    raise exception 'invalid Telegram user id' using errcode = '22023';
  end if;

  v_telegram_user_id := p_telegram_user_id::bigint;
  if v_telegram_user_id > 4503599627370495 then
    raise exception 'invalid Telegram user id' using errcode = '22023';
  end if;
  select ti.user_id
    into v_user_id
  from private.telegram_identities ti
  where ti.telegram_user_id = v_telegram_user_id;

  return v_user_id;
end;
$$;

create or replace function public.get_account_gate_state(
  p_user_id uuid
)
returns table (
  user_id uuid,
  role public.user_role,
  status public.user_status,
  profile_completed_at timestamptz,
  is_banned boolean,
  restrictions public.user_restriction_type[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    au.id,
    au.role,
    au.status,
    p.profile_completed_at,
    (
      au.status = 'banned'
      or exists (
        select 1
        from public.bans b
        where b.user_id = au.id
          and b.status = 'active'
          and b.starts_at <= now()
          and (b.ends_at is null or b.ends_at > now())
      )
    ),
    coalesce(
      array(
        select ur.restriction_type
        from public.user_restrictions ur
        where ur.user_id = au.id
          and ur.status = 'active'
          and ur.starts_at <= now()
          and (ur.ends_at is null or ur.ends_at > now())
        order by ur.restriction_type
      ),
      '{}'::public.user_restriction_type[]
    )
  from public.app_users au
  left join public.profiles p on p.user_id = au.id
  where au.id = p_user_id;
$$;

create or replace function public.provision_telegram_user(
  p_user_id uuid,
  p_telegram_user_id text,
  p_telegram_username text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_photo_url text default null,
  p_language_code text default null,
  p_is_telegram_premium boolean default false,
  p_allows_write_to_pm boolean default false,
  p_added_to_attachment_menu boolean default false,
  p_init_data_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_telegram_user_id bigint;
  v_existing_user_id uuid;
  v_initial_display_name text;
begin
  if p_telegram_user_id !~ '^[1-9][0-9]{0,15}$' then
    raise exception 'invalid Telegram user id' using errcode = '22023';
  end if;
  v_telegram_user_id := p_telegram_user_id::bigint;
  if v_telegram_user_id > 4503599627370495 then
    raise exception 'invalid Telegram user id' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('telegram_identity:' || p_telegram_user_id, 0)
  );
  v_initial_display_name := nullif(
    left(
      trim(concat_ws(' ', nullif(trim(p_first_name), ''), nullif(trim(p_last_name), ''))),
      80
    ),
    ''
  );
  if char_length(v_initial_display_name) < 2 then
    v_initial_display_name := null;
  end if;

  select ti.user_id
    into v_existing_user_id
  from private.telegram_identities ti
  where ti.telegram_user_id = v_telegram_user_id;

  if v_existing_user_id is not null then
    update public.app_users
      set language_code = left(p_language_code, 35),
          is_telegram_premium = coalesce(p_is_telegram_premium, false)
      where id = v_existing_user_id;

    update private.telegram_identities
      set telegram_username = nullif(left(trim(p_telegram_username), 64), ''),
          first_name = nullif(left(trim(p_first_name), 128), ''),
          last_name = nullif(left(trim(p_last_name), 128), ''),
          photo_url = nullif(left(trim(p_photo_url), 2048), ''),
          init_data_hash = nullif(left(trim(p_init_data_hash), 128), ''),
          allows_write_to_pm = coalesce(p_allows_write_to_pm, false),
          added_to_attachment_menu = coalesce(p_added_to_attachment_menu, false),
          last_validated_at = now()
      where user_id = v_existing_user_id;

    insert into public.profile_stats (user_id)
      values (v_existing_user_id)
      on conflict (user_id) do nothing;

    insert into public.profiles (user_id, display_name)
      values (v_existing_user_id, v_initial_display_name)
      on conflict (user_id) do nothing;

    return v_existing_user_id;
  end if;

  insert into public.app_users (
    id,
    language_code,
    is_telegram_premium
  )
  values (
    p_user_id,
    left(p_language_code, 35),
    coalesce(p_is_telegram_premium, false)
  )
  on conflict (id) do update
    set language_code = excluded.language_code,
        is_telegram_premium = excluded.is_telegram_premium;

  insert into private.telegram_identities (
    user_id,
    telegram_user_id,
    telegram_username,
    first_name,
    last_name,
    photo_url,
    init_data_hash,
    allows_write_to_pm,
    added_to_attachment_menu,
    last_validated_at
  )
  values (
    p_user_id,
    v_telegram_user_id,
    nullif(left(trim(p_telegram_username), 64), ''),
    nullif(left(trim(p_first_name), 128), ''),
    nullif(left(trim(p_last_name), 128), ''),
    nullif(left(trim(p_photo_url), 2048), ''),
    nullif(left(trim(p_init_data_hash), 128), ''),
    coalesce(p_allows_write_to_pm, false),
    coalesce(p_added_to_attachment_menu, false),
    now()
  )
  on conflict (telegram_user_id) do nothing;

  select ti.user_id
    into v_existing_user_id
  from private.telegram_identities ti
  where ti.telegram_user_id = v_telegram_user_id;

  if v_existing_user_id = p_user_id then
    insert into public.profile_stats (user_id)
      values (p_user_id)
      on conflict (user_id) do nothing;

    insert into public.profiles (user_id, display_name)
      values (p_user_id, v_initial_display_name)
      on conflict (user_id) do nothing;
  end if;

  return v_existing_user_id;
end;
$$;

create or replace function public.refresh_profile_completion(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_complete boolean;
  v_score numeric;
begin
  select
    (
      nullif(trim(p.display_name), '') is not null
      and p.age_years between 18 and 100
      and p.gender is not null
      and nullif(trim(p.country_code), '') is not null
      and nullif(trim(p.city_name), '') is not null
      and exists (
        select 1
        from public.profile_photos pp
        where pp.user_id = p.user_id
          and pp.deleted_at is null
          and pp.upload_status = 'confirmed'
          and pp.is_primary = true
      )
    ),
    (
      (case when nullif(trim(p.display_name), '') is not null then 20 else 0 end)
      + (case when p.age_years between 18 and 100 then 20 else 0 end)
      + (case when p.gender is not null then 20 else 0 end)
      + (case when nullif(trim(p.country_code), '') is not null and nullif(trim(p.city_name), '') is not null then 20 else 0 end)
      + (case when exists (
          select 1
          from public.profile_photos pp
          where pp.user_id = p.user_id
            and pp.deleted_at is null
            and pp.upload_status = 'confirmed'
            and pp.is_primary = true
        ) then 20 else 0 end)
    )::numeric
  into v_is_complete, v_score
  from public.profiles p
  where p.user_id = p_user_id;

  if not found then
    v_is_complete := false;
    v_score := 0;
  end if;

  update public.profiles
    set profile_completed_at = case
      when v_is_complete then coalesce(profile_completed_at, now())
      else null
    end
  where user_id = p_user_id;

  insert into public.profile_stats (user_id, profile_completion_score)
    values (p_user_id, v_score)
  on conflict (user_id) do update
    set profile_completion_score = excluded.profile_completion_score;

  return v_is_complete;
end;
$$;

create or replace function public.set_primary_profile_photo(
  p_user_id uuid,
  p_photo_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profile_photos pp
    where pp.id = p_photo_id
      and pp.user_id = p_user_id
      and pp.deleted_at is null
      and pp.upload_status = 'confirmed'
  ) then
    return false;
  end if;

  update public.profile_photos
    set is_primary = false
  where user_id = p_user_id
    and is_primary = true;

  update public.profile_photos
    set is_primary = true
  where id = p_photo_id
    and user_id = p_user_id;

  perform public.refresh_profile_completion(p_user_id);
  return true;
end;
$$;

create or replace function public.reorder_profile_photos(
  p_user_id uuid,
  p_photo_ids uuid[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested_count integer;
  v_owned_count integer;
  v_total_count integer;
begin
  v_requested_count := coalesce(array_length(p_photo_ids, 1), 0);
  if v_requested_count < 1 or v_requested_count > 9 then
    return false;
  end if;

  if (
    select count(distinct item.photo_id)
    from unnest(p_photo_ids) as item(photo_id)
  ) <> v_requested_count then
    return false;
  end if;

  select count(*)
    into v_owned_count
  from public.profile_photos pp
  where pp.user_id = p_user_id
    and pp.deleted_at is null
    and pp.id = any(p_photo_ids);

  if v_owned_count <> v_requested_count then
    return false;
  end if;

  select count(*)
    into v_total_count
  from public.profile_photos pp
  where pp.user_id = p_user_id
    and pp.deleted_at is null;

  if v_total_count <> v_requested_count then
    return false;
  end if;

  update public.profile_photos pp
    set sort_order = ordered.position - 1
  from unnest(p_photo_ids) with ordinality as ordered(photo_id, position)
  where pp.id = ordered.photo_id
    and pp.user_id = p_user_id;

  return true;
end;
$$;

create or replace function public.soft_delete_profile_photo(
  p_user_id uuid,
  p_photo_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_storage_path text;
  v_was_primary boolean;
  v_replacement_id uuid;
begin
  select pp.storage_path, pp.is_primary
    into v_storage_path, v_was_primary
  from public.profile_photos pp
  where pp.id = p_photo_id
    and pp.user_id = p_user_id
    and pp.deleted_at is null
  for update;

  if v_storage_path is null then
    return null;
  end if;

  update public.profile_photos
    set deleted_at = now(),
        upload_status = 'deleted',
        is_primary = false
  where id = p_photo_id
    and user_id = p_user_id;

  if v_was_primary then
    select pp.id
      into v_replacement_id
    from public.profile_photos pp
    where pp.user_id = p_user_id
      and pp.deleted_at is null
      and pp.upload_status = 'confirmed'
    order by pp.sort_order, pp.created_at
    limit 1;

    if v_replacement_id is not null then
      update public.profile_photos
        set is_primary = true
      where id = v_replacement_id;
    end if;
  end if;

  perform public.refresh_profile_completion(p_user_id);
  return v_storage_path;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.find_user_id_by_telegram_id(text) from public, anon, authenticated;
revoke all on function public.get_account_gate_state(uuid) from public, anon, authenticated;
revoke all on function public.provision_telegram_user(uuid, text, text, text, text, text, text, boolean, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.refresh_profile_completion(uuid) from public, anon, authenticated;
revoke all on function public.set_primary_profile_photo(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reorder_profile_photos(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.soft_delete_profile_photo(uuid, uuid) from public, anon, authenticated;

grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
grant execute on function public.find_user_id_by_telegram_id(text) to service_role;
grant execute on function public.get_account_gate_state(uuid) to service_role;
grant execute on function public.provision_telegram_user(uuid, text, text, text, text, text, text, boolean, boolean, boolean, text) to service_role;
grant execute on function public.refresh_profile_completion(uuid) to service_role;
grant execute on function public.set_primary_profile_photo(uuid, uuid) to service_role;
grant execute on function public.reorder_profile_photos(uuid, uuid[]) to service_role;
grant execute on function public.soft_delete_profile_photo(uuid, uuid) to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-photos-original',
  'profile-photos-original',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-photos-public',
  'profile-photos-public',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

commit;
