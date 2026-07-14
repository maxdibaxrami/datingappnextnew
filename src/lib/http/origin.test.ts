import { describe, expect, it } from 'vitest';

import { isAllowedOrigin } from './origin';

describe('isAllowedOrigin', () => {
  const allowed = ['https://dating.example.com', 'http://localhost:3000'];

  it('accepts absent and normalized allowed origins', () => {
    expect(isAllowedOrigin(null, allowed)).toBe(true);
    expect(isAllowedOrigin('https://dating.example.com/path', allowed)).toBe(true);
  });

  it('rejects malformed and untrusted origins', () => {
    expect(isAllowedOrigin('not-a-url', allowed)).toBe(false);
    expect(isAllowedOrigin('https://evil.example.com', allowed)).toBe(false);
  });
});
