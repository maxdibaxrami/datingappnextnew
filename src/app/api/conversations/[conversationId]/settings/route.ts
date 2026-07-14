import { type NextRequest } from 'next/server';

import {
  conversationNotificationSettingsSchema,
  parseConversationId,
} from '@/features/messaging/schemas';
import { setConversationNotificationSettings } from '@/features/messaging/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ conversationId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const { conversationId } = await context.params;
    await enforceRateLimit(request, `conversations:settings:${user.id}`, 60, 60);
    return jsonData(await setConversationNotificationSettings(
      user.id,
      parseConversationId(conversationId),
      await parseJsonBody(request, conversationNotificationSettingsSchema),
    ));
  });
}
