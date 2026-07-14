import { type NextRequest } from 'next/server';

import { parseMatchQuery } from '@/features/matches/schemas';
import { listMatches } from '@/features/matches/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'matches:list:' + user.id, 60, 120);
    const query = parseMatchQuery(request.nextUrl.searchParams);
    return jsonData(await listMatches(user.id, query));
  });
}
