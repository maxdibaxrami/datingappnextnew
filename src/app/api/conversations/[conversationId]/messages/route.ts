import { type NextRequest } from 'next/server';

import {
  parseConversationId,
  parseMessageQuery,
  sendConversationMessageSchema,
} from '@/features/messaging/schemas';
import { listConversationMessages, sendConversationMessage } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { conversationId } = await context.params;
    await enforceRateLimit(request, `conversations:messages:list:${user.id}`, 60, 240);
    return jsonData(await listConversationMessages(
      user.id,
      parseConversationId(conversationId),
      parseMessageQuery(request.nextUrl.searchParams),
    ));
  });
}

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { conversationId } = await context.params;
    await enforceRateLimit(request, `conversations:messages:send:${user.id}`, 60, 30);
    return jsonData(await sendConversationMessage(
      user.id,
      parseConversationId(conversationId),
      await parseJsonBody(request, sendConversationMessageSchema, 12 * 1024),
    ));
  });
}
