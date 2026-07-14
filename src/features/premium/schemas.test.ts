import { describe, expect, it } from 'vitest';

import { createPremiumPaymentIntentSchema, premiumTonPaymentConfirmationSchema } from './schemas';

describe('premium schemas', () => {
  it('accepts a bounded premium purchase request', () => {
    expect(createPremiumPaymentIntentSchema.parse({
      planId: '00000000-0000-4000-8000-000000000001',
      provider: 'telegram_stars',
      idempotencyKey: '00000000-0000-4000-8000-000000000002',
    }).provider).toBe('telegram_stars');
  });

  it('requires exactly one TON transaction verifier', () => {
    expect(() => premiumTonPaymentConfirmationSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001',
    })).toThrow();
    expect(() => premiumTonPaymentConfirmationSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001',
      transactionHash: 'a'.repeat(16),
      transactionBoc: 'a'.repeat(16),
    })).toThrow();
  });
});
