import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const moderationTargetTypeSchema = z.enum([
  'user',
  'profile',
  'profile_photo',
  'post',
  'video_session',
]);

const moderationQueueStatusSchema = z.enum([
  'open',
  'assigned',
  'needs_more_info',
  'resolved',
  'dismissed',
  'escalated',
]);

const adminActionTypeSchema = z.enum([
  'warn_user',
  'hide_profile',
  'unhide_profile',
  'remove_photo',
  'restore_photo',
  'remove_post',
  'restore_post',
  'restrict_user',
  'lift_restriction',
  'ban_user',
  'unban_user',
  'verify_user',
  'reject_verification',
  'manual_note',
]);

const restrictionTypeSchema = z.enum([
  'no_swipe',
  'no_post',
  'no_video',
  'no_gift',
  'no_profile_edit',
  'no_telegram_open',
  'shadow_ban',
  'rate_limited',
  'view_only',
  'full_suspension',
]);

const boundedInteger = (minimum: number, maximum: number) => z.string().trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

export const createBlockSchema = z.object({
  blockedUserId: z.uuid(),
  reason: z.string().trim().min(1).max(500).optional(),
}).strict();

export const createReportSchema = z.object({
  targetType: moderationTargetTypeSchema,
  targetId: z.uuid(),
  reportedUserId: z.uuid().optional(),
  reason: z.string().trim().min(2).max(500),
  details: z.string().trim().min(1).max(4000).optional(),
}).strict().superRefine((value, context) => {
  if (value.targetType === 'video_session' && !value.reportedUserId) {
    context.addIssue({
      code: 'custom',
      path: ['reportedUserId'],
      message: 'A video report must identify the reported user',
    });
  }
  if (value.targetType !== 'video_session' && value.reportedUserId) {
    context.addIssue({
      code: 'custom',
      path: ['reportedUserId'],
      message: 'reportedUserId is only accepted for video-session reports',
    });
  }
});

export const assignModerationCaseSchema = z.object({
  assigneeUserId: z.uuid().optional(),
}).strict();

export const decideModerationCaseSchema = z.object({
  action: adminActionTypeSchema,
  note: z.string().trim().min(1).max(4000).optional(),
  restrictionType: restrictionTypeSchema.optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  publicMessage: z.string().trim().min(1).max(1000).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === 'restrict_user' && !value.restrictionType) {
    context.addIssue({
      code: 'custom',
      path: ['restrictionType'],
      message: 'A restriction action needs a restrictionType',
    });
  }
  if (value.action !== 'restrict_user' && value.restrictionType) {
    context.addIssue({
      code: 'custom',
      path: ['restrictionType'],
      message: 'restrictionType is only accepted for a restriction action',
    });
  }
  if (value.endsAt && Date.parse(value.endsAt) <= Date.now()) {
    context.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'endsAt must be in the future',
    });
  }
});

export interface CursorQuery {
  cursor?: string;
  limit: number;
}

export interface ModerationQueueQuery extends CursorQuery {
  assignedToMe: boolean;
  statuses: z.infer<typeof moderationQueueStatusSchema>[];
}

const cursorQuerySchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: boundedInteger(1, 100).default(50),
}).strict();

const ALLOWED_CURSOR_QUERY_KEYS = new Set(['cursor', 'limit']);
const ALLOWED_QUEUE_QUERY_KEYS = new Set(['assignedToMe', 'cursor', 'limit', 'status']);

function scalar(searchParams: URLSearchParams, key: string, message: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) {
    throw new ValidationError(message);
  }
  return values[0] ?? undefined;
}

function assertAllowedKeys(searchParams: URLSearchParams, keys: Set<string>, message: string): void {
  for (const key of searchParams.keys()) {
    if (!keys.has(key)) {
      throw new ValidationError(message);
    }
  }
}

export function parseCursorQuery(searchParams: URLSearchParams): CursorQuery {
  assertAllowedKeys(searchParams, ALLOWED_CURSOR_QUERY_KEYS, 'An unsupported moderation filter was provided');
  const parsed = cursorQuerySchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Moderation cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Moderation limit cannot be repeated'),
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid moderation filters');
  }
  return parsed.data;
}

export function parseModerationQueueQuery(searchParams: URLSearchParams): ModerationQueueQuery {
  assertAllowedKeys(searchParams, ALLOWED_QUEUE_QUERY_KEYS, 'An unsupported moderation queue filter was provided');
  const statusValues = searchParams.getAll('status')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = z.object({
    assignedToMe: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
    cursor: z.string().min(1).max(768).optional(),
    limit: boundedInteger(1, 100).default(50),
    statuses: z.array(moderationQueueStatusSchema).max(6).transform((items) => [...new Set(items)]),
  }).strict().safeParse({
    assignedToMe: scalar(searchParams, 'assignedToMe', 'assignedToMe cannot be repeated'),
    cursor: scalar(searchParams, 'cursor', 'Moderation cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Moderation limit cannot be repeated'),
    statuses: statusValues,
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid moderation queue filters');
  }
  return parsed.data;
}

export function parseUuid(value: string, label: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(`${label} is invalid`);
  }
  return parsed.data;
}

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AssignModerationCaseInput = z.infer<typeof assignModerationCaseSchema>;
export type DecideModerationCaseInput = z.infer<typeof decideModerationCaseSchema>;
