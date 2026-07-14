import { type PostgrestError } from '@supabase/supabase-js';

import { ApiError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors/api-error';

export function throwGiftRpcError(error: PostgrestError, fallback: string): never {
  switch (error.message) {
    case 'profile_incomplete': throw new ApiError(403, 'PROFILE_INCOMPLETE', 'Complete the required profile fields first');
    case 'account_restricted': throw new ApiError(403, 'USER_RESTRICTED', 'This gift action is restricted');
    case 'account_unavailable': throw new ApiError(403, 'FORBIDDEN', 'This account cannot use gifts');
    case 'gift_receiver_unavailable': throw new NotFoundError('This recipient is not available');
    case 'gift_interaction_blocked': throw new ApiError(403, 'GIFT_INTERACTION_BLOCKED', 'Gifts are unavailable for this interaction');
    case 'gift_unavailable': throw new NotFoundError('This gift is not available');
    case 'gift_provider_unavailable': throw new ApiError(409, 'PAYMENT_PROVIDER_UNAVAILABLE', 'This gift is not available with that payment provider');
    case 'idempotency_conflict': throw new ConflictError('This idempotency key was already used for a different gift request');
    case 'payment_not_found': throw new NotFoundError('This payment could not be found');
    case 'payment_mismatch': throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The payment does not match the gift request');
    case 'payment_not_payable': throw new ConflictError('This payment can no longer be completed');
    case 'provider_payment_reused': throw new ConflictError('This provider payment was already used');
    case 'payment_grant_inconsistent': throw new ApiError(500, 'INTERNAL_ERROR', 'The payment record is inconsistent');
    case 'aura_unavailable': throw new ApiError(404, 'AURA_UNAVAILABLE', 'This profile aura is not available');
    case 'invalid_gift_input': case 'invalid_aura_input': case 'invalid_payment_verification':
      throw new ValidationError('The gift or payment request is invalid');
    default: throw new ApiError(500, 'INTERNAL_ERROR', fallback);
  }
}
