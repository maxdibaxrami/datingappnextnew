import { describe, expect, it } from 'vitest';

import { reorderPhotosSchema } from './photo-schemas';
import { updateProfileSchema } from './schemas';

describe('profile schemas', () => {
  it('normalizes country codes and removes duplicate interests', () => {
    const parsed = updateProfileSchema.parse({
      countryCode: 'nl',
      interests: ['music', 'music', 'travel'],
    });
    expect(parsed).toMatchObject({
      countryCode: 'NL',
      interests: ['music', 'travel'],
    });
  });

  it('rejects underage profiles and duplicate reorder ids', () => {
    expect(updateProfileSchema.safeParse({ ageYears: 17 }).success).toBe(false);
    const id = 'd860d98a-b72f-4a2d-8217-570a757b3123';
    expect(reorderPhotosSchema.safeParse({ photoIds: [id, id] }).success).toBe(false);
  });
});
