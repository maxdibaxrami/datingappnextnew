import 'server-only';

import { ApiError } from '@/lib/errors/api-error';
import { getServerEnv } from '@/lib/env';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
}

async function telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const { TELEGRAM_BOT_TOKEN: token } = getServerEnv();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
  });
  const result = await response.json().catch(() => null) as TelegramApiResponse<T> | null;
  if (!response.ok || !result?.ok || result.result === undefined) {
    throw new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Telegram Stars is temporarily unavailable');
  }
  return result.result;
}

export async function createTelegramStarsInvoiceLink(input: {
  title: string;
  description: string | null;
  invoicePayload: string;
  amountStars: number;
}): Promise<string> {
  return telegramApi<string>('createInvoiceLink', {
    title: input.title.slice(0, 32),
    description: (input.description ?? `Send ${input.title}`).slice(0, 255),
    payload: input.invoicePayload,
    provider_token: '',
    currency: 'XTR',
    prices: [{ label: input.title.slice(0, 32), amount: input.amountStars }],
  });
}

export async function answerTelegramPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string): Promise<void> {
  await telegramApi<boolean>('answerPreCheckoutQuery', {
    pre_checkout_query_id: id,
    ok,
    ...(ok ? {} : { error_message: (errorMessage ?? 'This payment is no longer available').slice(0, 128) }),
  });
}
