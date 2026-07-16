'use client';

import NextImage from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { initData, useRawInitData, useSignal } from '@tma.js/sdk-react';

import { Page } from '@/components/Page';

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
  headline: string;
  bio: string;
  interests: string;
};

const genderOptions = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const stepTitles = ['Basics', 'Story', 'Photo', 'Finish'];

function initialForm(profile?: ProfileData | null, telegramName = ''): ProfileForm {
  return {
    displayName: profile?.profile.displayName ?? telegramName,
    ageYears: profile?.profile.ageYears ? String(profile.profile.ageYears) : '',
    gender: profile?.profile.gender ?? '',
    countryCode: profile?.profile.countryCode ?? '',
    cityName: profile?.profile.cityName ?? '',
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
    <ol className="progress-steps" aria-label="Profile setup progress">
      {stepTitles.map((title, index) => (
        <li key={title} className={index <= step ? 'is-active' : ''}>
          <span>{index + 1}</span>
          <small>{title}</small>
        </li>
      ))}
    </ol>
  );
}

function CompleteProfileStepper({
  initialProfile,
  telegramName,
  onComplete,
}: {
  initialProfile: ProfileData | null;
  telegramName: string;
  onComplete: (profile: ProfileData) => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(initialProfile);
  const [form, setForm] = useState(() => initialForm(initialProfile, telegramName));
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<string[]>([]);

  const profileHasPhoto = hasPrimaryPhoto(profile);
  const canGoNext = useMemo(() => {
    if (step === 0) {
      return form.displayName.trim().length >= 2
        && Number(form.ageYears) >= 18
        && Boolean(form.gender)
        && /^[a-z]{2}$/i.test(form.countryCode.trim())
        && form.cityName.trim().length > 0;
    }
    if (step === 2) {
      return profileHasPhoto || Boolean(file);
    }
    return true;
  }, [file, form, profileHasPhoto, step]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfileFields() {
    const payload = {
      displayName: form.displayName.trim(),
      ageYears: Number(form.ageYears),
      gender: form.gender,
      countryCode: form.countryCode.trim().toUpperCase(),
      cityName: form.cityName.trim(),
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      interests: splitList(form.interests),
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
      const fields = typeof completeError === 'object'
        && completeError !== null
        && 'missingFields' in completeError
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
      if (step === 0 || step === 1) {
        await saveProfileFields();
      }
      if (step === 2) {
        if (!profileHasPhoto && file) {
          await uploadPrimaryPhoto(file);
          await refreshProfile();
        }
      }
      if (step === 3) {
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

  return (
    <main className="auth-page">
      <section className="onboarding-header">
        <div className="mini-icon">
          <NextImage src={appIcon} alt="Paw Date" priority />
        </div>
        <div>
          <p className="eyebrow">Complete profile</p>
          <h1>Set up your dating card</h1>
        </div>
      </section>

      <ProgressSteps step={step} />

      <section className="step-panel">
        {step === 0 && (
          <div className="field-grid">
            <label>
              Display name
              <input
                value={form.displayName}
                onChange={(event) => updateField('displayName', event.target.value)}
                placeholder="Your name"
              />
            </label>
            <label>
              Age
              <input
                value={form.ageYears}
                onChange={(event) => updateField('ageYears', event.target.value)}
                inputMode="numeric"
                placeholder="18+"
              />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                <option value="">Choose one</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="inline-fields">
              <label>
                Country
                <input
                  value={form.countryCode}
                  onChange={(event) => updateField('countryCode', event.target.value)}
                  maxLength={2}
                  placeholder="US"
                />
              </label>
              <label>
                City
                <input
                  value={form.cityName}
                  onChange={(event) => updateField('cityName', event.target.value)}
                  placeholder="City"
                />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="field-grid">
            <label>
              Headline
              <input
                value={form.headline}
                onChange={(event) => updateField('headline', event.target.value)}
                maxLength={120}
                placeholder="Coffee, museums, and sunset walks"
              />
            </label>
            <label>
              Bio
              <textarea
                value={form.bio}
                onChange={(event) => updateField('bio', event.target.value)}
                maxLength={500}
                rows={5}
                placeholder="Write a little about yourself"
              />
            </label>
            <label>
              Interests
              <input
                value={form.interests}
                onChange={(event) => updateField('interests', event.target.value)}
                placeholder="music, films, travel"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="photo-step">
            <div className="photo-target">
              {profileHasPhoto ? (
                <strong>Primary photo is ready</strong>
              ) : (
                <strong>Add your first profile photo</strong>
              )}
              <span>JPEG, PNG, or WebP up to 8 MB.</span>
            </div>
            <label className="file-picker">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span>{file ? file.name : 'Choose photo'}</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="finish-step">
            <h2>Almost there</h2>
            <p>The backend will check the required fields and unlock the main app when your profile is complete.</p>
            {missing.length > 0 && (
              <p className="missing-fields">Missing: {missing.join(', ')}</p>
            )}
          </div>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="step-actions">
          <button
            type="button"
            className="ghost-button"
            disabled={step === 0 || busy}
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
          >
            Back
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!canGoNext || busy}
            onClick={handleNext}
          >
            {busy ? 'Saving...' : step === 3 ? 'Enter app' : 'Continue'}
          </button>
        </div>
      </section>
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
