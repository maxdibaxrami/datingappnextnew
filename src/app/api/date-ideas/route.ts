import { type NextRequest } from 'next/server';
import { createDateIdeaSchema, parseDateIdeaQuery } from '@/features/date-ideas/schemas';
import { createDateIdea, listDateIdeas } from '@/features/date-ideas/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) { return handleApiRequest(async () => { const { user } = await getCurrentAuth(); await enforceRateLimit(request, 'date-ideas:list:' + user.id, 60, 120); return jsonData(await listDateIdeas(user.id, parseDateIdeaQuery(request.nextUrl.searchParams))); }); }
export async function POST(request: NextRequest) { return handleApiRequest(async () => { const { user } = await getCurrentAuth(); await enforceRateLimit(request, 'date-ideas:create:' + user.id, 60, 12); return jsonData(await createDateIdea(user.id, await parseJsonBody(request, createDateIdeaSchema))); }); }
