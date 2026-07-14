begin;

-- Gifts and payment records are a server-only workflow. The browser receives
-- payment instructions, never a table capability or a fulfillment RPC.
revoke all on table public.payments from public, anon, authenticated;
revoke all on table public.sent_gifts from public, anon, authenticated;
revoke all on table public.user_profile_auras from public, anon, authenticated;
revoke all on table public.profile_aura_events from public, anon, authenticated;
revoke all on table public.gifts from public, anon, authenticated;
revoke all on table public.gift_assets from public, anon, authenticated;
revoke all on table public.gift_categories from public, anon, authenticated;
revoke all on table public.profile_aura_effects from public, anon, authenticated;

grant select, insert, update, delete on table public.payments to service_role;
grant select, insert, update, delete on table public.sent_gifts to service_role;
grant select, insert, update, delete on table public.user_profile_auras to service_role;
grant select, insert, update, delete on table public.profile_aura_events to service_role;
grant select on table public.gifts to service_role;
grant select on table public.gift_assets to service_role;
grant select on table public.gift_categories to service_role;
grant select on table public.profile_aura_effects to service_role;

create table if not exists private.gift_payment_intents (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  sender_user_id uuid not null references public.app_users(id) on delete restrict,
  receiver_user_id uuid not null references public.app_users(id) on delete restrict,
  gift_id uuid not null references public.gifts(id) on delete restrict,
  idempotency_key uuid not null,
  message text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  constraint gift_payment_intents_sender_idempotency_key unique (sender_user_id, idempotency_key),
  constraint gift_payment_intents_sender_receiver_distinct check (sender_user_id <> receiver_user_id),
  constraint gift_payment_intents_message_length check (message is null or char_length(message) <= 500)
);

alter table private.gift_payment_intents enable row level security;
revoke all on table private.gift_payment_intents from public, anon, authenticated;
grant select, insert, update, delete on table private.gift_payment_intents to service_role;

create index if not exists payments_user_status_created_idx
  on public.payments (user_id, status, created_at desc);
create index if not exists gift_payment_intents_receiver_created_idx
  on private.gift_payment_intents (receiver_user_id, created_at desc);
create index if not exists gift_payment_intents_gift_id_idx
  on private.gift_payment_intents (gift_id);
create index if not exists sent_gifts_receiver_gift_idx
  on public.sent_gifts (receiver_user_id, gift_id);
create index if not exists sent_gifts_gift_id_idx
  on public.sent_gifts (gift_id);
create index if not exists user_profile_auras_user_owned_idx
  on public.user_profile_auras (user_id, unlocked_at desc)
  where status in ('owned', 'active');
create index if not exists ton_transactions_payment_id_idx
  on public.ton_transactions (payment_id)
  where payment_id is not null;

-- A historical data repair makes the one-active-aura rule safe to enforce.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id
      order by activated_at desc nulls last, unlocked_at desc, id desc
    ) as rank
  from public.user_profile_auras
  where is_active = true
)
update public.user_profile_auras aura
set is_active = false,
    status = case when aura.status = 'active' then 'owned'::public.profile_aura_status else aura.status end,
    updated_at = now()
from ranked
where aura.id = ranked.id
  and ranked.rank > 1;

create unique index if not exists user_profile_auras_one_active_per_user
  on public.user_profile_auras (user_id)
  where is_active = true;

