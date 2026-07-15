import { type NextRequest } from 'next/server';

import { endVideoSession } from '@/features/video/service';
import { endVideoSessionSchema, parseVideoSessionId } from '@/features/video/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ videoSessionId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { videoSessionId } = await context.params;
    await enforceRateLimit(request, `video:session:end:${user.id}`, 60, 60);
    return jsonData(await endVideoSession(
      user.id,
      parseVideoSessionId(videoSessionId),
      await parseJsonBody(request, endVideoSessionSchema),
    ));
  });
}
