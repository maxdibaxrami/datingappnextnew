import { ApiError } from '@/lib/errors/api-error';

import { type DailyChemistryRpcRow } from './rpc';

function mapCandidate(row: DailyChemistryRpcRow) {
  if (
    !row.candidate_id
    || !row.candidate_status
    || row.compatibility_score === null
    || !row.primary_photo_url
    || row.rank_position === null
    || !row.target_user_id
  ) {
    throw new ApiError(
      500,
      'INTERNAL_ERROR',
      'A Daily Chemistry candidate was incomplete',
    );
  }

  return {
    id: row.candidate_id,
    rankPosition: row.rank_position,
    compatibilityScore: row.compatibility_score,
    status: row.candidate_status,
    reasonTags: row.reason_tags ?? [],
    reasons: row.reasons ?? {},
    sharedInterests: row.shared_interests ?? [],
    sharedLanguages: row.shared_languages ?? [],
    sharedGoals: row.shared_goals ?? [],
    viewedAt: row.candidate_viewed_at,
    actedAt: row.candidate_acted_at,
    profile: {
      userId: row.target_user_id,
      displayName: row.display_name,
      ageYears: row.age_years,
      gender: row.gender,
      countryCode: row.country_code,
      cityName: row.city_name,
      headline: row.headline,
      bio: row.bio,
      languages: row.languages ?? [],
      interests: row.interests ?? [],
      relationshipGoals: row.relationship_goals ?? [],
      mood: row.mood,
      onlineState: row.online_state,
      lastActiveAt: row.last_active_at,
      publicGeohashPrefix: row.public_geohash_prefix,
      primaryPhoto: {
        url: row.primary_photo_url,
        blurHash: row.primary_photo_blur_hash,
        width: row.primary_photo_width,
        height: row.primary_photo_height,
      },
    },
  };
}

export function mapDailyChemistryRows(rows: DailyChemistryRpcRow[]) {
  const card = rows[0];
  if (!card) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The Daily Chemistry card was empty');
  }

  return {
    id: card.card_id,
    date: card.card_date,
    status: card.card_status,
    algorithmVersion: card.algorithm_version,
    generatedAt: card.generated_at,
    expiresAt: card.expires_at,
    totalCandidates: card.total_candidates,
    remainingCandidates: card.remaining_candidates,
    summary: card.card_summary,
    candidates: rows
      .filter((row) => row.candidate_id !== null)
      .map(mapCandidate),
  };
}
