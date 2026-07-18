import { type NextRequest } from 'next/server';
import { getActiveCountries } from '@/features/profile/geo-service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    // Authenticate the request
    await getCurrentAuth();
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || undefined;
    
    const countries = await getActiveCountries(query);
    return jsonData({ countries });
  });
}
