import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors/api-error';

import { parseDailyChemistryCandidateId } from './schemas';

describe('Daily Chemistry schemas', () => {
  it('accepts a canonical candidate UUID', () => {
    const candidateId = 'f29da7cb-57a7-4de8-8f99-00ad2db88a9c';
    expect(parseDailyChemistryCandidateId(candidateId)).toBe(candidateId);
  });

  it('rejects malformed candidate identifiers', () => {
    expect(() => parseDailyChemistryCandidateId('candidate-1'))
      .toThrow(ValidationError);
  });
});
