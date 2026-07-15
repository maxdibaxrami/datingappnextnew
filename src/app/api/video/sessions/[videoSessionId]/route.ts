import { type NextRequest } from 'next/server';

import { getVideoSession } from '@/features/video/service';
import { parseVideoSessionId } from '@/features/video/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ videoSessionId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { videoSessionId } = await context.params;
    await enforceRateLimit(request, `video:session:get:${user.id}`, 60, 180);
    return jsonData(await getVideoSession(user.id, parseVideoSessionId(videoSessionId)));
  });
}
