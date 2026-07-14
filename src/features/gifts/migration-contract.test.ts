import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260714205919_gifts_aura_payments_backend.sql'), 'utf8');

describe('Gifts, Aura, and Payments migration contract', () => {
  it('keeps payment fulfillment server-only and idempotent', () => {
    for (const name of [
      'get_gift_catalog', 'create_gift_payment_intent', 'grant_verified_gift_payment',
      'resolve_telegram_stars_gift_payment', 'get_ton_gift_payment_context',
      'get_own_profile_auras', 'activate_profile_aura',
    ]) expect(migration).toContain(`function public.${name}`);
    expect(migration).toContain('gift_payment_intents_sender_idempotency_key');
    expect(migration).toContain('payment_grant_inconsistent');
    expect(migration).toContain('provider_payment_reused');
    expect(migration).toContain("v_payment.status not in ('created', 'pending')");
    expect(migration).toContain("expires_at timestamptz not null default (now() + interval '15 minutes')");
    expect(migration).toContain('(not p_require_unexpired or intent.expires_at > now())');
    expect(migration).toContain('gift_payment_intents_receiver_created_idx');
    expect(migration).toContain('sent_gifts_gift_id_idx');
    expect(migration).toContain('ton_transactions_payment_id_idx');
    expect((migration.match(/security definer\nset search_path = ''/g) ?? []).length).toBeGreaterThanOrEqual(9);
  });

  it('does not expose payment or aura writes to browser roles', () => {
    expect(migration).toContain('revoke all on table public.payments from public, anon, authenticated;');
    expect(migration).toContain('revoke all on table public.sent_gifts from public, anon, authenticated;');
    expect(migration).toContain('grant execute on function public.grant_verified_gift_payment(');
    expect(migration).toContain('to service_role;');
  });
});
