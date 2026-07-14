import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors/api-error';

import { parseMatchQuery } from './schemas';

describe('match query', () => {
  it('uses a bounded default page size', () => {
    expect(parseMatchQuery(new URLSearchParams()).limit).toBe(20);
    expect(parseMatchQuery(new URLSearchParams({ limit: '50' })).limit).toBe(50);
  });

  it.each(['0', '51', '1.5', 'many'])('rejects invalid page size %s', (limit) => {
    expect(() => parseMatchQuery(new URLSearchParams({ limit }))).toThrow(ValidationError);
  });

  it('rejects unsupported or repeated pagination values', () => {
    expect(() => parseMatchQuery(new URLSearchParams({ status: 'active' })))
      .toThrow(ValidationError);
    expect(() => parseMatchQuery(new URLSearchParams([
      ['cursor', 'one'],
      ['cursor', 'two'],
    ]))).toThrow(ValidationError);
  });
});
