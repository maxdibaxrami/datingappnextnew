import 'server-only';

import { type NextRequest } from 'next/server';

import { ApiError, RateLimitError } from '@/lib/errors/api-error';
import { getPrivateRequestFingerprint } from '@/lib/http/request';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  windowSeconds: number,
  requestLimit: number,
): Promise<void> {
  const bucketKey = scope + ':' + getPrivateRequestFingerprint(request);
  const { data, error } = await getSupabaseAdmin().rpc('consume_api_rate_limit', {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
    p_request_limit: requestLimit,
  });

  if (error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Rate-limit state could not be checked');
  }
  if (!data) {
    throw new RateLimitError();
  }
}
