import { type NextRequest } from 'next/server';

import { revokeCurrentSession } from '@/features/auth/service';
import { clearSessionCookies } from '@/lib/auth/session';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    await revokeCurrentSession();
    const response = jsonData({ loggedOut: true });
    clearSessionCookies(response);
    return response;
  });
}
