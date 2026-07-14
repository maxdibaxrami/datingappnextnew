import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'p'.repeat(24),
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(24),
  TELEGRAM_BOT_TOKEN: 't'.repeat(24),
  TELEGRAM_AUTH_SECRET: 'a'.repeat(32),
  RATE_LIMIT_SECRET: 'r'.repeat(32),
  APP_ORIGINS: 'https://app.example.com',
  NODE_ENV: 'test',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('Telegram Stars adapter', () => {
  it('creates a one-price XTR invoice with the empty Stars provider token', async () => {
    Object.assign(process.env, env);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      result: 'https://t.me/invoice',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const { createTelegramStarsInvoiceLink } = await import('./telegram-stars');
    await expect(createTelegramStarsInvoiceLink({
      title: 'Sparkle rose',
      description: 'A virtual gift',
      invoicePayload: 'gft_0123456789abcdef0123456789abcdef',
      amountStars: 25,
    })).resolves.toBe('https://t.me/invoice');

    const [, options] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      provider_token: '',
      currency: 'XTR',
      payload: 'gft_0123456789abcdef0123456789abcdef',
    });
    expect(body.prices).toEqual([{ label: 'Sparkle rose', amount: 25 }]);
  });
});
