import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const premiumMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714230824_premium_boost_backend.sql',
), 'utf8');
const discoveryIntegrationMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714232231_boost_discovery_integration.sql',
), 'utf8');

describe('premium and boost migration contract', () => {
  it.each([
    'get_premium_plans',
    'get_my_premium_entitlements',
    'create_premium_payment_intent',
    'grant_verified_premium_payment',
    'claim_premium_daily_super_likes',
    'get_boost_catalog',
    'create_boost_payment_intent',
    'grant_verified_boost_payment',
    'create_premium_boost',
    'pause_own_boost',
    'resume_own_boost',
  ])('keeps %s behind the service-role boundary', (functionName) => {
    expect(premiumMigration).toContain(`function public.${functionName}`);
    expect(premiumMigration).toMatch(new RegExp(
      `revoke all on function public\\.${functionName}[\\s\\S]*?authenticated;`,
    ));
    expect(premiumMigration).toMatch(new RegExp(
      `grant execute on function public\\.${functionName}[\\s\\S]*?to service_role;`,
    ));
  });

  it('uses payment uniqueness and one-current-entitlement constraints', () => {
    expect(premiumMigration).toContain('payments_invoice_payload_unique_idx');
    expect(premiumMigration).toContain('payments_provider_payment_id_unique_idx');
    expect(premiumMigration).toContain('user_premium_subscriptions_one_active_idx');
    expect(premiumMigration).toContain('boosts_one_active_per_user_idx');
    expect(premiumMigration).toContain('premium_payment_intents_user_idempotency_key');
    expect(premiumMigration).toContain('boost_payment_intents_user_idempotency_key');
  });

  it('adds boost/premium ranking without leaking entitlement fields into cards', () => {
    expect(discoveryIntegrationMigration).toContain('exposure_multiplier');
    expect(discoveryIntegrationMigration).toContain("'priority_discovery'");
    expect(discoveryIntegrationMigration).toContain('record_boost_impressions');
    expect(discoveryIntegrationMigration).not.toContain('premium_plan_name');
    expect(discoveryIntegrationMigration).not.toContain('subscription_id uuid,');
  });
});
