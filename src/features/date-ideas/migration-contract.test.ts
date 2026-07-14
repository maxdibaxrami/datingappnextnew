import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260714202318_date_ideas_marketplace_backend.sql'), 'utf8');

describe('Date Idea migration contract', () => {
  it('keeps every trusted RPC server-only and search-path hardened', () => {
    for (const name of [
      'create_date_idea', 'get_date_idea_cards', 'set_date_idea_bookmark',
      'create_date_idea_request', 'get_date_idea_requests', 'decide_date_idea_request', 'close_date_idea',
    ]) {
      expect(migration).toContain(`function public.${name}`);
    }
    expect((migration.match(/security definer\nset search_path = ''/g) ?? []).length).toBe(7);
    expect(migration).toContain('revoke all on table public.date_ideas from anon, authenticated;');
    expect(migration).toContain('grant execute on function public.create_date_idea(');
  });

  it('enforces idempotency and block-aware marketplace access', () => {
    expect(migration).toContain('date_idea_requests_requester_idempotency_key');
    expect(migration).toContain("'date-idea:' || p_date_idea_id::text");
    expect(migration).toContain('from public.blocks as blocked_pair');
    expect(migration).toContain("'location_source', 'author_profile'");
  });
});
