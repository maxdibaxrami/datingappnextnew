import 'server-only';

import { z } from 'zod';

import { requireDatingAccount, requireUsableAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { throwDateIdeaRpcError } from './errors';
import { callDateIdeaRpc, type DateIdeaCardRpcRow, type DateIdeaRequestRpcRow } from './rpc';
import { type CreateDateIdeaInput, type CreateDateIdeaRequestInput, type DateIdeaDecisionInput, type DateIdeaQuery, type DateIdeaRequestsQuery } from './schemas';

const cardCursorSchema = z.object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid(), version: z.literal(1) }).strict();
const requestCursorSchema = z.object({ requestedAt: z.iso.datetime({ offset: true }), id: z.uuid(), version: z.literal(1) }).strict();

function mapCard(row: DateIdeaCardRpcRow) {
  return {
    id: row.date_idea_id, ideaType: row.idea_type, visibility: row.visibility, title: row.title, body: row.body,
    scheduledFor: row.scheduled_for, expiresAt: row.expires_at, cityName: row.city_name, countryCode: row.country_code,
    geohashPrefix: row.geohash_prefix, venueName: row.venue_name, venueHint: row.venue_hint,
    minAge: row.min_age, maxAge: row.max_age, lookingForGenders: row.looking_for_genders,
    relationshipGoals: row.relationship_goals, interestTags: row.interest_tags, languageCodes: row.language_codes,
    capacity: { maximum: row.max_requests, accepted: row.accepted_count, requests: row.request_count },
    bookmarked: row.bookmarked, myRequestStatus: row.my_request_status, createdAt: row.sort_created_at,
    author: {
      userId: row.author_user_id, displayName: row.author_display_name, ageYears: row.author_age_years,
      gender: row.author_gender, headline: row.author_headline, bio: row.author_bio, languages: row.author_languages,
      interests: row.author_interests, relationshipGoals: row.author_relationship_goals, onlineState: row.author_online_state,
      lastActiveAt: row.author_last_active_at, primaryPhoto: { url: row.author_photo_url, blurHash: row.author_photo_blur_hash, width: row.author_photo_width, height: row.author_photo_height },
    },
  };
}

function mapRequest(row: DateIdeaRequestRpcRow) {
  return {
    id: row.date_idea_request_id, status: row.request_status, message: row.message, responseNote: row.response_note,
    requestedAt: row.requested_at, decidedAt: row.decided_at,
    requester: { userId: row.requester_user_id, displayName: row.requester_display_name, ageYears: row.requester_age_years,
      gender: row.requester_gender, headline: row.requester_headline, bio: row.requester_bio, languages: row.requester_languages,
      interests: row.requester_interests, relationshipGoals: row.requester_relationship_goals,
      primaryPhoto: row.requester_photo_url ? { url: row.requester_photo_url, blurHash: row.requester_photo_blur_hash, width: row.requester_photo_width, height: row.requester_photo_height } : null },
  };
}

export async function listDateIdeas(userId: string, query: DateIdeaQuery) {
  await requireUsableAccount(userId, { completedProfile: true });
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, cardCursorSchema) : null;
  const { data, error } = await callDateIdeaRpc<DateIdeaCardRpcRow>('get_date_idea_cards', {
    p_actor_user_id: userId, p_limit: query.limit + 1, p_cursor_created_at: cursor?.createdAt,
    p_cursor_date_idea_id: cursor?.id, p_country_code: query.countryCode, p_city_name: query.cityName,
    p_geohash_prefix: query.geohashPrefix, p_idea_types: query.ideaTypes.length ? query.ideaTypes : null,
  });
  if (error) throwDateIdeaRpcError(error, 'Date Ideas could not be loaded');
  const rows = data ?? []; const pageRows = rows.slice(0, query.limit); const last = pageRows.at(-1);
  if (rows.length > query.limit && !last) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea pagination could not be created');
  return { items: pageRows.map(mapCard), nextCursor: rows.length > query.limit && last ? encodeOpaqueCursor({ createdAt: last.sort_created_at, id: last.date_idea_id, version: 1 }) : null };
}

