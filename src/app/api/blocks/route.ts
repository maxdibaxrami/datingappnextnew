import { type NextRequest } from 'next/server';

import { createBlockSchema, parseCursorQuery } from '@/features/moderation/schemas';
import { createBlock, listBlocks } from '@/features/moderation/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `blocks:list:${user.id}`, 60, 120);
    return jsonData(await listBlocks(user.id, parseCursorQuery(request.nextUrl.searchParams)));
  });
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `blocks:create:${user.id}`, 60, 20);
    return jsonData(await createBlock(user.id, await parseJsonBody(request, createBlockSchema)), 201);
  });
}
