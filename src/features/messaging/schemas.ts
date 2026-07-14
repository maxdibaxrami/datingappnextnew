import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const boundedInteger = (minimum: number, maximum: number) => z.string().trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

const paginationSchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: boundedInteger(1, 100).default(20),
}).strict();

const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
}).strict();

export const sendConversationMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  clientMessageId: z.uuid(),
  replyToMessageId: z.uuid().optional(),
}).strict();

export const markConversationReadSchema = z.object({
  throughMessageId: z.uuid().optional(),
}).strict();

export const conversationNotificationSettingsSchema = z.object({
  mutedUntil: z.iso.datetime({ offset: true }).nullable(),
}).strict().superRefine((value, context) => {
  if (value.mutedUntil && Date.parse(value.mutedUntil) <= Date.now()) {
    context.addIssue({
      code: 'custom',
      path: ['mutedUntil'],
      message: 'mutedUntil must be in the future or null',
    });
  }
});

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

export interface CursorQuery {
  cursor?: string;
  limit: number;
}

export interface NotificationQuery extends CursorQuery {
  unreadOnly: boolean;
}

export function parseConversationQuery(searchParams: URLSearchParams): CursorQuery {
  assertAllowedKeys(searchParams, ['cursor', 'limit'], 'An unsupported conversation filter was provided');
  const parsed = paginationSchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Conversation cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Conversation limit cannot be repeated'),
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid conversation filters');
  }
  return parsed.data;
}

export function parseMessageQuery(searchParams: URLSearchParams): CursorQuery {
  assertAllowedKeys(searchParams, ['cursor', 'limit'], 'An unsupported message filter was provided');
  const parsed = paginationSchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Message cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Message limit cannot be repeated'),
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid message filters');
  }
  return parsed.data;
}

export function parseNotificationQuery(searchParams: URLSearchParams): NotificationQuery {
  assertAllowedKeys(searchParams, ['cursor', 'limit', 'unreadOnly'], 'An unsupported notification filter was provided');
  const parsed = notificationQuerySchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Notification cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Notification limit cannot be repeated'),
    unreadOnly: scalar(searchParams, 'unreadOnly', 'unreadOnly cannot be repeated'),
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid notification filters');
  }
  return parsed.data;
}

export function parseConversationId(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError('Conversation ID is invalid');
  return parsed.data;
}

export function parseNotificationId(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError('Notification ID is invalid');
  return parsed.data;
}

export type SendConversationMessageInput = z.infer<typeof sendConversationMessageSchema>;
export type MarkConversationReadInput = z.infer<typeof markConversationReadSchema>;
export type ConversationNotificationSettingsInput = z.infer<typeof conversationNotificationSettingsSchema>;
