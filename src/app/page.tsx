'use client';

import NextImage from 'next/image';
import { useEffect, useMemo, useState, useRef } from 'react';
import { initData, useRawInitData, useSignal, mainButton, secondaryButton, locationManager } from '@tma.js/sdk-react';
import { useTranslations } from 'next-intl';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';

import { Page } from '@/components/Page';
import {
  Button,
  Cell,
  Section,
  Steps,
  Placeholder,
  Input,
  Textarea,
  Checkbox,
  Chip,
  Modal,
  Selectable,
  Multiselectable,
  DatePicker,
} from '@/components/ui';

import appIcon from './_assets/ChatGPT Image Jul 15, 2026, 01_38_55 PM.png';
import logoMark from './_assets/ChatGPT Image Jul 15, 2026, 01_38_51 PM.png';
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
    countryCode: string | null;
    cityName: string | null;
    cityId: string | null;
    interests: string[] | null;
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
  displayName: string;
  ageYears: string;
  gender: string;
  countryCode: string;
  cityName: string;
  cityId: string;
  headline: string;
  bio: string;
  interests: string;
};

interface CountryGeo {
  code: string;
  name: string;
  emoji_flag: string | null;
}

interface CityGeo {
  id: string;
  name: string;
  country_code: string;
}

const genderOptions = [
  { value: 'woman', key: 'gender_woman', descKey: 'gender_woman_desc' },
  { value: 'man', key: 'gender_man', descKey: 'gender_man_desc' },
  { value: 'non_binary', key: 'gender_non_binary', descKey: 'gender_non_binary_desc' },
  { value: 'other', key: 'gender_other', descKey: 'gender_other_desc' },
  { value: 'prefer_not_to_say', key: 'gender_prefer_not_to_say', descKey: 'gender_prefer_not_to_say_desc' },
];

const stepTitles = ['Basics', 'Location', 'Story & Interests', 'Photos', 'Ready'];

