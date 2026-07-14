import { describe, expect, it } from 'vitest';

import { createBoostPaymentIntentSchema, createPremiumBoostSchema, parseBoostQuery } from './schemas';

describe('boost schemas', () => {
  it('accepts a bound, idempotent boost purchase', () => {
    expect(createBoostPaymentIntentSchema.parse({
      boostProductId: '00000000-0000-4000-8000-000000000001',
      provider: 'telegram_stars',
      idempotencyKey: '00000000-0000-4000-8000-000000000002',
    }).provider).toBe('telegram_stars');
  });

  it('bounds premium-boost duration and pagination', () => {
    expect(createPremiumBoostSchema.parse({ durationMinutes: 30 }).durationMinutes).toBe(30);
    expect(() => createPremiumBoostSchema.parse({ durationMinutes: 4 })).toThrow();
    expect(parseBoostQuery(new URLSearchParams('limit=10'))).toEqual({ limit: 10 });
  });
});
