import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { ApiError, ProfileIncompleteError } from '@/lib/errors/api-error';

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

function responseHeaders(): HeadersInit {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestContext.getStore()?.requestId ?? randomUUID(),
  };
}

export function jsonData<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { headers: responseHeaders(), status });
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
      { headers: responseHeaders(), status: error.status },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { headers: responseHeaders(), status: error.status },
    );
  }

  const requestId = requestContext.getStore()?.requestId ?? randomUUID();
  console.error('Unhandled API error', { error, requestId });
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    {
      headers: { ...responseHeaders(), 'X-Request-Id': requestId },
      status: 500,
    },
  );
}

export async function handleApiRequest(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return requestContext.run({ requestId: randomUUID() }, async () => {
    try {
      return await handler();
    } catch (error) {
      return jsonError(error);
    }
  });
}
