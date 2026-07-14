import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireDatingAccount } from '@/lib/auth/guards';
import { ApiError, NotFoundError } from '@/lib/errors/api-error';

import { throwGiftRpcError } from './errors';
import { callGiftRpc } from './rpc';
import { type CreateGiftPaymentIntentInput, type TonPaymentConfirmationInput } from './schemas';
import { getConfiguredTonPaymentNetwork, getTonPaymentInstruction, verifyTonGiftTransaction } from './ton';
import { createTelegramStarsInvoiceLink } from './telegram-stars';

interface GiftCatalogRow {
  gift_id: string; slug: string; name: string; description: string | null; rarity: string;
  price_stars: number; price_ton: number | string | null; gift_effect: string | null;
  profile_aura_effect: string | null; asset_url: string; thumbnail_url: string | null;
  asset_type: string; category_slug: string; category_name: string; category_emoji: string | null;
}

interface PaymentIntentRow {
  payment_id: string; payment_provider: 'telegram_stars' | 'ton'; payment_status: string;
  invoice_payload: string; gift_id: string; gift_name: string; amount_stars: number | null;
  amount_ton: number | string | null; currency: string | null; expires_at: string;
}

interface GrantRow {
  payment_id: string; payment_status: string; sent_gift_id: string;
  receiver_user_id: string; gift_id: string; granted_at: string; already_granted: boolean;
}

interface AuraRow {
  user_aura_id: string; aura_id: string; slug: string; name: string; description: string | null;
  aura_key: string; preview_url: string | null; css_tokens: Record<string, unknown>;
  animation_metadata: Record<string, unknown>; aura_status: string; is_active: boolean;
  unlocked_at: string; activated_at: string | null; expires_at: string | null;
}

function mapGift(row: GiftCatalogRow) {
  return {
    id: row.gift_id, slug: row.slug, name: row.name, description: row.description, rarity: row.rarity,
    pricing: { stars: row.price_stars, ton: row.price_ton === null ? null : String(row.price_ton) },
    effect: row.gift_effect, profileAuraEffect: row.profile_aura_effect,
    asset: { url: row.asset_url, thumbnailUrl: row.thumbnail_url, type: row.asset_type },
    category: { slug: row.category_slug, name: row.category_name, emoji: row.category_emoji },
  };
}

function mapAura(row: AuraRow) {
  return {
    id: row.user_aura_id, auraId: row.aura_id, slug: row.slug, name: row.name, description: row.description,
    auraKey: row.aura_key, previewUrl: row.preview_url, cssTokens: row.css_tokens,
    animationMetadata: row.animation_metadata, status: row.aura_status, isActive: row.is_active,
    unlockedAt: row.unlocked_at, activatedAt: row.activated_at, expiresAt: row.expires_at,
  };
}

function invoicePayload(): string {
  return `gft_${randomUUID().replaceAll('-', '')}`;
}

function getUsablePaymentExpiry(expiresAt: string): Date {
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new ApiError(409, 'PAYMENT_EXPIRED', 'This payment request expired. Start again with a new idempotency key');
  }
  return new Date(expiresAtMs);
}

export async function listGiftCatalog(userId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callGiftRpc<GiftCatalogRow>('get_gift_catalog', { p_actor_user_id: userId });
  if (error) throwGiftRpcError(error, 'Gifts could not be loaded');
  return { items: (data ?? []).map(mapGift) };
}

export async function createGiftPaymentIntent(userId: string, input: CreateGiftPaymentIntentInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callGiftRpc<PaymentIntentRow>('create_gift_payment_intent', {
    p_sender_user_id: userId, p_receiver_user_id: input.receiverUserId, p_gift_id: input.giftId,
    p_provider: input.provider, p_invoice_payload: invoicePayload(), p_idempotency_key: input.idempotencyKey,
    p_message: input.message ?? null, p_is_public: input.isPublic,
  });
  if (error) throwGiftRpcError(error, 'The gift payment could not be created');
  const row = data?.[0];
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'The gift payment returned no result');
  const expiresAt = getUsablePaymentExpiry(row.expires_at);

  if (row.payment_provider === 'telegram_stars') {
    if (!row.amount_stars || row.amount_stars <= 0) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'The Stars price is invalid');
    }
    const invoiceUrl = await createTelegramStarsInvoiceLink({
      title: row.gift_name, description: `Send ${row.gift_name} as a gift`,
      invoicePayload: row.invoice_payload, amountStars: row.amount_stars,
    });
    return {
      paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
      expiresAt: expiresAt.toISOString(),
      invoice: { url: invoiceUrl, payload: row.invoice_payload, currency: 'XTR', amountStars: row.amount_stars },
    };
  }

  if (row.amount_ton === null || row.amount_ton === undefined) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The TON price is invalid');
  }
  return {
    paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
    expiresAt: expiresAt.toISOString(),
    transaction: getTonPaymentInstruction(row.invoice_payload, row.amount_ton, Math.floor(expiresAt.getTime() / 1000)),
  };
}

