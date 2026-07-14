import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

import { decodeOpaqueCursor, encodeOpaqueCursor } from './cursor';

const schema = z.object({
  id: z.uuid(),
  sortAt: z.iso.datetime({ offset: true }),
  version: z.literal(1),
}).strict();

describe('opaque cursor', () => {
  it('round-trips a valid payload', () => {
    const payload = {
      id: 'ba0f37f3-b76c-4dc3-926c-5979a6823652',
      sortAt: '2026-07-14T18:00:00.000Z',
      version: 1 as const,
    };

    expect(decodeOpaqueCursor(encodeOpaqueCursor(payload), schema)).toEqual(payload);
  });

  it.each(['', 'not+base64', 'e30', 'a'.repeat(769)])(
    'rejects an invalid cursor',
    (cursor) => {
      expect(() => decodeOpaqueCursor(cursor, schema)).toThrow(ValidationError);
    },
  );
});
