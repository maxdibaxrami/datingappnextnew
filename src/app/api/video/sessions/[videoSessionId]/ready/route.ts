import { type NextRequest } from 'next/server';

import { markVideoSessionReady } from '@/features/video/service';
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
    await enforceRateLimit(request, `video:session:ready:${user.id}`, 60, 60);
    return jsonData(await markVideoSessionReady(user.id, parseVideoSessionId(videoSessionId)));
  });
}
