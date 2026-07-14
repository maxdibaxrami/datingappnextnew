import { z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const candidateIdSchema = z.uuid();

export function parseDailyChemistryCandidateId(value: string): string {
  const parsed = candidateIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError('The Daily Chemistry candidate ID is invalid');
  }
  return parsed.data;
}
