import { type NextRequest } from 'next/server';

import { premiumTonPaymentConfirmationSchema } from '@/features/premium/schemas';
import { confirmTonPremiumPayment } from '@/features/premium/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `premium:ton:confirm:${user.id}`, 60, 10);
    return jsonData(await confirmTonPremiumPayment(
      user.id,
      await parseJsonBody(request, premiumTonPaymentConfirmationSchema, 96 * 1024),
    ));
  });
}
