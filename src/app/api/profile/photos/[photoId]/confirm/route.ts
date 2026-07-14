import { type NextRequest } from 'next/server';

import { confirmPhotoSchema, parsePhotoId } from '@/features/profile/photo-schemas';
import { confirmProfilePhoto } from '@/features/profile/photo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ photoId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'profile:photo-confirm:' + user.id, 60, 30);
    const input = await parseJsonBody(request, confirmPhotoSchema);
    const photoId = parsePhotoId((await context.params).photoId);
    return jsonData(await confirmProfilePhoto(user.id, photoId, input));
  });
}
