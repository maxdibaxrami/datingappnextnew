import { type PostgrestError } from '@supabase/supabase-js';

import {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ProfileIncompleteError,
  ValidationError,
} from '@/lib/errors/api-error';

export function throwDatingRpcError(
  error: PostgrestError,
  fallbackMessage: string,
): never {
  switch (error.message) {
    case 'profile_incomplete':
      throw new ProfileIncompleteError([]);
    case 'account_restricted':
      throw new ApiError(403, 'USER_RESTRICTED', 'This dating action is restricted');
    case 'account_unavailable':
      throw new ForbiddenError('This account cannot use dating features');
    case 'target_unavailable':
      throw new NotFoundError('The profile is not available');
    case 'already_swiped':
      throw new ApiError(409, 'ALREADY_SWIPED', 'You already acted on this profile');
    case 'already_matched':
      throw new ApiError(409, 'ALREADY_MATCHED', 'You are already matched with this user');
    case 'insufficient_super_likes':
      throw new ApiError(
        409,
        'INSUFFICIENT_SUPER_LIKES',
        'No super-likes are currently available',
      );
    case 'no_swipe_to_undo':
    case 'undo_window_expired':
    case 'matched_swipe_cannot_be_undone':
      throw new ApiError(
        409,
        'UNDO_NOT_AVAILABLE',
        'The most recent swipe can no longer be undone',
      );
    case 'idempotency_conflict':
      throw new ConflictError('The idempotency key was already used for another action');
    case 'invalid_cursor':
    case 'invalid_age_range':
    case 'invalid_geohash_prefix':
    case 'invalid_swipe_action':
    case 'cannot_swipe_self':
    case 'missing_swipe_input':
    case 'missing_undo_input':
    case 'invalid_undo_window':
      throw new ValidationError('The dating request is invalid');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallbackMessage);
  }
}
