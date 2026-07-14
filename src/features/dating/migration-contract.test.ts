import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const baseMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714185316_discovery_swipes_matches.sql',
), 'utf8');
const returningFixMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714185829_fix_dating_rpc_returning_ambiguity.sql',
), 'utf8');
const orderingFixMigration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714190104_fix_latest_swipe_ordering.sql',
), 'utf8');

describe('dating-loop migration contract', () => {
  it.each([
    'get_discovery_cards',
    'record_swipe_action',
    'undo_latest_swipe',
    'get_user_matches',
  ])('keeps %s behind the service-role boundary', (functionName) => {
    expect(baseMigration).toContain('function public.' + functionName);
    expect(baseMigration).toMatch(new RegExp(
      'grant execute on function public\\.' + functionName + '[\\s\\S]*?to service_role;',
    ));
    expect(baseMigration).toMatch(new RegExp(
      'revoke all on function public\\.' + functionName + '[\\s\\S]*?authenticated;',
    ));
  });

  it('uses hardened security-definer functions and pair serialization', () => {
    expect(baseMigration.match(/security definer/g)).toHaveLength(5);
    expect(baseMigration.match(/set search_path = ''/g)).toHaveLength(5);
    expect(baseMigration).toContain("'match-pair:' || v_user_a::text || ':' || v_user_b::text");
    expect(baseMigration).toContain('v_user_a := least(p_actor_user_id, p_target_user_id)');
    expect(baseMigration).toContain('v_user_b := greatest(p_actor_user_id, p_target_user_id)');
  });

  it('preserves swipe history and protects public location precision', () => {
    expect(baseMigration).toContain('undoes_action_id');
    expect(baseMigration).toContain('undone_at');
    expect(baseMigration).toContain('{2,5}');
  });

  it('qualifies match columns that collide with PL/pgSQL output variables', () => {
    expect(returningFixMigration).toContain('inserted_match.matched_at');
    expect(returningFixMigration).toContain('updated_match.matched_at');
    expect(returningFixMigration).toContain('to service_role;');
    expect(returningFixMigration).toContain('from public, anon, authenticated;');
  });

  it('uses a deterministic internal sequence for latest-swipe undo', () => {
    expect(orderingFixMigration).toContain('action_sequence bigint generated always as identity');
    expect(orderingFixMigration).toContain('order by sa.action_sequence desc');
    expect(orderingFixMigration).toContain('swipe_actions_actor_current_sequence_idx');
    expect(orderingFixMigration).toContain('to service_role;');
    expect(orderingFixMigration).toContain('from public, anon, authenticated;');
  });
});
