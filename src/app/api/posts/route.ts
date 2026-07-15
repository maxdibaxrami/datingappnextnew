import { type NextRequest } from 'next/server';

import { createSocialPostSchema } from '@/features/social/schemas';
import { createSocialPost } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `posts:create:${user.id}`, 60, 12);
    return jsonData(await createSocialPost(
      user.id,
      await parseJsonBody(request, createSocialPostSchema, 12 * 1024),
    ), 201);
  });
}
