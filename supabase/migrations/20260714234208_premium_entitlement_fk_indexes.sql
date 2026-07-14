begin;

-- These entitlement tables predate the premium API but are now on the active
-- payment and feature-claim path. Cover their foreign keys for safe plan and
-- payment maintenance at production volume.
create index if not exists user_premium_subscriptions_plan_id_idx
  on public.user_premium_subscriptions (plan_id);
create index if not exists user_premium_subscriptions_payment_id_idx
  on public.user_premium_subscriptions (payment_id);
create index if not exists premium_feature_usage_subscription_id_idx
  on public.premium_feature_usage (subscription_id);

commit;
