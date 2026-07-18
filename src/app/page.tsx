'use client';

import NextImage from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initData, locationManager, mainButton, secondaryButton, useRawInitData, useSignal } from '@tma.js/sdk-react';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';
import { useTranslations } from 'next-intl';

import { Page } from '@/components/Page';
import { Cell, Checkbox, DatePicker, Input, List, Section, Selectable, Steps, Textarea } from '@/components/ui';

import appIcon from './_assets/ChatGPT Image Jul 15, 2026, 01_38_55 PM.png';
import './home.css';

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    missingFields?: string[];
  };
};

type ApiSuccess<T> = {
  data: T;
};

type AccountGate = {
  isBanned: boolean;
  profileCompletedAt: string | null;
  restrictions: string[];
  role: string;
  status: string;
  userId: string;
};

type AuthGateData = {
  account: AccountGate;
  created?: boolean;
  profileRequired: boolean;
};

type ProfilePhoto = {
  id: string;
  publicUrl: string | null;
  sortOrder: number;
  uploadStatus: string;
  isPrimary: boolean;
};

type ProfileData = {
  account?: AccountGate;
  profile: {
    displayName: string | null;
    ageYears: number | null;
    gender: string | null;
    headline: string | null;
    bio: string | null;
    aboutMe?: string | null;
    lookingForText?: string | null;
    personalitySummary?: string | null;
    funFact?: string | null;
    firstDateIdea?: string | null;
    pronouns?: string | null;
    mood?: string | null;
    countryCode: string | null;
    cityName: string | null;
    cityId: string | null;
    interests: string[] | null;
    languages?: string[] | null;
    relationshipGoals?: string[] | null;
    intents?: string[] | null;
    visibility?: 'public' | 'hidden' | 'matches_only' | 'paused';
    discoverable?: boolean;
    followApprovalRequired?: boolean;
    profileCompletedAt: string | null;
  };
  photos: ProfilePhoto[];
};

type UploadTicket = {
  photoId: string;
  signedUrl: string;
};

type BootState = 'loading' | 'onboarding' | 'home' | 'error';

type ProfileForm = {
  ageYears: string;
  bio: string;
  displayName: string;
  gender: string;
  headline: string;
};

type CountryGeo = {
  code: string;
  name: string;
  emoji_flag: string | null;
};

type CityGeo = {
  id: string;
  name: string;
  country_code: string;
  admin1_name: string | null;
};

type CityPagination = {
  limit: number;
  nextOffset: number | null;
  offset: number;
};

const stepKeys = ['basics', 'location', 'story', 'photos', 'ready'] as const;

const genderOptions = [
  { value: 'woman', title: 'gender_woman', description: 'gender_woman_desc' },
  { value: 'man', title: 'gender_man', description: 'gender_man_desc' },
  { value: 'non_binary', title: 'gender_non_binary', description: 'gender_non_binary_desc' },
  { value: 'other', title: 'gender_other', description: 'gender_other_desc' },
  { value: 'prefer_not_to_say', title: 'gender_prefer_not_to_say', description: 'gender_prefer_not_to_say_desc' },
] as const;

const interestOptions = [
  ['art', '🎨'], ['music', '🎵'], ['travel', '✈️'], ['gaming', '🎮'], ['cooking', '🍳'],
  ['movies', '🎬'], ['reading', '📚'], ['fitness', '🏋️'], ['running', '🏃'], ['cycling', '🚴'],
  ['football', '⚽'], ['basketball', '🏀'], ['tennis', '🎾'], ['swimming', '🏊'], ['skiing', '⛷️'],
  ['photography', '📸'], ['camping', '🏕️'], ['hiking', '🥾'], ['coffee', '☕'], ['tea', '🍵'],
  ['food', '🍜'], ['baking', '🧁'], ['sushi', '🍣'], ['books', '📖'], ['poetry', '📝'],
  ['coding', '💻'], ['startups', '🚀'], ['design', '🖌️'], ['fashion', '👗'], ['makeup', '💄'],
  ['dancing', '💃'], ['karaoke', '🎤'], ['concerts', '🎧'], ['theater', '🎭'], ['museums', '🏛️'],
  ['board_games', '🎲'], ['chess', '♟️'], ['anime', '🍥'], ['comics', '💥'], ['gardening', '🪴'],
  ['nature', '🌿'], ['beach', '🏖️'], ['road_trips', '🚗'], ['motorcycles', '🏍️'], ['yoga', '🧘'],
  ['meditation', '🕯️'], ['volunteering', '🤝'], ['languages', '🗣️'], ['science', '🔬'], ['space', '🪐'],
  ['history', '📜'], ['podcasts', '🎙️'], ['finance', '💸'], ['crafts', '🧵'], ['cats', '🐱'],
  ['dogs', '🐶'], ['plants', '🌱'], ['night_walks', '🌙'], ['sunsets', '🌅'], ['picnics', '🧺'],
] as const;

