import React, { useState } from 'react';
import { X, User, Heart, Lock, Phone, ArrowRight, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { UserRole, PatientProfile, CaretakerProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  canClose?: boolean;
  onLoginSuccess: (
    role: UserRole,
    patient: PatientProfile | null,
    caretaker: CaretakerProfile | null,
    token: string
  ) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, canClose = true, onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

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

  if (!isOpen) return null;

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
          setError('Please enter your password.');
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
          setError(data.error || 'Login failed. Please verify credentials.');
          setLoading(false);
          return;
        }

        onLoginSuccess(
          data.role,
          data.patient || null,
          data.caretaker || null,
          data.token || data.patient?.id || data.caretaker?.id || 'session-token'
        );
        onClose();
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
                preferredLanguage: 'en',
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
          setError(data.error || 'Registration failed. Please check inputs.');
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
      setError(err?.message || 'Server connection error.');
      setLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
    >
      <div
        id="auth-modal-container"
        className="bg-white dark:bg-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-teal-850 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-teal-950 flex items-center justify-center font-bold font-serif text-sm">
              সা
            </div>
            <div>
              <h2 className="font-serif font-bold text-base">
                {mode === 'LOGIN' ? 'Sign In to CognitiveSaathi' : 'Create an Account'}
              </h2>
              <p className="text-xs text-teal-200">
                {role === 'PATIENT' ? 'Senior Companion Care' : 'Caregiver & Family Circle'}
              </p>
            </div>
          </div>
          {canClose && (
            <button
              id="close-auth-modal-btn"
              onClick={onClose}
              className="p-1 rounded-full text-teal-200 hover:text-white hover:bg-teal-700/50"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Role selector */}
          <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 mb-4 border border-stone-200 dark:border-stone-700">
            <button
              type="button"
              id="auth-role-patient-tab"
              onClick={() => {
                setRole('PATIENT');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                role === 'PATIENT'
                  ? 'bg-white dark:bg-stone-700 text-teal-900 dark:text-teal-200 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <User className="w-3.5 h-3.5 text-teal-700 dark:text-teal-300" />
              <span>Senior / Patient</span>
            </button>
            <button
              type="button"
              id="auth-role-caregiver-tab"
              onClick={() => {
                setRole('CAREGIVER');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                role === 'CAREGIVER'
                  ? 'bg-white dark:bg-stone-700 text-teal-900 dark:text-teal-200 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Family Caregiver</span>
            </button>
          </div>

          {/* Feedback alerts */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="register-full-name-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'PATIENT' ? 'e.g. Aruna Baruah' : 'e.g. Rahul Baruah'}
                    className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Username
                    </label>
                    <input
                      id="register-username-input"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. aruna72"
                      className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Mobile Number
                    </label>
                    <input
                      id="register-phone-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                </div>

                {role === 'PATIENT' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Age</label>
                      <input
                        id="register-age-input"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                        State (NER)
                      </label>
                      <select
                        id="register-state-select"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      >
                        <option value="Assam">Assam</option>
                        <option value="Manipur">Manipur</option>
                        <option value="Meghalaya">Meghalaya</option>
                        <option value="Nagaland">Nagaland</option>
                        <option value="Tripura">Tripura</option>
                        <option value="Arunachal Pradesh">Arunachal</option>
                        <option value="Mizoram">Mizoram</option>
                        <option value="Sikkim">Sikkim</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Relation to Loved One
                    </label>
                    <input
                      id="register-relation-input"
                      type="text"
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      placeholder="e.g. Son, Daughter, Spouse"
                      className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}

            {mode === 'LOGIN' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Mobile Number or Username
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="login-identifier-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter 10-digit number or username"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Password / Safe PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your safe password"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-50"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'LOGIN'
                  ? 'Sign In Safely'
                  : 'Complete Registration'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-800 text-center">
            {mode === 'LOGIN' ? (
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Don’t have an account yet?{' '}
                <button
                  type="button"
                  id="switch-to-register-btn"
                  onClick={() => {
                    setMode('REGISTER');
                    setError(null);
                  }}
                  className="font-semibold text-teal-800 dark:text-teal-400 hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Already have an account?{' '}
                <button
                  type="button"
                  id="switch-to-login-btn"
                  onClick={() => {
                    setMode('LOGIN');
                    setError(null);
                  }}
                  className="font-semibold text-teal-800 dark:text-teal-400 hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
