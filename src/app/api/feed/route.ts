import { type NextRequest } from 'next/server';

import { parseFeedQuery } from '@/features/social/schemas';
import { getSocialFeed } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `feed:list:${user.id}`, 60, 180);
    return jsonData(await getSocialFeed(user.id, parseFeedQuery(request.nextUrl.searchParams)));
  });
}
