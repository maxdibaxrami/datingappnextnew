import { type NextRequest } from 'next/server';

import { parseModerationQueueQuery } from '@/features/moderation/schemas';
import { listModerationQueue } from '@/features/moderation/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `admin:moderation:list:${user.id}`, 60, 120);
    return jsonData(await listModerationQueue(user.id, parseModerationQueueQuery(request.nextUrl.searchParams)));
  });
}
