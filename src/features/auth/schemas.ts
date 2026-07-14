import { z } from 'zod';

export const telegramLoginSchema = z.object({
  initData: z.string().min(1).max(8 * 1024),
}).strict();

export type TelegramLoginInput = z.infer<typeof telegramLoginSchema>;
