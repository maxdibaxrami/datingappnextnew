begin;

-- Cover the new foreign keys identified by the performance advisor. These
-- support catalog deletion/maintenance and keep the private payment-intent and
-- boost audit tables from requiring relation-wide scans.
create index if not exists premium_payment_intents_plan_id_idx
  on private.premium_payment_intents (plan_id);
create index if not exists boost_payment_intents_boost_product_id_idx
  on private.boost_payment_intents (boost_product_id);
create index if not exists boosts_boost_product_id_idx
  on public.boosts (boost_product_id);
create index if not exists boost_events_actor_user_id_idx
  on public.boost_events (actor_user_id);

-- The original payments constraint already owns this exact unique partial
-- index. Retain it and remove the redundant index introduced by the premium
-- migration so payment writes incur only one uniqueness-maintenance cost.
drop index if exists public.payments_provider_payment_id_unique_idx;

commit;
