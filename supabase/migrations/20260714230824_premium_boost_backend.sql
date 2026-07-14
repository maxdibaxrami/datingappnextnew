begin;

-- Paid boost products are server-owned catalog data. Prices are snapshots on
-- payment rows; changing a product later never changes an outstanding invoice.
create table if not exists public.boost_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 240),
  multiplier numeric(4,2) not null check (multiplier >= 1.10 and multiplier <= 5.00),
  price_stars integer not null check (price_stars > 0),
  price_ton numeric(20,9),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint boost_products_slug_check check (slug ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint boost_products_ton_price_check check (price_ton is null or price_ton > 0)
);

insert into public.boost_products (
  slug, name, description, duration_minutes, multiplier, price_stars, sort_order
) values
  ('boost_30', '30 minute Boost', 'Increase profile discovery exposure for 30 minutes.', 30, 2.00, 120, 10),
  ('boost_60', '60 minute Boost', 'Increase profile discovery exposure for 60 minutes.', 60, 2.00, 200, 20),
  ('boost_120', '2 hour Boost', 'Increase profile discovery exposure for two hours.', 120, 2.25, 350, 30)
on conflict (slug) do nothing;

alter table public.boosts
  add column if not exists boost_product_id uuid references public.boost_products(id) on delete set null,
  add column if not exists paused_at timestamptz,
  add column if not exists remaining_seconds integer;

alter table public.boosts
  drop constraint if exists boosts_remaining_seconds_check;
alter table public.boosts
  add constraint boosts_remaining_seconds_check
  check (remaining_seconds is null or remaining_seconds > 0);

create table if not exists private.premium_payment_intents (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  plan_id uuid not null references public.premium_plans(id) on delete restrict,
  idempotency_key uuid not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  constraint premium_payment_intents_user_idempotency_key unique (user_id, idempotency_key)
);

create table if not exists private.boost_payment_intents (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  boost_product_id uuid not null references public.boost_products(id) on delete restrict,
  idempotency_key uuid not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  constraint boost_payment_intents_user_idempotency_key unique (user_id, idempotency_key)
);

create unique index if not exists payments_invoice_payload_unique_idx
  on public.payments (invoice_payload);
create unique index if not exists payments_provider_payment_id_unique_idx
  on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create index if not exists payments_user_product_created_idx
  on public.payments (user_id, product_type, created_at desc, id desc);
create index if not exists premium_payment_intents_expires_idx
  on private.premium_payment_intents (expires_at);
create index if not exists boost_payment_intents_expires_idx
  on private.boost_payment_intents (expires_at);
create index if not exists boost_products_active_sort_idx
  on public.boost_products (sort_order, id)
  where is_active = true;
create unique index if not exists user_premium_subscriptions_one_active_idx
  on public.user_premium_subscriptions (user_id)
  where status in ('trialing', 'active', 'grace_period');
create index if not exists user_premium_subscriptions_user_period_idx
  on public.user_premium_subscriptions (user_id, current_period_end desc, id desc);
create unique index if not exists premium_feature_usage_subscription_period_idx
  on public.premium_feature_usage (user_id, subscription_id, feature_key, period_start)
  where subscription_id is not null;
create unique index if not exists boosts_payment_id_unique_idx
  on public.boosts (payment_id)
  where payment_id is not null;
create unique index if not exists boosts_one_active_per_user_idx
  on public.boosts (user_id)
  where status = 'active';
create index if not exists boosts_user_schedule_idx
  on public.boosts (user_id, status, ends_at desc, id desc);
create index if not exists boosts_active_discovery_idx
  on public.boosts (user_id, ends_at, multiplier desc)
  where status = 'active';
create index if not exists boost_events_boost_created_idx
  on public.boost_events (boost_id, created_at desc, id desc);
create index if not exists boost_events_user_created_idx
  on public.boost_events (user_id, created_at desc, id desc);

alter table public.boost_products enable row level security;
alter table private.premium_payment_intents enable row level security;
alter table private.boost_payment_intents enable row level security;
alter table public.premium_plans enable row level security;
alter table public.user_premium_subscriptions enable row level security;
alter table public.premium_feature_usage enable row level security;
alter table public.super_like_balances enable row level security;
alter table public.super_like_ledger enable row level security;
alter table public.boosts enable row level security;
alter table public.boost_events enable row level security;

revoke all on table public.boost_products from public, anon, authenticated;
revoke all on table private.premium_payment_intents from public, anon, authenticated;
revoke all on table private.boost_payment_intents from public, anon, authenticated;
revoke all on table public.premium_plans from public, anon, authenticated;
revoke all on table public.user_premium_subscriptions from public, anon, authenticated;
revoke all on table public.premium_feature_usage from public, anon, authenticated;
revoke all on table public.super_like_balances from public, anon, authenticated;
revoke all on table public.super_like_ledger from public, anon, authenticated;
revoke all on table public.boosts from public, anon, authenticated;
revoke all on table public.boost_events from public, anon, authenticated;

drop policy if exists premium_plans_admin_all on public.premium_plans;
drop policy if exists premium_plans_read_active on public.premium_plans;
drop policy if exists user_premium_subscriptions_admin_all on public.user_premium_subscriptions;
drop policy if exists user_premium_subscriptions_read_own on public.user_premium_subscriptions;
drop policy if exists premium_feature_usage_admin_all on public.premium_feature_usage;
drop policy if exists premium_feature_usage_read_own on public.premium_feature_usage;
drop policy if exists super_like_balances_admin_all on public.super_like_balances;
drop policy if exists super_like_balances_read_own on public.super_like_balances;
drop policy if exists super_like_ledger_admin_all on public.super_like_ledger;
drop policy if exists super_like_ledger_read_own on public.super_like_ledger;
drop policy if exists boosts_admin_all on public.boosts;
drop policy if exists boosts_read_own on public.boosts;
drop policy if exists boost_events_admin_all on public.boost_events;
drop policy if exists boost_events_read_own on public.boost_events;

create or replace function private.assert_premium_account(p_user_id uuid)
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

