import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const paymentProviderSchema = z.enum(['telegram_stars', 'ton']);

const boundedInteger = (minimum: number, maximum: number) => z.string().trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

export const createBoostPaymentIntentSchema = z.object({
  boostProductId: z.uuid(),
  provider: paymentProviderSchema,
  idempotencyKey: z.uuid(),
}).strict();

export const createPremiumBoostSchema = z.object({
  durationMinutes: z.number().int().min(5).max(240),
}).strict();

export const boostTonPaymentConfirmationSchema = z.object({
  paymentId: z.uuid(),
  transactionHash: z.string().trim().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
  transactionBoc: z.string().trim().min(16).max(64 * 1024).regex(/^[A-Za-z0-9+/_=-]+$/).optional(),
}).strict().superRefine((value, context) => {
  if ((value.transactionHash ? 1 : 0) + (value.transactionBoc ? 1 : 0) !== 1) {
    context.addIssue({ code: 'custom', message: 'Provide exactly one TON transaction hash or BOC' });
  }
});

const boostQuerySchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: boundedInteger(1, 100).default(20),
}).strict();

function scalar(searchParams: URLSearchParams, key: string, message: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) throw new ValidationError(message);
  return values[0] ?? undefined;
}

export function parseBoostQuery(searchParams: URLSearchParams) {
  for (const key of searchParams.keys()) {
    if (key !== 'cursor' && key !== 'limit') {
      throw new ValidationError('An unsupported boost filter was provided');
    }
  }
  const parsed = boostQuerySchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Boost cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Boost limit cannot be repeated'),
  });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid boost filters');
  return parsed.data;
}

export function parseBoostId(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError('Boost ID is invalid');
  return parsed.data;
}

export type CreateBoostPaymentIntentInput = z.infer<typeof createBoostPaymentIntentSchema>;
export type CreatePremiumBoostInput = z.infer<typeof createPremiumBoostSchema>;
export type BoostTonPaymentConfirmationInput = z.infer<typeof boostTonPaymentConfirmationSchema>;
export type BoostQuery = z.infer<typeof boostQuerySchema>;
