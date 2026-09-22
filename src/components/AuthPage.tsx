import React, { useState } from 'react';
import {
  User,
  Heart,
  Lock,
  Phone,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sun,
  Moon,
  Languages,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  Check,
} from 'lucide-react';
import { UserRole, PatientProfile, CaretakerProfile, LanguageCode } from '../types';
import { LANGUAGE_METADATA, getTranslation } from '../services/languages';

interface AuthPageProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  highContrast?: boolean;
  onToggleHighContrast?: () => void;
  initialRole?: UserRole;
  onLoginSuccess: (
    role: UserRole,
    patient: PatientProfile | null,
    caretaker: CaretakerProfile | null,
    token: string
  ) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  currentLanguage,
  onLanguageChange,
  darkMode,
  onToggleDarkMode,
  highContrast = false,
  onToggleHighContrast,
  initialRole = 'PATIENT',
  onLoginSuccess,
}) => {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register extra fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('72');
  const [region, setRegion] = useState('Guwahati, Assam');
  const [stateName, setStateName] = useState('Assam');
  const [relation, setRelation] = useState('Son / Daughter');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = (key: string) => getTranslation(key, currentLanguage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const cleanIdentifier = identifier.trim();
        if (!cleanIdentifier) {
          setError('Please enter your mobile number or username.');
          setLoading(false);
          return;
        }
        if (!password) {
          setError('Please enter your safe password or PIN.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password,
            role,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Login failed. Please verify your credentials or register.');
          setLoading(false);
          return;
        }

        onLoginSuccess(
          data.role,
          data.patient || null,
          data.caretaker || null,
          data.token || data.patient?.id || data.caretaker?.id || 'session-token'
        );
      } else {
        // Register Mode
        if (!fullName.trim()) {
          setError('Full Name is required.');
          setLoading(false);
          return;
        }
        if (!username.trim() || username.trim().length < 3) {
          setError('Username must be at least 3 characters.');
          setLoading(false);
          return;
        }
        const cleanPhone = phone.replace(/\D/g, '');
        const actualDigits = cleanPhone.startsWith('91') && cleanPhone.length === 12 ? cleanPhone.slice(2) : cleanPhone;
        if (actualDigits.length !== 10) {
          setError('Please enter a valid 10-digit mobile number.');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('Password must be at least 4 characters.');
          setLoading(false);
          return;
        }

        const profilePayload =
          role === 'PATIENT'
            ? {
                fullName: fullName.trim(),
                preferredName: fullName.trim().split(' ')[0],
                username: username.trim(),
                phone: actualDigits,
                age: Number(age) || 72,
                region,
                state: stateName,
                preferredLanguage: currentLanguage,
              }
            : {
                fullName: fullName.trim(),
                username: username.trim(),
                phone: actualDigits,
                relation,
              };

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            profile: profilePayload,
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error || 'Registration failed. Please check your inputs.');
          setLoading(false);
          return;
        }

        setSuccessMessage(data.message || 'Registration successful! Switching to log in...');
        setTimeout(() => {
          setMode('LOGIN');
          setIdentifier(actualDigits);
          setSuccessMessage(null);
          setLoading(false);
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Server connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-page-root"
      className="min-h-screen bg-[#FBF9F5] dark:bg-[#0D1117] text-[#292524] dark:text-[#E6EDF3] flex flex-col font-sans transition-colors duration-200"
    >
      {/* Top Header */}
      <header
        id="auth-page-header"
        className="sticky top-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#161B22]/95 backdrop-blur border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 py-3 transition-colors"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 dark:bg-teal-900 text-amber-200 flex items-center justify-center shadow-sm shrink-0 border border-teal-700 dark:border-teal-600">
              <span className="font-serif font-bold text-lg tracking-tight">সা</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight">
                  CognitiveSaathi
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700">
                  Care Companion
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 hidden xs:block">
                Assam & Northeast Senior Cognitive Support
              </p>
            </div>
          </div>

          {/* Controls: Theme & Language */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="relative flex items-center">
              <label htmlFor="auth-language-select" className="sr-only">
                Language
              </label>
              <Languages className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 absolute left-2 pointer-events-none" />
              <select
                id="auth-language-select"
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                className="pl-7 pr-2.5 py-1.5 text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer shadow-xs"
              >
                {(Object.keys(LANGUAGE_METADATA) as LanguageCode[]).map((code) => (
                  <option key={code} value={code} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                    {LANGUAGE_METADATA[code].nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* High Contrast Toggle (Optional) */}
            {onToggleHighContrast && (
              <button
                id="auth-toggle-contrast"
                onClick={onToggleHighContrast}
                title={highContrast ? 'Disable high contrast' : 'Enable high contrast mode'}
                className={`p-1.5 rounded-lg border transition-colors ${
                  highContrast
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100 ring-2 ring-amber-400'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="sr-only">Toggle high contrast</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              id="auth-toggle-dark-mode"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg border transition-colors bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-xs"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700 dark:text-stone-300" />}
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Hero Title & Subtitle */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-semibold mb-3 border border-amber-300 dark:border-amber-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Gentle Memory Support & Family Circle</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Welcome to CognitiveSaathi
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-lg mx-auto">
            A comforting digital space designed for seniors and their loving family caregivers in Northeast India.
          </p>
        </div>

        {/* SECTION: SELECT YOUR ROLE */}
        <div id="auth-role-selection-section" className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Select Your Role
            </h3>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {role === 'PATIENT' ? 'Currently viewing Patient Space' : 'Currently viewing Caregiver Space'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Patient Space */}
            <button
              type="button"
              id="auth-role-patient-card"
              onClick={() => {
                setRole('PATIENT');
                setError(null);
              }}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                role === 'PATIENT'
                  ? 'border-teal-700 dark:border-teal-400 bg-teal-50/70 dark:bg-teal-950/30 shadow-md ring-2 ring-teal-700/20 dark:ring-teal-400/20'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      role === 'PATIENT'
                        ? 'bg-teal-800 text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <User className="w-6 h-6" />
                  </div>
                  {role === 'PATIENT' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-700">
                      <Check className="w-3.5 h-3.5" />
                      Active Space
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Patient Space
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Calm daily routines, gentle memory quizzes, voice assistant, and cherished family moments.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800 text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span>Large Text Friendly</span>
                <span>•</span>
                <span>Voice Assisted</span>
                <span>•</span>
                <span>Simple Interface</span>
              </div>
            </button>

            {/* Card 2: Caregiver Space */}
            <button
              type="button"
              id="auth-role-caregiver-card"
              onClick={() => {
                setRole('CAREGIVER');
                setError(null);
              }}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                role === 'CAREGIVER'
                  ? 'border-teal-700 dark:border-teal-400 bg-teal-50/70 dark:bg-teal-950/30 shadow-md ring-2 ring-teal-700/20 dark:ring-teal-400/20'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      role === 'CAREGIVER'
                        ? 'bg-teal-800 text-amber-200'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    <Heart className="w-6 h-6 text-rose-400" />
                  </div>
                  {role === 'CAREGIVER' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-700">
                      <Check className="w-3.5 h-3.5" />
                      Active Space
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-1">
                  Caregiver Space
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  Care circle management, medicine schedules, cognitive recall telemetry, and clinical reports.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800 text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span>Care Analytics</span>
                <span>•</span>
                <span>Routine Editor</span>
                <span>•</span>
                <span>Family Circle</span>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION: LOGIN / REGISTRATION FORM */}
        <div
          id="auth-form-container"
          className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl p-6 sm:p-8 max-w-xl mx-auto w-full transition-all"
        >
          {/* Tab System: Switch between Log In and Register */}
          <div className="flex rounded-2xl bg-stone-100 dark:bg-stone-800 p-1 mb-6 border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setMode('LOGIN');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                mode === 'LOGIN'
                  ? 'bg-white dark:bg-stone-700 text-teal-900 dark:text-teal-200 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <UserCheck className="w-4 h-4 text-teal-700 dark:text-teal-300" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setMode('REGISTER');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                mode === 'REGISTER'
                  ? 'bg-white dark:bg-stone-700 text-teal-900 dark:text-teal-200 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Register New</span>
            </button>
          </div>

          {/* Form Header Info */}
          <div className="mb-5">
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              {mode === 'LOGIN'
                ? `Sign In to ${role === 'PATIENT' ? 'Patient Space' : 'Caregiver Space'}`
                : `Create New Account for ${role === 'PATIENT' ? 'Senior Patient' : 'Family Caregiver'}`}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
              {mode === 'LOGIN'
                ? 'Enter your mobile number or username and your safe password.'
                : 'Fill in your details below to set up your personal care profile.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div
              id="auth-error-alert"
              className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs sm:text-sm text-rose-800 dark:text-rose-300 flex items-start gap-2.5"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div
              id="auth-success-alert"
              className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="register-full-name-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'PATIENT' ? 'e.g. Bhaben Baruah' : 'e.g. Rahul Baruah'}
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="register-username-input"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. bhaben72"
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="register-phone-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                </div>

                {role === 'PATIENT' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        Age
                      </label>
                      <input
                        id="register-age-input"
                        type="number"
                        min="50"
                        max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        State (Northeast Region)
                      </label>
                      <select
                        id="register-state-select"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      >
                        <option value="Assam">Assam (অসম)</option>
                        <option value="Manipur">Manipur (মণিপুর)</option>
                        <option value="Meghalaya">Meghalaya</option>
                        <option value="Nagaland">Nagaland</option>
                        <option value="Tripura">Tripura</option>
                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                        <option value="Mizoram">Mizoram</option>
                        <option value="Sikkim">Sikkim</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Relationship to Loved One
                    </label>
                    <input
                      id="register-relation-input"
                      type="text"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      placeholder="e.g. Son, Daughter, Spouse, Grandchild"
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}

            {mode === 'LOGIN' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Mobile Number or Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    id="login-identifier-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter 10-digit mobile number or username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Password / Safe PIN <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your safe password or PIN"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="sr-only">Toggle password visibility</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Helper */}
            {mode === 'LOGIN' && (
              <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
                <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-1.5">
                  Quick Demo Access:
                </span>
                <div className="flex flex-wrap gap-2">
                  {role === 'PATIENT' ? (
                    <button
                      type="button"
                      id="demo-patient-quick-btn"
                      onClick={() => {
                        setIdentifier('1234567890');
                        setPassword('safe123');
                        setError(null);
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-medium"
                    >
                      Use Demo Patient (1234567890)
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="demo-caregiver-quick-btn"
                      onClick={() => {
                        setIdentifier('0987654321');
                        setPassword('safe123');
                        setError(null);
                      }}
                      className="px-2.5 py-1 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg text-teal-800 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-medium"
                    >
                      Use Demo Caregiver (0987654321)
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-850 hover:bg-teal-900 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Connecting Safely...'
                  : mode === 'LOGIN'
                  ? `Sign In to ${role === 'PATIENT' ? 'Patient Space' : 'Caregiver Space'}`
                  : `Complete Registration for ${role === 'PATIENT' ? 'Patient' : 'Caregiver'}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Tab Footer */}
          <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 text-center">
            {mode === 'LOGIN' ? (
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Don’t have an account yet?{' '}
                <button
                  type="button"
                  id="switch-to-register-link-btn"
                  onClick={() => {
                    setMode('REGISTER');
                    setError(null);
                  }}
                  className="font-bold text-teal-800 dark:text-teal-400 hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Already registered?{' '}
                <button
                  type="button"
                  id="switch-to-login-link-btn"
                  onClick={() => {
                    setMode('LOGIN');
                    setError(null);
                  }}
                  className="font-bold text-teal-800 dark:text-teal-400 hover:underline"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security & Privacy Badge */}
        <div className="mt-8 text-center text-xs text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Local offline-first privacy • Zero invasive trackers • Built for Northeast Indian Families</span>
        </div>
      </main>
    </div>
  );
};
