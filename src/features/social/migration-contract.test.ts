import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714243000_social_feed_backend.sql',
), 'utf8');
const idempotencyMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714243915_social_post_idempotency.sql',
), 'utf8');
const idempotencyRaceFixMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714244100_social_post_idempotency_race_fix.sql',
), 'utf8');
const safetyMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714244700_social_safety_and_muted_feed_fix.sql',
), 'utf8');

describe('social migration contract', () => {
  it('keeps social tables and mutating RPCs behind the service-role boundary', () => {
    expect(baseMigration).toContain('create table if not exists public.post_likes');
    expect(baseMigration).toContain('revoke all on table public.follows from public, anon, authenticated;');
    expect(baseMigration).toContain('revoke all on table public.posts from public, anon, authenticated;');
    expect(baseMigration).toContain('revoke all on table public.post_likes from public, anon, authenticated;');

    for (const functionName of [
      'follow_user',
      'unfollow_user',
      'set_follow_muted',
      'decide_follow_request',
      'create_social_post',
      'delete_own_social_post',
      'set_social_post_like',
    ]) {
      expect(baseMigration).toContain(`function public.${functionName}`);
      expect(baseMigration).toMatch(new RegExp(
        `revoke all on function public\\.${functionName}[\\s\\S]*?authenticated;`,
      ));
      expect(baseMigration).toMatch(new RegExp(
        `grant execute on function public\\.${functionName}[\\s\\S]*?to service_role;`,
      ));
    }
  });

  it('keeps posts retry-safe even when retries race', () => {
    expect(idempotencyMigration).toContain('client_post_id uuid');
    expect(idempotencyMigration).toContain('posts_author_client_post_id_unique_idx');
    expect(idempotencyRaceFixMigration).toContain('on conflict (author_user_id, client_post_id) where client_post_id is not null');
    expect(idempotencyRaceFixMigration).toContain('already_created boolean');
  });

  it('does not let a muted or unsafe author surface through feeds or likes', () => {
    expect(safetyMigration).toContain("muted_follow.status = 'muted'");
    expect(safetyMigration).toContain("follow_row.status = 'accepted'");
    expect(safetyMigration).toContain("restriction.restriction_type in ('shadow_ban', 'view_only', 'full_suspension')");
    expect(safetyMigration).toMatch(/grant execute on function public\.get_social_feed[\s\S]*?to service_role;/);
    expect(safetyMigration).toMatch(/grant execute on function public\.set_social_post_like[\s\S]*?to service_role;/);
  });
});