function initialForm(profile?: ProfileData | null, telegramName = ''): ProfileForm {
  return {
    displayName: profile?.profile.displayName ?? telegramName,
    ageYears: profile?.profile.ageYears ? String(profile.profile.ageYears) : '',
    gender: profile?.profile.gender ?? '',
    countryCode: profile?.profile.countryCode ?? '',
    cityName: profile?.profile.cityName ?? '',
    cityId: profile?.profile.cityId ?? '',
    headline: profile?.profile.headline ?? '',
    bio: profile?.profile.bio ?? '',
    interests: profile?.profile.interests?.join(', ') ?? '',
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

function hasPrimaryPhoto(profile: ProfileData | null) {
  return Boolean(profile?.photos.some((photo) => photo.isPrimary && photo.uploadStatus === 'confirmed'));
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
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

async function uploadPrimaryPhoto(file: File) {
  const ticket = await fetch('/api/profile/photos/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mimeType: file.type,
      fileSizeBytes: file.size,
      isPrivate: false,
    }),
  }).then((response) => readApi<UploadTicket>(response));

  const uploadResponse = await fetch(ticket.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error('The photo could not be uploaded.');
  }

  const size = await getImageSize(file);
  await fetch(`/api/profile/photos/${ticket.photoId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...size, blurHash: null }),
  }).then((response) => readApi<{ confirmed: boolean; photoId: string }>(response));
}

function BrandSplash({ message }: { message: string }) {
  return (
    <main className="auth-page auth-page--splash">
      <section className="splash-card" aria-live="polite">
        <div className="brand-stack">
          <div className="app-icon">
            <NextImage src={appIcon} alt="App icon" priority />
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
  const name = profile?.profile.displayName ?? 'there';

  return (
    <main className="auth-page">
      <section className="home-hero">
        <div>
          <p className="eyebrow">Ready</p>
          <h1>Hi, {name}</h1>
        </div>
        <div className="mini-icon">
          <NextImage src={appIcon} alt="" priority />
        </div>
      </section>

      <section className="quick-grid" aria-label="Main actions">
        <button type="button" className="action-tile">
          <span>Discovery</span>
          <strong>Find matches</strong>
        </button>
        <button type="button" className="action-tile">
          <span>Chemistry</span>
          <strong>Daily card</strong>
        </button>
        <button type="button" className="action-tile">
          <span>Messages</span>
          <strong>Open chats</strong>
        </button>
        <button type="button" className="action-tile">
          <span>Feed</span>
          <strong>Social posts</strong>
        </button>
      </section>

      <section className="profile-strip">
        <div>
          <p className="eyebrow">Profile</p>
          <h2>{profile?.profile.headline || 'Your profile is live'}</h2>
          <p>{profile?.profile.cityName || 'Start meeting people nearby.'}</p>
        </div>
      </section>
    </main>
  );
}

function ProgressSteps({ step }: { step: number }) {
  return (
    <ol
      className="progress-steps"
      style={{ gridTemplateColumns: `repeat(${stepTitles.length}, minmax(0, 1fr))` }}
      aria-label="Profile setup progress"
    >
      {stepTitles.map((title, index) => (
        <li key={title} className={index <= step ? 'is-active' : ''}>
          <span>{index + 1}</span>
          <small>{title}</small>
        </li>
      ))}
    </ol>
  );
}

const INTERESTS_LIST = [
  { label: 'Art', emoji: '🎨' },
  { label: 'Music', emoji: '🎵' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Cooking', emoji: '🍳' },
  { label: 'Movies', emoji: '🎬' },
  { label: 'Reading', emoji: '📚' },
  { label: 'Fitness', emoji: '🏋️' },
  { label: 'Cycling', emoji: '🚴' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Photography', emoji: '📸' },
  { label: 'Camping', emoji: '🏕️' },
  { label: 'Pets', emoji: '🐱' },
  { label: 'Coffee', emoji: '☕' },
  { label: 'Wine', emoji: '🍷' },
  { label: 'Food', emoji: '🍕' },
  { label: 'Board Games', emoji: '🧩' },
  { label: 'Coding', emoji: '💻' },
  { label: 'Writing', emoji: '✍️' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Dancing', emoji: '💃' },
  { label: 'Karaoke', emoji: '🎤' },
  { label: 'Shopping', emoji: '🛍️' },
  { label: 'Cars', emoji: '🚗' },
  { label: 'Fashion', emoji: '💄' },
  { label: 'Nature', emoji: '🌿' }
];

function CompleteProfileStepper({
  initialProfile,
  telegramName,
  onComplete,
}: {
  initialProfile: ProfileData | null;
  telegramName: string;
  onComplete: (profile: ProfileData) => void;
}) {
  const t = useTranslations('onboarding');
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile);
  const [form, setForm] = useState(() => initialForm(initialProfile, telegramName));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);

  // Geolocation states
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [countriesList, setCountriesList] = useState<CountryGeo[]>([]);
  const [citiesList, setCitiesList] = useState<CityGeo[]>([]);
  const [countriesSearch, setCountriesSearch] = useState('');
  const [citiesSearch, setCitiesSearch] = useState('');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const [country, setCountry] = useState<CountryGeo | null>(() => {
    if (initialProfile?.profile.countryCode) {
      return {
        code: initialProfile.profile.countryCode,
        name: initialProfile.profile.countryCode,
        emoji_flag: null
      };
    }
    return null;
  });

  const [city, setCity] = useState<CityGeo | null>(() => {
    if (initialProfile?.profile.cityId && initialProfile?.profile.cityName) {
      return {
        id: initialProfile.profile.cityId,
        name: initialProfile.profile.cityName,
        country_code: initialProfile.profile.countryCode || ''
      };
    }
    return null;
  });

  // Selected interests state (parsed from initial profile comma string)
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (initialProfile?.profile.interests) {
      return initialProfile.profile.interests;
    }
    return [];
  });

  // Confetti triggering on step 4 (Ready)
  useEffect(() => {
    if (step === 4) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error('Confetti error:', e);
      }
    }
  }, [step]);

  // Load countries on mount
  useEffect(() => {
    let active = true;
    fetch('/api/countries')
      .then((r) => r.json())
      .then((res) => {
        if (!active) return;
        if (res.data?.countries) {
          setCountriesList(res.data.countries);
          // Resolve initial country name and flag
          if (country && !country.emoji_flag) {
            const resolved = res.data.countries.find((c: any) => c.code === country.code);
            if (resolved) setCountry(resolved);
          }
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, []);

  // Load cities of country when selected country changes
  useEffect(() => {
    if (!country) {
      setCitiesList([]);
      return;
    }
    let active = true;
    fetch(`/api/cities?countryCode=${country.code}`)
      .then((r) => r.json())
      .then((res) => {
        if (!active) return;
        if (res.data?.cities) {
          setCitiesList(res.data.cities);
        }
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [country]);

  // Map photo slots from profile data
  const confirmedPhotos = useMemo(() => {
    return (profile?.photos || []).filter((p) => p.uploadStatus === 'confirmed');
  }, [profile]);

  const primaryPhoto = useMemo(() => {
    return confirmedPhotos.find((p) => p.isPrimary) || null;
  }, [confirmedPhotos]);

  const secondaryPhotos = useMemo(() => {
    return confirmedPhotos.filter((p) => !p.isPrimary);
  }, [confirmedPhotos]);

  const profileHasPhoto = Boolean(primaryPhoto);

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return (
        form.displayName.trim().length >= 2 &&
        Number(form.ageYears) >= 18 &&
        Boolean(form.gender)
      );
    }
    if (step === 1) {
      return country !== null && city !== null;
    }
    if (step === 2) {
      return (
        form.headline.trim().length >= 5 &&
        form.bio.trim().length >= 10 &&
        selectedInterests.length > 0 &&
        selectedInterests.length <= 20
      );
    }
    if (step === 3) {
      return profileHasPhoto;
    }
    return true;
  }, [form, country, city, selectedInterests, profileHasPhoto, step]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Interests selection handler
  function toggleInterest(interestLabel: string) {
    setSelectedInterests((current) => {
      if (current.includes(interestLabel)) {
        return current.filter((item) => item !== interestLabel);
      }
      if (current.length >= 20) {
        return current; // Cap at 20
      }
      return [...current, interestLabel];
    });
  }

  async function saveProfileFields() {
    const payload = {
      displayName: form.displayName.trim(),
      ageYears: Number(form.ageYears),
      gender: form.gender,
      countryCode: country?.code.toUpperCase() || null,
      cityName: city?.name || null,
      cityId: city?.id || null,
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      interests: selectedInterests,
      visibility: 'public',
      discoverable: true,
    };

    const updated = await fetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((response) => readApi<ProfileData>(response));
    setProfile(updated);
  }

  async function refreshProfile() {
    const updated = await fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
    setProfile(updated);
    return updated;
  }

  async function finishProfile() {
    try {
      const completed = await fetch('/api/profile/complete', {
        method: 'POST',
      }).then((response) => readApi<ProfileData>(response));
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
    if (!canGoNext || busy) {
      return;
    }

    setBusy(true);
    setError('');
    setMissing([]);
    try {
      if (step === 0 || step === 1 || step === 2) {
        await saveProfileFields();
      }
      if (step === 4) {
        await finishProfile();
        return;
      }
      setStep((current) => Math.min(current + 1, stepTitles.length - 1));
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

  // Synchronize click handlers with refs to avoid stale closures in native Telegram buttons
  const handleNextRef = useRef(handleNext);
  const handleBackRef = useRef(handleBack);
  handleNextRef.current = handleNext;
  handleBackRef.current = handleBack;

  useEffect(() => {
    const onMainClick = () => handleNextRef.current();
    const onSecClick = () => handleBackRef.current();

    try {
      mainButton.onClick(onMainClick);
      secondaryButton.onClick(onSecClick);
    } catch {}

    return () => {
      try {
        mainButton.offClick(onMainClick);
        secondaryButton.offClick(onSecClick);
      } catch {}
    };
  }, []);

  // Update native Telegram buttons state and properties dynamically
  useEffect(() => {
    if (!mainButton.isMounted) return;

    try {
      if (step === 4) {
        mainButton.setParams({
          text: t('ready.enterApp'),
          isVisible: true,
          isEnabled: true,
          isLoaderVisible: busy,
        });
      } else {
        mainButton.setParams({
          text: t('buttons.continue'),
          isVisible: true,
          isEnabled: canGoNext && !busy,
          isLoaderVisible: busy,
        });
      }

      if (canGoNext && !busy && step < 4) {
        mainButton.enableShineEffect();
      } else {
        mainButton.disableShineEffect();
      }

      if (step > 0 && step < 4) {
        secondaryButton.setParams({
          text: t('buttons.back'),
          isVisible: true,
          isEnabled: !busy,
        });
      } else {
        secondaryButton.hide();
      }
    } catch (e) {
      console.error('Error configuring Telegram native buttons:', e);
    }
  }, [step, canGoNext, busy, t]);

  async function handlePhotoDelete(photoId: string) {
    setError('');
    setBusy(true);
    try {
      await fetch(`/api/profile/photos/${photoId}`, {
        method: 'DELETE',
      }).then((response) => readApi<{ deleted: boolean }>(response));
      
      await refreshProfile();
    } catch (e: any) {
      setError(e.message || 'Failed to delete photo');
    } finally {
      setBusy(false);
    }
  }

  // Handle Photo Picker & Compression prior to uploading
  async function handleSlotUpload(slotIndex: number, fileInput: File) {
    if (!fileInput) return;
    setBusy(true);
    setError('');
    try {
      // Client-side image compression
      const compressionOpts = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileInput, compressionOpts);

      const ticket = await fetch('/api/profile/photos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mimeType: compressedFile.type,
          fileSizeBytes: compressedFile.size,
          isPrivate: false,
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

      // Make primary if Slot 0 (left slot)
      if (slotIndex === 0) {
        await fetch(`/api/profile/photos/${ticket.photoId}/primary`, {
          method: 'POST',
        });
      }

      await refreshProfile();
    } catch (e: any) {
      console.error(e);
      setError(e.message || t('photos.uploadError'));
    } finally {
      setBusy(false);
    }
  }

  // Handle native Location retrieval using locationManager SDK
  async function handleGPSDetection() {
    setGeoLoading(true);
    setGeoError('');
    try {
      if (!locationManager.isMounted) {
        await locationManager.mount();
      }
      
      if (!locationManager.requestLocation.isAvailable()) {
        throw new Error('Telegram Geolocation is not supported in this client version.');
      }

      const location = await locationManager.requestLocation();
      if (!location || location.latitude === undefined || location.longitude === undefined) {
        throw new Error('Coordinates could not be retrieved.');
      }

      const response = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Proximity lookup failed.');
      }

      const result = await response.json();
      if (result.data && result.data.city && result.data.country) {
        setCountry(result.data.country);
        setCity(result.data.city);
        
        setForm((curr) => ({
          ...curr,
          countryCode: result.data.country.code,
          cityName: result.data.city.name,
          cityId: result.data.city.id,
        }));
      } else {
        throw new Error('GPS coordinates are outside our covered area.');
      }
    } catch (e: any) {
      console.error(e);
      setGeoError(e.message || 'GPS location lookup failed.');
    } finally {
      setGeoLoading(false);
    }
  }

  const isFallback = typeof window !== 'undefined' && !(window as any).Telegram?.WebApp?.initData;

  const filteredCountries = countriesList.filter(
    (c) =>
      c.name.toLowerCase().includes(countriesSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countriesSearch.toLowerCase())
  );

  const filteredCities = citiesList.filter((c) =>
    c.name.toLowerCase().includes(citiesSearch.toLowerCase())
  );

  return (
    <main className="auth-page">
      <section className="onboarding-header">
        <div className="mini-icon">
          <NextImage src={appIcon} alt="Paw Date" priority />
        </div>
        <div>
          <p className="eyebrow">{t('basics.title')}</p>
          <h1>Set up your dating card</h1>
        </div>
      </section>

      <ProgressSteps step={step} />

      <section className="step-panel">
        {step === 0 && (
          <div className="field-grid">
            <label>
              {t('basics.labelName')}
              <input
                value={form.displayName}
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder={t('basics.placeholderName')}
              />
            </label>
            
            <label>
              {t('basics.labelAge')}
              <DatePicker
                initialDate={form.ageYears ? new Date(2026 - Number(form.ageYears), 0, 1) : undefined}
                onChange={(date, age) => {
                  updateField('ageYears', String(age));
                }}
              />
              {form.ageYears && (
                <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 600, color: 'var(--tg-theme-button-color, #34baba)' }}>
                  {t('basics.ageCalculated', { age: form.ageYears })}
                </div>
              )}
            </label>

            <label style={{ display: 'block', marginTop: '10px' }}>
              <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800 }}>
                {t('basics.labelGender')}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {genderOptions.map((option) => (
                  <Cell
                    key={option.value}
                    description={t(`basics.${option.descKey}`)}
                    after={
                      <Selectable
                        name="gender"
                        checked={form.gender === option.value}
                        onChange={() => updateField('gender', option.value)}
                      />
                    }
                    onClick={() => updateField('gender', option.value)}
                  >
                    {t(`basics.${option.key}`)}
                  </Cell>
                ))}
              </div>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="field-grid">
            <div className="gps-button-container">
              <button
                type="button"
                className="gps-button"
                onClick={handleGPSDetection}
                disabled={geoLoading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 12-8 12S4 15.25 4 10a8 8 0 0 1 8-8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {geoLoading ? t('location.locationLoading') : t('location.useGPS')}
              </button>
              {geoError && (
                <p className="form-error" style={{ marginTop: '8px' }}>{geoError}</p>
              )}
            </div>

            <label>
              {t('location.labelCountry')}
              <Cell
                onClick={() => setCountryModalOpen(true)}
                after={<span className="geo-flag">{country?.emoji_flag || '🌍'}</span>}
              >
                {country ? country.name : t('location.placeholderCountry')}
              </Cell>
            </label>

            <label className={!country ? 'tg-cell-disabled' : ''}>
              {t('location.labelCity')}
              <Cell
                onClick={() => country && setCityModalOpen(true)}
                after={<span>🏙️</span>}
              >
                {city ? city.name : t('location.placeholderCity')}
              </Cell>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="field-grid">
            <label>
              {t('story.labelHeadline')}
              <input
                value={form.headline}
                onChange={(event) => updateField('headline', event.target.value)}
                maxLength={120}
                placeholder={t('story.placeholderHeadline')}
              />
            </label>
            
            <label>
              {t('story.labelBio')}
              <textarea
                value={form.bio}
                onChange={(event) => updateField('bio', event.target.value)}
                maxLength={500}
                rows={4}
                placeholder={t('story.placeholderBio')}
              />
            </label>

            <label style={{ display: 'block', marginTop: '10px' }}>
              <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800 }}>
                {t('story.labelInterests')}
              </span>
              <div className="interests-grid">
                {INTERESTS_LIST.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.label);
                  return (
                    <div
                      key={interest.label}
                      className={`interest-chip ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => toggleInterest(interest.label)}
                    >
                      <span style={{ fontSize: '16px' }}>{interest.emoji}</span>
                      <span>{interest.label}</span>
                      <div className="interest-chip-checkbox">
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="photo-step">
            <div className="photo-target" style={{ border: '0', padding: '0', minHeight: 'auto' }}>
              <p style={{ margin: '0 0 10px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                {t('photos.tips')}
              </p>
            </div>

            <div className="photo-grid-layout">
              {/* Left Slot - Large Primary Photo */}
              <div className="photo-grid-left">
                {primaryPhoto ? (
                  <div className="photo-slot photo-slot-large has-image">
                    <img src={primaryPhoto.publicUrl || ''} alt="Primary" />
                    <div className="photo-slot-overlay">
                      <button
                        type="button"
                        className="photo-slot-btn"
                        onClick={() => handlePhotoDelete(primaryPhoto.id)}
                      >
                        {t('photos.deletePhoto')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="photo-slot photo-slot-large">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={busy}
                      onChange={(event) => {
                        const fileInput = event.target.files?.[0];
                        if (fileInput) handleSlotUpload(0, fileInput);
                      }}
                    />
                    <div className="photo-slot-add">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <span>{t('photos.choosePhoto')}</span>
                    </div>
                  </label>
                )}
              </div>

              {/* Right Slots - Two Smaller Secondary Photos */}
              <div className="photo-grid-right">
                {/* Secondary Slot 1 */}
                {secondaryPhotos[0] ? (
                  <div className="photo-slot photo-slot-small has-image">
                    <img src={secondaryPhotos[0].publicUrl || ''} alt="Secondary 1" />
                    <div className="photo-slot-overlay">
                      <button
                        type="button"
                        className="photo-slot-btn"
                        onClick={() => handlePhotoDelete(secondaryPhotos[0].id)}
                      >
                        {t('photos.deletePhoto')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="photo-slot photo-slot-small">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={busy}
                      onChange={(event) => {
                        const fileInput = event.target.files?.[0];
                        if (fileInput) handleSlotUpload(1, fileInput);
                      }}
                    />
                    <div className="photo-slot-add">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  </label>
                )}

                {/* Secondary Slot 2 */}
                {secondaryPhotos[1] ? (
                  <div className="photo-slot photo-slot-small has-image">
                    <img src={secondaryPhotos[1].publicUrl || ''} alt="Secondary 2" />
                    <div className="photo-slot-overlay">
                      <button
                        type="button"
                        className="photo-slot-btn"
                        onClick={() => handlePhotoDelete(secondaryPhotos[1].id)}
                      >
                        {t('photos.deletePhoto')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="photo-slot photo-slot-small">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={busy}
                      onChange={(event) => {
                        const fileInput = event.target.files?.[0];
                        if (fileInput) handleSlotUpload(2, fileInput);
                      }}
                    />
                    <div className="photo-slot-add">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="finish-step">
            <h2>{t('ready.title')}</h2>
            <p>{t('ready.message')}</p>
            {missing.length > 0 && (
              <p className="missing-fields">Missing: {missing.join(', ')}</p>
            )}
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {isFallback && (
          <div className="step-actions">
            {step > 0 && step < 4 && (
              <button
                type="button"
                className="ghost-button"
                disabled={busy}
                onClick={handleBack}
              >
                {t('buttons.back')}
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={!canGoNext || busy}
              onClick={handleNext}
              style={{ gridColumn: step === 0 || step === 4 ? 'span 2' : 'auto' }}
            >
              {busy ? t('buttons.saving') : step === 4 ? t('ready.enterApp') : t('buttons.continue')}
            </button>
          </div>
        )}
      </section>

      {/* Country Selection Modal */}
      {countryModalOpen && (
        <div className="geo-modal-overlay">
          <div className="geo-modal-content">
            <div className="geo-modal-header">
              <h3>{t('location.labelCountry')}</h3>
              <button
                type="button"
                className="geo-modal-close"
                onClick={() => setCountryModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="geo-modal-search">
              <input
                value={countriesSearch}
                onChange={(e) => setCountriesSearch(e.target.value)}
                placeholder={t('location.searchCountry')}
              />
            </div>
            <div className="geo-modal-list">
              {filteredCountries.map((item) => (
                <div
                  key={item.code}
                  className="geo-list-item"
                  onClick={() => {
                    setCountry(item);
                    setCity(null); // Clear city when country changes
                    setForm((curr) => ({
                      ...curr,
                      countryCode: item.code,
                      cityName: '',
                      cityId: '',
                    }));
                    setCountryModalOpen(false);
                    setCountriesSearch('');
                  }}
                >
                  <span className="geo-flag">{item.emoji_flag || '🌍'}</span>
                  <span className="geo-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* City Selection Modal */}
      {cityModalOpen && (
        <div className="geo-modal-overlay">
          <div className="geo-modal-content">
            <div className="geo-modal-header">
              <h3>{t('location.labelCity')}</h3>
              <button
                type="button"
                className="geo-modal-close"
                onClick={() => setCityModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="geo-modal-search">
              <input
                value={citiesSearch}
                onChange={(e) => setCitiesSearch(e.target.value)}
                placeholder={t('location.searchCity')}
              />
            </div>
            <div className="geo-modal-list">
              {filteredCities.map((item) => (
                <div
                  key={item.id}
                  className="geo-list-item"
                  onClick={() => {
                    setCity(item);
                    setForm((curr) => ({
                      ...curr,
                      cityName: item.name,
                      cityId: item.id,
                    }));
                    setCityModalOpen(false);
                    setCitiesSearch('');
                  }}
                >
                  <span className="geo-flag">🏙️</span>
                  <span className="geo-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  const rawInitData = useRawInitData();
  const telegramUser = useSignal(initData.user);
  const [state, setState] = useState<BootState>('loading');
  const [statusMessage, setStatusMessage] = useState('Opening Paw Date');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  const telegramName = useMemo(() => {
    if (!telegramUser) {
      return '';
    }
    return [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ');
  }, [telegramUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      return fetch('/api/profile/me').then((response) => readApi<ProfileData>(response));
    }

    async function boot() {
      setState('loading');
      setStatusMessage('Checking your session');
      setError('');

      try {
        let gate: AuthGateData;
        try {
          gate = await fetch('/api/auth/me').then((response) => readApi<AuthGateData>(response));
        } catch (sessionError) {
          if (!isUnauthorized(sessionError)) {
            throw sessionError;
          }
          if (!rawInitData) {
            throw new Error('Open this mini app from Telegram to sign in.');
          }
          setStatusMessage('Signing in with Telegram');
          gate = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: rawInitData }),
          }).then((response) => readApi<AuthGateData>(response));
        }

        setStatusMessage('Preparing your space');
        const nextProfile = gate.profileRequired ? await loadProfile() : await loadProfile().catch(() => null);
        if (cancelled) {
          return;
        }
        setProfile(nextProfile);
        setState(gate.profileRequired ? 'onboarding' : 'home');
      } catch (bootError) {
        if (cancelled) {
          return;
        }
        setError(getErrorMessage(bootError));
        setState('error');
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [rawInitData]);

  if (state === "loading") {
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
              <NextImage src={appIcon} alt="Paw Date" priority />
            </div>
            <h1>Could not sign in</h1>
            <p>{error}</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Try again
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
      <MainHome profile={profile} />
    </Page>
  );
}
