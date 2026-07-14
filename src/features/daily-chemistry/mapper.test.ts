import { describe, expect, it } from 'vitest';

import { type DailyChemistryRpcRow } from './rpc';
import { mapDailyChemistryRows } from './mapper';

const emptyCardRow: DailyChemistryRpcRow = {
  age_years: null,
  algorithm_version: 'v1',
  bio: null,
  candidate_acted_at: null,
  candidate_id: null,
  candidate_status: null,
  candidate_viewed_at: null,
  card_date: '2026-07-14',
  card_id: '9ed650af-4e06-4bf0-a0db-cb4cc22f77fc',
  card_status: 'completed',
  card_summary: 'No safe chemistry picks are available today.',
  city_name: null,
  compatibility_score: null,
  country_code: null,
  display_name: null,
  expires_at: '2026-07-15T00:00:00.000Z',
  gender: null,
  generated_at: '2026-07-14T19:30:00.000Z',
  headline: null,
  interests: null,
  languages: null,
  last_active_at: null,
  mood: null,
  online_state: null,
  primary_photo_blur_hash: null,
  primary_photo_height: null,
  primary_photo_url: null,
  primary_photo_width: null,
  public_geohash_prefix: null,
  rank_position: null,
  reason_tags: null,
  reasons: null,
  relationship_goals: null,
  remaining_candidates: 0,
  shared_goals: null,
  shared_interests: null,
  shared_languages: null,
  target_user_id: null,
  total_candidates: 0,
};

describe('Daily Chemistry mapping', () => {
  it('preserves a stored zero-result card without inventing candidates', () => {
    expect(mapDailyChemistryRows([emptyCardRow])).toMatchObject({
      id: emptyCardRow.card_id,
      status: 'completed',
      totalCandidates: 0,
      remainingCandidates: 0,
      candidates: [],
    });
  });

  it('maps explainable compatibility and a safe profile projection', () => {
    const candidateRow: DailyChemistryRpcRow = {
      ...emptyCardRow,
      age_years: 27,
      bio: 'Coffee, museums, and long walks.',
      candidate_id: '284712b0-6889-4fe2-b9e3-63c2d23d11a8',
      candidate_status: 'viewed',
      card_status: 'seen',
      card_summary: 'One compatibility pick for today.',
      city_name: 'Amsterdam',
      compatibility_score: 84,
      country_code: 'NL',
      display_name: 'Sam',
      gender: 'non_binary',
      interests: ['coffee', 'museums'],
      languages: ['English'],
      online_state: 'online',
      primary_photo_url: 'https://cdn.example.test/sam.webp',
      rank_position: 1,
      reason_tags: ['shared_interests', 'same_city'],
      reasons: { sharedInterests: ['coffee'], location: { kind: 'same_city' } },
      relationship_goals: ['long_term'],
      remaining_candidates: 1,
      shared_goals: ['long_term'],
      shared_interests: ['coffee'],
      shared_languages: ['English'],
      target_user_id: '0c869559-c4e3-46a3-af7a-207564f22bd3',
      total_candidates: 1,
    };

    expect(mapDailyChemistryRows([candidateRow])).toMatchObject({
      status: 'seen',
      candidates: [{
        id: candidateRow.candidate_id,
        compatibilityScore: 84,
        reasonTags: ['shared_interests', 'same_city'],
        profile: {
          userId: candidateRow.target_user_id,
          displayName: 'Sam',
          primaryPhoto: { url: 'https://cdn.example.test/sam.webp' },
        },
      }],
    });
  });
});
