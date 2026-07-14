import { type NextRequest } from 'next/server';

import { boostTonPaymentConfirmationSchema } from '@/features/boosts/schemas';
import { confirmTonBoostPayment } from '@/features/boosts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `boosts:ton:confirm:${user.id}`, 60, 10);
    return jsonData(await confirmTonBoostPayment(
      user.id,
      await parseJsonBody(request, boostTonPaymentConfirmationSchema, 96 * 1024),
    ));
  });
}
