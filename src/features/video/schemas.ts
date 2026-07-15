import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const videoModeSchema = z.enum([
  'global',
  'country',
  'city',
  'nearby',
  'same_language',
  'same_interest',
]);

const videoSignalTypeSchema = z.enum(['offer', 'answer', 'ice_candidate', 'hangup']);

const boundedInteger = (minimum: number, maximum: number) => z.string().trim()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(minimum).max(maximum));

const signalQuerySchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: boundedInteger(1, 100).default(50),
}).strict();

export const joinVideoQueueSchema = z.object({
  mode: videoModeSchema,
}).strict();

export const videoSignalSchema = z.object({
  clientSignalId: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
  type: videoSignalTypeSchema,
}).strict();

export const endVideoSessionSchema = z.object({
  reason: z.enum(['completed', 'skipped', 'left', 'failed']),
}).strict();

function scalar(searchParams: URLSearchParams, key: string, message: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) throw new ValidationError(message);
  return values[0] ?? undefined;
}

function assertAllowedKeys(searchParams: URLSearchParams): void {
  for (const key of searchParams.keys()) {
    if (key !== 'cursor' && key !== 'limit') {
      throw new ValidationError('An unsupported video signal filter was provided');
    }
  }
}

export interface SignalQuery {
  cursor?: string;
  limit: number;
}

export function parseSignalQuery(searchParams: URLSearchParams): SignalQuery {
  assertAllowedKeys(searchParams);
  const parsed = signalQuerySchema.safeParse({
    cursor: scalar(searchParams, 'cursor', 'Signal cursor cannot be repeated'),
    limit: scalar(searchParams, 'limit', 'Signal limit cannot be repeated'),
  });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid video signal filters');
  }
  return parsed.data;
}

export function parseVideoSessionId(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ValidationError('Video session ID is invalid');
  return parsed.data;
}

export type JoinVideoQueueInput = z.infer<typeof joinVideoQueueSchema>;
export type VideoSignalInput = z.infer<typeof videoSignalSchema>;
export type EndVideoSessionInput = z.infer<typeof endVideoSessionSchema>;
