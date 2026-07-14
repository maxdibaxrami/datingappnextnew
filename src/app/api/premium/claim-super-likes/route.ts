import { type NextRequest } from 'next/server';

import { claimPremiumDailySuperLikes } from '@/features/premium/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `premium:claim-super-likes:${user.id}`, 60, 12);
    return jsonData(await claimPremiumDailySuperLikes(user.id));
  });
}
