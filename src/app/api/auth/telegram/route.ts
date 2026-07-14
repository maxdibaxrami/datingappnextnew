import { type NextRequest } from 'next/server';

import { loginWithTelegram } from '@/features/auth/service';
import { telegramLoginSchema } from '@/features/auth/schemas';
import { setSessionCookies } from '@/lib/auth/session';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    await enforceRateLimit(request, 'auth:telegram', 60, 20);
    const input = await parseJsonBody(request, telegramLoginSchema, 12 * 1024);
    const result = await loginWithTelegram(input);
    const response = jsonData({
      account: result.account,
      created: result.created,
      profileRequired: !result.account.profileCompletedAt,
    }, result.created ? 201 : 200);
    setSessionCookies(response, result.session);
    return response;
  });
}
