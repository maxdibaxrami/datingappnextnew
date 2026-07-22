alter table public.profile_photos
  add column if not exists display_storage_path text,
  add column if not exists thumbnail_storage_path text,
  add column if not exists thumbnail_url text,
  add column if not exists display_file_size_bytes bigint,
  add column if not exists thumbnail_file_size_bytes bigint,
  add column if not exists processed_at timestamptz;

comment on column public.profile_photos.storage_path is
  'Private uploaded source object in profile-photos-original.';
comment on column public.profile_photos.display_storage_path is
  'Optimized large display object in profile-photos-public.';
comment on column public.profile_photos.thumbnail_storage_path is
  'Optimized small thumbnail object in profile-photos-public.';
comment on column public.profile_photos.public_url is
  'Public URL for the optimized large display image.';
comment on column public.profile_photos.thumbnail_url is
  'Public URL for the optimized small thumbnail image.';

create index if not exists profile_photos_user_active_variants_idx
  on public.profile_photos (user_id, sort_order)
  where deleted_at is null and upload_status = 'confirmed';
