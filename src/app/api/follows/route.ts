import { type NextRequest } from 'next/server';

import { followUserSchema, parseFollowListQuery } from '@/features/social/schemas';
import { followUser, listFollowRelationships } from '@/features/social/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `follows:list:${user.id}`, 60, 120);
    return jsonData(await listFollowRelationships(user.id, parseFollowListQuery(request.nextUrl.searchParams)));
  });
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `follows:create:${user.id}`, 60, 30);
    return jsonData(await followUser(user.id, await parseJsonBody(request, followUserSchema)), 201);
  });
}
