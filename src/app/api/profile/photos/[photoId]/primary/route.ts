import { type NextRequest } from 'next/server';

import { parsePhotoId } from '@/features/profile/photo-schemas';
import { setPrimaryProfilePhoto } from '@/features/profile/photo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ photoId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRequest(async () => {
    assertAllowedOrigin(request);
    const { user } = await getCurrentAuth();
    const photoId = parsePhotoId((await context.params).photoId);
    return jsonData(await setPrimaryProfilePhoto(user.id, photoId));
  });
}
