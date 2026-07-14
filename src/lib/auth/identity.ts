import { createHmac } from 'node:crypto';

export interface DerivedTelegramIdentity {
  email: string;
  userId: string;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = Buffer.from(bytes).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export function deriveTelegramAuthIdentity(
  telegramUserId: string,
  secret: string,
): DerivedTelegramIdentity {
  const digest = createHmac('sha256', secret)
    .update('telegram-auth:' + telegramUserId)
    .digest();
  const uuidBytes = Uint8Array.from(digest.subarray(0, 16));
  uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x40;
  uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80;

  return {
    userId: formatUuid(uuidBytes),
    email: 'tg-' + digest.toString('hex').slice(0, 40) + '@telegram.invalid',
  };
}
