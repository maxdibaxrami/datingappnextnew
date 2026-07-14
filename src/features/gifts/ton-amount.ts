import { ApiError } from '@/lib/errors/api-error';

export function tonToNano(amount: string | number): string {
  const value = String(amount).trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,9}))?$/.exec(value);
  if (!match) throw new ApiError(500, 'INTERNAL_ERROR', 'The TON price is invalid');
  const whole = match[1] ?? '0';
  const fraction = (match[2] ?? '').padEnd(9, '0');
  const nano = BigInt('1000000000');
  return (BigInt(whole) * nano + BigInt(fraction)).toString();
}
