import 'server-only';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { requireDatingAccount } from '@/lib/auth/guards';
import { ApiError, NotFoundError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { getConfiguredTonPaymentNetwork, getTonPaymentInstruction, verifyTonGiftTransaction } from '@/features/gifts/ton';
import { createTelegramStarsInvoiceLink } from '@/features/gifts/telegram-stars';

import { throwBoostRpcError } from './errors';
import { callBoostRpc } from './rpc';
import {
  type BoostQuery,
  type BoostTonPaymentConfirmationInput,
  type CreateBoostPaymentIntentInput,
  type CreatePremiumBoostInput,
} from './schemas';

const boostCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  version: z.literal(1),
}).strict();

interface BoostProductRow {
  boost_product_id: string; slug: string; name: string; description: string | null;
  duration_minutes: number; multiplier: number | string; price_stars: number; price_ton: number | string | null;
  sort_order: number;
}

interface BoostRow {
  boost_id: string; boost_product_id: string | null; boost_status: string; boost_type: string;
  starts_at: string; ends_at: string; paused_at: string | null; remaining_seconds: number | null;
  multiplier: number | string; impression_count: number; profile_view_count: number; like_count: number;
  match_count: number; created_at: string; payment_id: string | null;
}

interface BoostIntentRow {
  payment_id: string; payment_provider: 'telegram_stars' | 'ton'; payment_status: string;
  invoice_payload: string; boost_product_id: string; boost_name: string; duration_minutes: number;
  multiplier: number | string; amount_stars: number | null; amount_ton: number | string | null;
  currency: string | null; expires_at: string;
}

interface BoostGrantRow {
  payment_id: string; payment_status: string; boost_id: string; boost_status: string;
  starts_at: string; ends_at: string; granted_at: string; already_granted: boolean;
}

function boostInvoicePayload(): string {
  return `bst_${randomUUID().replaceAll('-', '')}`;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', message);
  return row;
}

function usableExpiry(expiresAt: string) {
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw new ApiError(409, 'PAYMENT_EXPIRED', 'This payment request expired. Start again with a new idempotency key');
  }
  return date;
}

function mapProduct(row: BoostProductRow) {
  return {
    id: row.boost_product_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    multiplier: String(row.multiplier),
    pricing: { stars: row.price_stars, ton: row.price_ton === null ? null : String(row.price_ton) },
  };
}

function mapBoost(row: BoostRow) {
  return {
    id: row.boost_id,
    productId: row.boost_product_id,
    status: row.boost_status,
    type: row.boost_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    pausedAt: row.paused_at,
    remainingSeconds: row.remaining_seconds,
    multiplier: String(row.multiplier),
    paymentId: row.payment_id,
    metrics: {
      impressions: row.impression_count,
      profileViews: row.profile_view_count,
      likes: row.like_count,
      matches: row.match_count,
    },
    createdAt: row.created_at,
  };
}

function mapGrant(row: BoostGrantRow) {
  return {
    paymentId: row.payment_id,
    status: row.payment_status,
    boostId: row.boost_id,
    boostStatus: row.boost_status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    grantedAt: row.granted_at,
    alreadyGranted: row.already_granted,
  };
}

export async function listBoosts(userId: string, query: BoostQuery) {
  await requireDatingAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, boostCursorSchema) : null;
  const [catalog, own] = await Promise.all([
    callBoostRpc<BoostProductRow>('get_boost_catalog'),
    callBoostRpc<BoostRow>('get_my_boosts', {
      p_actor_user_id: userId,
      p_limit: query.limit + 1,
      p_cursor_created_at: cursor?.createdAt ?? null,
      p_cursor_boost_id: cursor?.id ?? null,
    }),
  ]);
  if (catalog.error) throwBoostRpcError(catalog.error, 'Boost products could not be loaded');
  if (own.error) throwBoostRpcError(own.error, 'Boosts could not be loaded');
  const rows = own.data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    products: (catalog.data ?? []).map(mapProduct),
    items: pageRows.map(mapBoost),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, id: last.boost_id, version: 1 })
      : null,
  };
}

