import 'server-only';

import { z } from 'zod';

import { throwDatingRpcError } from '@/features/dating/errors';
import { callDatingRpc, type MatchRpcRow } from '@/features/dating/rpc';
import { requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { type MatchQuery } from './schemas';

const matchCursorSchema = z.object({
  matchId: z.uuid(),
  matchedAt: z.iso.datetime({ offset: true }),
  version: z.literal(1),
}).strict();

function mapMatch(row: MatchRpcRow) {
  return {
    id: row.match_id,
    status: row.match_status,
    source: row.match_source,
    matchedAt: row.matched_at,
    lastInteractionAt: row.last_interaction_at,
    profile: {
      userId: row.other_user_id,
      displayName: row.display_name,
      ageYears: row.age_years,
      gender: row.gender,
      countryCode: row.country_code,
      cityName: row.city_name,
      headline: row.headline,
      bio: row.bio,
      languages: row.languages,
      interests: row.interests,
      relationshipGoals: row.relationship_goals,
      mood: row.mood,
      onlineState: row.online_state,
      lastActiveAt: row.last_active_at,
      publicGeohashPrefix: row.public_geohash_prefix,
      primaryPhoto: row.primary_photo_url
        ? {
          url: row.primary_photo_url,
          blurHash: row.primary_photo_blur_hash,
          width: row.primary_photo_width,
          height: row.primary_photo_height,
        }
        : null,
    },
  };
}

export async function listMatches(userId: string, query: MatchQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor
    ? decodeOpaqueCursor(query.cursor, matchCursorSchema)
    : null;

  const { data, error } = await callDatingRpc('get_user_matches', {
    p_actor_user_id: userId,
    p_cursor_match_id: cursor?.matchId ?? null,
    p_cursor_matched_at: cursor?.matchedAt ?? null,
    p_limit: query.limit + 1,
  });
  if (error) {
    throwDatingRpcError(error, 'Matches could not be loaded');
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const lastRow = pageRows.at(-1);
  if (rows.length > query.limit && !lastRow) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Match pagination could not be created');
  }

  return {
    items: pageRows.map(mapMatch),
    nextCursor: rows.length > query.limit && lastRow
      ? encodeOpaqueCursor({
        matchId: lastRow.match_id,
        matchedAt: lastRow.matched_at,
        version: 1,
      })
      : null,
  };
}
