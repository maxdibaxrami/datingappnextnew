import { type NextRequest } from 'next/server';

import { markAllNotificationsRead } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `notifications:read-all:${user.id}`, 60, 30);
    return jsonData(await markAllNotificationsRead(user.id));
  });
}
