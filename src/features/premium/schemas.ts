import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const paymentProviderSchema = z.enum(['telegram_stars', 'ton']);

export const createPremiumPaymentIntentSchema = z.object({
  planId: z.uuid(),
  provider: paymentProviderSchema,
  idempotencyKey: z.uuid(),
}).strict();

export const premiumTonPaymentConfirmationSchema = z.object({
  paymentId: z.uuid(),
  transactionHash: z.string().trim().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
  transactionBoc: z.string().trim().min(16).max(64 * 1024).regex(/^[A-Za-z0-9+/_=-]+$/).optional(),
}).strict().superRefine((value, context) => {
  if ((value.transactionHash ? 1 : 0) + (value.transactionBoc ? 1 : 0) !== 1) {
    context.addIssue({ code: 'custom', message: 'Provide exactly one TON transaction hash or BOC' });
  }
});

export function parseUuid(value: string, label: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError(`${label} is invalid`);
  return parsed.data;
}

export type CreatePremiumPaymentIntentInput = z.infer<typeof createPremiumPaymentIntentSchema>;
export type PremiumTonPaymentConfirmationInput = z.infer<typeof premiumTonPaymentConfirmationSchema>;
