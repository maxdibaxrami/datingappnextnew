import { z } from 'zod';

export const requestPhotoUploadSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  fileSizeBytes: z.number().int().min(1).max(8 * 1024 * 1024),
  isPrivate: z.boolean().default(false),
}).strict();

export const confirmPhotoSchema = z.object({
  width: z.number().int().min(1).max(20_000),
  height: z.number().int().min(1).max(20_000),
  blurHash: z.string().trim().min(6).max(200).nullable().optional(),
}).strict();

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(9),
}).strict().refine(
  ({ photoIds }) => new Set(photoIds).size === photoIds.length,
  { message: 'Photo ids must be unique' },
);

const photoIdSchema = z.uuid();

export type RequestPhotoUploadInput = z.infer<typeof requestPhotoUploadSchema>;
export type ConfirmPhotoInput = z.infer<typeof confirmPhotoSchema>;
export type ReorderPhotosInput = z.infer<typeof reorderPhotosSchema>;

export function parsePhotoId(value: string): string {
  return photoIdSchema.parse(value);
}
