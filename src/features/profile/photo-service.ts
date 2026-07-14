import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireProfileEditor } from '@/lib/auth/guards';
import {
  ApiError,
  ConflictError,
  NotFoundError,
  StorageError,
} from '@/lib/errors/api-error';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

import {
  type ConfirmPhotoInput,
  type ReorderPhotosInput,
  type RequestPhotoUploadInput,
} from './photo-schemas';

const ORIGINAL_BUCKET = 'profile-photos-original';
const UPLOAD_VALIDITY_MS = 2 * 60 * 60 * 1_000;
const MAX_PROFILE_PHOTOS = 9;

const extensionByMimeType: Record<RequestPhotoUploadInput['mimeType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

async function markUploadFailed(photoId: string): Promise<void> {
  await getSupabaseAdmin().from('profile_photos')
    .update({ upload_status: 'failed' })
    .eq('id', photoId)
    .eq('upload_status', 'pending');
}

export async function createProfilePhotoUpload(
  userId: string,
  input: RequestPhotoUploadInput,
) {
  await requireProfileEditor(userId);
  const admin = getSupabaseAdmin();
  const activePhotos = await admin.from('profile_photos')
    .select('id,sort_order')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .neq('upload_status', 'failed')
    .order('sort_order', { ascending: false })
    .limit(MAX_PROFILE_PHOTOS);
  if (activePhotos.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Existing photos could not be checked');
  }
  if (activePhotos.data.length >= MAX_PROFILE_PHOTOS) {
    throw new ConflictError('A profile can contain at most nine photos');
  }

  const photoId = randomUUID();
  const extension = extensionByMimeType[input.mimeType];
  const storagePath = userId + '/' + photoId + '/original.' + extension;
  const expiresAt = new Date(Date.now() + UPLOAD_VALIDITY_MS).toISOString();
  const sortOrder = (activePhotos.data[0]?.sort_order ?? -1) + 1;
  const inserted = await admin.from('profile_photos').insert({
    id: photoId,
    user_id: userId,
    storage_path: storagePath,
    mime_type: input.mimeType,
    file_size_bytes: input.fileSizeBytes,
    upload_status: 'pending',
    upload_expires_at: expiresAt,
    is_private: input.isPrivate,
    is_primary: false,
    sort_order: sortOrder,
    moderation_status: 'pending',
    face_check_status: 'pending',
  });
  if (inserted.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The photo upload could not be prepared');
  }

  const signed = await admin.storage.from(ORIGINAL_BUCKET).createSignedUploadUrl(storagePath);
  if (signed.error || !signed.data) {
    await admin.from('profile_photos').delete().eq('id', photoId).eq('user_id', userId);
    throw new StorageError('The photo upload URL could not be created');
  }

  return {
    photoId,
    path: signed.data.path,
    signedUrl: signed.data.signedUrl,
    token: signed.data.token,
    expiresAt,
    maxBytes: 8 * 1024 * 1024,
  };
}

function getObjectMetadata(
  metadata: Record<string, unknown> | null,
): { mimeType?: string; size?: number } {
  if (!metadata) {
    return {};
  }
  const mimeType = typeof metadata.mimetype === 'string'
    ? metadata.mimetype
    : typeof metadata.contentType === 'string'
      ? metadata.contentType
      : undefined;
  const rawSize = metadata.size ?? metadata.contentLength;
  const size = typeof rawSize === 'number'
    ? rawSize
    : typeof rawSize === 'string' && /^\d+$/.test(rawSize)
      ? Number(rawSize)
      : undefined;
  return { mimeType, size };
}

export async function confirmProfilePhoto(
  userId: string,
  photoId: string,
  input: ConfirmPhotoInput,
) {
  await requireProfileEditor(userId);
  const admin = getSupabaseAdmin();
  const photo = await admin.from('profile_photos')
    .select('id,storage_path,mime_type,file_size_bytes,upload_status,upload_expires_at')
    .eq('id', photoId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (photo.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The photo upload could not be checked');
  }
  if (!photo.data) {
    throw new NotFoundError('The photo does not exist');
  }
  if (photo.data.upload_status === 'confirmed') {
    await ensurePrimaryPhotoAndCompletion(userId, photoId);
    return { photoId, confirmed: true };
  }
  if (photo.data.upload_status !== 'pending') {
    throw new ConflictError('The photo is not awaiting confirmation');
  }
  if (
    !photo.data.upload_expires_at
    || new Date(photo.data.upload_expires_at).getTime() < Date.now()
  ) {
    await markUploadFailed(photoId);
    throw new ConflictError('The photo upload has expired');
  }

  const slashIndex = photo.data.storage_path.lastIndexOf('/');
  const directory = photo.data.storage_path.slice(0, slashIndex);
  const fileName = photo.data.storage_path.slice(slashIndex + 1);
  const listed = await admin.storage.from(ORIGINAL_BUCKET).list(directory, {
    limit: 10,
    search: fileName,
  });
  const storedObject = listed.data?.find((item) => item.name === fileName);
  if (listed.error || !storedObject) {
    throw new StorageError('The uploaded photo was not found');
  }

  const metadata = getObjectMetadata(storedObject.metadata);
  const invalidSize = metadata.size !== undefined
    && (metadata.size < 1 || metadata.size > 8 * 1024 * 1024);
  const mismatchedMime = metadata.mimeType !== undefined
    && photo.data.mime_type !== null
    && metadata.mimeType !== photo.data.mime_type;
  if (invalidSize || mismatchedMime) {
    await Promise.all([
      admin.storage.from(ORIGINAL_BUCKET).remove([photo.data.storage_path]),
      markUploadFailed(photoId),
    ]);
    throw new StorageError('The uploaded photo metadata is invalid');
  }

  const confirmed = await admin.from('profile_photos').update({
    width: input.width,
    height: input.height,
    blur_hash: input.blurHash ?? null,
    file_size_bytes: metadata.size ?? photo.data.file_size_bytes,
    confirmed_at: new Date().toISOString(),
    upload_expires_at: null,
    upload_status: 'confirmed',
  })
    .eq('id', photoId)
    .eq('user_id', userId)
    .eq('upload_status', 'pending')
    .select('id')
    .maybeSingle();
  if (confirmed.error || !confirmed.data) {
    throw new ConflictError('The photo could not be confirmed');
  }

  await ensurePrimaryPhotoAndCompletion(userId, photoId);

  return { photoId, confirmed: true };
}

async function ensurePrimaryPhotoAndCompletion(
  userId: string,
  confirmedPhotoId: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const primary = await admin.from('profile_photos')
    .select('id')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .is('deleted_at', null)
    .maybeSingle();
  if (primary.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The primary photo state could not be checked');
  }
  if (!primary.data) {
    const result = await admin.rpc('set_primary_profile_photo', {
      p_user_id: userId,
      p_photo_id: confirmedPhotoId,
    });
    if (result.error || !result.data) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'The primary photo could not be assigned');
    }
  } else {
    const completion = await admin.rpc('refresh_profile_completion', { p_user_id: userId });
    if (completion.error) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Profile completion could not be refreshed');
    }
  }
}

