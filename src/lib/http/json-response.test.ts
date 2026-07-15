import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/errors/api-error';

import { handleApiRequest, jsonData } from './json-response';

describe('JSON API responses', () => {
  it('makes data responses private, non-cacheable, and traceable', async () => {
    const response = await handleApiRequest(async () => jsonData({ ok: true }));

    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
  });

  it('uses the same response protections for handled API errors', async () => {
    const response = await handleApiRequest(async () => {
      throw new ApiError(409, 'CONFLICT', 'The request conflicts with the current state');
    });

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(response.json()).resolves.toEqual({
      error: { code: 'CONFLICT', message: 'The request conflicts with the current state' },
    });
  });
});
