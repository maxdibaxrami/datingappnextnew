import 'server-only';

import { requireProfileEditor } from '@/lib/auth/guards';
import { ApiError, NotFoundError, ProfileIncompleteError } from '@/lib/errors/api-error';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type Database } from '@/types/database.generated';

import { type UpdateProfileInput } from './schemas';

const PROFILE_COLUMNS = 'user_id,display_name,age_years,gender,pronouns,headline,bio,about_me,looking_for_text,personality_summary,fun_fact,first_date_idea,country_code,city_name,city_id,public_geohash_prefix,mood,intents,languages,relationship_goals,interests,visibility,discoverable,follow_approval_required,profile_completed_at,created_at,updated_at' as const;

const PHOTO_COLUMNS = 'id,public_url,blur_hash,width,height,sort_order,is_primary,is_private,face_check_status,moderation_status,upload_status,confirmed_at,created_at' as const;

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PhotoRow = Database['public']['Tables']['profile_photos']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type OwnProfileRow = Pick<
  ProfileRow,
  | 'user_id'
  | 'display_name'
  | 'age_years'
  | 'gender'
  | 'pronouns'
  | 'headline'
  | 'bio'
  | 'about_me'
  | 'looking_for_text'
  | 'personality_summary'
  | 'fun_fact'
  | 'first_date_idea'
  | 'country_code'
  | 'city_name'
  | 'city_id'
  | 'public_geohash_prefix'
  | 'mood'
  | 'intents'
  | 'languages'
  | 'relationship_goals'
  | 'interests'
  | 'visibility'
  | 'discoverable'
  | 'follow_approval_required'
  | 'profile_completed_at'
  | 'created_at'
  | 'updated_at'
>;
type OwnPhotoRow = Pick<
  PhotoRow,
  | 'id'
  | 'public_url'
  | 'blur_hash'
  | 'width'
  | 'height'
  | 'sort_order'
  | 'is_primary'
  | 'is_private'
  | 'face_check_status'
  | 'moderation_status'
  | 'upload_status'
  | 'confirmed_at'
  | 'created_at'
>;

