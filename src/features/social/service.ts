import 'server-only';

import { z } from 'zod';

import { requireSocialAccount, requireSocialPostingAccount } from '@/lib/auth/guards';
import { ApiError } from '@/lib/errors/api-error';
import { decodeOpaqueCursor, encodeOpaqueCursor } from '@/lib/pagination/cursor';

import { throwSocialRpcError } from './errors';
import { callSocialRpc } from './rpc';
import {
  type CreateSocialPostInput,
  type CursorQuery,
  type FeedQuery,
  type FollowDecisionInput,
  type FollowListQuery,
  type FollowUserInput,
  type SetFollowMutedInput,
} from './schemas';

const relationshipCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  userId: z.uuid(),
  version: z.literal(1),
}).strict();

const feedCursorSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  postId: z.uuid(),
  version: z.literal(1),
}).strict();

interface FollowMutationRow {
  following_user_id: string;
  follow_status: string;
  accepted_at: string | null;
  already_following: boolean;
}

interface UnfollowRow {
  following_user_id: string;
  removed: boolean;
}

interface FollowMuteRow {
  following_user_id: string;
  follow_status: string;
  muted_at: string | null;
}

interface FollowDecisionRow {
  follower_user_id: string;
  follow_status: string;
  decided_at: string;
}

interface RelationshipRow {
  relationship_user_id: string;
  follow_status: string;
  created_at: string;
  accepted_at: string | null;
  muted_at: string | null;
  display_name: string;
  age_years: number;
  country_code: string;
  city_name: string;
  primary_photo_url: string | null;
  primary_photo_blur_hash: string | null;
}

interface PendingFollowRequestRow {
  follower_user_id: string;
  requested_at: string;
  display_name: string;
  age_years: number;
  country_code: string;
  city_name: string;
  primary_photo_url: string | null;
  primary_photo_blur_hash: string | null;
}

interface SocialPostRow {
  post_id: string;
  post_type: string;
  visibility: string;
  created_at: string;
  already_created: boolean;
}

interface FeedRow {
  post_id: string;
  author_user_id: string;
  body: string;
  post_type: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
  liked_by_actor: boolean;
  display_name: string;
  age_years: number;
  country_code: string;
  city_name: string;
  primary_photo_url: string | null;
  primary_photo_blur_hash: string | null;
}

interface DeletedPostRow {
  post_id: string;
  deleted_at: string;
  already_deleted: boolean;
}

interface PostLikeRow {
  post_id: string;
  liked: boolean;
  like_count: number;
}

function requireRow<T>(row: T | undefined, message: string): T {
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', message);
  return row;
}

function mapProfile(row: {
  relationship_user_id?: string;
  follower_user_id?: string;
  display_name: string;
  age_years: number;
  country_code: string;
  city_name: string;
  primary_photo_url: string | null;
  primary_photo_blur_hash: string | null;
}) {
  return {
    userId: row.relationship_user_id ?? row.follower_user_id,
    displayName: row.display_name,
    ageYears: row.age_years,
    countryCode: row.country_code,
    cityName: row.city_name,
    primaryPhoto: row.primary_photo_url
      ? { url: row.primary_photo_url, blurHash: row.primary_photo_blur_hash }
      : null,
  };
}

export async function followUser(userId: string, input: FollowUserInput) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<FollowMutationRow>('follow_user', {
    p_actor_user_id: userId,
    p_target_user_id: input.targetUserId,
  });
  if (error) throwSocialRpcError(error, 'The follow could not be saved');
  const row = requireRow(data?.[0], 'The follow operation returned no result');
  return {
    followingUserId: row.following_user_id,
    status: row.follow_status,
    acceptedAt: row.accepted_at,
    alreadyFollowing: row.already_following,
  };
}

export async function unfollowUser(userId: string, targetUserId: string) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<UnfollowRow>('unfollow_user', {
    p_actor_user_id: userId,
    p_target_user_id: targetUserId,
  });
  if (error) throwSocialRpcError(error, 'The follow could not be removed');
  const row = requireRow(data?.[0], 'The unfollow operation returned no result');
  return { followingUserId: row.following_user_id, removed: row.removed };
}

export async function setFollowMuted(userId: string, targetUserId: string, input: SetFollowMutedInput) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<FollowMuteRow>('set_follow_muted', {
    p_actor_user_id: userId,
    p_target_user_id: targetUserId,
    p_muted: input.muted,
  });
  if (error) throwSocialRpcError(error, 'The follow mute setting could not be saved');
  const row = requireRow(data?.[0], 'The follow mute operation returned no result');
  return { followingUserId: row.following_user_id, status: row.follow_status, mutedAt: row.muted_at };
}

