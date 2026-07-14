import { describe, expect, it } from 'vitest';

import { swipeInputSchema, undoSwipeInputSchema } from './schemas';

const targetUserId = 'ba0f37f3-b76c-4dc3-926c-5979a6823652';
const idempotencyKey = '8200e10a-67f7-410c-9458-0b6072e0b204';

describe('swipe schemas', () => {
  it('defaults to the cards surface and accepts supported actions', () => {
    expect(swipeInputSchema.parse({
      actionType: 'like',
      idempotencyKey,
      targetUserId,
    })).toEqual({
      actionType: 'like',
      idempotencyKey,
      sourceSurface: 'cards',
      targetUserId,
    });
  });

  it('does not accept undo through the regular swipe endpoint', () => {
    expect(swipeInputSchema.safeParse({
      actionType: 'undo',
      idempotencyKey,
      targetUserId,
    }).success).toBe(false);
  });

  it('supports undoing the latest swipe or a specified target', () => {
    expect(undoSwipeInputSchema.parse({ idempotencyKey })).toEqual({ idempotencyKey });
    expect(undoSwipeInputSchema.parse({ idempotencyKey, targetUserId })).toEqual({
      idempotencyKey,
      targetUserId,
    });
  });
});
