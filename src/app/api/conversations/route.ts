import { type NextRequest } from 'next/server';

import { parseConversationQuery } from '@/features/messaging/schemas';
import { listConversations } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `conversations:list:${user.id}`, 60, 120);
    return jsonData(await listConversations(user.id, parseConversationQuery(request.nextUrl.searchParams)));
  });
}
