import { type NextRequest } from 'next/server';

import { parseSocialPostId } from '@/features/social/schemas';
import { setSocialPostLike } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ postId: string }> };

async function updateLike(request: NextRequest, context: Context, liked: boolean) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { postId } = await context.params;
    await enforceRateLimit(request, `posts:like:${user.id}`, 60, 90);
    return jsonData(await setSocialPostLike(user.id, parseSocialPostId(postId), liked));
  });
}

export async function POST(request: NextRequest, context: Context) {
  return updateLike(request, context, true);
}

export async function DELETE(request: NextRequest, context: Context) {
  return updateLike(request, context, false);
}
