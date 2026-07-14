import { NextResponse } from 'next/server';

import { ApiError, ProfileIncompleteError } from '@/lib/errors/api-error';

export function jsonData<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ProfileIncompleteError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          missingFields: error.missingFields,
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error('Unhandled API error', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 },
  );
}

export async function handleApiRequest(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return jsonError(error);
  }
}
