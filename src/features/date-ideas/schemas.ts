import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const dateIdeaTypeSchema = z.enum([
  'coffee', 'walk', 'study', 'dinner', 'movie', 'gym', 'museum', 'party', 'video_call', 'custom',
]);
const visibilitySchema = z.enum(['city', 'nearby', 'country', 'global', 'followers', 'matches_only']);
const requestStatusSchema = z.enum(['requested', 'accepted', 'rejected', 'cancelled', 'expired']);
const boundedList = (maximumItems: number) => z.array(z.string().trim().min(1).max(60))
  .max(maximumItems).transform((values) => [...new Set(values)]);

export const createDateIdeaSchema = z.object({
  body: z.string().trim().max(1000).optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  ideaType: dateIdeaTypeSchema,
  interestTags: boundedList(30).default([]),
  languageCodes: boundedList(10).default([]),
  lookingForGenders: boundedList(5).default([]),
  maxAge: z.number().int().min(18).max(100).optional(),
  maxRequests: z.number().int().min(1).max(20).default(20),
  minAge: z.number().int().min(18).max(100).optional(),
  relationshipGoals: boundedList(10).default([]),
  scheduledFor: z.iso.datetime({ offset: true }).optional(),
  title: z.string().trim().min(3).max(120),
  visibility: visibilitySchema.default('city'),
}).strict().refine(
  (value) => value.minAge === undefined || value.maxAge === undefined || value.minAge <= value.maxAge,
  { message: 'Minimum age cannot be greater than maximum age' },
);

export const createDateIdeaRequestSchema = z.object({
  idempotencyKey: z.uuid(),
  message: z.string().trim().max(500).optional(),
}).strict();

export const dateIdeaDecisionSchema = z.object({
  accept: z.boolean(),
  responseNote: z.string().trim().max(500).optional(),
}).strict();

const optionalInteger = (minimum: number, maximum: number) => z.string().trim().regex(/^\d+$/)
  .transform(Number).pipe(z.number().int().min(minimum).max(maximum)).optional();

export const dateIdeaQuerySchema = z.object({
  cityName: z.string().trim().min(1).max(120).optional(),
  countryCode: z.string().trim().length(2).regex(/^[a-z]{2}$/i)
    .transform((value) => value.toUpperCase()).optional(),
  cursor: z.string().min(1).max(768).optional(),
  geohashPrefix: z.string().trim().toLowerCase()
    .regex(/^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$/).optional(),
  ideaTypes: z.array(dateIdeaTypeSchema).max(10).transform((values) => [...new Set(values)]),
  limit: optionalInteger(1, 50).default(20),
}).strict();

export const dateIdeaRequestsQuerySchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: optionalInteger(1, 50).default(20),
  statuses: z.array(requestStatusSchema).max(5).transform((values) => [...new Set(values)]),
}).strict();

export type CreateDateIdeaInput = z.infer<typeof createDateIdeaSchema>;
export type CreateDateIdeaRequestInput = z.infer<typeof createDateIdeaRequestSchema>;
export type DateIdeaDecisionInput = z.infer<typeof dateIdeaDecisionSchema>;
export type DateIdeaQuery = z.infer<typeof dateIdeaQuerySchema>;
export type DateIdeaRequestsQuery = z.infer<typeof dateIdeaRequestsQuerySchema>;

function scalar(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (values.length > 1) throw new ValidationError(`Date Idea ${key} cannot be repeated`);
  return values[0] ?? undefined;
}

function list(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
}

function parse<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? message);
  return parsed.data;
}

export function parseDateIdeaQuery(params: URLSearchParams): DateIdeaQuery {
  const permitted = new Set(['cityName', 'countryCode', 'cursor', 'geohashPrefix', 'ideaType', 'limit']);
  for (const key of params.keys()) if (!permitted.has(key)) throw new ValidationError('An unsupported Date Idea filter was provided');
  return parse(dateIdeaQuerySchema, {
    cityName: scalar(params, 'cityName'), countryCode: scalar(params, 'countryCode'),
    cursor: scalar(params, 'cursor'), geohashPrefix: scalar(params, 'geohashPrefix'),
    ideaTypes: list(params, 'ideaType'), limit: scalar(params, 'limit'),
  }, 'Invalid Date Idea filters');
}

export function parseDateIdeaRequestsQuery(params: URLSearchParams): DateIdeaRequestsQuery {
  const permitted = new Set(['cursor', 'limit', 'status']);
  for (const key of params.keys()) if (!permitted.has(key)) throw new ValidationError('An unsupported request filter was provided');
  return parse(dateIdeaRequestsQuerySchema, {
    cursor: scalar(params, 'cursor'), limit: scalar(params, 'limit'), statuses: list(params, 'status'),
  }, 'Invalid Date Idea request filters');
}

export function parseUuid(value: string, label: string): string {
  return parse(z.uuid(), value, `Invalid ${label}`);
}
