import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714182456_discovery_swipes_matches.sql',
), 'utf8');

describe('dating-loop migration contract', () => {
  it.each([
    'get_discovery_cards',
    'record_swipe_action',
    'undo_latest_swipe',
    'get_user_matches',
  ])('keeps %s behind the service-role boundary', (functionName) => {
    expect(migration).toContain('function public.' + functionName);
    expect(migration).toMatch(new RegExp(
      'grant execute on function public\\.' + functionName + '[\\s\\S]*?to service_role;',
    ));
    expect(migration).toMatch(new RegExp(
      'revoke all on function public\\.' + functionName + '[\\s\\S]*?authenticated;',
    ));
  });

  it('uses hardened security-definer functions and pair serialization', () => {
    expect(migration.match(/security definer/g)).toHaveLength(5);
    expect(migration.match(/set search_path = ''/g)).toHaveLength(5);
    expect(migration).toContain("'match-pair:' || v_user_a::text || ':' || v_user_b::text");
    expect(migration).toContain('v_user_a := least(p_actor_user_id, p_target_user_id)');
    expect(migration).toContain('v_user_b := greatest(p_actor_user_id, p_target_user_id)');
  });

  it('preserves swipe history and protects public location precision', () => {
    expect(migration).toContain('undoes_action_id');
    expect(migration).toContain('undone_at');
    expect(migration).toContain('{2,5}');
  });
});
