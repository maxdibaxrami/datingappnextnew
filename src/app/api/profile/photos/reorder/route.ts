import { type NextRequest } from 'next/server';

import { reorderPhotosSchema } from '@/features/profile/photo-schemas';
import { reorderProfilePhotos } from '@/features/profile/photo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const input = await parseJsonBody(request, reorderPhotosSchema);
    return jsonData(await reorderProfilePhotos(user.id, input));
  });
}