export async function createBoostPaymentIntent(userId: string, input: CreateBoostPaymentIntentInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callBoostRpc<BoostIntentRow>('create_boost_payment_intent', {
    p_user_id: userId,
    p_boost_product_id: input.boostProductId,
    p_provider: input.provider,
    p_invoice_payload: boostInvoicePayload(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throwBoostRpcError(error, 'The boost purchase could not be created');
  const row = requireRow(data?.[0], 'The boost payment returned no result');
  const expiresAt = usableExpiry(row.expires_at);
  if (row.payment_provider === 'telegram_stars') {
    if (!row.amount_stars || row.amount_stars < 1) throw new ApiError(500, 'INTERNAL_ERROR', 'The Stars price is invalid');
    const url = await createTelegramStarsInvoiceLink({
      title: row.boost_name,
      description: `Boost your profile for ${row.duration_minutes} minutes`,
      invoicePayload: row.invoice_payload,
      amountStars: row.amount_stars,
    });
    return {
      paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
      boostProductId: row.boost_product_id, expiresAt: expiresAt.toISOString(),
      invoice: { url, payload: row.invoice_payload, currency: 'XTR', amountStars: row.amount_stars },
    };
  }
  if (row.amount_ton === null || row.amount_ton === undefined) throw new ApiError(500, 'INTERNAL_ERROR', 'The TON price is invalid');
  return {
    paymentId: row.payment_id, provider: row.payment_provider, status: row.payment_status,
    boostProductId: row.boost_product_id, expiresAt: expiresAt.toISOString(),
    transaction: getTonPaymentInstruction(row.invoice_payload, row.amount_ton, Math.floor(expiresAt.getTime() / 1000)),
  };
}

export async function confirmTonBoostPayment(userId: string, input: BoostTonPaymentConfirmationInput) {
  await requireDatingAccount(userId);
  const { data: contextRows, error: contextError } = await callBoostRpc<{
    payment_id: string; invoice_payload: string; amount_ton: number | string; payment_status: string;
  }>('get_ton_boost_payment_context', { p_actor_user_id: userId, p_payment_id: input.paymentId });
  if (contextError) throwBoostRpcError(contextError, 'The TON boost payment could not be loaded');
  const context = contextRows?.[0];
  if (!context) throw new NotFoundError('This TON boost payment is not available');
  const transaction = await verifyTonGiftTransaction({
    transactionHash: input.transactionHash,
    transactionBoc: input.transactionBoc,
    invoicePayload: context.invoice_payload,
    minimumAmountTon: context.amount_ton,
  });
  const { data, error } = await callBoostRpc<BoostGrantRow>('grant_verified_boost_payment', {
    p_payment_id: context.payment_id,
    p_provider: 'ton',
    p_provider_payment_id: transaction.hash,
    p_provider_customer_id: transaction.fromAddress,
    p_amount_stars: null,
    p_amount_ton: transaction.amountTon,
    p_ton_network: getConfiguredTonPaymentNetwork(),
    p_raw_webhook: { transaction: { ...transaction.raw, to_address: transaction.toAddress } },
  });
  if (error) throwBoostRpcError(error, 'The TON boost payment could not be granted');
  return mapGrant(requireRow(data?.[0], 'The boost payment grant returned no result'));
}

export async function resolveTelegramStarsBoostPayment(
  invoicePayload: string,
  telegramUserId: string,
  amountStars: number,
  requireUnexpired = true,
) {
  const { data, error } = await callBoostRpc<{ payment_id: string; payment_status: string }>(
    'resolve_telegram_stars_boost_payment',
    {
      p_invoice_payload: invoicePayload,
      p_telegram_user_id: telegramUserId,
      p_amount_stars: amountStars,
      p_require_unexpired: requireUnexpired,
    },
  );
  if (error) throwBoostRpcError(error, 'The Telegram boost payment could not be resolved');
  return data?.[0] ?? null;
}

export async function grantTelegramStarsBoostPayment(input: {
  paymentId: string; chargeId: string; telegramUserId: string; amountStars: number; rawWebhook: Record<string, unknown>;
}) {
  const { data, error } = await callBoostRpc<BoostGrantRow>('grant_verified_boost_payment', {
    p_payment_id: input.paymentId,
    p_provider: 'telegram_stars',
    p_provider_payment_id: input.chargeId,
    p_provider_customer_id: input.telegramUserId,
    p_amount_stars: input.amountStars,
    p_amount_ton: null,
    p_ton_network: 'ton_mainnet',
    p_raw_webhook: input.rawWebhook,
  });
  if (error) throwBoostRpcError(error, 'The Telegram boost payment could not be granted');
  return mapGrant(requireRow(data?.[0], 'The boost payment grant returned no result'));
}

export async function createPremiumBoost(userId: string, input: CreatePremiumBoostInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callBoostRpc<{
    boost_id: string; boost_status: string; starts_at: string; ends_at: string; multiplier: number | string; remaining_minutes: number;
  }>('create_premium_boost', { p_actor_user_id: userId, p_duration_minutes: input.durationMinutes });
  if (error) throwBoostRpcError(error, 'The premium boost could not be created');
  const row = requireRow(data?.[0], 'The premium boost operation returned no result');
  return {
    id: row.boost_id, status: row.boost_status, startsAt: row.starts_at, endsAt: row.ends_at,
    multiplier: String(row.multiplier), remainingMinutes: row.remaining_minutes,
  };
}

export async function pauseBoost(userId: string, boostId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callBoostRpc<{
    boost_id: string; boost_status: string; remaining_seconds: number; paused_at: string;
  }>('pause_own_boost', { p_actor_user_id: userId, p_boost_id: boostId });
  if (error) throwBoostRpcError(error, 'The boost could not be paused');
  const row = requireRow(data?.[0], 'The boost pause operation returned no result');
  return { id: row.boost_id, status: row.boost_status, remainingSeconds: row.remaining_seconds, pausedAt: row.paused_at };
}

export async function resumeBoost(userId: string, boostId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callBoostRpc<{
    boost_id: string; boost_status: string; starts_at: string; ends_at: string;
  }>('resume_own_boost', { p_actor_user_id: userId, p_boost_id: boostId });
  if (error) throwBoostRpcError(error, 'The boost could not be resumed');
  const row = requireRow(data?.[0], 'The boost resume operation returned no result');
  return { id: row.boost_id, status: row.boost_status, startsAt: row.starts_at, endsAt: row.ends_at };
}

export async function recordBoostImpressions(userId: string, targetUserIds: string[]) {
  if (targetUserIds.length === 0) return 0;
  const { data, error } = await callBoostRpc<number>('record_boost_impressions', {
    p_actor_user_id: userId,
    p_target_user_ids: targetUserIds,
  });
  if (error) throwBoostRpcError(error, 'Boost metrics could not be recorded');
  return data?.[0] ?? 0;
}
