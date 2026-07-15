import { describe, expect, it } from 'vitest';

import {
  createSocialPostSchema,
  parseFeedQuery,
  parseFollowListQuery,
  setFollowMutedSchema,
} from './schemas';

describe('social schemas', () => {
  it('requires idempotency for post creation and constrains post options', () => {
    expect(createSocialPostSchema.parse({
      body: 'Hello nearby people',
      clientPostId: '00000000-0000-4000-8000-000000000001',
      visibility: 'city',
    })).toMatchObject({ type: 'text', visibility: 'city' });
    expect(() => createSocialPostSchema.parse({ body: 'Duplicate prone', type: 'poll' })).toThrow();
  });

  it('parses bounded cursors and does not accept unrecognized social filters', () => {
    expect(parseFeedQuery(new URLSearchParams('scope=discover&limit=20'))).toEqual({
      scope: 'discover', limit: 20,
    });
    expect(parseFollowListQuery(new URLSearchParams('direction=followers'))).toEqual({
      direction: 'followers', limit: 20,
    });
    expect(() => parseFeedQuery(new URLSearchParams('country=NL'))).toThrow();
  });

  it('requires an explicit mute state', () => {
    expect(setFollowMutedSchema.parse({ muted: true })).toEqual({ muted: true });
    expect(() => setFollowMutedSchema.parse({ muted: 'true' })).toThrow();
  });
});