export async function confirmTonGiftPayment(userId: string, input: TonPaymentConfirmationInput) {
  const { data: contextRows, error: contextError } = await callGiftRpc<{
    payment_id: string; invoice_payload: string; amount_ton: number | string; payment_status: string;
  }>('get_ton_gift_payment_context', { p_actor_user_id: userId, p_payment_id: input.paymentId });
  if (contextError) throwGiftRpcError(contextError, 'The TON payment could not be loaded');
  const context = contextRows?.[0];
  if (!context) throw new NotFoundError('This TON payment is not available');

  const transaction = await verifyTonGiftTransaction({
    transactionHash: input.transactionHash, transactionBoc: input.transactionBoc,
    invoicePayload: context.invoice_payload, minimumAmountTon: context.amount_ton,
  });
  const { data, error } = await callGiftRpc<GrantRow>('grant_verified_gift_payment', {
    p_payment_id: context.payment_id, p_provider: 'ton', p_provider_payment_id: transaction.hash,
    p_provider_customer_id: transaction.fromAddress, p_amount_stars: null, p_amount_ton: transaction.amountTon,
    p_ton_network: getConfiguredTonPaymentNetwork(),
    p_raw_webhook: { transaction: { ...transaction.raw, to_address: transaction.toAddress } },
  });
  if (error) throwGiftRpcError(error, 'The TON payment could not be granted');
  const grant = data?.[0];
  if (!grant) throw new ApiError(500, 'INTERNAL_ERROR', 'The TON payment grant returned no result');
  return {
    paymentId: grant.payment_id, status: grant.payment_status, sentGiftId: grant.sent_gift_id,
    receiverUserId: grant.receiver_user_id, giftId: grant.gift_id, grantedAt: grant.granted_at,
    alreadyGranted: grant.already_granted,
  };
}

export async function resolveTelegramStarsGiftPayment(
  invoicePayload: string,
  telegramUserId: string,
  amountStars: number,
  requireUnexpired = true,
) {
  const { data, error } = await callGiftRpc<{ payment_id: string; payment_status: string }>('resolve_telegram_stars_gift_payment', {
    p_invoice_payload: invoicePayload,
    p_telegram_user_id: telegramUserId,
    p_amount_stars: amountStars,
    p_require_unexpired: requireUnexpired,
  });
  if (error) throwGiftRpcError(error, 'The Telegram payment could not be resolved');
  return data?.[0] ?? null;
}

export async function grantTelegramStarsGiftPayment(input: {
  paymentId: string; chargeId: string; telegramUserId: string; amountStars: number; rawWebhook: Record<string, unknown>;
}) {
  const { data, error } = await callGiftRpc<GrantRow>('grant_verified_gift_payment', {
    p_payment_id: input.paymentId, p_provider: 'telegram_stars', p_provider_payment_id: input.chargeId,
    p_provider_customer_id: input.telegramUserId, p_amount_stars: input.amountStars,
    p_amount_ton: null, p_ton_network: 'ton_mainnet', p_raw_webhook: input.rawWebhook,
  });
  if (error) throwGiftRpcError(error, 'The Telegram Stars payment could not be granted');
  const grant = data?.[0];
  if (!grant) throw new ApiError(500, 'INTERNAL_ERROR', 'The Telegram Stars grant returned no result');
  return grant;
}

export async function listOwnProfileAuras(userId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callGiftRpc<AuraRow>('get_own_profile_auras', { p_actor_user_id: userId });
  if (error) throwGiftRpcError(error, 'Profile auras could not be loaded');
  return { items: (data ?? []).map(mapAura) };
}

export async function activateProfileAura(userId: string, userAuraId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callGiftRpc<{
    user_aura_id: string; aura_id: string; aura_status: string; activated_at: string; expires_at: string | null;
  }>('activate_profile_aura', { p_actor_user_id: userId, p_user_aura_id: userAuraId });
  if (error) throwGiftRpcError(error, 'The profile aura could not be activated');
  const aura = data?.[0];
  if (!aura) throw new ApiError(500, 'INTERNAL_ERROR', 'The profile aura activation returned no result');
  return { id: aura.user_aura_id, auraId: aura.aura_id, status: aura.aura_status, activatedAt: aura.activated_at, expiresAt: aura.expires_at };
}