create or replace function private.expire_user_boosts(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  with expired as (
    update public.boosts boost
    set status = 'expired',
        remaining_seconds = null,
        paused_at = null,
        updated_at = now()
    where boost.user_id = p_user_id
      and boost.status in ('active', 'scheduled')
      and boost.ends_at <= now()
    returning boost.id, boost.user_id
  )
  insert into public.boost_events (boost_id, user_id, event_type, payload)
  select expired.id, expired.user_id, 'expired', '{}'::jsonb
  from expired;

  with due_candidates as (
    select candidate.id, candidate.user_id,
      row_number() over (partition by candidate.user_id order by candidate.starts_at, candidate.id) as queue_position
    from public.boosts candidate
    where candidate.user_id = p_user_id
      and candidate.status = 'scheduled'
      and candidate.starts_at <= now()
      and candidate.ends_at > now()
      and not exists (
        select 1
        from public.boosts active_boost
        where active_boost.user_id = candidate.user_id
          and active_boost.status = 'active'
          and active_boost.ends_at > now()
      )
  ), started as (
    update public.boosts boost
    set status = 'active', updated_at = now()
    from due_candidates candidate
    where boost.id = candidate.id
      and candidate.queue_position = 1
    returning boost.id, boost.user_id
  )
  insert into public.boost_events (boost_id, user_id, event_type, payload)
  select started.id, started.user_id, 'started', jsonb_build_object('scheduled', true)
  from started;
end;
$$;

create or replace function private.next_boost_window(
  p_user_id uuid,
  p_duration_seconds integer
)
returns table (starts_at timestamptz, ends_at timestamptz, boost_status public.boost_status)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_start timestamptz := now();
  v_existing_end timestamptz;
begin
  if p_duration_seconds is null or p_duration_seconds < 60 or p_duration_seconds > 14400 then
    raise exception using errcode = '22023', message = 'invalid_boost_duration';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('boost-schedule:' || p_user_id::text, 0)
  );
  perform private.expire_user_boosts(p_user_id);

  select max(boost.ends_at) into v_existing_end
  from public.boosts boost
  where boost.user_id = p_user_id
    and boost.status in ('active', 'scheduled')
    and boost.ends_at > now();

  if v_existing_end is not null and v_existing_end > v_start then
    v_start := v_existing_end;
  end if;

  return query select
    v_start,
    v_start + make_interval(secs => p_duration_seconds),
    case when v_start <= now() then 'active'::public.boost_status else 'scheduled'::public.boost_status end;
end;
$$;

