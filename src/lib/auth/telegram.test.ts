import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyTelegramInitData } from './telegram';

const BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDE';
const NOW = 2_000_000_000;

function signInitData(
  user: Record<string, unknown>,
  authDate = NOW,
  extra: Record<string, string> = {},
): string {
  const values = new Map<string, string>([
    ['auth_date', String(authDate)],
    ['query_id', 'AAExampleQuery'],
    ['user', JSON.stringify(user)],
    ...Object.entries(extra),
  ]);
  const check = [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams([...values.entries(), ['hash', hash]]).toString();
}

const validUser = {
  id: 123456789,
  first_name: 'Mahdi',
  username: 'mahdi',
  language_code: 'en',
  is_premium: true,
};

describe('verifyTelegramInitData', () => {
  it('verifies and normalizes valid Telegram data', () => {
    const verified = verifyTelegramInitData(signInitData(validUser), {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    });
    expect(verified.user).toMatchObject({
      id: 123456789,
      firstName: 'Mahdi',
      username: 'mahdi',
      isPremium: true,
    });
  });

  it('rejects tampered signed data', () => {
    const initData = signInitData(validUser).replace('Mahdi', 'Other');
    expect(() => verifyTelegramInitData(initData, {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    })).toThrow('signature');
  });

  it('rejects expired data', () => {
    expect(() => verifyTelegramInitData(signInitData(validUser, NOW - 301), {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    })).toThrow('expired');
  });

  it('rejects duplicate fields', () => {
    const initData = signInitData(validUser) + '&auth_date=' + NOW;
    expect(() => verifyTelegramInitData(initData, {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    })).toThrow('duplicate');
  });

  it('rejects Telegram bot accounts', () => {
    expect(() => verifyTelegramInitData(signInitData({ ...validUser, is_bot: true }), {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    })).toThrow('bot accounts');
  });

  it('rejects ids outside the supported exact integer range', () => {
    expect(() => verifyTelegramInitData(signInitData({
      ...validUser,
      id: 4_503_599_627_370_496,
    }), {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 300,
      nowSeconds: NOW,
    })).toThrow('user id');
  });
});
