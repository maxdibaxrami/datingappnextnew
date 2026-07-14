import { type NextRequest } from 'next/server';

import { createGiftPaymentIntentSchema } from '@/features/gifts/schemas';
import { createGiftPaymentIntent, listGiftCatalog } from '@/features/gifts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `gifts:catalog:${user.id}`, 60, 60);
    return jsonData(await listGiftCatalog(user.id));
  });
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `gifts:intent:${user.id}`, 60, 12);
    return jsonData(await createGiftPaymentIntent(user.id, await parseJsonBody(request, createGiftPaymentIntentSchema)));
  });
}
