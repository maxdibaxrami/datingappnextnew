import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const paymentProviderSchema = z.enum(['telegram_stars', 'ton']);

export const createGiftPaymentIntentSchema = z.object({
  giftId: z.uuid(),
  receiverUserId: z.uuid(),
  provider: paymentProviderSchema,
  idempotencyKey: z.uuid(),
  message: z.string().trim().min(1).max(500).optional(),
  isPublic: z.boolean().default(true),
}).strict();

export const tonPaymentConfirmationSchema = z.object({
  paymentId: z.uuid(),
  transactionHash: z.string().trim().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/).optional(),
  transactionBoc: z.string().trim().min(16).max(64 * 1024).regex(/^[A-Za-z0-9+/_=-]+$/).optional(),
}).strict().superRefine((value, context) => {
  if ((value.transactionHash ? 1 : 0) + (value.transactionBoc ? 1 : 0) !== 1) {
    context.addIssue({ code: 'custom', message: 'Provide exactly one TON transaction hash or BOC' });
  }
});

export type CreateGiftPaymentIntentInput = z.infer<typeof createGiftPaymentIntentSchema>;
export type TonPaymentConfirmationInput = z.infer<typeof tonPaymentConfirmationSchema>;

export function parseUuid(value: string, label: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(`${label} is invalid`);
  }
  return parsed.data;
}
