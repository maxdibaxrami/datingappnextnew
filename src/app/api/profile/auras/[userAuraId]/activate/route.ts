import { type NextRequest } from 'next/server';

import { parseUuid } from '@/features/gifts/schemas';
import { activateProfileAura } from '@/features/gifts/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
type Context = { params: Promise<{ userAuraId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const { userAuraId } = await context.params;
    await enforceRateLimit(request, `profile:auras:activate:${user.id}`, 60, 20);
    return jsonData(await activateProfileAura(user.id, parseUuid(userAuraId, 'Profile aura ID')));
  });
}
