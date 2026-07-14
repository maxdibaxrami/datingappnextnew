import { describe, expect, it } from 'vitest';

import {
  createReportSchema,
  decideModerationCaseSchema,
  parseCursorQuery,
  parseModerationQueueQuery,
} from './schemas';

const userId = '00000000-0000-4000-8000-000000000001';
const targetId = '00000000-0000-4000-8000-000000000002';

describe('moderation schemas', () => {
  it('accepts a bounded profile report', () => {
    const input = createReportSchema.parse({
      targetType: 'profile_photo',
      targetId,
      reason: '  Impersonation  ',
      details: '  This photo is not the account owner.  ',
    });
    expect(input.reason).toBe('Impersonation');
    expect(input.details).toBe('This photo is not the account owner.');
  });

  it('requires the reported user for a video-session report only', () => {
    expect(() => createReportSchema.parse({
      targetType: 'video_session', targetId, reason: 'Harassment',
    })).toThrow();
    expect(createReportSchema.parse({
      targetType: 'video_session', targetId, reportedUserId: userId, reason: 'Harassment',
    }).reportedUserId).toBe(userId);
    expect(() => createReportSchema.parse({
      targetType: 'user', targetId, reportedUserId: userId, reason: 'Spam',
    })).toThrow();
  });

  it('requires a restriction type only for a restriction decision', () => {
    expect(() => decideModerationCaseSchema.parse({ action: 'restrict_user' })).toThrow();
    expect(decideModerationCaseSchema.parse({
      action: 'restrict_user', restrictionType: 'no_video', note: 'Repeated reports',
    }).restrictionType).toBe('no_video');
    expect(() => decideModerationCaseSchema.parse({
      action: 'warn_user', restrictionType: 'no_video',
    })).toThrow();
  });

  it('uses cursor pagination and rejects unsupported query parameters', () => {
    expect(parseCursorQuery(new URLSearchParams('limit=30')).limit).toBe(30);
    expect(parseModerationQueueQuery(new URLSearchParams('status=open,assigned&assignedToMe=true')))
      .toMatchObject({ statuses: ['open', 'assigned'], assignedToMe: true, limit: 50 });
    expect(() => parseModerationQueueQuery(new URLSearchParams('userId=' + userId))).toThrow();
  });
});
