import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.generated';

type DatingRpcName =
  | 'get_discovery_cards'
  | 'get_user_matches'
  | 'record_dating_swipe'
  | 'undo_dating_swipe';

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

type GeneratedSwipeRpcRow = RpcReturns<'record_dating_swipe'>[number];
export type SwipeRpcRow = NullableFields<GeneratedSwipeRpcRow,
  'match_id' | 'match_status' | 'matched_at'
>;

export type UndoRpcRow = RpcReturns<'undo_dating_swipe'>[number];

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

export function callDatingRpc<Name extends DatingRpcName>(
  functionName: Name,
  args: RpcArgs<Name>,
) {
  return getSupabaseAdmin().rpc(functionName, args);
}
