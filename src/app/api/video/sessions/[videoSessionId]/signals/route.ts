import { type NextRequest } from 'next/server';

import { listVideoSignals, sendVideoSignal } from '@/features/video/service';
import { parseSignalQuery, parseVideoSessionId, videoSignalSchema } from '@/features/video/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ videoSessionId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { videoSessionId } = await context.params;
    await enforceRateLimit(request, `video:signals:list:${user.id}`, 60, 240);
    return jsonData(await listVideoSignals(
      user.id,
      parseVideoSessionId(videoSessionId),
      parseSignalQuery(request.nextUrl.searchParams),
    ));
  });
}

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { videoSessionId } = await context.params;
    await enforceRateLimit(request, `video:signals:send:${user.id}`, 60, 240);
    return jsonData(await sendVideoSignal(
      user.id,
      parseVideoSessionId(videoSessionId),
      await parseJsonBody(request, videoSignalSchema, 52 * 1024),
    ));
  });
}
