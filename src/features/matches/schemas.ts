import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const matchQuerySchema = z.object({
  cursor: z.string().min(1).max(768).optional(),
  limit: z.string().trim().regex(/^\d+$/).transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .optional()
    .default(20),
}).strict();

export type MatchQuery = z.infer<typeof matchQuerySchema>;

export function parseMatchQuery(searchParams: URLSearchParams): MatchQuery {
  for (const key of searchParams.keys()) {
    if (key !== 'cursor' && key !== 'limit') {
      throw new ValidationError('An unsupported match filter was provided');
    }
  }
  if (searchParams.getAll('cursor').length > 1 || searchParams.getAll('limit').length > 1) {
    throw new ValidationError('Match pagination values cannot be repeated');
  }

  const rawQuery = {
    cursor: searchParams.get('cursor') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  };
  const parsed = matchQuerySchema.safeParse(Object.fromEntries(
    Object.entries(rawQuery).filter((entry) => entry[1] !== undefined),
  ));
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid match pagination');
  }
  return parsed.data;
}
