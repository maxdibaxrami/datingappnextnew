import { type NextRequest } from 'next/server';
import { dateIdeaDecisionSchema, parseUuid } from '@/features/date-ideas/schemas';
import { decideDateIdeaRequest } from '@/features/date-ideas/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { parseJsonBody } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
type Context = { params: Promise<{ dateIdeaId: string; requestId: string }> };
export async function POST(request: NextRequest, context: Context) { return handleApiRequest(async () => { const { user } = await getCurrentAuth(); const { dateIdeaId, requestId } = await context.params; await enforceRateLimit(request, 'date-ideas:requests:decide:' + user.id, 60, 30); return jsonData(await decideDateIdeaRequest(user.id, parseUuid(dateIdeaId, 'Date Idea ID'), parseUuid(requestId, 'Date Idea request ID'), await parseJsonBody(request, dateIdeaDecisionSchema))); }); }
