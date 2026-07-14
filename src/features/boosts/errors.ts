import { type PostgrestError } from '@supabase/supabase-js';

import { ApiError, ConflictError, NotFoundError, ProfileIncompleteError, ValidationError } from '@/lib/errors/api-error';

export function throwBoostRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete': throw new ProfileIncompleteError([]);
    case 'account_restricted': throw new ApiError(403, 'USER_RESTRICTED', 'Boost features are restricted for this account');
    case 'account_unavailable': throw new ApiError(403, 'FORBIDDEN', 'This account cannot use boosts');
    case 'boost_product_unavailable': throw new NotFoundError('This boost product is not available');
    case 'boost_provider_unavailable': throw new ApiError(409, 'PAYMENT_PROVIDER_UNAVAILABLE', 'This boost is unavailable with that payment provider');
    case 'boost_unavailable': throw new NotFoundError('This boost is not available');
    case 'boost_not_active': throw new ConflictError('This boost is not active');
    case 'boost_not_paused': throw new ConflictError('This boost is not paused');
    case 'premium_not_active': throw new ApiError(403, 'FORBIDDEN', 'An active premium plan is required');
    case 'premium_feature_unavailable': throw new ApiError(403, 'FORBIDDEN', 'Your premium plan does not include boosts');
    case 'premium_feature_limit_reached': throw new ConflictError('Your premium boost allowance is exhausted');
    case 'idempotency_conflict': throw new ConflictError('This idempotency key was already used for a different boost purchase');
    case 'payment_not_found': throw new NotFoundError('This payment could not be found');
    case 'payment_mismatch': throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The payment does not match the boost request');
    case 'payment_not_payable': throw new ConflictError('This payment can no longer be completed');
    case 'provider_payment_reused': throw new ConflictError('This provider payment was already used');
    case 'payment_grant_inconsistent': throw new ApiError(500, 'INTERNAL_ERROR', 'The payment grant record is inconsistent');
    case 'invalid_boost_input':
    case 'invalid_boost_duration':
    case 'invalid_boost_metric_input':
    case 'invalid_cursor':
    case 'invalid_payment_verification':
      throw new ValidationError('The boost request is invalid');
    default: throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
