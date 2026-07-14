import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireDatingAccount, requireUsableAccount } from '@/lib/auth/guards';
import { ApiError, NotFoundError } from '@/lib/errors/api-error';

import { getConfiguredTonPaymentNetwork, getTonPaymentInstruction, verifyTonGiftTransaction } from '@/features/gifts/ton';
import { createTelegramStarsInvoiceLink } from '@/features/gifts/telegram-stars';

import { throwPremiumRpcError } from './errors';
import { callPremiumRpc } from './rpc';
import { type CreatePremiumPaymentIntentInput, type PremiumTonPaymentConfirmationInput } from './schemas';

interface PremiumPlanRow {
  plan_id: string; slug: string; name: string; description: string | null; plan_interval: string;
  duration_days: number; price_stars: number | null; price_ton: number | string | null;
  features: Record<string, unknown>; limits: Record<string, unknown>; sort_order: number;
}

interface EntitlementRow {
  subscription_id: string; plan_id: string; plan_slug: string; plan_name: string; subscription_status: string;
  starts_at: string; current_period_end: string; expires_at: string | null;
  features: Record<string, unknown>; limits: Record<string, unknown>; super_like_balance: number;
}

interface PaymentIntentRow {
  payment_id: string; payment_provider: 'telegram_stars' | 'ton'; payment_status: string;
  invoice_payload: string; plan_id: string; plan_name: string; amount_stars: number | null;
  amount_ton: number | string | null; currency: string | null; expires_at: string;
}

interface PremiumGrantRow {
  payment_id: string; payment_status: string; subscription_id: string; plan_id: string;
  current_period_end: string; granted_at: string; already_granted: boolean;
}

function premiumInvoicePayload(): string {
  return `prm_${randomUUID().replaceAll('-', '')}`;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', message);
  return row;
}

function mapPlan(row: PremiumPlanRow) {
  return {
    id: row.plan_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    interval: row.plan_interval,
    durationDays: row.duration_days,
    pricing: { stars: row.price_stars, ton: row.price_ton === null ? null : String(row.price_ton) },
    features: row.features,
    limits: row.limits,
  };
}

function usableExpiry(expiresAt: string): Date {
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new ApiError(409, 'PAYMENT_EXPIRED', 'This payment request expired. Start again with a new idempotency key');
  }
  return date;
}

export async function listPremiumPlans(userId: string) {
  await requireUsableAccount(userId);
  const { data, error } = await callPremiumRpc<PremiumPlanRow>('get_premium_plans');
  if (error) throwPremiumRpcError(error, 'Premium plans could not be loaded');
  return { items: (data ?? []).map(mapPlan) };
}

export async function getPremiumEntitlements(userId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callPremiumRpc<EntitlementRow>('get_my_premium_entitlements', {
    p_actor_user_id: userId,
  });
  if (error) throwPremiumRpcError(error, 'Premium entitlements could not be loaded');
  const row = data?.[0];
  return {
    active: Boolean(row),
    subscription: row ? {
      id: row.subscription_id,
      status: row.subscription_status,
      startsAt: row.starts_at,
      currentPeriodEnd: row.current_period_end,
      expiresAt: row.expires_at,
      plan: { id: row.plan_id, slug: row.plan_slug, name: row.plan_name },
      features: row.features,
      limits: row.limits,
      superLikeBalance: row.super_like_balance,
    } : null,
  };
}

export async function createPremiumPaymentIntent(userId: string, input: CreatePremiumPaymentIntentInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callPremiumRpc<PaymentIntentRow>('create_premium_payment_intent', {
    p_user_id: userId,
    p_plan_id: input.planId,
    p_provider: input.provider,
    p_invoice_payload: premiumInvoicePayload(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throwPremiumRpcError(error, 'The premium purchase could not be created');
  const row = requireRow(data?.[0], 'The premium payment returned no result');
  const expiresAt = usableExpiry(row.expires_at);
  if (row.payment_provider === 'telegram_stars') {
    if (!row.amount_stars || row.amount_stars < 1) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'The Stars price is invalid');
    }
    const url = await createTelegramStarsInvoiceLink({
      title: row.plan_name,
      description: `Unlock ${row.plan_name} premium access`,
      invoicePayload: row.invoice_payload,
      amountStars: row.amount_stars,
    });
    return {
      paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
      expiresAt: expiresAt.toISOString(), planId: row.plan_id,
      invoice: { url, payload: row.invoice_payload, currency: 'XTR', amountStars: row.amount_stars },
    };
  }
  if (row.amount_ton === null || row.amount_ton === undefined) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The TON price is invalid');
  }
  return {
    paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
    expiresAt: expiresAt.toISOString(), planId: row.plan_id,
    transaction: getTonPaymentInstruction(row.invoice_payload, row.amount_ton, Math.floor(expiresAt.getTime() / 1000)),
  };
}

