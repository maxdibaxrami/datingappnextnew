import { type NextRequest } from 'next/server';

import { listPremiumPlans } from '@/features/premium/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `premium:plans:${user.id}`, 60, 60);
    return jsonData(await listPremiumPlans(user.id));
  });
}
