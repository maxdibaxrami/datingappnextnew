import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const receiver = `0:${'0'.repeat(64)}`;
const sender = `0:${'1'.repeat(64)}`;
const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'p'.repeat(24),
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(24),
  TELEGRAM_BOT_TOKEN: 't'.repeat(24),
  TELEGRAM_AUTH_SECRET: 'a'.repeat(32),
  RATE_LIMIT_SECRET: 'r'.repeat(32),
  APP_ORIGINS: 'https://app.example.com',
  TON_PAYMENT_RECEIVER_ADDRESS: receiver,
  TON_PAYMENT_NETWORK: 'ton_mainnet',
  TONAPI_BASE_URL: 'https://tonapi.io',
  TONAPI_KEY: 'k'.repeat(16),
  NODE_ENV: 'test',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('TON adapter', () => {
  it('verifies the server receiver, exact comment, and nanoTON amount', async () => {
    Object.assign(process.env, env);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      hash: 'tx_0123456789abcdef',
      success: true,
      aborted: false,
      out_msgs: [{
        source: { address: sender },
        destination: { address: receiver },
        value: '2500000000',
        decoded_body: { comment: 'gft_0123456789abcdef0123456789abcdef' },
      }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const { verifyTonGiftTransaction } = await import('./ton');
    await expect(verifyTonGiftTransaction({
      transactionHash: 'tx_0123456789abcdef',
      invoicePayload: 'gft_0123456789abcdef0123456789abcdef',
      minimumAmountTon: '2.5',
    })).resolves.toMatchObject({
      hash: 'tx_0123456789abcdef',
      fromAddress: sender,
      toAddress: receiver,
      amountTon: '2.500000000',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://tonapi.io/v2/blockchain/transactions/tx_0123456789abcdef',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
