import { type NextRequest } from 'next/server';

import { createReportSchema, parseCursorQuery } from '@/features/moderation/schemas';
import { createReport, listMyReports } from '@/features/moderation/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `reports:list:${user.id}`, 60, 120);
    return jsonData(await listMyReports(user.id, parseCursorQuery(request.nextUrl.searchParams)));
  });
}

export async function POST(request: NextRequest) {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    await enforceRateLimit(request, `reports:create:${user.id}`, 60, 5);
    return jsonData(await createReport(user.id, await parseJsonBody(request, createReportSchema)), 201);
  });
}
