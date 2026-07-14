import { describe, expect, it } from 'vitest';

import { createGiftPaymentIntentSchema, tonPaymentConfirmationSchema } from './schemas';

describe('gift payment schemas', () => {
  it('accepts a bounded, idempotent Stars gift request', () => {
    const parsed = createGiftPaymentIntentSchema.parse({
      giftId: '00000000-0000-4000-8000-000000000001',
      receiverUserId: '00000000-0000-4000-8000-000000000002',
      provider: 'telegram_stars',
      idempotencyKey: '00000000-0000-4000-8000-000000000003',
      message: '  Enjoy!  ',
    });
    expect(parsed.message).toBe('Enjoy!');
    expect(parsed.isPublic).toBe(true);
  });

  it('rejects a client-supplied sender and malformed TON hash', () => {
    expect(() => createGiftPaymentIntentSchema.parse({
      giftId: '00000000-0000-4000-8000-000000000001',
      receiverUserId: '00000000-0000-4000-8000-000000000002',
      provider: 'ton',
      idempotencyKey: '00000000-0000-4000-8000-000000000003',
      senderUserId: '00000000-0000-4000-8000-000000000004',
    })).toThrow();
    expect(() => tonPaymentConfirmationSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001', transactionHash: 'not a transaction hash',
    })).toThrow();
    expect(() => tonPaymentConfirmationSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001',
    })).toThrow();
    expect(() => tonPaymentConfirmationSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001',
      transactionHash: 'abcdefghijklmnoq', network: 'ton_testnet',
    })).toThrow();
  });
});
