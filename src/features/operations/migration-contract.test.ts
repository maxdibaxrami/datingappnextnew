import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const foreignKeyIndexesMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260715010000_scale_fk_indexes.sql',
), 'utf8');
const maintenanceMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260715010500_operational_maintenance_cron.sql',
), 'utf8');

describe('operational scale migration contract', () => {
  it('keeps covering indexes for every advisor-reported foreign-key family', () => {
    expect(foreignKeyIndexesMigration).toContain('app_users_invited_by_user_id_idx');
    expect(foreignKeyIndexesMigration).toContain('moderation_queue_reported_user_id_idx');
    expect(foreignKeyIndexesMigration).toContain('post_moderation_events_post_id_idx');
    expect(foreignKeyIndexesMigration).toContain('profile_aura_events_user_aura_id_idx');
    expect(foreignKeyIndexesMigration).toContain('user_profile_auras_source_sent_gift_id_idx');
    expect(foreignKeyIndexesMigration).toContain('user_restrictions_report_id_idx');
  });

  it('uses one bounded private cron worker instead of a browser-reachable job', () => {
    expect(maintenanceMigration).toContain('create extension if not exists pg_cron');
    expect(maintenanceMigration).toContain('function private.run_operational_maintenance');
    expect(maintenanceMigration).toContain('least(coalesce(p_batch_size, 250), 1000)');
    expect(maintenanceMigration).toContain("'dating-operational-maintenance'");
    expect(maintenanceMigration).toContain("'* * * * *'");
    expect(maintenanceMigration).toContain('revoke all on function private.run_operational_maintenance(integer)');
  });
});
