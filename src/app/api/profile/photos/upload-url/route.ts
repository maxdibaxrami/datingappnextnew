import { type NextRequest } from 'next/server';

import { requestPhotoUploadSchema } from '@/features/profile/photo-schemas';
import { createProfilePhotoUpload } from '@/features/profile/photo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, 'profile:photo-upload:' + user.id, 3_600, 30);
    const input = await parseJsonBody(request, requestPhotoUploadSchema);
    return jsonData(await createProfilePhotoUpload(user.id, input), 201);
  });
}
