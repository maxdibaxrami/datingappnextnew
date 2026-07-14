import { type PostgrestError } from '@supabase/supabase-js';

import { ApiError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors/api-error';

export function throwDateIdeaRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete': throw new ApiError(403, 'PROFILE_INCOMPLETE', 'Complete the required profile fields first');
    case 'account_restricted': throw new ApiError(403, 'USER_RESTRICTED', 'This Date Idea action is restricted');
    case 'account_unavailable': throw new ApiError(403, 'FORBIDDEN', 'This account cannot use Date Ideas');
    case 'date_idea_unavailable': throw new NotFoundError('This Date Idea is not available');
    case 'date_idea_not_author': throw new ApiError(403, 'FORBIDDEN', 'Only the Date Idea author can perform this action');
    case 'date_idea_expired': throw new ApiError(409, 'DATE_IDEA_EXPIRED', 'This Date Idea has expired');
    case 'date_idea_full': throw new ApiError(409, 'DATE_IDEA_FULL', 'This Date Idea cannot accept more requests');
    case 'already_requested_date_idea': throw new ApiError(409, 'ALREADY_REQUESTED_DATE_IDEA', 'You already requested this Date Idea');
    case 'cannot_request_own_date_idea': throw new ValidationError('You cannot request your own Date Idea');
    case 'date_idea_request_not_found': throw new NotFoundError('This Date Idea request is not available');
    case 'date_idea_request_unavailable': throw new ConflictError('This Date Idea request is no longer available');
    case 'date_idea_request_not_pending': throw new ConflictError('This Date Idea request has already been decided');
    case 'date_idea_not_open': throw new ConflictError('This Date Idea is no longer open');
    case 'idempotency_conflict': throw new ConflictError('The idempotency key was already used for another request');
    case 'invalid_cursor': case 'invalid_geohash_prefix': case 'invalid_date_idea_input':
    case 'missing_date_idea_actor': throw new ValidationError('The Date Idea request is invalid');
    default: throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
