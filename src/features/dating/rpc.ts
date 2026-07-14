import 'server-only';

import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.generated';

type DiscoverySurface = Database['public']['Enums']['discovery_surface'];
type Gender = Database['public']['Enums']['gender_type'];
type MatchSource = Database['public']['Enums']['match_source'];
type MatchStatus = Database['public']['Enums']['match_status'];
type OnlineState = Database['public']['Enums']['online_state'];
type SwipeAction = Database['public']['Enums']['swipe_action_type'];

export interface DiscoveryRpcRow {
  age_years: number | null;
  badges: string[];
  bio: string | null;
  city_name: string | null;
  country_code: string | null;
  display_name: string | null;
  gender: Gender | null;
  gifts_received: number | null;
  headline: string | null;
  interests: string[];
  intents: string[];
  languages: string[];
  last_active_at: string | null;
  likes_received: number | null;
  mood: string | null;
  online_state: OnlineState;
  popularity_score: number | null;
  primary_photo_blur_hash: string | null;
  primary_photo_height: number | null;
  primary_photo_url: string;
  primary_photo_width: number | null;
  profile_completion_score: number | null;
  public_geohash_prefix: string | null;
  relationship_goals: string[];
  sort_at: string;
  user_id: string;
}

export interface SwipeRpcRow {
  action_created_at: string;
  action_id: string;
  action_type: SwipeAction;
  match_created: boolean;
  match_id: string | null;
  match_status: MatchStatus | null;
  matched_at: string | null;
  source_surface: DiscoverySurface;
  target_user_id: string;
}

export interface UndoRpcRow {
  action_created_at: string;
  action_id: string;
  action_type: SwipeAction;
  source_surface: DiscoverySurface;
  target_user_id: string;
  undone_action_id: string;
}

export interface MatchRpcRow {
  age_years: number | null;
  bio: string | null;
  city_name: string | null;
  country_code: string | null;
  display_name: string | null;
  gender: Gender | null;
  headline: string | null;
  interests: string[];
  languages: string[];
  last_active_at: string | null;
  last_interaction_at: string;
  match_id: string;
  match_source: MatchSource;
  match_status: MatchStatus;
  matched_at: string;
  mood: string | null;
  online_state: OnlineState;
  other_user_id: string;
  primary_photo_blur_hash: string | null;
  primary_photo_height: number | null;
  primary_photo_url: string | null;
  primary_photo_width: number | null;
  public_geohash_prefix: string | null;
  relationship_goals: string[];
}

interface DatingRpcDefinitions {
  get_discovery_cards: {
    Args: {
      p_actor_user_id: string;
      p_city_name: string | null;
      p_country_code: string | null;
      p_cursor_sort_at: string | null;
      p_cursor_user_id: string | null;
      p_genders: Gender[] | null;
      p_geohash_prefix: string | null;
      p_interests: string[] | null;
      p_languages: string[] | null;
      p_limit: number;
      p_max_age: number | null;
      p_min_age: number | null;
      p_relationship_goals: string[] | null;
    };
    Returns: DiscoveryRpcRow[];
  };
  get_user_matches: {
    Args: {
      p_actor_user_id: string;
      p_cursor_match_id: string | null;
      p_cursor_matched_at: string | null;
      p_limit: number;
    };
    Returns: MatchRpcRow[];
  };
  record_swipe_action: {
    Args: {
      p_action_type: Exclude<SwipeAction, 'undo'>;
      p_actor_user_id: string;
      p_idempotency_key: string;
      p_source_surface: DiscoverySurface;
      p_target_user_id: string;
    };
    Returns: SwipeRpcRow[];
  };
  undo_latest_swipe: {
    Args: {
      p_actor_user_id: string;
      p_idempotency_key: string;
      p_target_user_id: string | null;
      p_window_seconds: number;
    };
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
  // These definitions live beside the migration until the migration is
  // deployed and the generated project types can be refreshed from Supabase.
  const admin = getSupabaseAdmin();
  const rpc = admin.rpc.bind(admin) as unknown as UntypedRpc;
  const result = await rpc(functionName, args);
  return result as RpcResponse<DatingRpcDefinitions[Name]['Returns']>;
}
