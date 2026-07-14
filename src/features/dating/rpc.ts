import 'server-only';

import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.generated';

type DatingRpcName =
  | 'get_discovery_cards'
  | 'get_user_matches'
  | 'record_swipe_action'
  | 'undo_latest_swipe';

type RpcArgs<Name extends DatingRpcName> =
  Database['public']['Functions'][Name]['Args'];
type RpcReturns<Name extends DatingRpcName> =
  Database['public']['Functions'][Name]['Returns'];
type NullableFields<Row, Keys extends keyof Row> = Omit<Row, Keys> & {
  [Key in Keys]: Row[Key] | null;
};

type GeneratedDiscoveryRpcRow = RpcReturns<'get_discovery_cards'>[number];
export type DiscoveryRpcRow = NullableFields<GeneratedDiscoveryRpcRow,
  | 'age_years'
  | 'bio'
  | 'city_name'
  | 'country_code'
  | 'display_name'
  | 'gender'
  | 'gifts_received'
  | 'headline'
  | 'last_active_at'
  | 'likes_received'
  | 'mood'
  | 'popularity_score'
  | 'primary_photo_blur_hash'
  | 'primary_photo_height'
  | 'primary_photo_width'
  | 'profile_completion_score'
  | 'public_geohash_prefix'
>;

type GeneratedSwipeRpcRow = RpcReturns<'record_swipe_action'>[number];
export type SwipeRpcRow = NullableFields<GeneratedSwipeRpcRow,
  'match_id' | 'match_status' | 'matched_at'
>;

export type UndoRpcRow = RpcReturns<'undo_latest_swipe'>[number];

type GeneratedMatchRpcRow = RpcReturns<'get_user_matches'>[number];
export type MatchRpcRow = NullableFields<GeneratedMatchRpcRow,
  | 'age_years'
  | 'bio'
  | 'city_name'
  | 'country_code'
  | 'display_name'
  | 'gender'
  | 'headline'
  | 'last_active_at'
  | 'mood'
  | 'primary_photo_blur_hash'
  | 'primary_photo_height'
  | 'primary_photo_url'
  | 'primary_photo_width'
  | 'public_geohash_prefix'
>;

interface DatingRpcDefinitions {
  get_discovery_cards: {
    Args: RpcArgs<'get_discovery_cards'>;
    Returns: DiscoveryRpcRow[];
  };
  get_user_matches: {
    Args: RpcArgs<'get_user_matches'>;
    Returns: MatchRpcRow[];
  };
  record_dating_swipe: {
    Args: RpcArgs<'record_swipe_action'> & {
      p_daily_chemistry_candidate_id?: string;
    };
    Returns: SwipeRpcRow[];
  };
  undo_dating_swipe: {
    Args: RpcArgs<'undo_latest_swipe'>;
    Returns: UndoRpcRow[];
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

export async function callDatingRpc<Name extends keyof DatingRpcDefinitions>(
  functionName: Name,
  args: DatingRpcDefinitions[Name]['Args'],
): Promise<RpcResponse<DatingRpcDefinitions[Name]['Returns']>> {
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as UntypedRpc;
  const result = await rpc(functionName, args);
  return result as RpcResponse<DatingRpcDefinitions[Name]['Returns']>;
}
