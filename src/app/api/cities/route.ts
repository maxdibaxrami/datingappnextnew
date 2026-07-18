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
    
    if (!countryCode) {
      throw new ApiError(400, 'INVALID_REQUEST', 'Missing countryCode parameter');
    }
    
    const cities = await getCitiesOfCountry(countryCode, query);
    return jsonData({ cities });
  });
}
