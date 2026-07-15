import { type NextRequest } from 'next/server';

import { parseSocialUserId } from '@/features/social/schemas';
import { unfollowUser } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ targetUserId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { targetUserId } = await context.params;
    await enforceRateLimit(request, `follows:remove:${user.id}`, 60, 30);
    return jsonData(await unfollowUser(user.id, parseSocialUserId(targetUserId)));
  });
}
