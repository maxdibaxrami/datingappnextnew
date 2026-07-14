import { timingSafeEqual } from 'node:crypto';

import { type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  grantTelegramStarsBoostPayment,
  resolveTelegramStarsBoostPayment,
} from '@/features/boosts/service';
import { grantTelegramStarsGiftPayment, resolveTelegramStarsGiftPayment } from '@/features/gifts/service';
import { answerTelegramPreCheckoutQuery } from '@/features/gifts/telegram-stars';
import {
  grantTelegramStarsPremiumPayment,
  resolveTelegramStarsPremiumPayment,
} from '@/features/premium/service';
import { ApiError } from '@/lib/errors/api-error';
import { getServerEnv } from '@/lib/env';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseExternalJsonBody } from '@/lib/http/request';

export const runtime = 'nodejs';

const telegramUpdateSchema = z.object({
  update_id: z.number().int().optional(),
  pre_checkout_query: z.object({
    id: z.string().min(1),
    from: z.object({ id: z.number().int().safe().positive() }),
    currency: z.literal('XTR'),
    total_amount: z.number().int().positive(),
    invoice_payload: z.string().min(1).max(128),
  }).optional(),
  message: z.object({
    from: z.object({ id: z.number().int().safe().positive() }).optional(),
    successful_payment: z.object({
      currency: z.literal('XTR'),
      total_amount: z.number().int().positive(),
      invoice_payload: z.string().min(1).max(128),
      telegram_payment_charge_id: z.string().min(1).max(255),
    }).optional(),
  }).optional(),
}).passthrough();

function webhookSecretMatches(received: string | null): boolean {
  const expected = getServerEnv().TELEGRAM_PAYMENT_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

type ResolvedStarsPayment = { payment_id: string; kind: 'boost' | 'gift' | 'premium' } | null;

async function resolveStarsPayment(
  invoicePayload: string,
  telegramUserId: string,
  amountStars: number,
  requireUnexpired = true,
): Promise<ResolvedStarsPayment> {
  if (invoicePayload.startsWith('gft_')) {
    const payment = await resolveTelegramStarsGiftPayment(
      invoicePayload, telegramUserId, amountStars, requireUnexpired,
    );
    return payment ? { payment_id: payment.payment_id, kind: 'gift' } : null;
  }
  if (invoicePayload.startsWith('prm_')) {
    const payment = await resolveTelegramStarsPremiumPayment(
      invoicePayload, telegramUserId, amountStars, requireUnexpired,
    );
    return payment ? { payment_id: payment.payment_id, kind: 'premium' } : null;
  }
  if (invoicePayload.startsWith('bst_')) {
    const payment = await resolveTelegramStarsBoostPayment(
      invoicePayload, telegramUserId, amountStars, requireUnexpired,
    );
    return payment ? { payment_id: payment.payment_id, kind: 'boost' } : null;
  }
  return null;
}

async function grantStarsPayment(input: {
  payment: Exclude<ResolvedStarsPayment, null>;
  chargeId: string;
  telegramUserId: string;
  amountStars: number;
  rawWebhook: Record<string, unknown>;
}): Promise<void> {
  const payload = {
    paymentId: input.payment.payment_id,
    chargeId: input.chargeId,
    telegramUserId: input.telegramUserId,
    amountStars: input.amountStars,
    rawWebhook: input.rawWebhook,
  };
  if (input.payment.kind === 'gift') {
    await grantTelegramStarsGiftPayment(payload);
  } else if (input.payment.kind === 'premium') {
    await grantTelegramStarsPremiumPayment(payload);
  } else {
    await grantTelegramStarsBoostPayment(payload);
  }
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    if (!webhookSecretMatches(request.headers.get('x-telegram-bot-api-secret-token'))) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Invalid Telegram payment webhook secret');
    }
    if (request.headers.get('content-type')?.split(';', 1)[0]?.trim() !== 'application/json') {
      throw new ApiError(400, 'INVALID_REQUEST', 'Telegram payment webhooks must use JSON');
    }
    const raw = await parseExternalJsonBody(request, 64 * 1024);
    const parsed = telegramUpdateSchema.safeParse(raw);
    if (!parsed.success) return jsonData({ accepted: true });

    const preCheckout = parsed.data.pre_checkout_query;
    if (preCheckout) {
      const payment = await resolveStarsPayment(
        preCheckout.invoice_payload, String(preCheckout.from.id), preCheckout.total_amount,
      );
      await answerTelegramPreCheckoutQuery(preCheckout.id, Boolean(payment));
      return jsonData({ accepted: true });
    }

    const successfulPayment = parsed.data.message?.successful_payment;
    const telegramUserId = parsed.data.message?.from?.id;
    if (successfulPayment && telegramUserId) {
      const payment = await resolveStarsPayment(
        successfulPayment.invoice_payload, String(telegramUserId), successfulPayment.total_amount, false,
      );
      if (payment) {
        await grantStarsPayment({
          payment,
          chargeId: successfulPayment.telegram_payment_charge_id,
          telegramUserId: String(telegramUserId),
          amountStars: successfulPayment.total_amount,
          rawWebhook: raw as Record<string, unknown>,
        });
      }
    }
    return jsonData({ accepted: true });
  });
}
