import { createHmac, timingSafeEqual } from 'node:crypto';

import { ValidationError } from '@/lib/errors/api-error';

const MAX_INIT_DATA_LENGTH = 8 * 1024;
const MAX_TELEGRAM_USER_ID = 4_503_599_627_370_495;

export interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium: boolean;
  allowsWriteToPm: boolean;
  addedToAttachmentMenu: boolean;
  photoUrl?: string;
}

export interface VerifiedTelegramInitData {
  authDate: number;
  hash: string;
  queryId?: string;
  user: TelegramUser;
}

export interface TelegramVerificationOptions {
  botToken: string;
  maxAgeSeconds: number;
  nowSeconds?: number;
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ValidationError('Telegram ' + field + ' is invalid');
  }
  return value;
}

function parseTelegramUser(serializedUser: string): TelegramUser {
  let value: unknown;
  try {
    value = JSON.parse(serializedUser);
  } catch (error) {
    throw new ValidationError('Telegram user data is invalid', { cause: error });
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Telegram user data is invalid');
  }

  const user = value as Record<string, unknown>;
  if (
    typeof user.id !== 'number'
    || !Number.isSafeInteger(user.id)
    || user.id < 1
    || user.id > MAX_TELEGRAM_USER_ID
  ) {
    throw new ValidationError('Telegram user id is invalid');
  }
  if (user.is_bot === true) {
    throw new ValidationError('Telegram bot accounts cannot sign in');
  }

  const photoUrl = optionalString(user.photo_url, 'photo URL', 2048);
  if (photoUrl) {
    try {
      if (new URL(photoUrl).protocol !== 'https:') {
        throw new Error('not https');
      }
    } catch {
      throw new ValidationError('Telegram photo URL is invalid');
    }
  }

  return {
    id: user.id,
    firstName: optionalString(user.first_name, 'first name', 128),
    lastName: optionalString(user.last_name, 'last name', 128),
    username: optionalString(user.username, 'username', 64),
    languageCode: optionalString(user.language_code, 'language code', 35),
    isPremium: user.is_premium === true,
    allowsWriteToPm: user.allows_write_to_pm === true,
    addedToAttachmentMenu: user.added_to_attachment_menu === true,
    photoUrl,
  };
}

function parseUniqueParams(initData: string): Map<string, string> {
  if (initData.length === 0 || initData.length > MAX_INIT_DATA_LENGTH) {
    throw new ValidationError('Telegram initData is invalid');
  }

  const result = new Map<string, string>();
  for (const [key, value] of new URLSearchParams(initData)) {
    if (result.has(key)) {
      throw new ValidationError('Telegram initData contains duplicate fields');
    }
    result.set(key, value);
  }
  return result;
}

export function verifyTelegramInitData(
  initData: string,
  options: TelegramVerificationOptions,
): VerifiedTelegramInitData {
  const params = parseUniqueParams(initData);
  const suppliedHash = params.get('hash');
  const serializedUser = params.get('user');
  const authDateText = params.get('auth_date');

  if (!suppliedHash || !/^[a-f0-9]{64}$/i.test(suppliedHash) || !serializedUser || !authDateText) {
    throw new ValidationError('Telegram initData is missing required fields');
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + '=' + value)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(options.botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();
  const suppliedHashBytes = Buffer.from(suppliedHash, 'hex');

  if (
    suppliedHashBytes.length !== expectedHash.length
    || !timingSafeEqual(suppliedHashBytes, expectedHash)
  ) {
    throw new ValidationError('Telegram initData signature is invalid');
  }

  const authDate = Number(authDateText);
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isInteger(authDate) || authDate < 1) {
    throw new ValidationError('Telegram auth date is invalid');
  }
  if (authDate > nowSeconds + 30 || nowSeconds - authDate > options.maxAgeSeconds) {
    throw new ValidationError('Telegram initData has expired');
  }

  return {
    authDate,
    hash: suppliedHash.toLowerCase(),
    queryId: params.get('query_id') || undefined,
    user: parseTelegramUser(serializedUser),
  };
}
