import { type Database } from '@/types/database.generated';

type RpcReturns<
  Name extends keyof Database['public']['Functions'],
> = Database['public']['Functions'][Name]['Returns'];

type NullableFields<Row, Keys extends keyof Row> = Omit<Row, Keys> & {
  [Key in Keys]: Row[Key] | null;
};

type GeneratedDailyChemistryRpcRow =
  RpcReturns<'get_or_create_daily_chemistry_card'>[number];

export type DailyChemistryRpcRow = NullableFields<
  GeneratedDailyChemistryRpcRow,
  | 'age_years'
  | 'bio'
  | 'candidate_acted_at'
  | 'candidate_id'
  | 'candidate_status'
  | 'candidate_viewed_at'
  | 'card_summary'
  | 'city_name'
  | 'compatibility_score'
  | 'country_code'
  | 'display_name'
  | 'gender'
  | 'headline'
  | 'interests'
  | 'languages'
  | 'last_active_at'
  | 'mood'
  | 'online_state'
  | 'primary_photo_blur_hash'
  | 'primary_photo_height'
  | 'primary_photo_url'
  | 'primary_photo_width'
  | 'public_geohash_prefix'
  | 'rank_position'
  | 'reason_tags'
  | 'reasons'
  | 'relationship_goals'
  | 'shared_goals'
  | 'shared_interests'
  | 'shared_languages'
  | 'target_user_id'
>;

type GeneratedViewedCandidateRpcRow =
  RpcReturns<'mark_daily_chemistry_candidate_viewed'>[number];

export type ViewedCandidateRpcRow = NullableFields<
  GeneratedViewedCandidateRpcRow,
  'viewed_at'
>;
