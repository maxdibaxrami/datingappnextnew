import { describe, expect, it } from 'vitest';

import { createDateIdeaSchema, parseDateIdeaQuery, parseDateIdeaRequestsQuery } from './schemas';

describe('Date Idea schemas', () => {
  it('normalizes valid create input', () => {
    const input = createDateIdeaSchema.parse({ ideaType: 'coffee', title: ' Coffee after work ', interestTags: ['music', 'music'] });
    expect(input.title).toBe('Coffee after work');
    expect(input.interestTags).toEqual(['music']);
    expect(input.visibility).toBe('city');
  });

  it('rejects an invalid age range', () => {
    expect(() => createDateIdeaSchema.parse({ ideaType: 'walk', title: 'Walk by the river', minAge: 30, maxAge: 20 })).toThrow();
  });

  it('parses bounded marketplace filters', () => {
    const query = parseDateIdeaQuery(new URLSearchParams('countryCode=nl&ideaType=coffee,walk&limit=12'));
    expect(query.countryCode).toBe('NL');
    expect(query.ideaTypes).toEqual(['coffee', 'walk']);
    expect(query.limit).toBe(12);
  });

  it('rejects unsupported request filters', () => {
    expect(() => parseDateIdeaRequestsQuery(new URLSearchParams('owner=me'))).toThrow();
  });
});