create or replace function private.create_boost_record(
  p_user_id uuid,
  p_payment_id uuid,
  p_boost_product_id uuid,
  p_source text,
  p_duration_minutes integer,
  p_multiplier numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  boost_id uuid,
  boost_status public.boost_status,
  starts_at timestamptz,
  ends_at timestamptz,
  multiplier numeric
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window record;
  v_profile public.profiles%rowtype;
  v_boost public.boosts%rowtype;
begin
  if p_user_id is null
    or p_source is null
    or p_source !~ '^[a-z][a-z0-9_]{1,31}$'
    or p_duration_minutes is null
    or p_duration_minutes < 5
    or p_duration_minutes > 240
    or p_multiplier is null
    or p_multiplier < 1.10
    or p_multiplier > 5.00
    or p_metadata is null
    or jsonb_typeof(p_metadata) <> 'object'
  then
    raise exception using errcode = '22023', message = 'invalid_boost_input';
  end if;

  select * into v_profile from public.profiles profile where profile.user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'account_unavailable';
  end if;

  select * into v_window from private.next_boost_window(p_user_id, p_duration_minutes * 60);

  insert into public.boosts (
    user_id, payment_id, boost_product_id, status, boost_type, starts_at, ends_at,
    multiplier, country_code, city_name, geohash_prefix, metadata
  ) values (
    p_user_id, p_payment_id, p_boost_product_id, v_window.boost_status, 'profile',
    v_window.starts_at, v_window.ends_at, p_multiplier,
    v_profile.country_code, v_profile.city_name, v_profile.public_geohash_prefix,
    p_metadata || jsonb_build_object('source', p_source)
  ) returning * into v_boost;

  insert into public.boost_events (boost_id, user_id, event_type, payload)
  values (v_boost.id, p_user_id, 'created', jsonb_build_object('source', p_source));
  if p_payment_id is not null then
    insert into public.boost_events (boost_id, user_id, event_type, payload)
    values (v_boost.id, p_user_id, 'paid', jsonb_build_object('source', p_source, 'payment_id', p_payment_id));
  end if;
  if v_boost.status = 'active' then
    insert into public.boost_events (boost_id, user_id, event_type, payload)
    values (v_boost.id, p_user_id, 'started', jsonb_build_object('source', p_source));
  end if;

  return query select v_boost.id, v_boost.status, v_boost.starts_at, v_boost.ends_at, v_boost.multiplier;
end;
$$;

create or replace function public.get_premium_plans()
returns table (
  plan_id uuid,
  slug text,
  name text,
  description text,
  plan_interval public.premium_plan_interval,
  duration_days integer,
  price_stars integer,
  price_ton numeric,
  features jsonb,
  limits jsonb,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select plan.id, plan.slug, plan.name, plan.description, plan.interval,
    plan.duration_days, plan.price_stars, plan.price_ton,
    plan.features, plan.limits, plan.sort_order
  from public.premium_plans plan
  where plan.is_active = true
  order by plan.sort_order, plan.id;
$$;

create or replace function public.get_my_premium_entitlements(p_actor_user_id uuid)
returns table (
  subscription_id uuid,
  plan_id uuid,
  plan_slug text,
  plan_name text,
  subscription_status public.premium_subscription_status,
  starts_at timestamptz,
  current_period_end timestamptz,
  expires_at timestamptz,
  features jsonb,
  limits jsonb,
  super_like_balance integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.assert_premium_account(p_actor_user_id);
  update public.user_premium_subscriptions subscription
  set status = 'expired', updated_at = now()
  where subscription.user_id = p_actor_user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end <= now();

  return query
  select subscription.id, plan.id, plan.slug, plan.name, subscription.status,
    subscription.starts_at, subscription.current_period_end, subscription.expires_at,
    plan.features, plan.limits, coalesce(balance.available_count, 0)
  from public.user_premium_subscriptions subscription
  join public.premium_plans plan on plan.id = subscription.plan_id
  left join public.super_like_balances balance on balance.user_id = subscription.user_id
  where subscription.user_id = p_actor_user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end > now()
  order by subscription.current_period_end desc, subscription.id desc
  limit 1;
end;
$$;

create or replace function public.create_premium_payment_intent(
  p_user_id uuid,
  p_plan_id uuid,
  p_provider public.payment_provider,
  p_invoice_payload text,
  p_idempotency_key uuid
)
returns table (
  payment_id uuid,
  payment_provider public.payment_provider,
  payment_status public.payment_status,
  invoice_payload text,
  plan_id uuid,
  plan_name text,
  amount_stars integer,
  amount_ton numeric,
  currency text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_plan public.premium_plans%rowtype;
  v_payment public.payments%rowtype;
  v_existing private.premium_payment_intents%rowtype;
begin
  if p_user_id is null
    or p_plan_id is null
    or p_provider is null
    or p_idempotency_key is null
    or p_invoice_payload is null
    or p_invoice_payload !~ '^prm_[A-Za-z0-9_-]{8,124}$'
  then
    raise exception using errcode = '22023', message = 'invalid_premium_input';
  end if;
  perform private.assert_premium_account(p_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('premium-payment:' || p_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_existing
  from private.premium_payment_intents intent
  where intent.user_id = p_user_id and intent.idempotency_key = p_idempotency_key;
  if found then
    select * into v_payment from public.payments payment where payment.id = v_existing.payment_id;
    if v_existing.plan_id <> p_plan_id or v_payment.provider <> p_provider then
      raise exception using errcode = 'P0001', message = 'idempotency_conflict';
    end if;
    if v_payment.granted_at is not null or v_payment.status not in ('created', 'pending') then
      raise exception using errcode = 'P0001', message = 'payment_not_payable';
    end if;
    select * into v_plan from public.premium_plans plan where plan.id = v_existing.plan_id;
    return query select v_payment.id, v_payment.provider, v_payment.status, v_payment.invoice_payload,
      v_plan.id, v_plan.name, v_payment.amount_stars, v_payment.amount_ton,
      v_payment.currency, v_existing.expires_at;
    return;
  end if;

  select * into v_plan
  from public.premium_plans plan
  where plan.id = p_plan_id and plan.is_active = true
  for share;
  if not found or v_plan.duration_days is null or v_plan.duration_days < 1 then
    raise exception using errcode = 'P0001', message = 'premium_plan_unavailable';
  end if;
  if (p_provider = 'telegram_stars' and (v_plan.price_stars is null or v_plan.price_stars <= 0))
    or (p_provider = 'ton' and (v_plan.price_ton is null or v_plan.price_ton <= 0))
  then
    raise exception using errcode = 'P0001', message = 'premium_provider_unavailable';
  end if;

  insert into public.payments (
    user_id, provider, product_type, product_id, invoice_payload,
    amount_stars, amount_ton, currency, status, raw_request
  ) values (
    p_user_id, p_provider, 'premium', v_plan.id, p_invoice_payload,
    case when p_provider = 'telegram_stars' then v_plan.price_stars else null end,
    case when p_provider = 'ton' then v_plan.price_ton else null end,
    case when p_provider = 'telegram_stars' then 'XTR' else 'TON' end,
    'pending', jsonb_build_object('created_through', 'premium_api', 'idempotency_key', p_idempotency_key)
  ) returning * into v_payment;

  insert into private.premium_payment_intents (payment_id, user_id, plan_id, idempotency_key)
  values (v_payment.id, p_user_id, v_plan.id, p_idempotency_key)
  returning expires_at into v_existing.expires_at;

  return query select v_payment.id, v_payment.provider, v_payment.status, v_payment.invoice_payload,
    v_plan.id, v_plan.name, v_payment.amount_stars, v_payment.amount_ton,
    v_payment.currency, v_existing.expires_at;
end;
$$;

create or replace function public.resolve_telegram_stars_premium_payment(
  p_invoice_payload text,
  p_telegram_user_id text,
  p_amount_stars integer,
  p_require_unexpired boolean default true
)
returns table (payment_id uuid, payment_status public.payment_status)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_invoice_payload is null or p_telegram_user_id is null
    or p_amount_stars is null or p_amount_stars <= 0 or p_require_unexpired is null
  then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;

  return query
  select payment.id, payment.status
  from public.payments payment
  join private.premium_payment_intents intent on intent.payment_id = payment.id
  join private.telegram_identities identity on identity.user_id = intent.user_id
  where payment.provider = 'telegram_stars'
    and payment.product_type = 'premium'
    and payment.invoice_payload = p_invoice_payload
    and payment.amount_stars = p_amount_stars
    and identity.telegram_user_id = p_telegram_user_id
    and payment.granted_at is null
    and payment.status in ('created', 'pending')
    and (not p_require_unexpired or intent.expires_at > now());
end;
$$;

create or replace function public.grant_verified_premium_payment(
  p_payment_id uuid,
  p_provider public.payment_provider,
  p_provider_payment_id text,
  p_provider_customer_id text,
  p_amount_stars integer default null,
  p_amount_ton numeric default null,
  p_ton_network public.wallet_network default 'ton_mainnet',
  p_raw_webhook jsonb default '{}'::jsonb
)
returns table (
  payment_id uuid,
  payment_status public.payment_status,
  subscription_id uuid,
  plan_id uuid,
  current_period_end timestamptz,
  granted_at timestamptz,
  already_granted boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_intent private.premium_payment_intents%rowtype;
  v_plan public.premium_plans%rowtype;
  v_subscription public.user_premium_subscriptions%rowtype;
  v_base_end timestamptz;
  v_period_end timestamptz;
begin
  if p_payment_id is null
    or p_provider is null
    or p_provider_payment_id is null
    or char_length(btrim(p_provider_payment_id)) not between 3 and 255
    or p_provider_customer_id is null
    or char_length(btrim(p_provider_customer_id)) not between 1 and 255
    or p_raw_webhook is null
  then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('premium-payment-grant:' || p_payment_id::text, 0)
  );
  select * into v_payment from public.payments payment where payment.id = p_payment_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'payment_not_found';
  end if;
  select * into v_intent from private.premium_payment_intents intent where intent.payment_id = p_payment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'payment_not_found';
  end if;
  select * into v_plan from public.premium_plans plan where plan.id = v_intent.plan_id;
  if not found or v_plan.duration_days is null or v_plan.duration_days < 1 then
    raise exception using errcode = 'P0001', message = 'premium_plan_unavailable';
  end if;

  if exists (
    select 1 from public.payments payment
    where payment.provider = p_provider
      and payment.provider_payment_id = p_provider_payment_id
      and payment.id <> p_payment_id
  ) then
    raise exception using errcode = 'P0001', message = 'provider_payment_reused';
  end if;
  if v_payment.provider <> p_provider
    or v_payment.product_type <> 'premium'
    or v_payment.product_id <> v_intent.plan_id
  then
    raise exception using errcode = 'P0001', message = 'payment_mismatch';
  end if;

  if v_payment.granted_at is not null then
    select * into v_subscription
    from public.user_premium_subscriptions subscription
    where subscription.payment_id = v_payment.id
    order by subscription.created_at desc
    limit 1;
    if not found then
      raise exception using errcode = 'P0001', message = 'payment_grant_inconsistent';
    end if;
    return query select v_payment.id, v_payment.status, v_subscription.id, v_subscription.plan_id,
      v_subscription.current_period_end, v_payment.granted_at, true;
    return;
  end if;
  if v_payment.status not in ('created', 'pending', 'verified') then
    raise exception using errcode = 'P0001', message = 'payment_not_payable';
  end if;
  if p_provider = 'telegram_stars' then
    if p_amount_stars is null or p_amount_stars <> v_payment.amount_stars
      or not exists (
        select 1 from private.telegram_identities identity
        where identity.user_id = v_intent.user_id
          and identity.telegram_user_id = p_provider_customer_id
      )
    then
      raise exception using errcode = 'P0001', message = 'payment_mismatch';
    end if;
  elsif p_provider = 'ton' then
    if p_amount_ton is null or v_payment.amount_ton is null or p_amount_ton < v_payment.amount_ton then
      raise exception using errcode = 'P0001', message = 'payment_mismatch';
    end if;
  else
    raise exception using errcode = 'P0001', message = 'payment_mismatch';
  end if;

  update public.payments payment
  set status = 'verified',
      provider_payment_id = p_provider_payment_id,
      verified_at = coalesce(payment.verified_at, now()),
      raw_webhook = p_raw_webhook,
      updated_at = now()
  where payment.id = v_payment.id
  returning * into v_payment;

  update public.user_premium_subscriptions subscription
  set status = 'expired', updated_at = now()
  where subscription.user_id = v_intent.user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end <= now();

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('premium-subscription:' || v_intent.user_id::text, 0)
  );
  select * into v_subscription
  from public.user_premium_subscriptions subscription
  where subscription.user_id = v_intent.user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end > now()
  order by subscription.current_period_end desc
  limit 1
  for update;

  if found then
    v_base_end := greatest(v_subscription.current_period_end, now());
    v_period_end := v_base_end + make_interval(days => v_plan.duration_days);
    update public.user_premium_subscriptions subscription
    set plan_id = v_plan.id,
        payment_id = v_payment.id,
        status = 'active',
        provider = p_provider,
        provider_subscription_id = null,
        current_period_end = v_period_end,
        expires_at = v_period_end,
        cancelled_at = null,
        auto_renew = false,
        metadata = subscription.metadata || jsonb_build_object(
          'last_payment_id', v_payment.id,
          'last_granted_at', now()
        ),
        updated_at = now()
    where subscription.id = v_subscription.id
    returning * into v_subscription;
  else
    v_period_end := now() + make_interval(days => v_plan.duration_days);
    insert into public.user_premium_subscriptions (
      user_id, plan_id, payment_id, status, provider, starts_at,
      current_period_start, current_period_end, expires_at, auto_renew, metadata
    ) values (
      v_intent.user_id, v_plan.id, v_payment.id, 'active', p_provider, now(),
      now(), v_period_end, v_period_end, false,
      jsonb_build_object('initial_payment_id', v_payment.id)
    ) returning * into v_subscription;
  end if;

  if p_provider = 'ton' then
    insert into public.ton_transactions (
      user_id, payment_id, network, transaction_type, status, tx_hash,
      from_address, to_address, amount_ton, comment, payload, confirmed_at, raw_transaction
    ) values (
      v_intent.user_id, v_payment.id, p_ton_network, 'premium_purchase', 'confirmed',
      p_provider_payment_id, p_provider_customer_id,
      p_raw_webhook #>> '{transaction,to_address}', p_amount_ton,
      v_payment.invoice_payload, v_payment.invoice_payload, now(), p_raw_webhook
    ) on conflict (network, tx_hash) where tx_hash is not null do nothing;
  end if;

  update public.payments payment
  set granted_at = now(), updated_at = now()
  where payment.id = v_payment.id
  returning * into v_payment;

  return query select v_payment.id, v_payment.status, v_subscription.id, v_subscription.plan_id,
    v_subscription.current_period_end, v_payment.granted_at, false;
end;
$$;

create or replace function public.get_ton_premium_payment_context(
  p_actor_user_id uuid,
  p_payment_id uuid
)
returns table (payment_id uuid, invoice_payload text, amount_ton numeric, payment_status public.payment_status)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_premium_account(p_actor_user_id);
  return query
  select payment.id, payment.invoice_payload, payment.amount_ton, payment.status
  from public.payments payment
  join private.premium_payment_intents intent on intent.payment_id = payment.id
  where payment.id = p_payment_id
    and payment.user_id = p_actor_user_id
    and intent.user_id = p_actor_user_id
    and payment.provider = 'ton'
    and payment.product_type = 'premium'
    and payment.granted_at is null
    and payment.status in ('created', 'pending');
end;
$$;

create or replace function public.claim_premium_daily_super_likes(p_actor_user_id uuid)
returns table (
  subscription_id uuid,
  granted_count integer,
  available_count integer,
  next_refill_at timestamptz,
  already_claimed boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_subscription public.user_premium_subscriptions%rowtype;
  v_plan public.premium_plans%rowtype;
  v_period_start timestamptz := date_trunc('day', now());
  v_period_end timestamptz := date_trunc('day', now()) + interval '1 day';
  v_grant integer;
  v_usage_created boolean := false;
  v_balance public.super_like_balances%rowtype;
  v_source_id uuid;
begin
  perform private.assert_premium_account(p_actor_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('premium-super-like:' || p_actor_user_id::text || ':' || v_period_start::text, 0)
  );
  select * into v_subscription
  from public.user_premium_subscriptions subscription
  where subscription.user_id = p_actor_user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end > now()
  order by subscription.current_period_end desc
  limit 1
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'premium_not_active';
  end if;
  select * into v_plan from public.premium_plans plan where plan.id = v_subscription.plan_id;
  v_grant := coalesce((v_plan.limits ->> 'super_likes_per_day')::integer, 0);
  if v_grant < 1 or v_grant > 100 then
    raise exception using errcode = 'P0001', message = 'premium_feature_unavailable';
  end if;

  insert into public.premium_feature_usage (
    user_id, subscription_id, feature_key, usage_count, limit_count,
    period_start, period_end, reset_at, metadata
  ) values (
    p_actor_user_id, v_subscription.id, 'premium_super_likes', v_grant, v_grant,
    v_period_start, v_period_end, v_period_end,
    jsonb_build_object('grant_type', 'daily_super_likes')
  ) on conflict (user_id, subscription_id, feature_key, period_start)
    where subscription_id is not null do nothing;
  v_usage_created := found;

  select * into v_balance
  from public.super_like_balances balance
  where balance.user_id = p_actor_user_id
  for update;

  if not v_usage_created then
    if not found then
      insert into public.super_like_balances (user_id, next_refill_at)
      values (p_actor_user_id, v_period_end)
      returning * into v_balance;
    end if;
    return query select v_subscription.id, 0, v_balance.available_count, v_period_end, true;
    return;
  end if;

  v_source_id := (
    substr(md5(v_subscription.id::text || ':' || v_period_start::date::text), 1, 8) || '-' ||
    substr(md5(v_subscription.id::text || ':' || v_period_start::date::text), 9, 4) || '-' ||
    substr(md5(v_subscription.id::text || ':' || v_period_start::date::text), 13, 4) || '-' ||
    substr(md5(v_subscription.id::text || ':' || v_period_start::date::text), 17, 4) || '-' ||
    substr(md5(v_subscription.id::text || ':' || v_period_start::date::text), 21, 12)
  )::uuid;

  if found then
    update public.super_like_balances balance
    set available_count = balance.available_count + v_grant,
        lifetime_granted = balance.lifetime_granted + v_grant,
        next_refill_at = v_period_end,
        updated_at = now()
    where balance.user_id = p_actor_user_id
    returning * into v_balance;
  else
    insert into public.super_like_balances (
      user_id, available_count, lifetime_granted, next_refill_at
    ) values (p_actor_user_id, v_grant, v_grant, v_period_end)
    returning * into v_balance;
  end if;

  insert into public.super_like_ledger (
    user_id, event_type, delta, balance_after, source_type, source_id, metadata
  ) values (
    p_actor_user_id, 'premium_refill', v_grant, v_balance.available_count,
    'premium_daily', v_source_id,
    jsonb_build_object('subscription_id', v_subscription.id, 'period_start', v_period_start)
  ) on conflict (user_id, event_type, source_type, source_id)
    where source_id is not null do nothing;

  return query select v_subscription.id, v_grant, v_balance.available_count, v_period_end, false;
end;
$$;

create or replace function public.get_boost_catalog()
returns table (
  boost_product_id uuid,
  slug text,
  name text,
  description text,
  duration_minutes integer,
  multiplier numeric,
  price_stars integer,
  price_ton numeric,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select product.id, product.slug, product.name, product.description,
    product.duration_minutes, product.multiplier, product.price_stars,
    product.price_ton, product.sort_order
  from public.boost_products product
  where product.is_active = true
  order by product.sort_order, product.id;
$$;

create or replace function public.get_my_boosts(
  p_actor_user_id uuid,
  p_limit integer default 21,
  p_cursor_created_at timestamptz default null,
  p_cursor_boost_id uuid default null
)
returns table (
  boost_id uuid,
  boost_product_id uuid,
  boost_status public.boost_status,
  boost_type text,
  starts_at timestamptz,
  ends_at timestamptz,
  paused_at timestamptz,
  remaining_seconds integer,
  multiplier numeric,
  impression_count integer,
  profile_view_count integer,
  like_count integer,
  match_count integer,
  created_at timestamptz,
  payment_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 21), 101));
begin
  perform private.assert_premium_account(p_actor_user_id);
  if (p_cursor_created_at is null) <> (p_cursor_boost_id is null) then
    raise exception using errcode = '22023', message = 'invalid_cursor';
  end if;
  perform private.expire_user_boosts(p_actor_user_id);
  return query
  select boost.id, boost.boost_product_id, boost.status, boost.boost_type,
    boost.starts_at, boost.ends_at, boost.paused_at, boost.remaining_seconds,
    boost.multiplier, boost.impression_count, boost.profile_view_count,
    boost.like_count, boost.match_count, boost.created_at, boost.payment_id
  from public.boosts boost
  where boost.user_id = p_actor_user_id
    and (
      p_cursor_created_at is null
      or (boost.created_at, boost.id) < (p_cursor_created_at, p_cursor_boost_id)
    )
  order by boost.created_at desc, boost.id desc
  limit v_limit;
end;
$$;

create or replace function public.create_boost_payment_intent(
  p_user_id uuid,
  p_boost_product_id uuid,
  p_provider public.payment_provider,
  p_invoice_payload text,
  p_idempotency_key uuid
)
returns table (
  payment_id uuid,
  payment_provider public.payment_provider,
  payment_status public.payment_status,
  invoice_payload text,
  boost_product_id uuid,
  boost_name text,
  duration_minutes integer,
  multiplier numeric,
  amount_stars integer,
  amount_ton numeric,
  currency text,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_product public.boost_products%rowtype;
  v_payment public.payments%rowtype;
  v_existing private.boost_payment_intents%rowtype;
begin
  if p_user_id is null
    or p_boost_product_id is null
    or p_provider is null
    or p_idempotency_key is null
    or p_invoice_payload is null
    or p_invoice_payload !~ '^bst_[A-Za-z0-9_-]{8,124}$'
  then
    raise exception using errcode = '22023', message = 'invalid_boost_input';
  end if;
  perform private.assert_premium_account(p_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('boost-payment:' || p_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_existing
  from private.boost_payment_intents intent
  where intent.user_id = p_user_id and intent.idempotency_key = p_idempotency_key;
  if found then
    select * into v_payment from public.payments payment where payment.id = v_existing.payment_id;
    if v_existing.boost_product_id <> p_boost_product_id or v_payment.provider <> p_provider then
      raise exception using errcode = 'P0001', message = 'idempotency_conflict';
    end if;
    if v_payment.granted_at is not null or v_payment.status not in ('created', 'pending') then
      raise exception using errcode = 'P0001', message = 'payment_not_payable';
    end if;
    select * into v_product from public.boost_products product where product.id = v_existing.boost_product_id;
    return query select v_payment.id, v_payment.provider, v_payment.status, v_payment.invoice_payload,
      v_product.id, v_product.name, v_product.duration_minutes, v_product.multiplier,
      v_payment.amount_stars, v_payment.amount_ton, v_payment.currency, v_existing.expires_at;
    return;
  end if;

  select * into v_product
  from public.boost_products product
  where product.id = p_boost_product_id and product.is_active = true
  for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'boost_product_unavailable';
  end if;
  if (p_provider = 'telegram_stars' and v_product.price_stars <= 0)
    or (p_provider = 'ton' and (v_product.price_ton is null or v_product.price_ton <= 0))
  then
    raise exception using errcode = 'P0001', message = 'boost_provider_unavailable';
  end if;

  insert into public.payments (
    user_id, provider, product_type, product_id, invoice_payload,
    amount_stars, amount_ton, currency, status, raw_request
  ) values (
    p_user_id, p_provider, 'boost', v_product.id, p_invoice_payload,
    case when p_provider = 'telegram_stars' then v_product.price_stars else null end,
    case when p_provider = 'ton' then v_product.price_ton else null end,
    case when p_provider = 'telegram_stars' then 'XTR' else 'TON' end,
    'pending', jsonb_build_object('created_through', 'boost_api', 'idempotency_key', p_idempotency_key)
  ) returning * into v_payment;

  insert into private.boost_payment_intents (payment_id, user_id, boost_product_id, idempotency_key)
  values (v_payment.id, p_user_id, v_product.id, p_idempotency_key)
  returning expires_at into v_existing.expires_at;

  return query select v_payment.id, v_payment.provider, v_payment.status, v_payment.invoice_payload,
    v_product.id, v_product.name, v_product.duration_minutes, v_product.multiplier,
    v_payment.amount_stars, v_payment.amount_ton, v_payment.currency, v_existing.expires_at;
end;
$$;

create or replace function public.resolve_telegram_stars_boost_payment(
  p_invoice_payload text,
  p_telegram_user_id text,
  p_amount_stars integer,
  p_require_unexpired boolean default true
)
returns table (payment_id uuid, payment_status public.payment_status)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_invoice_payload is null or p_telegram_user_id is null
    or p_amount_stars is null or p_amount_stars <= 0 or p_require_unexpired is null
  then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;
  return query
  select payment.id, payment.status
  from public.payments payment
  join private.boost_payment_intents intent on intent.payment_id = payment.id
  join private.telegram_identities identity on identity.user_id = intent.user_id
  where payment.provider = 'telegram_stars'
    and payment.product_type = 'boost'
    and payment.invoice_payload = p_invoice_payload
    and payment.amount_stars = p_amount_stars
    and identity.telegram_user_id = p_telegram_user_id
    and payment.granted_at is null
    and payment.status in ('created', 'pending')
    and (not p_require_unexpired or intent.expires_at > now());
end;
$$;

create or replace function public.grant_verified_boost_payment(
  p_payment_id uuid,
  p_provider public.payment_provider,
  p_provider_payment_id text,
  p_provider_customer_id text,
  p_amount_stars integer default null,
  p_amount_ton numeric default null,
  p_ton_network public.wallet_network default 'ton_mainnet',
  p_raw_webhook jsonb default '{}'::jsonb
)
returns table (
  payment_id uuid,
  payment_status public.payment_status,
  boost_id uuid,
  boost_status public.boost_status,
  starts_at timestamptz,
  ends_at timestamptz,
  granted_at timestamptz,
  already_granted boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_intent private.boost_payment_intents%rowtype;
  v_product public.boost_products%rowtype;
  v_boost public.boosts%rowtype;
begin
  if p_payment_id is null
    or p_provider is null
    or p_provider_payment_id is null
    or char_length(btrim(p_provider_payment_id)) not between 3 and 255
    or p_provider_customer_id is null
    or char_length(btrim(p_provider_customer_id)) not between 1 and 255
    or p_raw_webhook is null
  then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('boost-payment-grant:' || p_payment_id::text, 0)
  );
  select * into v_payment from public.payments payment where payment.id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'payment_not_found'; end if;
  select * into v_intent from private.boost_payment_intents intent where intent.payment_id = p_payment_id;
  if not found then raise exception using errcode = 'P0001', message = 'payment_not_found'; end if;
  select * into v_product from public.boost_products product where product.id = v_intent.boost_product_id;
  if not found then raise exception using errcode = 'P0001', message = 'boost_product_unavailable'; end if;

  if exists (
    select 1 from public.payments payment
    where payment.provider = p_provider
      and payment.provider_payment_id = p_provider_payment_id
      and payment.id <> p_payment_id
  ) then raise exception using errcode = 'P0001', message = 'provider_payment_reused'; end if;
  if v_payment.provider <> p_provider
    or v_payment.product_type <> 'boost'
    or v_payment.product_id <> v_intent.boost_product_id
  then raise exception using errcode = 'P0001', message = 'payment_mismatch'; end if;

  if v_payment.granted_at is not null then
    select * into v_boost from public.boosts boost where boost.payment_id = v_payment.id;
    if not found then raise exception using errcode = 'P0001', message = 'payment_grant_inconsistent'; end if;
    return query select v_payment.id, v_payment.status, v_boost.id, v_boost.status,
      v_boost.starts_at, v_boost.ends_at, v_payment.granted_at, true;
    return;
  end if;
  if v_payment.status not in ('created', 'pending', 'verified') then
    raise exception using errcode = 'P0001', message = 'payment_not_payable';
  end if;
  if p_provider = 'telegram_stars' then
    if p_amount_stars is null or p_amount_stars <> v_payment.amount_stars
      or not exists (
        select 1 from private.telegram_identities identity
        where identity.user_id = v_intent.user_id
          and identity.telegram_user_id = p_provider_customer_id
      )
    then raise exception using errcode = 'P0001', message = 'payment_mismatch'; end if;
  elsif p_provider = 'ton' then
    if p_amount_ton is null or v_payment.amount_ton is null or p_amount_ton < v_payment.amount_ton
    then raise exception using errcode = 'P0001', message = 'payment_mismatch'; end if;
  else
    raise exception using errcode = 'P0001', message = 'payment_mismatch';
  end if;

  update public.payments payment
  set status = 'verified', provider_payment_id = p_provider_payment_id,
      verified_at = coalesce(payment.verified_at, now()), raw_webhook = p_raw_webhook,
      updated_at = now()
  where payment.id = v_payment.id
  returning * into v_payment;

  select boost.* into v_boost
  from private.create_boost_record(
    v_intent.user_id, v_payment.id, v_product.id, 'payment',
    v_product.duration_minutes, v_product.multiplier,
    jsonb_build_object('product_slug', v_product.slug, 'payment_id', v_payment.id)
  ) created
  join public.boosts boost on boost.id = created.boost_id;

  if p_provider = 'ton' then
    insert into public.ton_transactions (
      user_id, payment_id, network, transaction_type, status, tx_hash,
      from_address, to_address, amount_ton, comment, payload, confirmed_at, raw_transaction
    ) values (
      v_intent.user_id, v_payment.id, p_ton_network, 'boost_purchase', 'confirmed',
      p_provider_payment_id, p_provider_customer_id,
      p_raw_webhook #>> '{transaction,to_address}', p_amount_ton,
      v_payment.invoice_payload, v_payment.invoice_payload, now(), p_raw_webhook
    ) on conflict (network, tx_hash) where tx_hash is not null do nothing;
  end if;
  update public.payments payment
  set granted_at = now(), updated_at = now()
  where payment.id = v_payment.id
  returning * into v_payment;

  return query select v_payment.id, v_payment.status, v_boost.id, v_boost.status,
    v_boost.starts_at, v_boost.ends_at, v_payment.granted_at, false;
end;
$$;

create or replace function public.get_ton_boost_payment_context(
  p_actor_user_id uuid,
  p_payment_id uuid
)
returns table (payment_id uuid, invoice_payload text, amount_ton numeric, payment_status public.payment_status)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_premium_account(p_actor_user_id);
  return query
  select payment.id, payment.invoice_payload, payment.amount_ton, payment.status
  from public.payments payment
  join private.boost_payment_intents intent on intent.payment_id = payment.id
  where payment.id = p_payment_id
    and payment.user_id = p_actor_user_id
    and intent.user_id = p_actor_user_id
    and payment.provider = 'ton'
    and payment.product_type = 'boost'
    and payment.granted_at is null
    and payment.status in ('created', 'pending');
end;
$$;

create or replace function public.create_premium_boost(
  p_actor_user_id uuid,
  p_duration_minutes integer
)
returns table (
  boost_id uuid,
  boost_status public.boost_status,
  starts_at timestamptz,
  ends_at timestamptz,
  multiplier numeric,
  remaining_minutes integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_subscription public.user_premium_subscriptions%rowtype;
  v_plan public.premium_plans%rowtype;
  v_limit integer;
  v_usage public.premium_feature_usage%rowtype;
  v_boost record;
begin
  if p_duration_minutes is null or p_duration_minutes < 5 or p_duration_minutes > 240 then
    raise exception using errcode = '22023', message = 'invalid_boost_duration';
  end if;
  perform private.assert_premium_account(p_actor_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('premium-boost:' || p_actor_user_id::text, 0)
  );
  select * into v_subscription
  from public.user_premium_subscriptions subscription
  where subscription.user_id = p_actor_user_id
    and subscription.status in ('trialing', 'active', 'grace_period')
    and subscription.current_period_end > now()
  order by subscription.current_period_end desc
  limit 1
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'premium_not_active'; end if;
  select * into v_plan from public.premium_plans plan where plan.id = v_subscription.plan_id;
  v_limit := coalesce((v_plan.limits ->> 'boost_minutes')::integer, 0);
  if v_limit < 5 then raise exception using errcode = 'P0001', message = 'premium_feature_unavailable'; end if;

  insert into public.premium_feature_usage (
    user_id, subscription_id, feature_key, usage_count, limit_count,
    period_start, period_end, reset_at, metadata
  ) values (
    p_actor_user_id, v_subscription.id, 'premium_boost_minutes', p_duration_minutes, v_limit,
    v_subscription.current_period_start, v_subscription.current_period_end,
    v_subscription.current_period_end, '{}'::jsonb
  ) on conflict (user_id, subscription_id, feature_key, period_start)
    where subscription_id is not null do update
    set usage_count = public.premium_feature_usage.usage_count + excluded.usage_count,
        updated_at = now()
    where public.premium_feature_usage.usage_count + excluded.usage_count <= public.premium_feature_usage.limit_count
  returning * into v_usage;
  if not found then raise exception using errcode = 'P0001', message = 'premium_feature_limit_reached'; end if;

  select * into v_boost
  from private.create_boost_record(
    p_actor_user_id, null, null, 'premium', p_duration_minutes, 1.50,
    jsonb_build_object('subscription_id', v_subscription.id, 'feature_key', 'premium_boost_minutes')
  );
  return query select v_boost.boost_id, v_boost.boost_status, v_boost.starts_at,
    v_boost.ends_at, v_boost.multiplier, greatest(0, v_limit - v_usage.usage_count);
end;
$$;

create or replace function public.pause_own_boost(
  p_actor_user_id uuid,
  p_boost_id uuid
)
returns table (boost_id uuid, boost_status public.boost_status, remaining_seconds integer, paused_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_boost public.boosts%rowtype;
  v_remaining integer;
begin
  perform private.assert_premium_account(p_actor_user_id);
  select * into v_boost
  from public.boosts boost
  where boost.id = p_boost_id and boost.user_id = p_actor_user_id
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'boost_unavailable'; end if;
  perform private.expire_user_boosts(p_actor_user_id);
  select * into v_boost from public.boosts boost where boost.id = p_boost_id for update;
  if v_boost.status <> 'active' then raise exception using errcode = 'P0001', message = 'boost_not_active'; end if;
  v_remaining := ceil(extract(epoch from v_boost.ends_at - now()))::integer;
  if v_remaining < 1 then raise exception using errcode = 'P0001', message = 'boost_not_active'; end if;
  update public.boosts boost
  set status = 'paused', paused_at = now(), remaining_seconds = v_remaining, updated_at = now()
  where boost.id = v_boost.id
  returning * into v_boost;
  insert into public.boost_events (boost_id, user_id, event_type, payload)
  values (v_boost.id, p_actor_user_id, 'paused', jsonb_build_object('remaining_seconds', v_remaining));
  return query select v_boost.id, v_boost.status, v_boost.remaining_seconds, v_boost.paused_at;
end;
$$;

create or replace function public.resume_own_boost(
  p_actor_user_id uuid,
  p_boost_id uuid
)
returns table (boost_id uuid, boost_status public.boost_status, starts_at timestamptz, ends_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_boost public.boosts%rowtype;
  v_window record;
begin
  perform private.assert_premium_account(p_actor_user_id);
  select * into v_boost
  from public.boosts boost
  where boost.id = p_boost_id and boost.user_id = p_actor_user_id
  for update;
  if not found or v_boost.status <> 'paused' or v_boost.remaining_seconds is null then
    raise exception using errcode = 'P0001', message = 'boost_not_paused';
  end if;
  select * into v_window from private.next_boost_window(p_actor_user_id, v_boost.remaining_seconds);
  update public.boosts boost
  set status = v_window.boost_status,
      starts_at = v_window.starts_at,
      ends_at = v_window.ends_at,
      paused_at = null,
      remaining_seconds = null,
      updated_at = now()
  where boost.id = v_boost.id
  returning * into v_boost;
  insert into public.boost_events (boost_id, user_id, event_type, payload)
  values (v_boost.id, p_actor_user_id, 'resumed', jsonb_build_object('status', v_boost.status));
  if v_boost.status = 'active' then
    insert into public.boost_events (boost_id, user_id, event_type, payload)
    values (v_boost.id, p_actor_user_id, 'started', jsonb_build_object('resumed', true));
  end if;
  return query select v_boost.id, v_boost.status, v_boost.starts_at, v_boost.ends_at;
end;
$$;

create or replace function public.record_boost_impressions(
  p_actor_user_id uuid,
  p_target_user_ids uuid[]
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  perform private.assert_premium_account(p_actor_user_id);
  if p_target_user_ids is null or cardinality(p_target_user_ids) > 51 then
    raise exception using errcode = '22023', message = 'invalid_boost_metric_input';
  end if;
  with targets as (
    select distinct target_id
    from unnest(p_target_user_ids) as target_id
    where target_id is not null and target_id <> p_actor_user_id
  ), updated as (
    update public.boosts boost
    set impression_count = boost.impression_count + 1,
        updated_at = now()
    from targets
    where boost.user_id = targets.target_id
      and boost.status = 'active'
      and boost.starts_at <= now()
      and boost.ends_at > now()
    returning boost.id, boost.user_id
  ), inserted as (
    insert into public.boost_events (boost_id, user_id, event_type, payload)
    select updated.id, updated.user_id, 'impression', jsonb_build_object('source', 'discovery')
    from updated
    returning 1
  )
  select count(*)::integer into v_count from inserted;
  return v_count;
end;
$$;

revoke all on function private.assert_premium_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.expire_user_boosts(uuid) from public, anon, authenticated, service_role;
revoke all on function private.next_boost_window(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function private.create_boost_record(uuid, uuid, uuid, text, integer, numeric, jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.get_premium_plans() from public, anon, authenticated;
revoke all on function public.get_my_premium_entitlements(uuid) from public, anon, authenticated;
revoke all on function public.create_premium_payment_intent(uuid, uuid, public.payment_provider, text, uuid)
from public, anon, authenticated;
revoke all on function public.resolve_telegram_stars_premium_payment(text, text, integer, boolean)
from public, anon, authenticated;
revoke all on function public.grant_verified_premium_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) from public, anon, authenticated;
revoke all on function public.get_ton_premium_payment_context(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.claim_premium_daily_super_likes(uuid)
from public, anon, authenticated;
revoke all on function public.get_boost_catalog() from public, anon, authenticated;
revoke all on function public.get_my_boosts(uuid, integer, timestamptz, uuid)
from public, anon, authenticated;
revoke all on function public.create_boost_payment_intent(uuid, uuid, public.payment_provider, text, uuid)
from public, anon, authenticated;
revoke all on function public.resolve_telegram_stars_boost_payment(text, text, integer, boolean)
from public, anon, authenticated;
revoke all on function public.grant_verified_boost_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) from public, anon, authenticated;
revoke all on function public.get_ton_boost_payment_context(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.create_premium_boost(uuid, integer)
from public, anon, authenticated;
revoke all on function public.pause_own_boost(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.resume_own_boost(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.record_boost_impressions(uuid, uuid[])
from public, anon, authenticated;

grant execute on function public.get_premium_plans() to service_role;
grant execute on function public.get_my_premium_entitlements(uuid) to service_role;
grant execute on function public.create_premium_payment_intent(uuid, uuid, public.payment_provider, text, uuid)
to service_role;
grant execute on function public.resolve_telegram_stars_premium_payment(text, text, integer, boolean)
to service_role;
grant execute on function public.grant_verified_premium_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) to service_role;
grant execute on function public.get_ton_premium_payment_context(uuid, uuid) to service_role;
grant execute on function public.claim_premium_daily_super_likes(uuid) to service_role;
grant execute on function public.get_boost_catalog() to service_role;
grant execute on function public.get_my_boosts(uuid, integer, timestamptz, uuid) to service_role;
grant execute on function public.create_boost_payment_intent(uuid, uuid, public.payment_provider, text, uuid)
to service_role;
grant execute on function public.resolve_telegram_stars_boost_payment(text, text, integer, boolean)
to service_role;
grant execute on function public.grant_verified_boost_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) to service_role;
grant execute on function public.get_ton_boost_payment_context(uuid, uuid) to service_role;
grant execute on function public.create_premium_boost(uuid, integer) to service_role;
grant execute on function public.pause_own_boost(uuid, uuid) to service_role;
grant execute on function public.resume_own_boost(uuid, uuid) to service_role;
grant execute on function public.record_boost_impressions(uuid, uuid[]) to service_role;

comment on function public.grant_verified_premium_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) is 'Verifies a payment and atomically creates or extends one premium entitlement.';
comment on function public.grant_verified_boost_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) is 'Verifies a payment and atomically creates one scheduled or active paid boost.';

commit;
