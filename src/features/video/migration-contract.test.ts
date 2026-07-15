import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714240100_random_video_chat_backend.sql',
), 'utf8');

describe('random video migration contract', () => {
  it.each([
    'join_video_queue',
    'get_video_queue_state',
    'cancel_video_queue',
    'get_video_session_state',
    'mark_video_session_ready',
    'mark_video_session_connected',
    'heartbeat_video_session',
    'send_video_session_signal',
    'get_video_session_signals',
    'end_video_session',
  ])('keeps %s behind the service-role boundary', (functionName) => {
    expect(migration).toContain(`function public.${functionName}`);
    expect(migration).toMatch(new RegExp(
      `revoke all on function public\\.${functionName}[\\s\\S]*?authenticated;`,
    ));
    expect(migration).toMatch(new RegExp(
      `grant execute on function public\\.${functionName}[\\s\\S]*?to service_role;`,
    ));
  });

  it('models private participants, block termination, and report proof', () => {
    expect(migration).toContain('video_session_participants');
    expect(migration).toContain('video_session_signals');
    expect(migration).toContain('blocks_end_video_sessions_after_insert');
    expect(migration).toContain('reports_enforce_video_participants');
    expect(migration).toContain('skip locked');
    expect(migration).toContain('revoke all on table public.video_session_signals from public, anon, authenticated;');
  });
});