function mapProfile(profile: OwnProfileRow) {
  return {
    userId: profile.user_id,
    displayName: profile.display_name,
    ageYears: profile.age_years,
    gender: profile.gender,
    pronouns: profile.pronouns,
    headline: profile.headline,
    bio: profile.bio,
    aboutMe: profile.about_me,
    lookingForText: profile.looking_for_text,
    personalitySummary: profile.personality_summary,
    funFact: profile.fun_fact,
    firstDateIdea: profile.first_date_idea,
    countryCode: profile.country_code,
    cityName: profile.city_name,
    cityId: profile.city_id,
    publicGeohashPrefix: profile.public_geohash_prefix,
    mood: profile.mood,
    intents: profile.intents,
    languages: profile.languages,
    relationshipGoals: profile.relationship_goals,
    interests: profile.interests,
    visibility: profile.visibility,
    discoverable: profile.discoverable,
    followApprovalRequired: profile.follow_approval_required,
    profileCompletedAt: profile.profile_completed_at,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function mapPhoto(photo: OwnPhotoRow) {
  return {
    id: photo.id,
    publicUrl: photo.public_url,
    blurHash: photo.blur_hash,
    width: photo.width,
    height: photo.height,
    sortOrder: photo.sort_order,
    isPrimary: photo.is_primary,
    isPrivate: photo.is_private,
    faceCheckStatus: photo.face_check_status,
    moderationStatus: photo.moderation_status,
    uploadStatus: photo.upload_status,
    confirmedAt: photo.confirmed_at,
    createdAt: photo.created_at,
  };
}

export async function getOwnProfile(userId: string) {
  const admin = getSupabaseAdmin();
  const [profileResult, photosResult] = await Promise.all([
    admin.from('profiles').select(PROFILE_COLUMNS).eq('user_id', userId).maybeSingle(),
    admin.from('profile_photos')
      .select(PHOTO_COLUMNS)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .limit(9),
  ]);

  if (profileResult.error || photosResult.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The profile could not be loaded');
  }
  if (!profileResult.data) {
    throw new NotFoundError('The profile does not exist');
  }

  return {
    profile: mapProfile(profileResult.data),
    photos: photosResult.data.map(mapPhoto),
  };
}

function toDatabaseUpdate(input: UpdateProfileInput): ProfileUpdate {
  const update: ProfileUpdate = {};
  if ('displayName' in input) update.display_name = input.displayName;
  if ('ageYears' in input) update.age_years = input.ageYears;
  if ('gender' in input) update.gender = input.gender;
  if ('pronouns' in input) update.pronouns = input.pronouns;
  if ('headline' in input) update.headline = input.headline;
  if ('bio' in input) update.bio = input.bio;
  if ('aboutMe' in input) update.about_me = input.aboutMe;
  if ('lookingForText' in input) update.looking_for_text = input.lookingForText;
  if ('personalitySummary' in input) update.personality_summary = input.personalitySummary;
  if ('funFact' in input) update.fun_fact = input.funFact;
  if ('firstDateIdea' in input) update.first_date_idea = input.firstDateIdea;
  if ('countryCode' in input) update.country_code = input.countryCode;
  if ('cityName' in input) update.city_name = input.cityName;
  if ('cityId' in input) update.city_id = input.cityId;
  if ('publicGeohashPrefix' in input) update.public_geohash_prefix = input.publicGeohashPrefix;
  if ('mood' in input) update.mood = input.mood;
  if ('intents' in input) update.intents = input.intents;
  if ('languages' in input) update.languages = input.languages;
  if ('relationshipGoals' in input) update.relationship_goals = input.relationshipGoals;
  if ('interests' in input) update.interests = input.interests;
  if ('visibility' in input) update.visibility = input.visibility;
  if ('discoverable' in input) update.discoverable = input.discoverable;
  if ('followApprovalRequired' in input) update.follow_approval_required = input.followApprovalRequired;
  update.last_active_at = new Date().toISOString();
  return update;
}

export async function updateOwnProfile(userId: string, input: UpdateProfileInput) {
  await requireProfileEditor(userId);
  const admin = getSupabaseAdmin();
  const updated = await admin.from('profiles')
    .update(toDatabaseUpdate(input))
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();
  if (updated.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'The profile could not be updated');
  }
  if (!updated.data) {
    throw new NotFoundError('The profile does not exist');
  }

  const completion = await admin.rpc('refresh_profile_completion', { p_user_id: userId });
  if (completion.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Profile completion could not be refreshed');
  }
  return getOwnProfile(userId);
}

function findMissingFields(profileData: Awaited<ReturnType<typeof getOwnProfile>>): string[] {
  const { profile, photos } = profileData;
  const missing: string[] = [];
  if (!profile.displayName) missing.push('displayName');
  if (typeof profile.ageYears !== 'number' || profile.ageYears < 18) missing.push('ageYears');
  if (!profile.gender) missing.push('gender');
  if (!profile.countryCode) missing.push('countryCode');
  if (!profile.cityName) missing.push('cityName');
  if (!photos.some((photo) => photo.isPrimary && photo.uploadStatus === 'confirmed')) {
    missing.push('primaryPhoto');
  }
  return missing;
}

export async function completeOwnProfile(userId: string) {
  await requireProfileEditor(userId);
  const result = await getSupabaseAdmin().rpc('refresh_profile_completion', {
    p_user_id: userId,
  });
  if (result.error) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Profile completion could not be checked');
  }
  if (!result.data) {
    const profileData = await getOwnProfile(userId);
    throw new ProfileIncompleteError(findMissingFields(profileData));
  }
  return getOwnProfile(userId);
}
