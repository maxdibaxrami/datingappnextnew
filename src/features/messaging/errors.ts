import { type PostgrestError } from '@supabase/supabase-js';

import {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ProfileIncompleteError,
  ValidationError,
} from '@/lib/errors/api-error';

export function throwMessagingRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete':
      throw new ProfileIncompleteError([]);
    case 'account_restricted':
      throw new ApiError(403, 'USER_RESTRICTED', 'Messaging is restricted for this account');
    case 'account_unavailable':
      throw new ForbiddenError('This account cannot use messaging');
    case 'conversation_unavailable':
      throw new NotFoundError('This conversation is not available');
    case 'message_unavailable':
      throw new NotFoundError('This message is not available');
    case 'notification_unavailable':
      throw new NotFoundError('This notification is not available');
    case 'idempotency_conflict':
      throw new ConflictError('This client message ID was already used in another conversation');
    case 'reply_message_unavailable':
      throw new NotFoundError('The message being replied to is not available');
    case 'invalid_conversation_input':
    case 'invalid_message_input':
    case 'invalid_cursor':
    case 'invalid_notification_settings':
      throw new ValidationError('The messaging request is invalid');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
