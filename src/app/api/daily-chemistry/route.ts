import { type NextRequest } from 'next/server';

import { getDailyChemistryCard } from '@/features/daily-chemistry/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'daily-chemistry:get:' + user.id, 60, 30);
    return jsonData(await getDailyChemistryCard(user.id));
  });
}
