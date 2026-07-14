import 'server-only';

import { z } from 'zod';

import { throwDatingRpcError } from '@/features/dating/errors';
import { callDatingRpc, type DiscoveryRpcRow } from '@/features/dating/rpc';
import { requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { type DiscoveryQuery } from './schemas';

const discoveryCursorSchema = z.object({
  sortAt: z.iso.datetime({ offset: true }),
  userId: z.uuid(),
  version: z.literal(1),
}).strict();

function mapDiscoveryCard(row: DiscoveryRpcRow) {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    ageYears: row.age_years,
    gender: row.gender,
    countryCode: row.country_code,
    cityName: row.city_name,
    headline: row.headline,
    bio: row.bio,
    intents: row.intents,
    languages: row.languages,
    interests: row.interests,
    badges: row.badges,
    relationshipGoals: row.relationship_goals,
    mood: row.mood,
    onlineState: row.online_state,
    lastActiveAt: row.last_active_at,
    publicGeohashPrefix: row.public_geohash_prefix,
    stats: {
      profileCompletionScore: row.profile_completion_score ?? 0,
      popularityScore: row.popularity_score ?? 0,
      likesReceived: row.likes_received ?? 0,
      giftsReceived: row.gifts_received ?? 0,
    },
    primaryPhoto: {
      url: row.primary_photo_url,
      blurHash: row.primary_photo_blur_hash,
      width: row.primary_photo_width,
      height: row.primary_photo_height,
    },
  };
}

export async function listDiscoveryCards(userId: string, query: DiscoveryQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor
    ? decodeOpaqueCursor(query.cursor, discoveryCursorSchema)
    : null;

  const { data, error } = await callDatingRpc('get_discovery_cards', {
    p_actor_user_id: userId,
    p_city_name: query.cityName,
    p_country_code: query.countryCode,
    p_cursor_sort_at: cursor?.sortAt,
    p_cursor_user_id: cursor?.userId,
    p_genders: query.genders.length > 0 ? query.genders : undefined,
    p_geohash_prefix: query.geohashPrefix,
    p_interests: query.interests.length > 0 ? query.interests : undefined,
    p_languages: query.languages.length > 0 ? query.languages : undefined,
    p_limit: query.limit + 1,
    p_max_age: query.maxAge,
    p_min_age: query.minAge,
    p_relationship_goals: query.relationshipGoals.length > 0
      ? query.relationshipGoals
      : undefined,
  });
  if (error) {
    throwDatingRpcError(error, 'Discovery profiles could not be loaded');
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const lastRow = pageRows.at(-1);
  if (rows.length > query.limit && !lastRow) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Discovery pagination could not be created');
  }

  return {
    items: pageRows.map(mapDiscoveryCard),
    nextCursor: rows.length > query.limit && lastRow
      ? encodeOpaqueCursor({
        sortAt: lastRow.sort_at,
        userId: lastRow.user_id,
        version: 1,
      })
      : null,
  };
}
