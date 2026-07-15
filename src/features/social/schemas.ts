import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const postTypeSchema = z.enum(['text', 'question', 'confession', 'local_shout']);
const postVisibilitySchema = z.enum(['public', 'followers', 'country', 'city', 'nearby', 'global']);
const feedScopeSchema = z.enum(['following', 'discover']);
const followDirectionSchema = z.enum(['following', 'followers']);

const boundedInteger = (minimum: number, maximum: number) => z.string().trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

const cursorPaginationSchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: boundedInteger(1, 100).default(20),
}).strict();

const followListQuerySchema = cursorPaginationSchema.extend({
  direction: followDirectionSchema.default('following'),
}).strict();

const feedQuerySchema = cursorPaginationSchema.extend({
  scope: feedScopeSchema.default('following'),
}).strict();

export const followUserSchema = z.object({
  targetUserId: z.uuid(),
}).strict();

export const setFollowMutedSchema = z.object({
  muted: z.boolean(),
}).strict();

export const followDecisionSchema = z.object({
  accept: z.boolean(),
}).strict();

export const createSocialPostSchema = z.object({
  body: z.string().trim().min(1).max(2_000),
  clientPostId: z.uuid(),
  type: postTypeSchema.default('text'),
  visibility: postVisibilitySchema.default('public'),
}).strict();

function scalar(searchParams: URLSearchParams, key: string, message: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) throw new ValidationError(message);
  return values[0] ?? undefined;
}

function assertAllowedKeys(searchParams: URLSearchParams, allowedKeys: readonly string[], message: string): void {
  const allowed = new Set(allowedKeys);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) throw new ValidationError(message);
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? message);
  return parsed.data;
}

export function parseFollowListQuery(searchParams: URLSearchParams): FollowListQuery {
  assertAllowedKeys(searchParams, ['cursor', 'direction', 'limit'], 'An unsupported follow filter was provided');
  return parse(followListQuerySchema, {
    cursor: scalar(searchParams, 'cursor', 'Follow cursor cannot be repeated'),
    direction: scalar(searchParams, 'direction', 'Follow direction cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Follow limit cannot be repeated'),
  }, 'Invalid follow filters');
}

export function parsePendingFollowRequestQuery(searchParams: URLSearchParams): CursorQuery {
  assertAllowedKeys(searchParams, ['cursor', 'limit'], 'An unsupported follow-request filter was provided');
  return parse(cursorPaginationSchema, {
    cursor: scalar(searchParams, 'cursor', 'Follow-request cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Follow-request limit cannot be repeated'),
  }, 'Invalid follow-request filters');
}

export function parseFeedQuery(searchParams: URLSearchParams): FeedQuery {
  assertAllowedKeys(searchParams, ['cursor', 'limit', 'scope'], 'An unsupported feed filter was provided');
  return parse(feedQuerySchema, {
    cursor: scalar(searchParams, 'cursor', 'Feed cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Feed limit cannot be repeated'),
    scope: scalar(searchParams, 'scope', 'Feed scope cannot be repeated'),
  }, 'Invalid feed filters');
}

export function parseSocialUserId(value: string, label = 'User ID'): string {
  return parse(z.uuid(), value, `${label} is invalid`);
}

export function parseSocialPostId(value: string): string {
  return parse(z.uuid(), value, 'Post ID is invalid');
}

export type FollowUserInput = z.infer<typeof followUserSchema>;
export type SetFollowMutedInput = z.infer<typeof setFollowMutedSchema>;
export type FollowDecisionInput = z.infer<typeof followDecisionSchema>;
export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;
export interface CursorQuery {
  cursor?: string;
  limit: number;
}
export interface FollowListQuery extends CursorQuery {
  direction: z.infer<typeof followDirectionSchema>;
}
export interface FeedQuery extends CursorQuery {
  scope: z.infer<typeof feedScopeSchema>;
}
