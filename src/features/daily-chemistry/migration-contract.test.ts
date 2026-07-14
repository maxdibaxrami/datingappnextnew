import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714192407_daily_chemistry_backend.sql',
), 'utf8');

describe('Daily Chemistry migration contract', () => {
  it('enforces one bounded card and at most three ranked candidates', () => {
    expect(migration).toContain('total_candidates between 0 and 3');
    expect(migration).toContain('remaining_candidates <= total_candidates');
    expect(migration).toContain('where ranked.calculated_rank <= 3');
    expect(migration).toContain('daily_chemistry_cards_user_id_card_date_key');
  });

  it('uses safe eligibility and a bounded compatibility pool', () => {
    expect(migration).toContain('limit 500');
    expect(migration).toContain("recent_candidate.created_at >= now() - interval '30 days'");
    expect(migration).toContain("safe_photo.moderation_status = 'approved'");
    expect(migration).toContain("target_restriction.restriction_type in (");
    expect(migration).toContain('blocked_pair.blocker_user_id = p_actor_user_id');
  });

  it('keeps scoring tables and privileged RPCs behind the backend boundary', () => {
    expect(migration).toContain(
      'revoke all on table public.daily_chemistry_cards from anon, authenticated;',
    );
    expect(migration).toContain(
      'revoke all on table public.daily_chemistry_candidates from anon, authenticated;',
    );
    expect(migration.match(/security definer/g)).toHaveLength(5);
    expect(migration.match(/set search_path = ''/g)).toHaveLength(5);
    expect(migration).toContain('to service_role;');
  });

  it('routes swipes and undo through atomic Daily Chemistry wrappers', () => {
    expect(migration).toContain('function public.record_dating_swipe(');
    expect(migration).toContain('function public.undo_dating_swipe(');
    expect(migration).toContain('daily_chemistry_candidate_required');
    expect(migration).toContain("status = 'matched'");
    expect(migration).toContain("then 'viewed'::public.daily_chemistry_candidate_status");
    expect(migration).toMatch(/record_swipe_action[\s\S]*?authenticated, service_role;/);
    expect(migration).toMatch(/undo_latest_swipe[\s\S]*?authenticated, service_role;/);
  });

  it('uses a UTC day and never returns exact location or hidden weights', () => {
    expect(migration).toContain("at time zone 'UTC'");
    expect(migration).not.toContain('exact_latitude');
    expect(migration).not.toContain('exact_longitude');
    expect(migration).not.toContain('distance_km');
  });
});