function initialForm(profile?: ProfileData | null, telegramName = ''): ProfileForm {
  return {
    ageYears: profile?.profile.ageYears ? String(profile.profile.ageYears) : '25',
    bio: profile?.profile.bio ?? '',
    displayName: profile?.profile.displayName ?? telegramName,
    gender: profile?.profile.gender ?? '',
    headline: profile?.profile.headline ?? '',
  };
}

async function readApi<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as ApiSuccess<T> & ApiErrorBody;
  if (!response.ok) {
    const message = body.error?.message ?? 'Something went wrong. Please try again.';
    const error = new Error(message);
    Object.assign(error, {
      code: body.error?.code,
      missingFields: body.error?.missingFields,
      status: response.status,
    });
    throw error;
  }
  return body.data;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function isUnauthorized(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status?: number }).status === 401;
}

async function getImageSize(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('The image could not be read.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function BrandSplash({ message }: { message: string }) {
  return (
    <main className="auth-page auth-page--splash">
      <section className="splash-card" aria-live="polite">
        <div className="brand-stack">
          <div className="app-icon">
            <NextImage src={appIcon} alt="Mull Mull" priority />
          </div>
          <div className="logo-lockup">
            <strong>Mull Mull!</strong>
          </div>
        </div>
        <div className="spinner-wrap">
          <span className="spinner" />
        </div>
        <p>{message}</p>
      </section>
    </main>
  );
}

function MainHome({ profile }: { profile: ProfileData | null }) {
  const t = useTranslations('home');
  const name = profile?.profile.displayName ?? t('fallbackName');

  return (
    <main className="auth-page">
      <section className="home-hero">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>{t('title', { name })}</h1>
        </div>
        <div className="mini-icon">
          <NextImage src={appIcon} alt="" priority />
        </div>
      </section>

      <section className="quick-grid" aria-label={t('actionsLabel')}>
        <button type="button" className="action-tile">
          <span>{t('discovery')}</span>
          <strong>{t('findMatches')}</strong>
        </button>
        <button type="button" className="action-tile">
          <span>{t('chemistry')}</span>
          <strong>{t('dailyCard')}</strong>
        </button>
        <button type="button" className="action-tile">
          <span>{t('messages')}</span>
          <strong>{t('openChats')}</strong>
        </button>
        <button type="button" className="action-tile">
          <span>{t('feed')}</span>
          <strong>{t('socialPosts')}</strong>
        </button>
      </section>

      <section className="profile-strip">
        <div>
          <p className="eyebrow">{t('profile')}</p>
          <h2>{profile?.profile.headline || t('profileLive')}</h2>
          <p>{profile?.profile.cityName || t('nearby')}</p>
        </div>
      </section>
    </main>
  );
}

function ProgressSteps({ step, title }: { step: number; title: string }) {
  return (
    <div className="step-progress" aria-label={title}>
      <Steps count={stepKeys.length} progress={step} />
      <ol style={{ gridTemplateColumns: `repeat(${stepKeys.length}, minmax(0, 1fr))` }}>
        {stepKeys.map((key, index) => (
          <li key={key} className={index <= step ? 'is-active' : ''}>
            {index + 1}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SearchSheet<T extends { id?: string; code?: string; name: string }>({
  emptyText,
  closeText,
  getKey,
  getSubtitle,
  getVisual,
  isLoading,
  items,
  loadMoreText,
  nextOffset,
  onClose,
  onLoadMore,
  onPick,
  onSearch,
  placeholder,
  search,
  title,
}: {
  closeText: string;
  emptyText: string;
  getKey: (item: T) => string;
  getSubtitle?: (item: T) => string | null;
  getVisual: (item: T) => string;
  isLoading: boolean;
  items: T[];
  loadMoreText: string;
  nextOffset?: number | null;
  onClose: () => void;
  onLoadMore?: () => void;
  onPick: (item: T) => void;
  onSearch: (value: string) => void;
  placeholder: string;
  search: string;
  title: string;
}) {
  return (
    <div className="geo-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="geo-modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="geo-modal-header">
          <h3>{title}</h3>
          <button type="button" className="geo-modal-close" onClick={onClose} aria-label={closeText}>
            ×
          </button>
        </div>
        <div className="geo-modal-search">
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={placeholder} />
        </div>
        <div className="geo-modal-list">
          {items.map((item) => {
            const subtitle = getSubtitle?.(item);
            return (
              <button key={getKey(item)} type="button" className="geo-list-item" onClick={() => onPick(item)}>
                <span className="geo-flag">{getVisual(item)}</span>
                <span className="geo-copy">
                  <span className="geo-name">{item.name}</span>
                  {subtitle && <span className="geo-subtitle">{subtitle}</span>}
                </span>
              </button>
            );
          })}
          {!isLoading && items.length === 0 && <p className="empty-list">{emptyText}</p>}
          {isLoading && <p className="empty-list">...</p>}
          {nextOffset !== null && nextOffset !== undefined && onLoadMore && (
            <button type="button" className="load-more-button" disabled={isLoading} onClick={onLoadMore}>
              {loadMoreText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CompleteProfileStepper({
  initialProfile,
  onComplete,
  telegramName,
}: {
  initialProfile: ProfileData | null;
  onComplete: (profile: ProfileData) => void;
  telegramName: string;
}) {
  const t = useTranslations('onboarding');
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile);
  const [form, setForm] = useState(() => initialForm(initialProfile, telegramName));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);

  const [countries, setCountries] = useState<CountryGeo[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesSearch, setCountriesSearch] = useState('');
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [country, setCountry] = useState<CountryGeo | null>(null);

  const [cities, setCities] = useState<CityGeo[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesPagination, setCitiesPagination] = useState<CityPagination | null>(null);
  const [citiesSearch, setCitiesSearch] = useState('');
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [city, setCity] = useState<CityGeo | null>(() => {
    if (!initialProfile?.profile.cityId || !initialProfile.profile.cityName) {
      return null;
    }
    return {
      admin1_name: null,
      country_code: initialProfile.profile.countryCode ?? '',
      id: initialProfile.profile.cityId,
      name: initialProfile.profile.cityName,
    };
  });

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => initialProfile?.profile.interests ?? []);

  const confirmedPhotos = useMemo(
    () => [...(profile?.photos ?? [])]
      .filter((photo) => photo.uploadStatus === 'confirmed')
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [profile],
  );
  const primaryPhoto = confirmedPhotos.find((photo) => photo.isPrimary) ?? confirmedPhotos[0] ?? null;
  const secondaryPhotos = confirmedPhotos.filter((photo) => photo.id !== primaryPhoto?.id).slice(0, 2);

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return form.displayName.trim().length >= 2 && Number(form.ageYears) >= 18 && Number(form.ageYears) <= 99 && Boolean(form.gender);
    }
    if (step === 1) {
      return Boolean(country && city);
    }
    if (step === 2) {
      return form.headline.trim().length >= 5
        && form.bio.trim().length >= 10
        && selectedInterests.length > 0
        && selectedInterests.length <= 20;
    }
    if (step === 3) {
      return Boolean(primaryPhoto);
    }
    return true;
  }, [city, country, form, primaryPhoto, selectedInterests.length, step]);

  const isFallback = typeof window !== 'undefined' && !(window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;

  const fetchCountries = useCallback(async (query = '') => {
    setCountriesLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const data = await fetch('/api/countries?' + params.toString()).then((response) => readApi<{ countries: CountryGeo[] }>(response));
      setCountries(data.countries);
      if (initialProfile?.profile.countryCode) {
        const resolved = data.countries.find((item) => item.code === initialProfile.profile.countryCode);
        if (resolved) setCountry((current) => current ?? resolved);
      }
    } catch (countryError) {
      setError(getErrorMessage(countryError));
    } finally {
      setCountriesLoading(false);
    }
  }, [initialProfile?.profile.countryCode]);

  const fetchCities = useCallback(async ({
    append = false,
    countryCode,
    offset = 0,
    query = '',
  }: {
    append?: boolean;
    countryCode: string;
    offset?: number;
    query?: string;
  }) => {
    setCitiesLoading(true);
    try {
      const params = new URLSearchParams({
        countryCode,
        limit: '500',
        offset: String(offset),
      });
      if (query.trim()) params.set('q', query.trim());
      const data = await fetch('/api/cities?' + params.toString()).then((response) => readApi<{
        cities: CityGeo[];
        pagination: CityPagination;
      }>(response));
      setCities((current) => append ? [...current, ...data.cities] : data.cities);
      setCitiesPagination(data.pagination);
    } catch (cityError) {
      setError(getErrorMessage(cityError));
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCountries();
  }, [fetchCountries]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCountries(countriesSearch);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [countriesSearch, fetchCountries]);

  useEffect(() => {
    if (!country) {
      setCities([]);
      setCitiesPagination(null);
      return;
    }
    setCitiesSearch('');
    void fetchCities({ countryCode: country.code });
  }, [country, fetchCities]);

  useEffect(() => {
    if (!country) return;
    const timeout = window.setTimeout(() => {
      void fetchCities({ countryCode: country.code, query: citiesSearch });
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [citiesSearch, country, fetchCities]);

  useEffect(() => {
    if (step !== 4) return;
    void confetti({
      colors: ['#34baba', '#111827', '#ffffff', '#f59e0b'],
      particleCount: 160,
      spread: 84,
      origin: { y: 0.72 },
    });
  }, [step]);

  const updateField = useCallback((field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  function toggleInterest(value: string) {
    setSelectedInterests((current) => {
      if (current.includes(value)) return current.filter((item) => item !== value);
      if (current.length >= 20) return current;
      return [...current, value];
    });
  }

  async function saveProfileFields() {
    const updated = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ageYears: Number(form.ageYears),
        bio: form.bio.trim() || null,
        cityId: city?.id ?? null,
        cityName: city?.name ?? null,
        countryCode: country?.code ?? null,
        discoverable: true,
        displayName: form.displayName.trim(),
        gender: form.gender,
        headline: form.headline.trim() || null,
        interests: selectedInterests,
        visibility: 'public',
      }),
    }).then((response) => readApi<ProfileData>(response));
    setProfile(updated);
    return updated;
  }

  async function refreshProfile() {
    const updated = await fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
    setProfile(updated);
    return updated;
  }

  async function finishProfile() {
    try {
      const completed = await fetch('/api/profile/complete', { method: 'POST' }).then((response) => readApi<ProfileData>(response));
      onComplete(completed);
    } catch (completeError) {
      const fields = typeof completeError === 'object' && completeError !== null && 'missingFields' in completeError
        ? ((completeError as { missingFields?: string[] }).missingFields ?? [])
        : [];
      setMissing(fields);
      throw completeError;
    }
  }

  async function handleNext() {
    if (!canGoNext || busy) return;
    setBusy(true);
    setError('');
    setMissing([]);
    try {
      if (step <= 2) {
        await saveProfileFields();
      }
      if (step === stepKeys.length - 1) {
        await finishProfile();
        return;
      }
      setStep((current) => Math.min(current + 1, stepKeys.length - 1));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setBusy(false);
    }
  }

  function handleBack() {
    if (step === 0 || busy) return;
    setStep((current) => Math.max(current - 1, 0));
  }

  const nextRef = useRef(handleNext);
  const backRef = useRef(handleBack);
  nextRef.current = handleNext;
  backRef.current = handleBack;

  useEffect(() => {
    const onMainClick = () => nextRef.current();
    const onSecondaryClick = () => backRef.current();
    const mainOff = mainButton.onClick.ifAvailable(onMainClick);
    const secondaryOff = secondaryButton.onClick.ifAvailable(onSecondaryClick);
    return () => {
      if (mainOff.ok) mainOff.data();
      if (secondaryOff.ok) secondaryOff.data();
      mainButton.hide.ifAvailable();
      secondaryButton.hide.ifAvailable();
    };
  }, []);

  useEffect(() => {
    mainButton.setParams.ifAvailable({
      hasShineEffect: canGoNext && !busy,
      isEnabled: canGoNext && !busy,
      isLoaderVisible: busy,
      isVisible: true,
      text: busy ? t('buttons.saving') : step === 4 ? t('ready.enterApp') : t('buttons.continue'),
    });
    secondaryButton.setParams.ifAvailable({
      hasShineEffect: false,
      isEnabled: step > 0 && !busy,
      isLoaderVisible: false,
      isVisible: step > 0 && step < 4,
      position: 'left',
      text: t('buttons.back'),
    });
  }, [busy, canGoNext, step, t]);

  async function uploadPhoto(slotIndex: number, rawFile: File) {
    setBusy(true);
    setError('');
    try {
      const compressedFile = await imageCompression(rawFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const ticket = await fetch('/api/profile/photos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileSizeBytes: compressedFile.size,
          isPrivate: false,
          mimeType: compressedFile.type,
        }),
      }).then((response) => readApi<UploadTicket>(response));

      const uploadResponse = await fetch(ticket.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': compressedFile.type },
        body: compressedFile,
      });
      if (!uploadResponse.ok) {
        throw new Error(t('photos.uploadError'));
      }
      const size = await getImageSize(compressedFile);
      await fetch(`/api/profile/photos/${ticket.photoId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...size, blurHash: null }),
      }).then((response) => readApi<{ confirmed: boolean; photoId: string }>(response));
      if (slotIndex === 0) {
        await fetch(`/api/profile/photos/${ticket.photoId}/primary`, { method: 'POST' }).then((response) => readApi<{ isPrimary: boolean }>(response));
      }
      await refreshProfile();
    } catch (photoError) {
      setError(getErrorMessage(photoError));
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photoId: string) {
    setBusy(true);
    setError('');
    try {
      await fetch(`/api/profile/photos/${photoId}`, { method: 'DELETE' }).then((response) => readApi<{ deleted: boolean }>(response));
      await refreshProfile();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  async function requestCoordinates() {
    if (locationManager.requestLocation.isAvailable()) {
      const result = await locationManager.requestLocation();
      if (result) return { latitude: result.latitude, longitude: result.longitude };
    }
    if ('geolocation' in navigator) {
      return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
          () => reject(new Error(t('location.locationDenied'))),
          { enableHighAccuracy: true, timeout: 12_000 },
        );
      });
    }
    throw new Error(t('location.unsupportedLocation'));
  }

  async function handleGPSDetection() {
    setGeoLoading(true);
    setGeoError('');
    setError('');
    try {
      const coordinates = await requestCoordinates();
      const result = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coordinates),
      }).then((response) => readApi<{ city: CityGeo; country: CountryGeo }>(response));
      setCountry(result.country);
      setCity(result.city);
    } catch (locationError) {
      setGeoError(getErrorMessage(locationError));
    } finally {
      setGeoLoading(false);
    }
  }

  function renderPhotoSlot(slotIndex: number, photo: ProfilePhoto | null, label: string) {
    return photo ? (
      <div className={`photo-slot ${slotIndex === 0 ? 'photo-slot-large' : 'photo-slot-small'} has-image`}>
        {photo.publicUrl && <img src={photo.publicUrl} alt={label} />}
        <button type="button" className="photo-delete-button" disabled={busy} onClick={() => deletePhoto(photo.id)}>
          {t('photos.deletePhoto')}
        </button>
      </div>
    ) : (
      <label className={`photo-slot ${slotIndex === 0 ? 'photo-slot-large' : 'photo-slot-small'}`}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void uploadPhoto(slotIndex, file);
          }}
        />
        <span className="photo-slot-add">
          <span className="photo-plus">+</span>
          <span>{slotIndex === 0 ? t('photos.choosePhoto') : t('photos.addPhoto')}</span>
        </span>
      </label>
    );
  }

  return (
    <main className="auth-page">
      <section className="onboarding-header">
        <div className="mini-icon">
          <NextImage src={appIcon} alt="Mull Mull" priority />
        </div>
        <div>
          <p className="eyebrow">{t('stepLabel', { current: step + 1, total: stepKeys.length })}</p>
          <h1>{t(`${stepKeys[step]}.title`)}</h1>
        </div>
      </section>

      <ProgressSteps step={step} title={t('progressLabel')} />

      <section className="step-panel">
        {step === 0 && (
          <div className="field-grid">
            <Section header={t('basics.nameHeader')} footer={t('basics.nameFooter')}>
              <Input
                value={form.displayName}
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder={t('basics.placeholderName')}
                maxLength={80}
              />
            </Section>

            <Section header={t('basics.ageHeader')} footer={t('basics.ageCalculated', { age: form.ageYears })}>
              <div className="age-cell">
                <DatePicker
                  initialAge={Number(form.ageYears) || 25}
                  label={t('basics.ageWheel')}
                  onChange={(_, age) => updateField('ageYears', String(age))}
                />
              </div>
            </Section>

            <Section header={t('basics.labelGender')} footer={t('basics.descriptionGender')}>
              {genderOptions.map((option) => (
                <Cell
                  key={option.value}
                  multiline
                  description={t(`basics.${option.description}`)}
                  after={<Selectable checked={form.gender === option.value} name="gender" onChange={() => updateField('gender', option.value)} />}
                  onClick={() => updateField('gender', option.value)}
                >
                  {t(`basics.${option.title}`)}
                </Cell>
              ))}
            </Section>
          </div>
        )}

        {step === 1 && (
          <div className="field-grid">
            <Section header={t('location.gpsHeader')} footer={geoError || t('location.gpsFooter')}>
              <button type="button" className="gps-button" disabled={geoLoading} onClick={handleGPSDetection}>
                <span>⌖</span>
                {geoLoading ? t('location.locationLoading') : t('location.useGPS')}
              </button>
            </Section>

            <Section header={t('location.title')} footer={t('location.footer')}>
              <Cell
                before={<span className="geo-flag">{country?.emoji_flag ?? '🌍'}</span>}
                after={<span className="cell-chevron">›</span>}
                description={country ? country.code : t('location.countryHint')}
                onClick={() => setCountrySheetOpen(true)}
              >
                {country ? country.name : t('location.placeholderCountry')}
              </Cell>
              <Cell
                before={<span className="geo-flag">🏙️</span>}
                after={<span className="cell-chevron">›</span>}
                className={!country ? 'tg-cell-disabled' : ''}
                description={city?.admin1_name ?? (country ? t('location.cityHint') : t('location.selectCountryFirst'))}
                onClick={() => country && setCitySheetOpen(true)}
              >
                {city ? city.name : t('location.placeholderCity')}
              </Cell>
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="field-grid">
            <Section header={t('story.textHeader')} footer={t('story.textFooter')}>
              <Input
                value={form.headline}
                onChange={(event) => updateField('headline', event.target.value)}
                maxLength={120}
                placeholder={t('story.placeholderHeadline')}
              />
              <Textarea
                value={form.bio}
                onChange={(event) => updateField('bio', event.target.value)}
                maxLength={500}
                rows={4}
                placeholder={t('story.placeholderBio')}
              />
            </Section>

            <Section header={t('story.labelInterests')} footer={t('story.interestCount', { count: selectedInterests.length, max: 20 })}>
              <div className="interests-grid">
                {interestOptions.map(([value, emoji]) => {
                  const selected = selectedInterests.includes(value);
                  const disabled = !selected && selectedInterests.length >= 20;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`interest-chip ${selected ? 'is-selected' : ''}`}
                      disabled={disabled}
                      onClick={() => toggleInterest(value)}
                    >
                      <span>{emoji}</span>
                      <span>{t(`interests.${value}`)}</span>
                      <Checkbox checked={selected} readOnly />
                    </button>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="photo-step">
            <Section header={t('photos.title')} footer={t('photos.tips')}>
              <div className="photo-grid-layout">
                <div className="photo-grid-left">{renderPhotoSlot(0, primaryPhoto, t('photos.primaryAlt'))}</div>
                <div className="photo-grid-right">
                  {renderPhotoSlot(1, secondaryPhotos[0] ?? null, t('photos.secondaryAlt'))}
                  {renderPhotoSlot(2, secondaryPhotos[1] ?? null, t('photos.secondaryAlt'))}
                </div>
              </div>
            </Section>
          </div>
        )}

        {step === 4 && (
          <div className="finish-step">
            <h2>{t('ready.title')}</h2>
            <p>{t('ready.message')}</p>
            {missing.length > 0 && <p className="missing-fields">{t('ready.missing', { fields: missing.join(', ') })}</p>}
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {isFallback && (
          <div className="step-actions">
            {step > 0 && step < 4 && (
              <button type="button" className="ghost-button" disabled={busy} onClick={handleBack}>
                {t('buttons.back')}
              </button>
            )}
            <button type="button" className="primary-button" disabled={!canGoNext || busy} onClick={handleNext}>
              {busy ? t('buttons.saving') : step === 4 ? t('ready.enterApp') : t('buttons.continue')}
            </button>
          </div>
        )}
      </section>

      {countrySheetOpen && (
        <SearchSheet
          emptyText={t('location.emptyCountries')}
          closeText={t('buttons.close')}
          getKey={(item) => item.code}
          getSubtitle={(item) => item.code}
          getVisual={(item) => item.emoji_flag ?? '🌍'}
          isLoading={countriesLoading}
          items={countries}
          loadMoreText={t('location.loadMore')}
          onClose={() => setCountrySheetOpen(false)}
          onPick={(item) => {
            setCountry(item);
            setCity(null);
            setCountrySheetOpen(false);
            setCountriesSearch('');
          }}
          onSearch={setCountriesSearch}
          placeholder={t('location.searchCountry')}
          search={countriesSearch}
          title={t('location.labelCountry')}
        />
      )}

      {citySheetOpen && country && (
        <SearchSheet
          emptyText={t('location.emptyCities')}
          closeText={t('buttons.close')}
          getKey={(item) => item.id}
          getSubtitle={(item) => item.admin1_name}
          getVisual={() => '🏙️'}
          isLoading={citiesLoading}
          items={cities}
          loadMoreText={t('location.loadMore')}
          nextOffset={citiesPagination?.nextOffset}
          onClose={() => setCitySheetOpen(false)}
          onLoadMore={() => {
            if (citiesPagination?.nextOffset !== null && citiesPagination?.nextOffset !== undefined) {
              void fetchCities({
                append: true,
                countryCode: country.code,
                offset: citiesPagination.nextOffset,
                query: citiesSearch,
              });
            }
          }}
          onPick={(item) => {
            setCity(item);
            setCitySheetOpen(false);
            setCitiesSearch('');
          }}
          onSearch={setCitiesSearch}
          placeholder={t('location.searchCity')}
          search={citiesSearch}
          title={t('location.labelCity')}
        />
      )}
    </main>
  );
}

type EditableField =
  | 'displayName'
  | 'headline'
  | 'bio'
  | 'aboutMe'
  | 'lookingForText'
  | 'personalitySummary'
  | 'funFact'
  | 'firstDateIdea'
  | 'pronouns'
  | 'mood'
  | 'languages'
  | 'relationshipGoals'
  | 'intents'
  | 'interests'
  | 'discoverable'
  | 'followApprovalRequired'
  | 'visibility';

type ProfileEditor = {
  field: EditableField;
  label: string;
  multiline?: boolean;
  options?: readonly string[];
};

const profileSections: Array<{ title: string; fields: ProfileEditor[] }> = [
  {
    title: 'About you',
    fields: [
      { field: 'displayName', label: 'Name' },
      { field: 'headline', label: 'Headline' },
      { field: 'bio', label: 'Bio', multiline: true },
      { field: 'aboutMe', label: 'About me', multiline: true },
      { field: 'pronouns', label: 'Pronouns' },
      { field: 'mood', label: 'Current mood' },
    ],
  },
  {
    title: 'Dating preferences',
    fields: [
      { field: 'lookingForText', label: 'What you are looking for', multiline: true },
      { field: 'relationshipGoals', label: 'Relationship goals' },
      { field: 'intents', label: 'Dating intentions' },
      { field: 'firstDateIdea', label: 'Perfect first date', multiline: true },
    ],
  },
  {
    title: 'More to discover',
    fields: [
      { field: 'personalitySummary', label: 'Personality', multiline: true },
      { field: 'funFact', label: 'Fun fact', multiline: true },
      { field: 'interests', label: 'Interests' },
      { field: 'languages', label: 'Languages' },
    ],
  },
  {
    title: 'Privacy',
    fields: [
      { field: 'discoverable', label: 'Show me in discovery' },
      { field: 'followApprovalRequired', label: 'Approve followers manually' },
      { field: 'visibility', label: 'Profile visibility', options: ['public', 'matches_only', 'hidden', 'paused'] },
    ],
  },
];

function profileValue(profile: ProfileData['profile'], field: EditableField): string {
  const value = profile[field];
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (value === 'matches_only') return 'Matches only';
  if (value === 'paused') return 'Paused';
  return value?.trim() || 'Add';
}

function ProfileScreen({ profile, onProfileChange }: { profile: ProfileData; onProfileChange: (profile: ProfileData) => void }) {
  const [editor, setEditor] = useState<ProfileEditor | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirmedPhotos = useMemo(
    () => profile.photos.filter((photo) => photo.uploadStatus === 'confirmed').sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
    [profile.photos],
  );

  const closeEditor = useCallback(() => {
    if (!busy) setEditor(null);
  }, [busy]);

  const saveEditor = useCallback(async () => {
    if (!editor || busy) return;
    setBusy(true);
    setError('');
    try {
      let nextValue: string | string[] | boolean = value.trim();
      if (editor.field === 'discoverable' || editor.field === 'followApprovalRequired') nextValue = value === 'On';
      if (['languages', 'relationshipGoals', 'intents', 'interests'].includes(editor.field)) {
        nextValue = value.split(',').map((item) => item.trim()).filter(Boolean);
      }
      const updated = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editor.field]: nextValue || null }),
      }).then((response) => readApi<ProfileData>(response));
      onProfileChange(updated);
      setEditor(null);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }, [busy, editor, onProfileChange, value]);

  const saveRef = useRef(saveEditor);
  saveRef.current = saveEditor;
  useEffect(() => {
    if (!editor) return;
    const off = mainButton.onClick.ifAvailable(() => saveRef.current());
    mainButton.setParams.ifAvailable({ hasShineEffect: !busy, isEnabled: !busy, isLoaderVisible: busy, isVisible: true, text: busy ? 'Saving…' : 'Save changes' });
    secondaryButton.setParams.ifAvailable({ hasShineEffect: false, isEnabled: !busy, isLoaderVisible: false, isVisible: true, position: 'left', text: 'Cancel' });
    const cancel = secondaryButton.onClick.ifAvailable(closeEditor);
    return () => {
      if (off.ok) off.data();
      if (cancel.ok) cancel.data();
      mainButton.hide.ifAvailable();
      secondaryButton.hide.ifAvailable();
    };
  }, [busy, closeEditor, editor]);

  async function uploadPhoto(rawFile: File) {
    setBusy(true);
    setError('');
    try {
      const file = await imageCompression(rawFile, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true });
      const ticket = await fetch('/api/profile/photos/upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSizeBytes: file.size, isPrivate: false, mimeType: file.type }),
      }).then((response) => readApi<UploadTicket>(response));
      const uploaded = await fetch(ticket.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!uploaded.ok) throw new Error('Photo upload failed. Please try again.');
      const size = await getImageSize(file);
      await fetch(`/api/profile/photos/${ticket.photoId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...size, blurHash: null }) }).then((response) => readApi<unknown>(response));
      const updated = await fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
      onProfileChange(updated);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(photoId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/profile/photos/${photoId}`, { method: 'DELETE' }).then((response) => readApi<unknown>(response));
      const updated = await fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
      onProfileChange(updated);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="profile-page">
      <header className="profile-topbar"><strong>Profile</strong><span>⋯</span></header>
      <section className="profile-hero">
        <div className="profile-photo-grid">
          {confirmedPhotos.slice(0, 6).map((photo) => <div className="profile-photo" key={photo.id}>{photo.publicUrl && <img alt="Your profile" src={photo.publicUrl} />}<button aria-label="Remove photo" disabled={busy} onClick={() => void deletePhoto(photo.id)} type="button">×</button></div>)}
          {confirmedPhotos.length < 9 && <label className="profile-photo profile-photo--add"><input accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadPhoto(file); }} type="file" /><span>+</span><small>Add photo</small></label>}
        </div>
        <div className="profile-intro"><h1>{profile.profile.displayName ?? 'Your profile'}{profile.profile.ageYears ? `, ${profile.profile.ageYears}` : ''}</h1><p>{profile.profile.cityName || 'Add your city'} · {profile.profile.gender || 'Add gender'}</p></div>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      {profileSections.map((section) => <Section key={section.title} header={section.title}><List>{section.fields.map((field) => <Cell after={<span className="cell-chevron">›</span>} description={profileValue(profile.profile, field.field)} key={field.field} onClick={() => { setValue(profileValue(profile.profile, field.field) === 'Add' ? '' : Array.isArray(profile.profile[field.field]) ? (profile.profile[field.field] as string[]).join(', ') : typeof profile.profile[field.field] === 'boolean' ? profile.profile[field.field] ? 'On' : 'Off' : String(profile.profile[field.field] ?? '')); setEditor(field); }}>{field.label}</Cell>)}</List></Section>)}
      <nav aria-label="Main navigation" className="bottom-nav"><button type="button">⌂<span>Discover</span></button><button type="button">♡<span>Likes</span></button><button type="button">✦<span>Matches</span></button><button type="button">☻<span>Profile</span></button></nav>
      {editor && <div className="profile-editor-backdrop" onMouseDown={closeEditor} role="presentation"><section aria-label={`Edit ${editor.label}`} aria-modal="true" className="profile-editor-sheet" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="sheet-handle" /><header><h2>{editor.label}</h2><button aria-label="Close" disabled={busy} onClick={closeEditor} type="button">×</button></header>{editor.field === 'discoverable' || editor.field === 'followApprovalRequired' ? <div className="editor-options">{['On', 'Off'].map((option) => <button className={value === option ? 'is-selected' : ''} key={option} onClick={() => setValue(option)} type="button">{option}</button>)}</div> : editor.options ? <div className="editor-options">{editor.options.map((option) => <button className={value === option ? 'is-selected' : ''} key={option} onClick={() => setValue(option)} type="button">{option.replace('_', ' ')}</button>)}</div> : editor.multiline ? <Textarea maxLength={editor.field === 'aboutMe' ? 2000 : 500} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${editor.label.toLowerCase()}`} rows={5} value={value} /> : <Input maxLength={editor.field === 'displayName' ? 80 : 300} onChange={(event) => setValue(event.target.value)} placeholder={`Add ${editor.label.toLowerCase()}`} value={value} />}{['languages', 'relationshipGoals', 'intents', 'interests'].includes(editor.field) && <p className="editor-hint">Separate items with commas.</p>}<div className="editor-actions"><button disabled={busy} onClick={closeEditor} type="button">Cancel</button><button disabled={busy} onClick={() => void saveEditor()} type="button">{busy ? 'Saving…' : 'Save changes'}</button></div></section></div>}
    </main>
  );
}

export default function Home() {
  const t = useTranslations('app');
  const rawInitData = useRawInitData();
  const telegramUser = useSignal(initData.user);
  const [state, setState] = useState<BootState>('loading');
  const [statusMessage, setStatusMessage] = useState(t('opening'));
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  const telegramName = useMemo(() => {
    if (!telegramUser) return '';
    return [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
  }, [telegramUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      return fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
    }

    async function boot() {
      setState('loading');
      setStatusMessage(t('checkingSession'));
      setError('');

      try {
        let gate: AuthGateData;
        try {
          gate = await fetch('/api/auth/me').then((response) => readApi<AuthGateData>(response));
        } catch (sessionError) {
          if (!isUnauthorized(sessionError)) throw sessionError;
          if (!rawInitData) throw new Error(t('openFromTelegram'));
          setStatusMessage(t('signingIn'));
          gate = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: rawInitData }),
          }).then((response) => readApi<AuthGateData>(response));
        }

        setStatusMessage(t('preparingProfile'));
        const nextProfile = gate.profileRequired ? await loadProfile() : await loadProfile().catch(() => null);
        if (cancelled) return;
        setProfile(nextProfile);
        setState(gate.profileRequired ? 'onboarding' : 'home');
      } catch (bootError) {
        if (cancelled) return;
        setError(getErrorMessage(bootError));
        setState('error');
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [rawInitData, t]);

  if (state === 'loading') {
    return (
      <Page back={false}>
        <BrandSplash message={statusMessage} />
      </Page>
    );
  }

  if (state === 'error') {
    return (
      <Page back={false}>
        <main className="auth-page auth-page--splash">
          <section className="splash-card">
            <div className="app-icon">
              <NextImage src={appIcon} alt="Mull Mull" priority />
            </div>
            <h1>{t('signInError')}</h1>
            <p>{error}</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              {t('tryAgain')}
            </button>
          </section>
        </main>
      </Page>
    );
  }

  if (state === 'onboarding') {
    return (
      <Page back={false}>
        <CompleteProfileStepper
          initialProfile={profile}
          telegramName={telegramName}
          onComplete={(completedProfile) => {
            setProfile(completedProfile);
            setState('home');
          }}
        />
      </Page>
    );
  }

  return (
    <Page back={false}>
      {profile ? <ProfileScreen profile={profile} onProfileChange={setProfile} /> : <MainHome profile={profile} />}
    </Page>
  );
}
