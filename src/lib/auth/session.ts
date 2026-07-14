import 'server-only';

import { type Session } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { type NextResponse } from 'next/server';

export const SESSION_COOKIES = {
  access: '__Host-dating-access',
  refresh: '__Host-dating-refresh',
} as const;

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax' as const,
    // __Host- cookies require Secure in every environment. Modern browsers
    // treat localhost as a secure context; use HTTPS for device/LAN testing.
    secure: true,
  };
}

export function setSessionCookies(response: NextResponse, session: Session): void {
  response.cookies.set(
    SESSION_COOKIES.access,
    session.access_token,
    cookieOptions(Math.max(60, session.expires_in)),
  );
  response.cookies.set(
    SESSION_COOKIES.refresh,
    session.refresh_token,
    cookieOptions(REFRESH_COOKIE_MAX_AGE),
  );
}

export async function persistSessionCookies(session: Session): Promise<void> {
  const store = await cookies();
  store.set(
    SESSION_COOKIES.access,
    session.access_token,
    cookieOptions(Math.max(60, session.expires_in)),
  );
  store.set(
    SESSION_COOKIES.refresh,
    session.refresh_token,
    cookieOptions(REFRESH_COOKIE_MAX_AGE),
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIES.access, '', cookieOptions(0));
  response.cookies.set(SESSION_COOKIES.refresh, '', cookieOptions(0));
}

export async function clearPersistedSessionCookies(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIES.access, '', cookieOptions(0));
  store.set(SESSION_COOKIES.refresh, '', cookieOptions(0));
}

export async function readSessionCookies(): Promise<{
  accessToken?: string;
  refreshToken?: string;
}> {
  const store = await cookies();
  return {
    accessToken: store.get(SESSION_COOKIES.access)?.value,
    refreshToken: store.get(SESSION_COOKIES.refresh)?.value,
  };
}
