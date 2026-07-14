import { type NextRequest } from 'next/server';

import { parseUuid } from '@/features/moderation/schemas';
import { removeBlock } from '@/features/moderation/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ blockedUserId: string }>;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { blockedUserId } = await context.params;
    await enforceRateLimit(request, `blocks:remove:${user.id}`, 60, 20);
    return jsonData(await removeBlock(user.id, parseUuid(blockedUserId, 'blockedUserId')));
  });
}