export async function confirmTonPremiumPayment(userId: string, input: PremiumTonPaymentConfirmationInput) {
  await requireDatingAccount(userId);
  const { data: contextRows, error: contextError } = await callPremiumRpc<{
    payment_id: string; invoice_payload: string; amount_ton: number | string; payment_status: string;
  }>('get_ton_premium_payment_context', { p_actor_user_id: userId, p_payment_id: input.paymentId });
  if (contextError) throwPremiumRpcError(contextError, 'The TON premium payment could not be loaded');
  const context = contextRows?.[0];
  if (!context) throw new NotFoundError('This TON premium payment is not available');
  const transaction = await verifyTonGiftTransaction({
    transactionHash: input.transactionHash,
    transactionBoc: input.transactionBoc,
    invoicePayload: context.invoice_payload,
    minimumAmountTon: context.amount_ton,
  });
  const { data, error } = await callPremiumRpc<PremiumGrantRow>('grant_verified_premium_payment', {
    p_payment_id: context.payment_id,
    p_provider: 'ton',
    p_provider_payment_id: transaction.hash,
    p_provider_customer_id: transaction.fromAddress,
    p_amount_stars: null,
    p_amount_ton: transaction.amountTon,
    p_ton_network: getConfiguredTonPaymentNetwork(),
    p_raw_webhook: { transaction: { ...transaction.raw, to_address: transaction.toAddress } },
  });
  if (error) throwPremiumRpcError(error, 'The TON premium payment could not be granted');
  return mapPremiumGrant(requireRow(data?.[0], 'The premium payment grant returned no result'));
}

export async function resolveTelegramStarsPremiumPayment(
  invoicePayload: string,
  telegramUserId: string,
  amountStars: number,
  requireUnexpired = true,
) {
  const { data, error } = await callPremiumRpc<{ payment_id: string; payment_status: string }>(
    'resolve_telegram_stars_premium_payment',
    {
      p_invoice_payload: invoicePayload,
      p_telegram_user_id: telegramUserId,
      p_amount_stars: amountStars,
      p_require_unexpired: requireUnexpired,
    },
  );
  if (error) throwPremiumRpcError(error, 'The Telegram premium payment could not be resolved');
  return data?.[0] ?? null;
}

function mapPremiumGrant(row: PremiumGrantRow) {
  return {
    paymentId: row.payment_id,
    status: row.payment_status,
    subscriptionId: row.subscription_id,
    planId: row.plan_id,
    currentPeriodEnd: row.current_period_end,
    grantedAt: row.granted_at,
    alreadyGranted: row.already_granted,
  };
}

export async function grantTelegramStarsPremiumPayment(input: {
  paymentId: string; chargeId: string; telegramUserId: string; amountStars: number; rawWebhook: Record<string, unknown>;
}) {
  const { data, error } = await callPremiumRpc<PremiumGrantRow>('grant_verified_premium_payment', {
    p_payment_id: input.paymentId,
    p_provider: 'telegram_stars',
    p_provider_payment_id: input.chargeId,
    p_provider_customer_id: input.telegramUserId,
    p_amount_stars: input.amountStars,
    p_amount_ton: null,
    p_ton_network: 'ton_mainnet',
    p_raw_webhook: input.rawWebhook,
  });
  if (error) throwPremiumRpcError(error, 'The Telegram premium payment could not be granted');
  return mapPremiumGrant(requireRow(data?.[0], 'The premium payment grant returned no result'));
}

export async function claimPremiumDailySuperLikes(userId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callPremiumRpc<{
    subscription_id: string; granted_count: number; available_count: number; next_refill_at: string; already_claimed: boolean;
  }>('claim_premium_daily_super_likes', { p_actor_user_id: userId });
  if (error) throwPremiumRpcError(error, 'Premium super-likes could not be claimed');
  const row = requireRow(data?.[0], 'The premium super-like claim returned no result');
  return {
    subscriptionId: row.subscription_id,
    grantedCount: row.granted_count,
    availableCount: row.available_count,
    nextRefillAt: row.next_refill_at,
    alreadyClaimed: row.already_claimed,
  };
}
