import { describe, expect, it } from 'vitest';

import {
  conversationNotificationSettingsSchema,
  parseConversationQuery,
  parseNotificationQuery,
  sendConversationMessageSchema,
} from './schemas';

describe('messaging schemas', () => {
  it('normalizes a bounded, idempotent text message', () => {
    const parsed = sendConversationMessageSchema.parse({
      body: '  Hello there  ',
      clientMessageId: '00000000-0000-4000-8000-000000000001',
    });
    expect(parsed.body).toBe('Hello there');
  });

  it('rejects client-supplied sender fields and oversized messages', () => {
    expect(() => sendConversationMessageSchema.parse({
      body: 'Hello',
      clientMessageId: '00000000-0000-4000-8000-000000000001',
      senderUserId: '00000000-0000-4000-8000-000000000002',
    })).toThrow();
    expect(() => sendConversationMessageSchema.parse({
      body: 'x'.repeat(4001),
      clientMessageId: '00000000-0000-4000-8000-000000000001',
    })).toThrow();
  });

  it('accepts strict pagination and notification filters', () => {
    expect(parseConversationQuery(new URLSearchParams('limit=25'))).toEqual({ limit: 25 });
    expect(parseNotificationQuery(new URLSearchParams('unreadOnly=true&limit=10')))
      .toEqual({ unreadOnly: true, limit: 10 });
  });

  it('requires a future mute time or an explicit unmute', () => {
    expect(conversationNotificationSettingsSchema.parse({ mutedUntil: null }).mutedUntil).toBeNull();
    expect(() => conversationNotificationSettingsSchema.parse({ mutedUntil: '2000-01-01T00:00:00.000Z' }))
      .toThrow();
  });
});
