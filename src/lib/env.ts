import 'server-only';

import { z } from 'zod';

const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_AUTH_SECRET: z.string().min(32),
  TELEGRAM_PAYMENT_WEBHOOK_SECRET: z.string().min(20).optional(),
  TON_PAYMENT_RECEIVER_ADDRESS: z.string().min(8).optional(),
  TON_PAYMENT_NETWORK: z.enum(['ton_mainnet', 'ton_testnet']).default('ton_mainnet'),
  TONAPI_BASE_URL: z.url().optional(),
  TONAPI_KEY: z.string().min(10).optional(),
  RATE_LIMIT_SECRET: z.string().min(32),
  APP_ORIGINS: z.string().min(1),
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & {
  allowedOrigins: readonly string[];
};

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error('Invalid server environment configuration: ' + missing);
  }

  const allowedOrigins = parsed.data.APP_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);

  if (allowedOrigins.length === 0) {
    throw new Error('APP_ORIGINS must contain at least one valid origin');
  }

  cachedEnv = { ...parsed.data, allowedOrigins };
  return cachedEnv;
}
