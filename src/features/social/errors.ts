import { type PostgrestError } from '@supabase/supabase-js';

import {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ProfileIncompleteError,
  ValidationError,
} from '@/lib/errors/api-error';

export function throwSocialRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete':
      throw new ProfileIncompleteError([]);
    case 'account_restricted':
      throw new ApiError(403, 'USER_RESTRICTED', 'This social action is restricted for the account');
    case 'account_unavailable':
      throw new ForbiddenError('This account cannot use social features');
    case 'follow_target_unavailable':
    case 'follow_unavailable':
    case 'follow_request_unavailable':
    case 'social_post_unavailable':
      throw new NotFoundError('This social resource is not available');
    case 'follow_request_cooldown':
      throw new ConflictError('This follow request was recently rejected. Please try again later');
    case 'invalid_follow_input':
    case 'invalid_follow_list_input':
    case 'invalid_social_post_input':
    case 'invalid_feed_input':
    case 'invalid_cursor':
      throw new ValidationError('The social request is invalid');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
