import { describe, expect, it } from 'vitest';

import { tonToNano } from './ton-amount';

describe('TON amount conversion', () => {
  it('converts decimal TON amounts without floating-point rounding', () => {
    expect(tonToNano('1')).toBe('1000000000');
    expect(tonToNano('0.000000001')).toBe('1');
    expect(tonToNano('12.3456789')).toBe('12345678900');
  });

  it('rejects invalid or over-precise values', () => {
    expect(() => tonToNano('0.0000000001')).toThrow();
    expect(() => tonToNano('-1')).toThrow();
  });
});
