import { z } from 'zod';

export const swipeInputSchema = z.object({
  actionType: z.enum(['like', 'pass', 'super_like', 'secret_crush']),
  candidateId: z.uuid().optional(),
  idempotencyKey: z.uuid(),
  sourceSurface: z.enum([
    'cards',
    'explore',
    'nearby',
    'feed',
    'leaderboard',
    'daily_chemistry',
    'date_ideas',
  ]).default('cards'),
  targetUserId: z.uuid(),
}).strict().superRefine((value, context) => {
  const isDailyChemistry = value.sourceSurface === 'daily_chemistry';
  if (isDailyChemistry && !value.candidateId) {
    context.addIssue({
      code: 'custom',
      message: 'Daily Chemistry swipes require a candidate ID',
      path: ['candidateId'],
    });
  }
  if (!isDailyChemistry && value.candidateId) {
    context.addIssue({
      code: 'custom',
      message: 'Candidate IDs are only valid for Daily Chemistry swipes',
      path: ['candidateId'],
    });
  }
});

export const undoSwipeInputSchema = z.object({
  idempotencyKey: z.uuid(),
  targetUserId: z.uuid().optional(),
}).strict();

export type SwipeInput = z.infer<typeof swipeInputSchema>;
export type UndoSwipeInput = z.infer<typeof undoSwipeInputSchema>;
