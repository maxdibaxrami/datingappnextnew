import { type NextRequest } from 'next/server';

import { swipeInputSchema } from '@/features/swipes/schemas';
import { recordSwipe } from '@/features/swipes/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin, parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'swipes:create:' + user.id, 60, 60);
    const input = await parseJsonBody(request, swipeInputSchema);
    return jsonData(await recordSwipe(user.id, input));
  });
}
