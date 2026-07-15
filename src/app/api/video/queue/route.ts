import { type NextRequest } from 'next/server';

import { cancelVideoQueue, getVideoQueueState, joinVideoQueue } from '@/features/video/service';
import { joinVideoQueueSchema } from '@/features/video/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin, parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `video:queue:state:${user.id}`, 60, 120);
    return jsonData(await getVideoQueueState(user.id));
  });
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `video:queue:join:${user.id}`, 60, 30);
    return jsonData(await joinVideoQueue(user.id, await parseJsonBody(request, joinVideoQueueSchema)));
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `video:queue:cancel:${user.id}`, 60, 60);
    return jsonData(await cancelVideoQueue(user.id));
  });
}
