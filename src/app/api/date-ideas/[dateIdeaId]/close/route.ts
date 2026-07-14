import { type NextRequest } from 'next/server';
import { parseUuid } from '@/features/date-ideas/schemas';
import { closeDateIdea } from '@/features/date-ideas/service';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
type Context = { params: Promise<{ dateIdeaId: string }> };
export async function POST(request: NextRequest, context: Context) { return handleApiRequest(async () => { assertAllowedOrigin(request); const { user } = await getCurrentAuth(); const { dateIdeaId } = await context.params; await enforceRateLimit(request, 'date-ideas:close:' + user.id, 60, 12); return jsonData(await closeDateIdea(user.id, parseUuid(dateIdeaId, 'Date Idea ID'))); }); }
