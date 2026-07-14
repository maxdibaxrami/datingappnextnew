import { type NextRequest } from 'next/server';

import { tonPaymentConfirmationSchema } from '@/features/gifts/schemas';
import { confirmTonGiftPayment } from '@/features/gifts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `payments:ton:confirm:${user.id}`, 60, 10);
    return jsonData(await confirmTonGiftPayment(user.id, await parseJsonBody(request, tonPaymentConfirmationSchema, 96 * 1024)));
  });
}
