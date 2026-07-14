import { type NextRequest } from 'next/server';

import { parseBoostQuery } from '@/features/boosts/schemas';
import { listBoosts } from '@/features/boosts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `boosts:list:${user.id}`, 60, 120);
    return jsonData(await listBoosts(user.id, parseBoostQuery(request.nextUrl.searchParams)));
  });
}
