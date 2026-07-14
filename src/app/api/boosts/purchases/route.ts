import { type NextRequest } from 'next/server';

import { createBoostPaymentIntentSchema } from '@/features/boosts/schemas';
import { createBoostPaymentIntent } from '@/features/boosts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `boosts:purchase:${user.id}`, 60, 12);
    return jsonData(await createBoostPaymentIntent(
      user.id,
      await parseJsonBody(request, createBoostPaymentIntentSchema),
    ));
  });
}
