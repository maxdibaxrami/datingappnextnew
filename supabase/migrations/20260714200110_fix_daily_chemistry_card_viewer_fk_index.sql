-- Recorded in live Supabase migration history as version 20260714200110.
-- Cover the composite card/viewer foreign key used to preserve Daily
-- Chemistry ownership integrity. PostgreSQL does not create indexes on the
-- referencing columns automatically.
create index if not exists daily_chemistry_candidates_card_viewer_idx
  on public.daily_chemistry_candidates (card_id, viewer_user_id);
