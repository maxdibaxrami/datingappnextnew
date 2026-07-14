import { z } from 'zod';

export const swipeInputSchema = z.object({
  actionType: z.enum(['like', 'pass', 'super_like', 'secret_crush']),
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
}).strict();

export const undoSwipeInputSchema = z.object({
  idempotencyKey: z.uuid(),
  targetUserId: z.uuid().optional(),
}).strict();

export type SwipeInput = z.infer<typeof swipeInputSchema>;
export type UndoSwipeInput = z.infer<typeof undoSwipeInputSchema>;
