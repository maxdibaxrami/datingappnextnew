import { type NextRequest } from 'next/server';

import { undoSwipeInputSchema } from '@/features/swipes/schemas';
import { undoSwipe } from '@/features/swipes/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin, parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'swipes:undo:' + user.id, 60, 20);
    const input = await parseJsonBody(request, undoSwipeInputSchema);
    return jsonData(await undoSwipe(user.id, input));
  });
}
