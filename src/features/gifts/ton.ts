import 'server-only';

import { Address, beginCell, Cell, loadMessage, type Message } from '@ton/core';

import { ApiError } from '@/lib/errors/api-error';
import { getServerEnv } from '@/lib/env';

import { tonToNano } from './ton-amount';

export { tonToNano } from './ton-amount';

interface TonAddress { address?: string | null }
interface TonMessage {
  source?: TonAddress | string | null;
  destination?: TonAddress | string | null;
  value?: string | number | null;
  decoded_body?: unknown;
}
interface TonTransaction {
  hash?: string | null;
  success?: boolean | null;
  aborted?: boolean | null;
  in_msg?: TonMessage | null;
  out_msgs?: TonMessage[] | null;
}

function config() {
  const env = getServerEnv();
  if (!env.TON_PAYMENT_RECEIVER_ADDRESS || !env.TONAPI_BASE_URL || !env.TONAPI_KEY) {
    throw new ApiError(503, 'PAYMENT_PROVIDER_UNAVAILABLE', 'TON payments are not configured');
  }
  try {
    return {
      receiverAddress: Address.parse(env.TON_PAYMENT_RECEIVER_ADDRESS).toRawString(),
      network: env.TON_PAYMENT_NETWORK,
      apiUrl: env.TONAPI_BASE_URL.replace(/\/$/, ''),
      apiKey: env.TONAPI_KEY,
    };
  } catch {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The configured TON receiver address is invalid');
  }
}

export function getConfiguredTonPaymentNetwork(): 'ton_mainnet' | 'ton_testnet' {
  return config().network;
}

function valueOfAddress(value: TonMessage['source']): string | null {
  if (typeof value === 'string') return value;
  return value?.address ?? null;
}

function rawAddress(value: string | null): string | null {
  if (!value) return null;
  try { return Address.parse(value).toRawString(); } catch { return null; }
}

function paymentComment(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  for (const key of ['comment', 'text', 'value']) {
    if (typeof body[key] === 'string') return body[key];
  }
  return null;
}

function nanoValue(value: TonMessage['value']): bigint | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  return typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value) : null;
}

function normalizedMessageHash(message: Message): string {
  if (message.info.type !== 'external-in') return message.body.hash().toString('hex');
  return beginCell()
    .storeUint(2, 2)
    .storeUint(0, 2)
    .storeAddress(message.info.dest)
    .storeUint(0, 4)
    .storeBit(false)
    .storeBit(true)
    .storeRef(message.body)
    .endCell()
    .hash()
    .toString('hex');
}

function messageHashFromBoc(boc: string): string {
  try {
    const message = loadMessage(Cell.fromBase64(boc).beginParse());
    if (message.info.type !== 'external-in') throw new Error('expected an external-in message');
    return normalizedMessageHash(message);
  } catch {
    throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The TON Connect transaction BOC is invalid');
  }
}

async function fetchTransaction(path: string, apiUrl: string, apiKey: string): Promise<TonTransaction> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }, cache: 'no-store',
  });
  if (!response.ok) throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The TON transaction could not be verified');
  return response.json() as Promise<TonTransaction>;
}

export async function verifyTonGiftTransaction(input: {
  transactionHash?: string;
  transactionBoc?: string;
  invoicePayload: string;
  minimumAmountTon: string | number;
}): Promise<{ hash: string; fromAddress: string; toAddress: string; amountTon: string; raw: Record<string, unknown> }> {
  const { apiUrl, apiKey, receiverAddress } = config();
  const path = input.transactionBoc
    ? `/v2/blockchain/messages/${messageHashFromBoc(input.transactionBoc)}/transaction`
    : `/v2/blockchain/transactions/${encodeURIComponent(input.transactionHash ?? '')}`;
  const transaction = await fetchTransaction(path, apiUrl, apiKey);
  if (!transaction.hash || transaction.success !== true || transaction.aborted === true) {
    throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The TON transaction was not successful');
  }

  const candidateMessages = [...(transaction.out_msgs ?? []), ...(transaction.in_msg ? [transaction.in_msg] : [])];
  const message = candidateMessages.find((candidate) => {
    const destination = rawAddress(valueOfAddress(candidate.destination));
    const amount = nanoValue(candidate.value);
    return destination === receiverAddress && paymentComment(candidate.decoded_body) === input.invoicePayload
      && amount !== null && amount >= BigInt(tonToNano(input.minimumAmountTon));
  });
  const toAddress = rawAddress(valueOfAddress(message?.destination));
  const fromAddress = rawAddress(valueOfAddress(message?.source));
  const amount = message ? nanoValue(message.value) : null;
  if (!message || !toAddress || !fromAddress || amount === null) {
    throw new ApiError(400, 'PAYMENT_VERIFICATION_FAILED', 'The TON transaction does not match this payment');
  }
  const nano = BigInt('1000000000');
  return {
    hash: transaction.hash,
    fromAddress,
    toAddress,
    amountTon: `${amount / nano}.${(amount % nano).toString().padStart(9, '0')}`,
    raw: transaction as Record<string, unknown>,
  };
}

export function getTonPaymentInstruction(
  invoicePayload: string,
  amountTon: string | number,
  validUntil: number,
) {
  const { receiverAddress } = config();
  const payload = beginCell().storeUint(0, 32).storeStringTail(invoicePayload).endCell().toBoc().toString('base64');
  return {
    validUntil,
    messages: [{ address: receiverAddress, amount: tonToNano(amountTon), payload }],
  };
}