create or replace function private.assert_gift_sender(p_user_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_dating_account(p_user_id, false);

  if exists (
    select 1
    from public.user_restrictions restriction
    where restriction.user_id = p_user_id
      and restriction.status = 'active'
      and restriction.starts_at <= now()
      and (restriction.ends_at is null or restriction.ends_at > now())
      and restriction.restriction_type = 'no_gift'
  ) then
    raise exception using errcode = 'P0001', message = 'account_restricted';
  end if;
end;
$$;

create or replace function private.assert_gift_receiver(
  p_sender_user_id uuid,
  p_receiver_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_sender_user_id is null
    or p_receiver_user_id is null
    or p_sender_user_id = p_receiver_user_id
  then
    raise exception using errcode = '22023', message = 'invalid_gift_input';
  end if;

  if not exists (
    select 1
    from public.app_users account
    join public.profiles profile on profile.user_id = account.id
    where account.id = p_receiver_user_id
      and account.status = 'active'
      and profile.profile_completed_at is not null
  ) then
    raise exception using errcode = 'P0001', message = 'gift_receiver_unavailable';
  end if;

  if exists (
    select 1
    from public.bans ban
    where ban.user_id = p_receiver_user_id
      and ban.status = 'active'
      and ban.starts_at <= now()
      and (ban.ends_at is null or ban.ends_at > now())
  ) or exists (
    select 1
    from public.user_restrictions restriction
    where restriction.user_id = p_receiver_user_id
      and restriction.status = 'active'
      and restriction.starts_at <= now()
      and (restriction.ends_at is null or restriction.ends_at > now())
      and restriction.restriction_type in ('full_suspension', 'view_only')
  ) then
    raise exception using errcode = 'P0001', message = 'gift_receiver_unavailable';
  end if;

  if exists (
    select 1
    from public.blocks block
    where (block.blocker_user_id = p_sender_user_id and block.blocked_user_id = p_receiver_user_id)
       or (block.blocker_user_id = p_receiver_user_id and block.blocked_user_id = p_sender_user_id)
  ) then
    raise exception using errcode = 'P0001', message = 'gift_interaction_blocked';
  end if;
end;
$$;

-- Replaces the original Stars-only trigger with provider-neutral eligibility.
-- The payment row has already been verified by the grant function before this
-- trigger runs, so an aura can never be unlocked by a client-only gift insert.
create or replace function public.unlock_profile_auras_from_sent_gift()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gift public.gifts%rowtype;
  v_user_aura_id uuid;
  v_existing boolean;
  v_aura record;
begin
  select * into v_gift from public.gifts where id = new.gift_id;
  if not found then
    return new;
  end if;

  for v_aura in
    select aura.*
    from public.profile_aura_effects aura
    where aura.is_active = true
      and (aura.required_gift_id is null or aura.required_gift_id = new.gift_id)
      and (
        aura.required_min_gift_price_stars is null
        or v_gift.price_stars >= aura.required_min_gift_price_stars
      )
      and (aura.required_rarity is null or v_gift.rarity = aura.required_rarity)
      and (
        aura.required_gift_count is null
        or (
          select count(*)
          from public.sent_gifts received
          where received.receiver_user_id = new.receiver_user_id
        ) >= aura.required_gift_count
      )
      and (
        aura.required_min_total_gift_value_stars is null
        or (
          select coalesce(sum(received_gift.price_stars), 0)
          from public.sent_gifts received
          join public.gifts received_gift on received_gift.id = received.gift_id
          where received.receiver_user_id = new.receiver_user_id
        ) >= aura.required_min_total_gift_value_stars
      )
  loop
    select exists (
      select 1 from public.user_profile_auras owned
      where owned.user_id = new.receiver_user_id and owned.aura_id = v_aura.id
    ) into v_existing;

    insert into public.user_profile_auras (
      user_id, aura_id, status, unlock_source, source_gift_id,
      source_sent_gift_id, source_payment_id, unlocked_at, expires_at, metadata
    ) values (
      new.receiver_user_id, v_aura.id, 'owned', 'gift_received', new.gift_id,
      new.id, new.payment_id, now(),
      case
        when v_aura.is_permanent then null
        when v_aura.duration_hours is not null then now() + make_interval(hours => v_aura.duration_hours)
        else null
      end,
      jsonb_build_object('unlock_rule', 'verified_gift', 'provider_neutral', true)
    )
    on conflict (user_id, aura_id) do update
      set status = case
          when public.user_profile_auras.status in ('revoked', 'expired') then 'owned'::public.profile_aura_status
          else public.user_profile_auras.status
        end,
        source_gift_id = excluded.source_gift_id,
        source_sent_gift_id = excluded.source_sent_gift_id,
        source_payment_id = excluded.source_payment_id,
        expires_at = case
          when public.user_profile_auras.expires_at is null then excluded.expires_at
          when excluded.expires_at is null then public.user_profile_auras.expires_at
          else greatest(public.user_profile_auras.expires_at, excluded.expires_at)
        end,
        updated_at = now()
    returning id into v_user_aura_id;

    insert into public.profile_aura_events (
      user_aura_id, user_id, aura_id, event_type, source_gift_id,
      source_sent_gift_id, source_payment_id, metadata
    ) values (
      v_user_aura_id, new.receiver_user_id, v_aura.id,
      case when v_existing then 'extended'::public.profile_aura_event_type else 'unlocked'::public.profile_aura_event_type end,
      new.gift_id, new.id, new.payment_id,
      jsonb_build_object('provider_neutral', true)
    );
  end loop;
  return new;
end;
$$;

revoke all on function public.unlock_profile_auras_from_sent_gift()
from public, anon, authenticated, service_role;

create or replace function public.get_gift_catalog(p_actor_user_id uuid)
returns table (
  gift_id uuid,
  slug text,
  name text,
  description text,
  rarity public.gift_rarity,
  price_stars integer,
  price_ton numeric,
  gift_effect text,
  profile_aura_effect text,
  asset_url text,
  thumbnail_url text,
  asset_type public.gift_asset_type,
  category_slug text,
  category_name text,
  category_emoji text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_gift_sender(p_actor_user_id);
  return query
  select
    gift.id, gift.slug, gift.name, gift.description, gift.rarity,
    gift.price_stars, gift.price_ton, gift.gift_effect, gift.profile_aura_effect,
    asset.public_url, asset.thumbnail_url, asset.asset_type,
    category.slug, category.name, category.emoji
  from public.gifts gift
  join public.gift_assets asset on asset.id = gift.asset_id
  join public.gift_categories category on category.id = gift.category_id
  where gift.is_active = true
    and (gift.available_from is null or gift.available_from <= now())
    and (gift.available_until is null or gift.available_until > now())
  order by category.sort_order, gift.rarity desc, gift.price_stars, gift.name;
end;
$$;

create or replace function public.create_gift_payment_intent(
  p_sender_user_id uuid,
  p_receiver_user_id uuid,
  p_gift_id uuid,
  p_provider public.payment_provider,
  p_invoice_payload text,
  p_idempotency_key uuid,
  p_message text default null,
  p_is_public boolean default true
)
returns table (
  payment_id uuid,
  payment_provider public.payment_provider,
  payment_status public.payment_status,
  invoice_payload text,
  gift_id uuid,
  gift_name text,
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
  v_gift public.gifts%rowtype;
  v_payment public.payments%rowtype;
  v_existing_intent private.gift_payment_intents%rowtype;
  v_expires_at timestamptz;
begin
  if p_sender_user_id is null or p_receiver_user_id is null or p_gift_id is null
    or p_provider is null or p_idempotency_key is null
    or p_invoice_payload is null
    or p_invoice_payload !~ '^[A-Za-z0-9:_-]{8,128}$'
    or (p_message is not null and char_length(btrim(p_message)) > 500)
  then
    raise exception using errcode = '22023', message = 'invalid_gift_input';
  end if;

  perform private.assert_gift_sender(p_sender_user_id);
  perform private.assert_gift_receiver(p_sender_user_id, p_receiver_user_id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('gift-payment:' || p_sender_user_id::text || ':' || p_idempotency_key::text, 0)
  );

  select * into v_existing_intent
  from private.gift_payment_intents intent
  where intent.sender_user_id = p_sender_user_id
    and intent.idempotency_key = p_idempotency_key;

  if found then
    select * into v_payment from public.payments where id = v_existing_intent.payment_id;
    if v_existing_intent.receiver_user_id <> p_receiver_user_id
      or v_existing_intent.gift_id <> p_gift_id
      or v_payment.provider <> p_provider
    then
      raise exception using errcode = 'P0001', message = 'idempotency_conflict';
    end if;
    if v_payment.granted_at is not null
      or v_payment.status not in ('created', 'pending')
    then
      raise exception using errcode = 'P0001', message = 'payment_not_payable';
    end if;
    select * into v_gift from public.gifts where id = v_existing_intent.gift_id;
    return query select v_payment.id, v_payment.provider, v_payment.status,
      v_payment.invoice_payload, v_gift.id, v_gift.name, v_payment.amount_stars,
      v_payment.amount_ton, v_payment.currency, v_existing_intent.expires_at;
    return;
  end if;

  select * into v_gift
  from public.gifts gift
  where gift.id = p_gift_id
    and gift.is_active = true
    and (gift.available_from is null or gift.available_from <= now())
    and (gift.available_until is null or gift.available_until > now())
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'gift_unavailable';
  end if;
  if (p_provider = 'telegram_stars' and v_gift.price_stars <= 0)
    or (p_provider = 'ton' and (v_gift.price_ton is null or v_gift.price_ton <= 0))
  then
    raise exception using errcode = 'P0001', message = 'gift_provider_unavailable';
  end if;

  insert into public.payments (
    user_id, provider, product_type, product_id, invoice_payload,
    amount_stars, amount_ton, currency, status, raw_request
  ) values (
    p_sender_user_id, p_provider, 'gift', v_gift.id, p_invoice_payload,
    case when p_provider = 'telegram_stars' then v_gift.price_stars else null end,
    case when p_provider = 'ton' then v_gift.price_ton else null end,
    case when p_provider = 'telegram_stars' then 'XTR' else 'TON' end,
    'pending',
    jsonb_build_object('created_through', 'gifts_api', 'idempotency_key', p_idempotency_key)
  ) returning * into v_payment;

  insert into private.gift_payment_intents (
    payment_id, sender_user_id, receiver_user_id, gift_id,
    idempotency_key, message, is_public
  ) values (
    v_payment.id, p_sender_user_id, p_receiver_user_id, v_gift.id,
    p_idempotency_key, nullif(btrim(p_message), ''), coalesce(p_is_public, true)
  ) returning expires_at into v_expires_at;

  return query select v_payment.id, v_payment.provider, v_payment.status,
    v_payment.invoice_payload, v_gift.id, v_gift.name, v_payment.amount_stars,
    v_payment.amount_ton, v_payment.currency, v_expires_at;
end;
$$;

create or replace function public.grant_verified_gift_payment(
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
  sent_gift_id uuid,
  receiver_user_id uuid,
  gift_id uuid,
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
  v_intent private.gift_payment_intents%rowtype;
  v_gift public.gifts%rowtype;
  v_sent_gift public.sent_gifts%rowtype;
  v_existing_payment_id uuid;
begin
  if p_payment_id is null or p_provider is null
    or p_provider_payment_id is null or char_length(btrim(p_provider_payment_id)) not between 3 and 255
    or p_provider_customer_id is null or char_length(btrim(p_provider_customer_id)) not between 1 and 255
    or p_raw_webhook is null
  then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('payment:' || p_payment_id::text, 0)
  );
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'payment_not_found';
  end if;
  select * into v_intent from private.gift_payment_intents where payment_id = p_payment_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'payment_not_found';
  end if;
  select * into v_gift from public.gifts where id = v_intent.gift_id;

  select payment.id into v_existing_payment_id
  from public.payments payment
  where payment.provider = p_provider
    and payment.provider_payment_id = p_provider_payment_id
  limit 1;
  if v_existing_payment_id is not null and v_existing_payment_id <> p_payment_id then
    raise exception using errcode = 'P0001', message = 'provider_payment_reused';
  end if;

  if v_payment.provider <> p_provider or v_payment.product_type <> 'gift'
    or v_payment.product_id <> v_intent.gift_id
  then
    raise exception using errcode = 'P0001', message = 'payment_mismatch';
  end if;

  if v_payment.granted_at is not null then
    select * into v_sent_gift from public.sent_gifts where payment_id = v_payment.id;
    if not found then
      raise exception using errcode = 'P0001', message = 'payment_grant_inconsistent';
    end if;
    return query select v_payment.id, v_payment.status, v_sent_gift.id,
      v_sent_gift.receiver_user_id, v_sent_gift.gift_id, v_payment.granted_at, true;
    return;
  end if;

  if v_payment.status not in ('created', 'pending', 'verified') then
    raise exception using errcode = 'P0001', message = 'payment_not_payable';
  end if;
  if p_provider = 'telegram_stars' then
    if p_amount_stars is null or p_amount_stars <> v_gift.price_stars
      or not exists (
        select 1 from private.telegram_identities identity
        where identity.user_id = v_intent.sender_user_id
          and identity.telegram_user_id = p_provider_customer_id
      )
    then
      raise exception using errcode = 'P0001', message = 'payment_mismatch';
    end if;
  elsif p_provider = 'ton' then
    if p_amount_ton is null or v_gift.price_ton is null or p_amount_ton < v_gift.price_ton then
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

  insert into public.sent_gifts (
    gift_id, sender_user_id, receiver_user_id, payment_id, message, is_public
  ) values (
    v_intent.gift_id, v_intent.sender_user_id, v_intent.receiver_user_id,
    v_payment.id, v_intent.message, v_intent.is_public
  ) returning * into v_sent_gift;

  if p_provider = 'ton' then
    insert into public.ton_transactions (
      user_id, payment_id, network, transaction_type, status, tx_hash,
      from_address, to_address, amount_ton, comment, payload, confirmed_at,
      raw_transaction
    ) values (
      v_intent.sender_user_id, v_payment.id, p_ton_network, 'gift_purchase', 'confirmed',
      p_provider_payment_id, p_provider_customer_id,
      p_raw_webhook #>> '{transaction,to_address}', p_amount_ton,
      v_payment.invoice_payload, v_payment.invoice_payload, now(), p_raw_webhook
    ) on conflict (network, tx_hash) where tx_hash is not null do nothing;
  end if;

  update public.payments payment
  set granted_at = now(), updated_at = now()
  where payment.id = v_payment.id
  returning * into v_payment;

  return query select v_payment.id, v_payment.status, v_sent_gift.id,
    v_sent_gift.receiver_user_id, v_sent_gift.gift_id, v_payment.granted_at, false;
end;
$$;

create or replace function public.resolve_telegram_stars_gift_payment(
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
  join private.gift_payment_intents intent on intent.payment_id = payment.id
  join public.gifts gift on gift.id = intent.gift_id
  join private.telegram_identities identity on identity.user_id = intent.sender_user_id
  where payment.provider = 'telegram_stars'
    and payment.product_type = 'gift'
    and payment.invoice_payload = p_invoice_payload
    and identity.telegram_user_id = p_telegram_user_id
    and payment.amount_stars = p_amount_stars
    and gift.price_stars = p_amount_stars
    and (not p_require_unexpired or intent.expires_at > now())
    and payment.granted_at is null
    and payment.status in ('created', 'pending');
end;
$$;

create or replace function public.get_ton_gift_payment_context(
  p_actor_user_id uuid,
  p_payment_id uuid
)
returns table (
  payment_id uuid,
  invoice_payload text,
  amount_ton numeric,
  payment_status public.payment_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or p_payment_id is null then
    raise exception using errcode = '22023', message = 'invalid_payment_verification';
  end if;
  return query
  select payment.id, payment.invoice_payload, payment.amount_ton, payment.status
  from public.payments payment
  join private.gift_payment_intents intent on intent.payment_id = payment.id
  where payment.id = p_payment_id
    and payment.user_id = p_actor_user_id
    and intent.sender_user_id = p_actor_user_id
    and payment.provider = 'ton'
    and payment.product_type = 'gift'
    and payment.granted_at is null
    and payment.status in ('created', 'pending');
end;
$$;

create or replace function public.get_own_profile_auras(p_actor_user_id uuid)
returns table (
  user_aura_id uuid,
  aura_id uuid,
  slug text,
  name text,
  description text,
  aura_key text,
  preview_url text,
  css_tokens jsonb,
  animation_metadata jsonb,
  aura_status public.profile_aura_status,
  is_active boolean,
  unlocked_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.assert_dating_account(p_actor_user_id, false);
  update public.user_profile_auras aura
  set status = 'expired', is_active = false, updated_at = now()
  where aura.user_id = p_actor_user_id
    and aura.status in ('owned', 'active')
    and aura.expires_at is not null
    and aura.expires_at <= now();

  return query
  select owned.id, effect.id, effect.slug, effect.name, effect.description,
    effect.aura_key, effect.preview_url, effect.css_tokens, effect.animation_metadata,
    owned.status, owned.is_active, owned.unlocked_at, owned.activated_at, owned.expires_at
  from public.user_profile_auras owned
  join public.profile_aura_effects effect on effect.id = owned.aura_id
  where owned.user_id = p_actor_user_id
  order by owned.is_active desc, owned.unlocked_at desc, owned.id desc;
end;
$$;

create or replace function public.activate_profile_aura(
  p_actor_user_id uuid,
  p_user_aura_id uuid
)
returns table (
  user_aura_id uuid,
  aura_id uuid,
  aura_status public.profile_aura_status,
  activated_at timestamptz,
  expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_target public.user_profile_auras%rowtype;
  v_previous_id uuid;
begin
  if p_actor_user_id is null or p_user_aura_id is null then
    raise exception using errcode = '22023', message = 'invalid_aura_input';
  end if;
  perform private.assert_dating_account(p_actor_user_id, false);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('profile-aura:' || p_actor_user_id::text, 0)
  );

  update public.user_profile_auras aura
  set status = 'expired', is_active = false, updated_at = now()
  where aura.user_id = p_actor_user_id
    and aura.status in ('owned', 'active')
    and aura.expires_at is not null
    and aura.expires_at <= now();

  select * into v_target
  from public.user_profile_auras aura
  where aura.id = p_user_aura_id and aura.user_id = p_actor_user_id
  for update;
  if not found or v_target.status not in ('owned', 'active')
    or (v_target.expires_at is not null and v_target.expires_at <= now())
  then
    raise exception using errcode = 'P0001', message = 'aura_unavailable';
  end if;

  select aura.id into v_previous_id
  from public.user_profile_auras aura
  where aura.user_id = p_actor_user_id and aura.is_active = true and aura.id <> p_user_aura_id
  limit 1;

  update public.user_profile_auras aura
  set is_active = false,
      status = case when aura.status = 'active' then 'owned'::public.profile_aura_status else aura.status end,
      updated_at = now()
  where aura.user_id = p_actor_user_id and aura.is_active = true and aura.id <> p_user_aura_id;

  update public.user_profile_auras aura
  set status = 'active', is_active = true, activated_at = coalesce(aura.activated_at, now()), updated_at = now()
  where aura.id = p_user_aura_id
  returning * into v_target;

  if v_previous_id is not null then
    insert into public.profile_aura_events (user_aura_id, user_id, aura_id, event_type, metadata)
    select id, user_id, aura_id, 'deactivated', jsonb_build_object('replaced_by', p_user_aura_id)
    from public.user_profile_auras where id = v_previous_id;
  end if;
  insert into public.profile_aura_events (user_aura_id, user_id, aura_id, event_type, metadata)
  values (v_target.id, p_actor_user_id, v_target.aura_id, 'activated', '{}'::jsonb);

  return query select v_target.id, v_target.aura_id, v_target.status,
    v_target.activated_at, v_target.expires_at;
end;
$$;

revoke all on function private.assert_gift_sender(uuid)
from public, anon, authenticated, service_role;
revoke all on function private.assert_gift_receiver(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.get_gift_catalog(uuid)
from public, anon, authenticated;
revoke all on function public.create_gift_payment_intent(
  uuid, uuid, uuid, public.payment_provider, text, uuid, text, boolean
) from public, anon, authenticated;
revoke all on function public.grant_verified_gift_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) from public, anon, authenticated;
revoke all on function public.resolve_telegram_stars_gift_payment(text, text, integer, boolean)
from public, anon, authenticated;
revoke all on function public.get_ton_gift_payment_context(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.get_own_profile_auras(uuid)
from public, anon, authenticated;
revoke all on function public.activate_profile_aura(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.get_gift_catalog(uuid) to service_role;
grant execute on function public.create_gift_payment_intent(
  uuid, uuid, uuid, public.payment_provider, text, uuid, text, boolean
) to service_role;
grant execute on function public.grant_verified_gift_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) to service_role;
grant execute on function public.resolve_telegram_stars_gift_payment(text, text, integer, boolean)
to service_role;
grant execute on function public.get_ton_gift_payment_context(uuid, uuid)
to service_role;
grant execute on function public.get_own_profile_auras(uuid) to service_role;
grant execute on function public.activate_profile_aura(uuid, uuid) to service_role;

comment on function public.create_gift_payment_intent(
  uuid, uuid, uuid, public.payment_provider, text, uuid, text, boolean
) is 'Creates one payment-bound gift intent, idempotent per sender and idempotency key.';
comment on function public.grant_verified_gift_payment(
  uuid, public.payment_provider, text, text, integer, numeric, public.wallet_network, jsonb
) is 'Atomically verifies a provider payment, delivers its gift, and triggers aura fulfillment.';

commit;