export async function createDateIdea(userId: string, input: CreateDateIdeaInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callDateIdeaRpc<{ date_idea_id: string; date_idea_status: string; created_at: string; scheduled_for: string | null; expires_at: string; max_requests: number }>('create_date_idea', {
    p_actor_user_id: userId, p_idea_type: input.ideaType, p_title: input.title, p_body: input.body ?? null,
    p_scheduled_for: input.scheduledFor ?? null, p_expires_at: input.expiresAt ?? null, p_visibility: input.visibility,
    p_min_age: input.minAge ?? null, p_max_age: input.maxAge ?? null, p_looking_for_genders: input.lookingForGenders,
    p_relationship_goals: input.relationshipGoals, p_interest_tags: input.interestTags, p_language_codes: input.languageCodes, p_max_requests: input.maxRequests,
  });
  if (error) throwDateIdeaRpcError(error, 'Date Idea could not be created');
  const row = data?.[0]; if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea creation returned no result');
  return { id: row.date_idea_id, status: row.date_idea_status, createdAt: row.created_at, scheduledFor: row.scheduled_for, expiresAt: row.expires_at, maxRequests: row.max_requests };
}

export async function setDateIdeaBookmark(userId: string, dateIdeaId: string, bookmarked: boolean) {
  await requireUsableAccount(userId, { completedProfile: true });
  const { data, error } = await callDateIdeaRpc<{ date_idea_id: string; bookmarked: boolean }>('set_date_idea_bookmark', { p_actor_user_id: userId, p_date_idea_id: dateIdeaId, p_bookmarked: bookmarked });
  if (error) throwDateIdeaRpcError(error, 'Date Idea bookmark could not be updated');
  const row = data?.[0]; if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea bookmark returned no result');
  return { id: row.date_idea_id, bookmarked: row.bookmarked };
}

export async function requestDateIdea(userId: string, dateIdeaId: string, input: CreateDateIdeaRequestInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callDateIdeaRpc<{ date_idea_request_id: string; request_status: string; requested_at: string; date_idea_status: string }>('create_date_idea_request', { p_actor_user_id: userId, p_date_idea_id: dateIdeaId, p_message: input.message ?? null, p_idempotency_key: input.idempotencyKey });
  if (error) throwDateIdeaRpcError(error, 'Date Idea request could not be created');
  const row = data?.[0]; if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea request returned no result');
  return { id: row.date_idea_request_id, status: row.request_status, requestedAt: row.requested_at, dateIdeaStatus: row.date_idea_status };
}

export async function listDateIdeaRequests(userId: string, dateIdeaId: string, query: DateIdeaRequestsQuery) {
  await requireDatingAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, requestCursorSchema) : null;
  const { data, error } = await callDateIdeaRpc<DateIdeaRequestRpcRow>('get_date_idea_requests', { p_actor_user_id: userId, p_date_idea_id: dateIdeaId, p_limit: query.limit + 1, p_cursor_requested_at: cursor?.requestedAt, p_cursor_request_id: cursor?.id, p_statuses: query.statuses.length ? query.statuses : null });
  if (error) throwDateIdeaRpcError(error, 'Date Idea requests could not be loaded');
  const rows = data ?? []; const pageRows = rows.slice(0, query.limit); const last = pageRows.at(-1);
  if (rows.length > query.limit && !last) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea request pagination could not be created');
  return { items: pageRows.map(mapRequest), nextCursor: rows.length > query.limit && last ? encodeOpaqueCursor({ requestedAt: last.requested_at, id: last.date_idea_request_id, version: 1 }) : null };
}

export async function decideDateIdeaRequest(userId: string, dateIdeaId: string, requestId: string, input: DateIdeaDecisionInput) {
  await requireDatingAccount(userId);
  const { data, error } = await callDateIdeaRpc<{ date_idea_request_id: string; request_status: string; decided_at: string; date_idea_status: string; accepted_count: number }>('decide_date_idea_request', { p_actor_user_id: userId, p_date_idea_id: dateIdeaId, p_date_idea_request_id: requestId, p_accept: input.accept, p_response_note: input.responseNote ?? null });
  if (error) throwDateIdeaRpcError(error, 'Date Idea request could not be decided');
  const row = data?.[0]; if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea decision returned no result');
  return { id: row.date_idea_request_id, status: row.request_status, decidedAt: row.decided_at, dateIdeaStatus: row.date_idea_status, acceptedCount: row.accepted_count };
}

export async function closeDateIdea(userId: string, dateIdeaId: string) {
  await requireDatingAccount(userId);
  const { data, error } = await callDateIdeaRpc<{ date_idea_id: string; date_idea_status: string; closed_at: string }>('close_date_idea', { p_actor_user_id: userId, p_date_idea_id: dateIdeaId });
  if (error) throwDateIdeaRpcError(error, 'Date Idea could not be closed');
  const row = data?.[0]; if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Date Idea close returned no result');
  return { id: row.date_idea_id, status: row.date_idea_status, closedAt: row.closed_at };
}
