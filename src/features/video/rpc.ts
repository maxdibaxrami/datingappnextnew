import 'server-only';

import { type PostgrestError } from '@supabase/supabase-js';

import { getSupabaseAdmin } from '@/lib/supabase/admin';

type RpcResponse<T> = Promise<{ data: T[] | null; error: PostgrestError | null }>;

export function callVideoRpc<T>(name: string, args: Record<string, unknown>): RpcResponse<T> {
  const rpc = getSupabaseAdmin().rpc as unknown as (
    fn: string,
    values: Record<string, unknown>,
  ) => RpcResponse<T>;
  return rpc(name, args);
}
