import { describe, expect, it } from 'vitest';

import {
  endVideoSessionSchema,
  joinVideoQueueSchema,
  parseSignalQuery,
  videoSignalSchema,
} from './schemas';

describe('video schemas', () => {
  it('accepts one bounded random-video queue mode', () => {
    expect(joinVideoQueueSchema.parse({ mode: 'same_interest' }).mode).toBe('same_interest');
    expect(() => joinVideoQueueSchema.parse({ mode: 'all' })).toThrow();
  });

  it('requires an idempotent object signal and a safe end reason', () => {
    expect(videoSignalSchema.parse({
      clientSignalId: '00000000-0000-4000-8000-000000000001',
      payload: { candidate: 'candidate-value' },
      type: 'ice_candidate',
    }).type).toBe('ice_candidate');
    expect(() => videoSignalSchema.parse({
      clientSignalId: '00000000-0000-4000-8000-000000000001',
      payload: [],
      type: 'offer',
    })).toThrow();
    expect(endVideoSessionSchema.parse({ reason: 'skipped' }).reason).toBe('skipped');
  });

  it('bounds signal pagination', () => {
    expect(parseSignalQuery(new URLSearchParams('limit=20'))).toEqual({ limit: 20 });
    expect(() => parseSignalQuery(new URLSearchParams('unknown=value'))).toThrow();
  });
});
