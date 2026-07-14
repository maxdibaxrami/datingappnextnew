import 'server-only';

import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface DateIdeaCardRpcRow {
  date_idea_id: string; idea_type: string; visibility: string; title: string; body: string | null;
  scheduled_for: string | null; expires_at: string; city_name: string | null; country_code: string | null;
  geohash_prefix: string | null; venue_name: string | null; venue_hint: string | null;
  min_age: number | null; max_age: number | null; looking_for_genders: string[];
  relationship_goals: string[]; interest_tags: string[]; language_codes: string[];
  max_requests: number; accepted_count: number; request_count: number; author_user_id: string;
  author_display_name: string | null; author_age_years: number | null; author_gender: string | null;
  author_headline: string | null; author_bio: string | null; author_languages: string[];
  author_interests: string[]; author_relationship_goals: string[]; author_online_state: string | null;
  author_last_active_at: string | null; author_photo_url: string; author_photo_blur_hash: string | null;
  author_photo_width: number | null; author_photo_height: number | null; bookmarked: boolean;
  my_request_status: string | null; sort_created_at: string;
}

export interface DateIdeaRequestRpcRow {
  date_idea_request_id: string; request_status: string; message: string | null;
  response_note: string | null; requested_at: string; decided_at: string | null;
  requester_user_id: string; requester_display_name: string | null; requester_age_years: number | null;
  requester_gender: string | null; requester_headline: string | null; requester_bio: string | null;
  requester_languages: string[]; requester_interests: string[]; requester_relationship_goals: string[];
  requester_photo_url: string | null; requester_photo_blur_hash: string | null;
  requester_photo_width: number | null; requester_photo_height: number | null;
}

type RpcResponse<T> = Promise<{ data: T[] | null; error: PostgrestError | null }>;
export function callDateIdeaRpc<T>(name: string, args: Record<string, unknown>): RpcResponse<T> {
  const rpc = getSupabaseAdmin().rpc as unknown as (fn: string, values: Record<string, unknown>) => RpcResponse<T>;
  return rpc(name, args);
}
