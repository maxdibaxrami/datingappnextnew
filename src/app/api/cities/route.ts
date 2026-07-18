import { type NextRequest } from 'next/server';
import { getCitiesOfCountry } from '@/features/profile/geo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { ApiError } from '@/lib/errors/api-error';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    // Authenticate user
    await getCurrentAuth();
    
    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('countryCode');
    const query = searchParams.get('q') || undefined;
    const limitParam = Number(searchParams.get('limit') ?? '500');
    const offsetParam = Number(searchParams.get('offset') ?? '0');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.floor(limitParam), 1), 1_000) : 500;
    const offset = Number.isFinite(offsetParam) ? Math.max(Math.floor(offsetParam), 0) : 0;
    
    if (!countryCode) {
      throw new ApiError(400, 'INVALID_REQUEST', 'Missing countryCode parameter');
    }
    
    const cities = await getCitiesOfCountry(countryCode, query, { limit, offset });
    return jsonData({
      cities,
      pagination: {
        limit,
        offset,
        nextOffset: cities.length === limit ? offset + limit : null,
      },
    });
  });
}
