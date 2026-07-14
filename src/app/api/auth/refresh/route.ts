import { type NextRequest } from 'next/server';

import { refreshCurrentSession } from '@/lib/auth/current-user';
import { getAccountGate } from '@/lib/auth/guards';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    await enforceRateLimit(request, 'auth:refresh', 60, 30);
    const { user } = await refreshCurrentSession();
    const account = await getAccountGate(user.id);
    return jsonData({ account, profileRequired: !account.profileCompletedAt });
  });
}
