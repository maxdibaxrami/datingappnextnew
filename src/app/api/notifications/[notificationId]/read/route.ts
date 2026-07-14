import { type NextRequest } from 'next/server';

import { parseNotificationId } from '@/features/messaging/schemas';
import { markNotificationRead } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ notificationId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { notificationId } = await context.params;
    await enforceRateLimit(request, `notifications:read:${user.id}`, 60, 120);
    return jsonData(await markNotificationRead(user.id, parseNotificationId(notificationId)));
  });
}
