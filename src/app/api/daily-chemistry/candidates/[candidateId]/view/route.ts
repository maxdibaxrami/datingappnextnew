import { type NextRequest } from 'next/server';

import { parseDailyChemistryCandidateId } from '@/features/daily-chemistry/schemas';
import { markDailyChemistryCandidateViewed } from '@/features/daily-chemistry/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ candidateId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'daily-chemistry:view:' + user.id, 60, 120);
    const candidateId = parseDailyChemistryCandidateId(
      (await context.params).candidateId,
    );
    return jsonData(await markDailyChemistryCandidateViewed(user.id, candidateId));
  });
}
