import 'server-only';

import { type Session } from '@supabase/supabase-js';

import { getAccountGate, type AccountGate } from '@/lib/auth/guards';
import { deriveTelegramAuthIdentity } from '@/lib/auth/identity';
import { readSessionCookies } from '@/lib/auth/session';
import { verifyTelegramInitData } from '@/lib/auth/telegram';
import { getServerEnv } from '@/lib/env';
import { ApiError } from '@/lib/errors/api-error';
import { createSupabaseAuthClient } from '@/lib/supabase/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

import { type TelegramLoginInput } from './schemas';

export interface TelegramLoginResult {
  account: AccountGate;
  created: boolean;
  session: Session;
}

async function ensureAuthUser(
  userId: string,
  email: string,
  telegramUserId: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.createUser({
    id: userId,
    email,
    email_confirm: true,
    app_metadata: {
      provider: 'telegram',
      telegram_user_id: telegramUserId,
    },
  });
  if (!error) {
    return;
  }

  // A concurrent first login can win the deterministic Auth insert. Confirm
  // that the expected user exists instead of treating that race as a failure.
  const existing = await admin.auth.admin.getUserById(userId);
  if (
    existing.error
    || !existing.data.user
    || existing.data.user.email?.toLowerCase() !== email.toLowerCase()
  ) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The authentication account could not be created');
  }
}

async function createSession(userId: string): Promise<Session> {
  const admin = getSupabaseAdmin();
  const authUser = await admin.auth.admin.getUserById(userId);
  const email = authUser.data.user?.email;
  if (authUser.error || !email) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The authentication account is unavailable');
  }

  const link = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'A secure session could not be started');
  }

  const verified = await createSupabaseAuthClient().auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  });
  if (verified.error || !verified.data.session) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'A secure session could not be verified');
  }
  return verified.data.session;
}

export async function loginWithTelegram(
  input: TelegramLoginInput,
): Promise<TelegramLoginResult> {
  const env = getServerEnv();
  const telegram = verifyTelegramInitData(input.initData, {
    botToken: env.TELEGRAM_BOT_TOKEN,
    maxAgeSeconds: env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
  });
  const telegramUserId = String(telegram.user.id);
  const identity = deriveTelegramAuthIdentity(telegramUserId, env.TELEGRAM_AUTH_SECRET);
  const admin = getSupabaseAdmin();

  const lookup = await admin.rpc('find_user_id_by_telegram_id', {
    p_telegram_user_id: telegramUserId,
  });
  if (lookup.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The Telegram identity could not be checked');
  }

  const existingUserId = lookup.data || null;
  const candidateUserId = existingUserId ?? identity.userId;
  if (!existingUserId) {
    await ensureAuthUser(candidateUserId, identity.email, telegramUserId);
  }

  const provisioned = await admin.rpc('provision_telegram_user', {
    p_user_id: candidateUserId,
    p_telegram_user_id: telegramUserId,
    p_telegram_username: telegram.user.username,
    p_first_name: telegram.user.firstName,
    p_last_name: telegram.user.lastName,
    p_photo_url: telegram.user.photoUrl,
    p_language_code: telegram.user.languageCode,
    p_is_telegram_premium: telegram.user.isPremium,
    p_allows_write_to_pm: telegram.user.allowsWriteToPm,
    p_added_to_attachment_menu: telegram.user.addedToAttachmentMenu,
    p_init_data_hash: telegram.hash,
  });
  const provisionedUserId = provisioned.data;
  if (provisioned.error || !provisionedUserId) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The application account could not be provisioned');
  }

  return {
    account: await getAccountGate(provisionedUserId),
    created: !existingUserId,
    session: await createSession(provisionedUserId),
  };
}

export async function revokeCurrentSession(): Promise<void> {
  const { accessToken, refreshToken } = await readSessionCookies();
  if (!accessToken || !refreshToken) {
    return;
  }

  const client = createSupabaseAuthClient();
  const established = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (!established.error) {
    await client.auth.signOut({ scope: 'local' });
  }
}