export async function setPrimaryProfilePhoto(userId: string, photoId: string) {
  await requireProfileEditor(userId);
  const result = await getSupabaseAdmin().rpc('set_primary_profile_photo', {
    p_user_id: userId,
    p_photo_id: photoId,
  });
  if (result.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The primary photo could not be updated');
  }
  if (!result.data) {
    throw new NotFoundError('A confirmed owned photo was not found');
  }
  return { photoId, isPrimary: true };
}

export async function reorderProfilePhotos(userId: string, input: ReorderPhotosInput) {
  await requireProfileEditor(userId);
  const result = await getSupabaseAdmin().rpc('reorder_profile_photos', {
    p_user_id: userId,
    p_photo_ids: input.photoIds,
  });
  if (result.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The photos could not be reordered');
  }
  if (!result.data) {
    throw new ConflictError('Provide every active owned photo exactly once');
  }
  return { photoIds: input.photoIds };
}

export async function deleteProfilePhoto(userId: string, photoId: string) {
  await requireProfileEditor(userId);
  const admin = getSupabaseAdmin();
  const result = await admin.rpc('soft_delete_profile_photo', {
    p_user_id: userId,
    p_photo_id: photoId,
  });
  if (result.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The photo could not be deleted');
  }
  if (!result.data) {
    throw new NotFoundError('The photo does not exist');
  }

  const removed = await admin.storage.from(ORIGINAL_BUCKET).remove([result.data]);
  if (removed.error) {
    console.error('Profile photo storage cleanup failed', {
      photoId,
      userId,
      message: removed.error.message,
    });
  }
  return { photoId, deleted: true, storageCleanupPending: Boolean(removed.error) };
}
