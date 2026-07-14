import 'server-only';

import { type Session, type User } from '@supabase/supabase-js';

import { UnauthorizedError } from '@/lib/errors/api-error';
import {
  clearPersistedSessionCookies,
  persistSessionCookies,
  readSessionCookies,
} from '@/lib/auth/session';
import { createSupabaseAuthClient } from '@/lib/supabase/auth';

export interface CurrentAuth {
  session?: Session;
  user: User;
}

export async function getCurrentAuth(): Promise<CurrentAuth> {
  const { accessToken, refreshToken } = await readSessionCookies();
  const authClient = createSupabaseAuthClient();

  if (accessToken) {
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (!error && data.user) {
      return { user: data.user };
    }
  }

  if (refreshToken) {
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (!error && data.session && data.user) {
      await persistSessionCookies(data.session);
      return { session: data.session, user: data.user };
    }
  }

  await clearPersistedSessionCookies();
  throw new UnauthorizedError();
}

export async function refreshCurrentSession(): Promise<CurrentAuth & { session: Session }> {
  const { refreshToken } = await readSessionCookies();
  if (!refreshToken) {
    throw new UnauthorizedError();
  }

  const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session || !data.user) {
    await clearPersistedSessionCookies();
    throw new UnauthorizedError('The session has expired');
  }

  await persistSessionCookies(data.session);
  return { session: data.session, user: data.user };
}
