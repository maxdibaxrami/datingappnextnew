import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getServerEnv } from '@/lib/env';
import { type Database } from '@/types/database.generated';

export function createSupabaseAuthClient(): SupabaseClient<Database> {
  const env = getServerEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
