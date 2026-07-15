import { type PostgrestError } from '@supabase/supabase-js';

import {
  ApiError,
  ForbiddenError,
  NotFoundError,
  ProfileIncompleteError,
  ValidationError,
} from '@/lib/errors/api-error';

export function throwVideoRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete':
      throw new ProfileIncompleteError([]);
    case 'account_restricted':
      throw new ApiError(403, 'USER_RESTRICTED', 'Video chat is restricted for this account');
    case 'account_unavailable':
      throw new ForbiddenError('This account cannot use video chat');
    case 'video_unavailable':
      throw new ForbiddenError('Video chat needs a safe, discoverable profile photo');
    case 'video_session_unavailable':
      throw new NotFoundError('This video session is not available');
    case 'invalid_cursor':
    case 'invalid_video_queue_input':
    case 'invalid_video_signal_input':
    case 'invalid_video_end_input':
      throw new ValidationError('The video request is invalid');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
