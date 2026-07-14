import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260714222122_hardening_moderation_backend.sql'),
  'utf8',
);

describe('moderation migration contract', () => {
  it('keeps moderation writes behind server-only RPCs', () => {
    for (const name of [
      'set_user_block', 'remove_user_block', 'get_user_blocks', 'create_moderation_report',
      'get_my_moderation_reports', 'get_moderation_queue', 'assign_moderation_case',
      'decide_moderation_case',
    ]) {
      expect(migration).toContain(`function public.${name}`);
    }
    expect(migration).toContain('revoke all on table public.moderation_queue from public, anon, authenticated;');
    expect(migration).toContain('grant execute on function public.create_moderation_report');
    expect(migration).toContain("set search_path = ''");
  });

  it('links photo and video reports to an auditable moderation queue', () => {
    expect(migration).toContain('add column if not exists profile_photo_id');
    expect(migration).toContain('moderation_queue_one_report_idx');
    expect(migration).toContain("'report_created'");
    expect(migration).toContain('video_report_events');
  });

  it('prevents direct financial refunds from being faked by moderation', () => {
    expect(migration).toContain("message = 'refund_requires_payment_adapter'");
  });
});
