import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260714224659_messaging_notifications_backend.sql',
), 'utf8');

describe('Messaging and notifications migration contract', () => {
  it('keeps conversations tied to active, unblocked matches', () => {
    for (const name of [
      'get_user_conversations',
      'get_conversation_messages',
      'send_conversation_message',
      'mark_conversation_read',
      'set_conversation_notification_settings',
      'get_user_notifications',
      'mark_user_notification_read',
      'mark_all_user_notifications_read',
    ]) expect(migration).toContain(`function public.${name}`);
    expect(migration).toContain('sync_match_conversation_after_change');
    expect(migration).toContain("message.sender_user_id = p_actor_user_id");
    expect(migration).toContain('idempotency_conflict');
    expect(migration).toContain('conversation_unavailable');
    expect(migration).toContain('messages_conversation_sequence_key');
  });

  it('does not expose messages or notification inboxes to browser roles', () => {
    for (const table of [
      'public.conversations',
      'public.conversation_members',
      'public.messages',
      'public.user_notifications',
    ]) expect(migration).toContain(`revoke all on table ${table} from public, anon, authenticated;`);
    expect((migration.match(/security definer\nset search_path = ''/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(migration).toContain('to service_role;');
  });
});
