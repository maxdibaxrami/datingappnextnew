import { type PostgrestError } from '@supabase/supabase-js';

import { ApiError, ConflictError, NotFoundError, ProfileIncompleteError, ValidationError } from '@/lib/errors/api-error';

export function throwPremiumRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete':
      throw new ProfileIncompleteError([]);
    case 'account_restricted':
      throw new ApiError(403, 'USER_RESTRICTED', 'Premium features are restricted for this account');
    case 'account_unavailable':
      throw new ApiError(403, 'FORBIDDEN', 'This account cannot use premium features');
    case 'premium_plan_unavailable':
      throw new NotFoundError('This premium plan is not available');
    case 'premium_provider_unavailable':
      throw new ApiError(409, 'PAYMENT_PROVIDER_UNAVAILABLE', 'This plan is not available with that payment provider');
    case 'premium_not_active':
      throw new ApiError(403, 'FORBIDDEN', 'An active premium plan is required');
    case 'premium_feature_unavailable':
      throw new ApiError(403, 'FORBIDDEN', 'This premium feature is not included in your plan');
    case 'premium_feature_limit_reached':
      throw new ConflictError('The premium feature limit has been reached for this period');
    case 'idempotency_conflict':
      throw new ConflictError('This idempotency key was already used for a different purchase');
    case 'payment_not_found':
      throw new NotFoundError('This payment could not be found');
    case 'payment_mismatch':
      throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The payment does not match the purchase request');
    case 'payment_not_payable':
      throw new ConflictError('This payment can no longer be completed');
    case 'provider_payment_reused':
      throw new ConflictError('This provider payment was already used');
    case 'payment_grant_inconsistent':
      throw new ApiError(500, 'INTERNAL_ERROR', 'The payment grant record is inconsistent');
    case 'invalid_premium_input':
    case 'invalid_payment_verification':
      throw new ValidationError('The premium request is invalid');
    default:
      throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