export async function decideFollowRequest(userId: string, followerUserId: string, input: FollowDecisionInput) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<FollowDecisionRow>('decide_follow_request', {
    p_actor_user_id: userId,
    p_follower_user_id: followerUserId,
    p_accept: input.accept,
  });
  if (error) throwSocialRpcError(error, 'The follow request could not be decided');
  const row = requireRow(data?.[0], 'The follow decision returned no result');
  return { followerUserId: row.follower_user_id, status: row.follow_status, decidedAt: row.decided_at };
}

export async function listFollowRelationships(userId: string, query: FollowListQuery) {
  await requireSocialAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, relationshipCursorSchema) : null;
  const { data, error } = await callSocialRpc<RelationshipRow>('get_follow_relationships', {
    p_actor_user_id: userId,
    p_direction: query.direction,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_user_id: cursor?.userId ?? null,
  });
  if (error) throwSocialRpcError(error, 'Follow relationships could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    direction: query.direction,
    items: pageRows.map((row) => ({
      status: row.follow_status,
      createdAt: row.created_at,
      acceptedAt: row.accepted_at,
      mutedAt: row.muted_at,
      profile: mapProfile(row),
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, userId: last.relationship_user_id, version: 1 })
      : null,
  };
}

export async function listPendingFollowRequests(userId: string, query: CursorQuery) {
  await requireSocialAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, relationshipCursorSchema) : null;
  const { data, error } = await callSocialRpc<PendingFollowRequestRow>('get_pending_follow_requests', {
    p_actor_user_id: userId,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_follower_user_id: cursor?.userId ?? null,
  });
  if (error) throwSocialRpcError(error, 'Follow requests could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map((row) => ({ requestedAt: row.requested_at, profile: mapProfile(row) })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.requested_at, userId: last.follower_user_id, version: 1 })
      : null,
  };
}

export async function createSocialPost(userId: string, input: CreateSocialPostInput) {
  await requireSocialPostingAccount(userId);
  const { data, error } = await callSocialRpc<SocialPostRow>('create_social_post', {
    p_actor_user_id: userId,
    p_body: input.body,
    p_client_post_id: input.clientPostId,
    p_post_type: input.type,
    p_visibility: input.visibility,
  });
  if (error) throwSocialRpcError(error, 'The post could not be created');
  const row = requireRow(data?.[0], 'The post operation returned no result');
  return {
    id: row.post_id,
    type: row.post_type,
    visibility: row.visibility,
    createdAt: row.created_at,
    alreadyCreated: row.already_created,
  };
}

export async function getSocialFeed(userId: string, query: FeedQuery) {
  await requireSocialAccount(userId);
  const cursor = query.cursor ? decodeOpaqueCursor(query.cursor, feedCursorSchema) : null;
  const { data, error } = await callSocialRpc<FeedRow>('get_social_feed', {
    p_actor_user_id: userId,
    p_scope: query.scope,
    p_limit: query.limit + 1,
    p_cursor_created_at: cursor?.createdAt ?? null,
    p_cursor_post_id: cursor?.postId ?? null,
  });
  if (error) throwSocialRpcError(error, 'The social feed could not be loaded');
  const rows = data ?? [];
  const pageRows = rows.slice(0, query.limit);
  const last = pageRows.at(-1);
  return {
    scope: query.scope,
    items: pageRows.map((row) => ({
      id: row.post_id,
      body: row.body,
      type: row.post_type,
      visibility: row.visibility,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      counts: { likes: row.like_count, replies: row.reply_count, reposts: row.repost_count },
      likedByMe: row.liked_by_actor,
      author: {
        userId: row.author_user_id,
        displayName: row.display_name,
        ageYears: row.age_years,
        countryCode: row.country_code,
        cityName: row.city_name,
        primaryPhoto: row.primary_photo_url
          ? { url: row.primary_photo_url, blurHash: row.primary_photo_blur_hash }
          : null,
      },
    })),
    nextCursor: rows.length > query.limit && last
      ? encodeOpaqueCursor({ createdAt: last.created_at, postId: last.post_id, version: 1 })
      : null,
  };
}

export async function deleteOwnSocialPost(userId: string, postId: string) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<DeletedPostRow>('delete_own_social_post', {
    p_actor_user_id: userId,
    p_post_id: postId,
  });
  if (error) throwSocialRpcError(error, 'The post could not be deleted');
  const row = requireRow(data?.[0], 'The delete operation returned no result');
  return { id: row.post_id, deletedAt: row.deleted_at, alreadyDeleted: row.already_deleted };
}

export async function setSocialPostLike(userId: string, postId: string, liked: boolean) {
  await requireSocialAccount(userId);
  const { data, error } = await callSocialRpc<PostLikeRow>('set_social_post_like', {
    p_actor_user_id: userId,
    p_post_id: postId,
    p_liked: liked,
  });
  if (error) throwSocialRpcError(error, 'The post like could not be saved');
  const row = requireRow(data?.[0], 'The post like operation returned no result');
  return { id: row.post_id, liked: row.liked, likeCount: row.like_count };
}
