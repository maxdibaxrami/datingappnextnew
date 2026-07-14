import { z } from 'zod';

const trimmedNullable = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).nullable();

const stringList = (itemMax: number, listMax: number) =>
  z.array(z.string().trim().min(1).max(itemMax))
    .max(listMax)
    .transform((items) => [...new Set(items)]);

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).nullable().optional(),
  ageYears: z.number().int().min(18).max(100).nullable().optional(),
  gender: z.enum(['woman', 'man', 'non_binary', 'other', 'prefer_not_to_say']).nullable().optional(),
  pronouns: trimmedNullable(50).optional(),
  headline: trimmedNullable(120).optional(),
  bio: trimmedNullable(500).optional(),
  aboutMe: trimmedNullable(2_000).optional(),
  lookingForText: trimmedNullable(500).optional(),
  personalitySummary: trimmedNullable(500).optional(),
  funFact: trimmedNullable(300).optional(),
  firstDateIdea: trimmedNullable(300).optional(),
  countryCode: z.string().trim().length(2).regex(/^[a-z]{2}$/i)
    .transform((value) => value.toUpperCase()).nullable().optional(),
  cityName: z.string().trim().min(1).max(120).nullable().optional(),
  cityId: z.uuid().nullable().optional(),
  publicGeohashPrefix: z.string().trim().toLowerCase()
    .regex(/^[0-9bcdefghjkmnpqrstuvwxyz]{2,5}$/).nullable().optional(),
  mood: trimmedNullable(80).optional(),
  intents: stringList(60, 10).optional(),
  languages: stringList(35, 10).optional(),
  relationshipGoals: stringList(60, 10).optional(),
  interests: stringList(60, 30).optional(),
  visibility: z.enum(['public', 'hidden', 'matches_only', 'paused']).optional(),
  discoverable: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one profile field is required',
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
