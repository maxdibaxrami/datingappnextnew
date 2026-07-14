import 'server-only';

import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database, type Json } from '@/types/database.generated';

type CandidateStatus = Database['public']['Enums']['daily_chemistry_candidate_status'];
type CardStatus = Database['public']['Enums']['daily_chemistry_card_status'];
type Gender = Database['public']['Enums']['gender_type'];
type OnlineState = Database['public']['Enums']['online_state'];

export interface DailyChemistryRpcRow {
  age_years: number | null;
  algorithm_version: string;
  bio: string | null;
  candidate_acted_at: string | null;
  candidate_id: string | null;
  candidate_status: CandidateStatus | null;
  candidate_viewed_at: string | null;
  card_date: string;
  card_id: string;
  card_status: CardStatus;
  card_summary: string | null;
  city_name: string | null;
  compatibility_score: number | null;
  country_code: string | null;
  display_name: string | null;
  expires_at: string;
  gender: Gender | null;
  generated_at: string;
  headline: string | null;
  interests: string[] | null;
  languages: string[] | null;
  last_active_at: string | null;
  mood: string | null;
  online_state: OnlineState | null;
  primary_photo_blur_hash: string | null;
  primary_photo_height: number | null;
  primary_photo_url: string | null;
  primary_photo_width: number | null;
  public_geohash_prefix: string | null;
  rank_position: number | null;
  reason_tags: string[] | null;
  reasons: Json | null;
  relationship_goals: string[] | null;
  remaining_candidates: number;
  shared_goals: string[] | null;
  shared_interests: string[] | null;
  shared_languages: string[] | null;
  target_user_id: string | null;
  total_candidates: number;
}

export interface ViewedCandidateRpcRow {
  candidate_id: string;
  candidate_status: CandidateStatus;
  card_remaining_candidates: number;
  card_status: CardStatus;
  viewed_at: string | null;
}

interface DailyChemistryRpcDefinitions {
  get_or_create_daily_chemistry_card: {
    Args: { p_actor_user_id: string };
    Returns: DailyChemistryRpcRow[];
  };
  mark_daily_chemistry_candidate_viewed: {
    Args: { p_actor_user_id: string; p_candidate_id: string };
    Returns: ViewedCandidateRpcRow[];
  };
}

interface RpcResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

type UntypedRpc = (
  functionName: string,
  args: Record<string, unknown>,
) => PromiseLike<RpcResponse<unknown>>;

export async function callDailyChemistryRpc<
  Name extends keyof DailyChemistryRpcDefinitions,
>(
  functionName: Name,
  args: DailyChemistryRpcDefinitions[Name]['Args'],
): Promise<RpcResponse<DailyChemistryRpcDefinitions[Name]['Returns']>> {
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as UntypedRpc;
  const result = await rpc(functionName, args);
  return result as RpcResponse<DailyChemistryRpcDefinitions[Name]['Returns']>;
}
