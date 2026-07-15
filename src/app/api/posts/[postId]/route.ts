import { type NextRequest } from 'next/server';

import { parseSocialPostId } from '@/features/social/schemas';
import { deleteOwnSocialPost } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ postId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { postId } = await context.params;
    await enforceRateLimit(request, `posts:delete:${user.id}`, 60, 20);
    return jsonData(await deleteOwnSocialPost(user.id, parseSocialPostId(postId)));
  });
}
