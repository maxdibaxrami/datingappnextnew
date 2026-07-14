import { type PostgrestError } from '@supabase/supabase-js';

import { ApiError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors/api-error';

export function throwModerationRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'account_unavailable':
      throw new ForbiddenError('This account cannot perform that action');
    case 'moderator_required':
      throw new ForbiddenError('Moderator access is required');
    case 'block_target_unavailable':
    case 'report_target_unavailable':
      throw new NotFoundError('The reported account or content is not available');
    case 'moderation_case_unavailable':
      throw new NotFoundError('This moderation case is no longer available');
    case 'cannot_report_self':
      throw new ValidationError('You cannot report yourself');
    case 'invalid_block_input':
    case 'invalid_cursor':
    case 'invalid_moderation_action':
    case 'invalid_moderation_action_target':
    case 'invalid_moderation_input':
    case 'invalid_report_input':
    case 'moderation_target_missing':
    case 'restriction_type_required':
      throw new ValidationError('The moderation request is invalid');
    case 'refund_requires_payment_adapter':
      throw new ConflictError('Payment refunds must be processed through the payment provider');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
