import { type NextRequest } from 'next/server';

import { getOwnProfile, updateOwnProfile } from '@/features/profile/service';
import { updateProfileSchema } from '@/features/profile/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { getAccountGate } from '@/lib/auth/guards';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET() {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const [account, profile] = await Promise.all([
      getAccountGate(user.id),
      getOwnProfile(user.id),
    ]);
    return jsonData({ account, ...profile });
  });
}

export async function PATCH(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'profile:update:' + user.id, 60, 30);
    const input = await parseJsonBody(request, updateProfileSchema);
    return jsonData(await updateOwnProfile(user.id, input));
  });
}
