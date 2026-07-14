import { timingSafeEqual } from 'node:crypto';

import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { grantTelegramStarsGiftPayment, resolveTelegramStarsGiftPayment } from '@/features/gifts/service';
import { answerTelegramPreCheckoutQuery } from '@/features/gifts/telegram-stars';
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
      const payment = await resolveTelegramStarsGiftPayment(
        preCheckout.invoice_payload, String(preCheckout.from.id), preCheckout.total_amount,
      );
      await answerTelegramPreCheckoutQuery(preCheckout.id, Boolean(payment));
      return jsonData({ accepted: true });
    }

    const successfulPayment = parsed.data.message?.successful_payment;
    const telegramUserId = parsed.data.message?.from?.id;
    if (successfulPayment && telegramUserId) {
      const payment = await resolveTelegramStarsGiftPayment(
        successfulPayment.invoice_payload, String(telegramUserId), successfulPayment.total_amount, false,
      );
      if (payment) {
        await grantTelegramStarsGiftPayment({
          paymentId: payment.payment_id,
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
