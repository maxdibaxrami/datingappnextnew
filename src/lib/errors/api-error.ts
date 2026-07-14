export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'PROFILE_INCOMPLETE'
  | 'USER_BANNED'
  | 'USER_RESTRICTED'
  | 'STORAGE_ERROR';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'The request is invalid', options?: ErrorOptions) {
    super(400, 'VALIDATION_ERROR', message, options);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication is required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You are not allowed to perform this action') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'The requested resource was not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'The request conflicts with the current state') {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests. Please try again later') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class StorageError extends ApiError {
  constructor(message = 'The media operation could not be completed', options?: ErrorOptions) {
    super(500, 'STORAGE_ERROR', message, options);
  }
}

export class ProfileIncompleteError extends ApiError {
  constructor(public readonly missingFields: readonly string[]) {
    super(403, 'PROFILE_INCOMPLETE', 'Complete the required profile fields first');
  }
}
