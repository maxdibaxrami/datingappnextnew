import { type NextRequest } from 'next/server';

import { createPremiumBoostSchema } from '@/features/boosts/schemas';
import { createPremiumBoost } from '@/features/boosts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `boosts:premium:${user.id}`, 60, 12);
    return jsonData(await createPremiumBoost(
      user.id,
      await parseJsonBody(request, createPremiumBoostSchema),
    ));
  });
}
