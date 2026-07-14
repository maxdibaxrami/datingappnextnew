import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const genderSchema = z.enum([
  'woman',
  'man',
  'non_binary',
  'other',
  'prefer_not_to_say',
]);

const optionalInteger = (minimum: number, maximum: number) =>
  z.string().trim().regex(/^\d+$/).transform(Number)
    .pipe(z.number().int().min(minimum).max(maximum))
    .optional();

const normalizedFilterList = (maximumItems: number) =>
  z.array(z.string().trim().min(1).max(60))
    .max(maximumItems)
    .transform((items) => [...new Set(items)]);

export const discoveryQuerySchema = z.object({
  cityName: z.string().trim().min(1).max(120).optional(),
  countryCode: z.string().trim().length(2).regex(/^[a-z]{2}$/i)
    .transform((value) => value.toUpperCase()).optional(),
  cursor: z.string().min(1).max(768).optional(),
  genders: z.array(genderSchema).max(5)
    .transform((items) => [...new Set(items)]),
  geohashPrefix: z.string().trim().toLowerCase()
    .regex(/^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$/).optional(),
  interests: normalizedFilterList(30),
  languages: normalizedFilterList(10),
  limit: optionalInteger(1, 50).default(20),
  maxAge: optionalInteger(18, 100),
  minAge: optionalInteger(18, 100),
  relationshipGoals: normalizedFilterList(10),
}).strict().refine(
  (value) => (
    value.minAge === undefined
    || value.maxAge === undefined
    || value.minAge <= value.maxAge
  ),
  { message: 'Minimum age cannot be greater than maximum age' },
);

export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;

const ALLOWED_QUERY_KEYS = new Set([
  'cityName',
  'countryCode',
  'cursor',
  'gender',
  'geohashPrefix',
  'interest',
  'language',
  'limit',
  'maxAge',
  'minAge',
  'relationshipGoal',
]);

function readScalar(searchParams: URLSearchParams, key: string): string | undefined {
  const values = searchParams.getAll(key);
  if (values.length > 1) {
    throw new ValidationError('Discovery scalar filters cannot be repeated');
  }
  return values[0] ?? undefined;
}

function readList(searchParams: URLSearchParams, key: string): string[] {
  return searchParams.getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseDiscoveryQuery(searchParams: URLSearchParams): DiscoveryQuery {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw new ValidationError('An unsupported discovery filter was provided');
    }
  }

  const rawQuery = {
    cityName: readScalar(searchParams, 'cityName'),
    countryCode: readScalar(searchParams, 'countryCode'),
    cursor: readScalar(searchParams, 'cursor'),
    genders: readList(searchParams, 'gender'),
    geohashPrefix: readScalar(searchParams, 'geohashPrefix'),
    interests: readList(searchParams, 'interest'),
    languages: readList(searchParams, 'language'),
    limit: readScalar(searchParams, 'limit'),
    maxAge: readScalar(searchParams, 'maxAge'),
    minAge: readScalar(searchParams, 'minAge'),
    relationshipGoals: readList(searchParams, 'relationshipGoal'),
  };
  const parsed = discoveryQuerySchema.safeParse(Object.fromEntries(
    Object.entries(rawQuery).filter((entry) => entry[1] !== undefined),
  ));

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid discovery filters');
  }
  return parsed.data;
}
