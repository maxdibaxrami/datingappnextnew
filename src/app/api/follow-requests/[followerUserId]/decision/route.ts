import { type NextRequest } from 'next/server';

import { followDecisionSchema, parseSocialUserId } from '@/features/social/schemas';
import { decideFollowRequest } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ followerUserId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { followerUserId } = await context.params;
    await enforceRateLimit(request, `follows:requests:decide:${user.id}`, 60, 30);
    return jsonData(await decideFollowRequest(
      user.id,
      parseSocialUserId(followerUserId, 'Follower user ID'),
      await parseJsonBody(request, followDecisionSchema),
    ));
  });
}
