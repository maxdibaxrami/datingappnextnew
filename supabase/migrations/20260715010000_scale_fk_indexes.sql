begin;

-- These indexes cover every previously unindexed foreign-key side identified
-- by the live advisor. They make join, moderation/audit lookup, and ON DELETE
-- cascade checks bounded as the account and event tables grow.
create index if not exists app_users_invited_by_user_id_idx
  on public.app_users (invited_by_user_id);

create index if not exists bans_banned_by_user_id_idx
  on public.bans (banned_by_user_id);
create index if not exists bans_lifted_by_user_id_idx
  on public.bans (lifted_by_user_id);
create index if not exists bans_moderation_queue_id_idx
  on public.bans (moderation_queue_id);
create index if not exists bans_report_id_idx
  on public.bans (report_id);

create index if not exists gifts_asset_id_idx on public.gifts (asset_id);
create index if not exists gifts_category_id_idx on public.gifts (category_id);

create index if not exists moderation_queue_reported_user_id_idx
  on public.moderation_queue (reported_user_id);
create index if not exists moderation_queue_reporter_user_id_idx
  on public.moderation_queue (reporter_user_id);

create index if not exists photo_moderation_events_actor_user_id_idx
  on public.photo_moderation_events (actor_user_id);
create index if not exists photo_moderation_events_photo_id_idx
  on public.photo_moderation_events (photo_id);
create index if not exists photo_moderation_events_user_id_idx
  on public.photo_moderation_events (user_id);

create index if not exists post_moderation_events_actor_user_id_idx
  on public.post_moderation_events (actor_user_id);
create index if not exists post_moderation_events_post_id_idx
  on public.post_moderation_events (post_id);
create index if not exists post_moderation_events_user_id_idx
  on public.post_moderation_events (user_id);

create index if not exists profile_aura_effects_required_gift_id_idx
  on public.profile_aura_effects (required_gift_id);
create index if not exists profile_aura_events_actor_user_id_idx
  on public.profile_aura_events (actor_user_id);
create index if not exists profile_aura_events_aura_id_idx
  on public.profile_aura_events (aura_id);
create index if not exists profile_aura_events_source_gift_id_idx
  on public.profile_aura_events (source_gift_id);
create index if not exists profile_aura_events_source_payment_id_idx
  on public.profile_aura_events (source_payment_id);
create index if not exists profile_aura_events_source_sent_gift_id_idx
  on public.profile_aura_events (source_sent_gift_id);
create index if not exists profile_aura_events_user_aura_id_idx
  on public.profile_aura_events (user_aura_id);

create index if not exists reports_decided_by_user_id_idx
  on public.reports (decided_by_user_id);
create index if not exists reports_post_id_idx on public.reports (post_id);
create index if not exists reports_video_session_id_idx
  on public.reports (video_session_id);

create index if not exists ton_transactions_wallet_id_idx
  on public.ton_transactions (wallet_id);

create index if not exists user_profile_auras_aura_id_idx
  on public.user_profile_auras (aura_id);
create index if not exists user_profile_auras_source_gift_id_idx
  on public.user_profile_auras (source_gift_id);
create index if not exists user_profile_auras_source_payment_id_idx
  on public.user_profile_auras (source_payment_id);
create index if not exists user_profile_auras_source_sent_gift_id_idx
  on public.user_profile_auras (source_sent_gift_id);

create index if not exists user_restrictions_created_by_user_id_idx
  on public.user_restrictions (created_by_user_id);
create index if not exists user_restrictions_lifted_by_user_id_idx
  on public.user_restrictions (lifted_by_user_id);
create index if not exists user_restrictions_moderation_queue_id_idx
  on public.user_restrictions (moderation_queue_id);
create index if not exists user_restrictions_report_id_idx
  on public.user_restrictions (report_id);

commit;
