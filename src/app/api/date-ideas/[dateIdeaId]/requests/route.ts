import { type NextRequest } from 'next/server';
import { createDateIdeaRequestSchema, parseDateIdeaRequestsQuery, parseUuid } from '@/features/date-ideas/schemas';
import { listDateIdeaRequests, requestDateIdea } from '@/features/date-ideas/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
type Context = { params: Promise<{ dateIdeaId: string }> };
export async function GET(request: NextRequest, context: Context) { return handleApiRequest(async () => { const { user } = await getCurrentAuth(); const { dateIdeaId } = await context.params; await enforceRateLimit(request, 'date-ideas:requests:list:' + user.id, 60, 60); return jsonData(await listDateIdeaRequests(user.id, parseUuid(dateIdeaId, 'Date Idea ID'), parseDateIdeaRequestsQuery(request.nextUrl.searchParams))); }); }
export async function POST(request: NextRequest, context: Context) { return handleApiRequest(async () => { const { user } = await getCurrentAuth(); const { dateIdeaId } = await context.params; await enforceRateLimit(request, 'date-ideas:requests:create:' + user.id, 60, 20); return jsonData(await requestDateIdea(user.id, parseUuid(dateIdeaId, 'Date Idea ID'), await parseJsonBody(request, createDateIdeaRequestSchema))); }); }
