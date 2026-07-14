import 'server-only';

import { throwDatingRpcError } from '@/features/dating/errors';
import { requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

import { mapDailyChemistryRows } from './mapper';
import { type ViewedCandidateRpcRow } from './types';

export async function getDailyChemistryCard(userId: string) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await getSupabaseAdmin().rpc(
    'get_or_create_daily_chemistry_card',
    { p_actor_user_id: userId },
  );
  if (error) {
    throwDatingRpcError(error, 'Daily Chemistry could not be loaded');
  }
  return mapDailyChemistryRows(data ?? []);
}

export async function markDailyChemistryCandidateViewed(
  userId: string,
  candidateId: string,
) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await getSupabaseAdmin().rpc(
    'mark_daily_chemistry_candidate_viewed',
    {
      p_actor_user_id: userId,
      p_candidate_id: candidateId,
    },
  );
  if (error) {
    throwDatingRpcError(error, 'The Daily Chemistry candidate could not be updated');
  }
  const row = data?.[0] as ViewedCandidateRpcRow | undefined;
  if (!row) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The candidate view result was empty');
  }
  return {
    candidateId: row.candidate_id,
    status: row.candidate_status,
    viewedAt: row.viewed_at,
    card: {
      status: row.card_status,
      remainingCandidates: row.card_remaining_candidates,
    },
  };
}
