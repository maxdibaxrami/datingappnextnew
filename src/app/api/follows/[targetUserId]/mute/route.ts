import { type NextRequest } from 'next/server';

import { parseSocialUserId, setFollowMutedSchema } from '@/features/social/schemas';
import { setFollowMuted } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ targetUserId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { targetUserId } = await context.params;
    await enforceRateLimit(request, `follows:mute:${user.id}`, 60, 60);
    return jsonData(await setFollowMuted(
      user.id,
      parseSocialUserId(targetUserId),
      await parseJsonBody(request, setFollowMutedSchema),
    ));
  });
}
