import { type NextRequest } from 'next/server';

import { parseNotificationQuery } from '@/features/messaging/schemas';
import { listNotifications } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `notifications:list:${user.id}`, 60, 120);
    return jsonData(await listNotifications(user.id, parseNotificationQuery(request.nextUrl.searchParams)));
  });
}
