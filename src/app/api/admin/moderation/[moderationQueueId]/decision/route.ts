import { type NextRequest } from 'next/server';

import { decideModerationCaseSchema, parseUuid } from '@/features/moderation/schemas';
import { decideModerationCase } from '@/features/moderation/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ moderationQueueId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { moderationQueueId } = await context.params;
    await enforceRateLimit(request, `admin:moderation:decision:${user.id}`, 60, 30);
    return jsonData(await decideModerationCase(
      user.id,
      parseUuid(moderationQueueId, 'moderationQueueId'),
      await parseJsonBody(request, decideModerationCaseSchema),
    ));
  });
}
