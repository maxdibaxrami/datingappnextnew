import { describe, expect, it } from 'vitest';

import { deriveTelegramAuthIdentity } from './identity';

const SECRET = 'a-stable-secret-with-more-than-32-characters';

describe('deriveTelegramAuthIdentity', () => {
  it('is deterministic', () => {
    expect(deriveTelegramAuthIdentity('123', SECRET))
      .toEqual(deriveTelegramAuthIdentity('123', SECRET));
  });

  it('creates an RFC 4122 version 4 shaped UUID', () => {
    const { userId } = deriveTelegramAuthIdentity('123', SECRET);
    expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('separates different Telegram users', () => {
    expect(deriveTelegramAuthIdentity('123', SECRET).userId)
      .not.toBe(deriveTelegramAuthIdentity('124', SECRET).userId);
  });

  it('creates a deterministic non-routable Auth email', () => {
    expect(deriveTelegramAuthIdentity('123', SECRET).email)
      .toMatch(/^tg-[0-9a-f]{40}@telegram\.invalid$/);
  });
});
