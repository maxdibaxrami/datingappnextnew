import { type NextRequest } from 'next/server';
import { getClosestCity } from '@/features/profile/geo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { ApiError } from '@/lib/errors/api-error';
import { z } from 'zod';

export const runtime = 'nodejs';

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
});

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    // Authenticate user
    await getCurrentAuth();
    
    const { latitude, longitude } = await parseJsonBody(request, locationSchema);
    
    const result = await getClosestCity(latitude, longitude);
    if (!result) {
      throw new ApiError(404, 'NOT_FOUND', 'Could not determine closest city');
    }
    
    return jsonData(result);
  });
}
