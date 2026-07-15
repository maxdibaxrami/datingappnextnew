begin;

-- Cover the participant/report retention paths identified by the performance
-- advisor. The composite signal lookup index serves session polling; this
-- standalone recipient index additionally protects parent-user maintenance.
create index if not exists video_session_signals_recipient_user_id_idx
  on public.video_session_signals (recipient_user_id);
create index if not exists video_report_events_actor_user_id_idx
  on public.video_report_events (actor_user_id)
  where actor_user_id is not null;
create index if not exists video_report_events_reported_user_id_idx
  on public.video_report_events (reported_user_id)
  where reported_user_id is not null;
create index if not exists video_report_events_reporter_user_id_idx
  on public.video_report_events (reporter_user_id)
  where reporter_user_id is not null;
create index if not exists video_report_events_video_session_id_idx
  on public.video_report_events (video_session_id);

commit;
