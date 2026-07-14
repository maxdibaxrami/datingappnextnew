import 'server-only';

import { ApiError, ForbiddenError, ProfileIncompleteError, UnauthorizedError } from '@/lib/errors/api-error';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.generated';

type UserRole = Database['public']['Enums']['user_role'];
type UserStatus = Database['public']['Enums']['user_status'];
type Restriction = Database['public']['Enums']['user_restriction_type'];

export interface AccountGate {
  isBanned: boolean;
  profileCompletedAt: string | null;
  restrictions: Restriction[];
  role: UserRole;
  status: UserStatus;
  userId: string;
}

export async function getAccountGate(userId: string): Promise<AccountGate> {
  const { data, error } = await getSupabaseAdmin().rpc('get_account_gate_state', {
    p_user_id: userId,
  });
  if (error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The account state could not be loaded');
  }
  const row = data[0];
  if (!row) {
    throw new UnauthorizedError('The application account does not exist');
  }
  return {
    isBanned: row.is_banned,
    profileCompletedAt: row.profile_completed_at ?? null,
    restrictions: row.restrictions,
    role: row.role,
    status: row.status,
    userId: row.user_id,
  };
}

export interface AccountGuardOptions {
  completedProfile?: boolean;
  denyRestrictions?: readonly Restriction[];
}

export async function requireUsableAccount(
  userId: string,
  options: AccountGuardOptions = {},
): Promise<AccountGate> {
  const gate = await getAccountGate(userId);

  if (gate.isBanned || gate.status === 'banned') {
    throw new ApiError(403, 'USER_BANNED', 'This account is banned');
  }
  if (gate.status === 'deleted') {
    throw new UnauthorizedError('This account is no longer available');
  }
  if (gate.status !== 'active') {
    throw new ForbiddenError('This account is currently paused');
  }

  const denied = new Set<Restriction>([
    'full_suspension',
    'view_only',
    ...(options.denyRestrictions ?? []),
  ]);
  if (gate.restrictions.some((restriction) => denied.has(restriction))) {
    throw new ApiError(403, 'USER_RESTRICTED', 'This action is restricted for the account');
  }

  if (options.completedProfile && !gate.profileCompletedAt) {
    throw new ProfileIncompleteError([]);
  }
  return gate;
}

export async function requireProfileEditor(userId: string): Promise<AccountGate> {
  return requireUsableAccount(userId, { denyRestrictions: ['no_profile_edit'] });
}

export async function requireDatingAccount(userId: string): Promise<AccountGate> {
  return requireUsableAccount(userId, {
    completedProfile: true,
    denyRestrictions: ['no_swipe'],
  });
}
