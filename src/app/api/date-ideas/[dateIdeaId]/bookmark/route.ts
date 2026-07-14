import { type NextRequest } from 'next/server';
import { setDateIdeaBookmark } from '@/features/date-ideas/service';
import { parseUuid } from '@/features/date-ideas/schemas';
import { getCurrentAuth } from '@/lib/auth/current-user';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';
import { assertAllowedOrigin } from '@/lib/http/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';
export const runtime = 'nodejs';
type Context = { params: Promise<{ dateIdeaId: string }> };
async function update(request: NextRequest, context: Context, bookmarked: boolean) { return handleApiRequest(async () => { assertAllowedOrigin(request); const { user } = await getCurrentAuth(); const { dateIdeaId } = await context.params; await enforceRateLimit(request, 'date-ideas:bookmark:' + user.id, 60, 60); return jsonData(await setDateIdeaBookmark(user.id, parseUuid(dateIdeaId, 'Date Idea ID'), bookmarked)); }); }
export async function POST(request: NextRequest, context: Context) { return update(request, context, true); }
export async function DELETE(request: NextRequest, context: Context) { return update(request, context, false); }
