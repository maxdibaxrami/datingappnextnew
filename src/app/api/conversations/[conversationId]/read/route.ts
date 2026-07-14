import { type NextRequest } from 'next/server';

import { markConversationReadSchema, parseConversationId } from '@/features/messaging/schemas';
import { markConversationRead } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { conversationId } = await context.params;
    await enforceRateLimit(request, `conversations:read:${user.id}`, 60, 180);
    return jsonData(await markConversationRead(
      user.id,
      parseConversationId(conversationId),
      await parseJsonBody(request, markConversationReadSchema),
    ));
  });
}
