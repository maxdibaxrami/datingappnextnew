import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/lib/errors/api-error';

import { parseDiscoveryQuery } from './schemas';

describe('discovery query', () => {
  it('normalizes filters and applies a bounded default limit', () => {
    const params = new URLSearchParams([
      ['countryCode', 'nl'],
      ['gender', 'woman,non_binary'],
      ['gender', 'woman'],
      ['language', 'English'],
      ['interest', 'coffee'],
    ]);

    expect(parseDiscoveryQuery(params)).toEqual({
      countryCode: 'NL',
      genders: ['woman', 'non_binary'],
      interests: ['coffee'],
      languages: ['English'],
      limit: 20,
      relationshipGoals: [],
    });
  });

  it('rejects reversed ages and overly precise public location', () => {
    expect(() => parseDiscoveryQuery(new URLSearchParams({
      maxAge: '25',
      minAge: '30',
    }))).toThrow(ValidationError);

    expect(() => parseDiscoveryQuery(new URLSearchParams({
      geohashPrefix: 'u173zq',
    }))).toThrow(ValidationError);
  });

  it('rejects unknown gender values and excessive page sizes', () => {
    expect(() => parseDiscoveryQuery(new URLSearchParams({
      gender: 'unknown',
    }))).toThrow(ValidationError);

    expect(() => parseDiscoveryQuery(new URLSearchParams({
      limit: '51',
    }))).toThrow(ValidationError);
  });

  it('rejects unsupported filters and repeated scalar filters', () => {
    expect(() => parseDiscoveryQuery(new URLSearchParams({
      exactLatitude: '52.3676',
    }))).toThrow(ValidationError);

    expect(() => parseDiscoveryQuery(new URLSearchParams([
      ['limit', '10'],
      ['limit', '20'],
    ]))).toThrow(ValidationError);
  });
});
