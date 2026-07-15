import { type NextRequest } from 'next/server';

import { heartbeatVideoSession } from '@/features/video/service';
import { parseVideoSessionId } from '@/features/video/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ videoSessionId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { videoSessionId } = await context.params;
    await enforceRateLimit(request, `video:session:heartbeat:${user.id}`, 60, 120);
    return jsonData(await heartbeatVideoSession(user.id, parseVideoSessionId(videoSessionId)));
  });
}
