import { getCurrentAuth } from '@/lib/auth/current-user';
import { getAccountGate } from '@/lib/auth/guards';
import { handleApiRequest, jsonData } from '@/lib/http/json-response';

export const runtime = 'nodejs';

export async function GET() {
  return handleApiRequest(async () => {
    const { user } = await getCurrentAuth();
    const account = await getAccountGate(user.id);
    return jsonData({
      account,
      profileRequired: !account.profileCompletedAt,
    });
  });
}
