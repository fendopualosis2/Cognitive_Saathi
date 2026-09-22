import React, { useState } from 'react';
import {
  Heart,
  Volume2,
  PhoneCall,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  Languages,
  LogOut,
  User,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { UserRole, ConnectivityStatus, LanguageCode, PatientProfile, CaretakerProfile, TextScale } from '../types';
import { LANGUAGE_METADATA } from '../services/languages';

interface HeaderProps {
  role: UserRole;
  currentPatient: PatientProfile | null;
  currentCaretaker: CaretakerProfile | null;
  connectivity: ConnectivityStatus;
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  textScale?: TextScale;
  onToggleTextScale?: () => void;
  onOpenVoiceCompanion: () => void;
  onEmergencyCall: () => void;
  onTriggerSync: () => void;
  onSwitchRole: (targetRole: UserRole) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  currentPatient,
  currentCaretaker,
  connectivity,
  currentLanguage,
  onLanguageChange,
  highContrast,
  onToggleHighContrast,
  darkMode,
  onToggleDarkMode,
  textScale = 'normal',
  onToggleTextScale,
  onOpenVoiceCompanion,
  onEmergencyCall,
  onTriggerSync,
  onSwitchRole,
  onLogout,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#161B22]/95 backdrop-blur border-b border-stone-200 dark:border-stone-800 px-4 py-2.5 transition-colors"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-800 dark:bg-teal-900 text-amber-200 flex items-center justify-center shadow-sm shrink-0 border border-teal-700 dark:border-teal-600">
            <span className="font-serif font-bold text-lg tracking-tight">সা</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 truncate leading-tight">
                CognitiveSaathi
              </h1>
              <span
                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                  role === 'PATIENT'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'bg-teal-100 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700'
                }`}
              >
                {role === 'PATIENT' ? 'Companion' : 'Care Circle'}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 truncate hidden sm:block">
              {role === 'PATIENT'
                ? currentPatient?.preferredName
                  ? `For ${currentPatient.preferredName}`
                  : 'Gentle Memory & Daily Care'
                : `Caregiver: ${currentCaretaker?.fullName || 'Family Circle'}`}
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connectivity status pill & Test Reconnect */}
          <button
            id="sync-status-indicator"
            onClick={onTriggerSync}
            title={connectivity === 'CONNECTED' ? 'Connected (Tap to refresh)' : 'Offline mode (Tap to reconnect)'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              connectivity === 'CONNECTED' || connectivity === 'SYNCED'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                : connectivity === 'SYNCING'
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 animate-pulse'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            {connectivity === 'CONNECTED' || connectivity === 'SYNCED' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : connectivity === 'SYNCING' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span className="hidden md:inline">
              {connectivity === 'CONNECTED' || connectivity === 'SYNCED'
                ? 'Live'
                : connectivity === 'SYNCING'
                ? 'Syncing'
                : 'Offline'}
            </span>
          </button>

          {/* Language Selector */}
          <div className="relative flex items-center">
            <label htmlFor="language-select" className="sr-only">
              Select Language
            </label>
            <Languages className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 absolute left-2 pointer-events-none" />
            <select
              id="language-select"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="pl-7 pr-2 py-1 text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
            >
              {(Object.keys(LANGUAGE_METADATA) as LanguageCode[]).map((code) => (
                <option key={code} value={code} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                  {LANGUAGE_METADATA[code].nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Dark Mode Toggle */}
          {onToggleDarkMode && (
            <button
              id="toggle-dark-mode"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-lg border transition-colors bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-xs"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700 dark:text-stone-300" />}
              <span className="sr-only">Toggle theme</span>
            </button>
          )}

          {/* High Contrast Toggle */}
          <button
            id="toggle-high-contrast"
            onClick={onToggleHighContrast}
            title={highContrast ? 'Disable high contrast' : 'Enable high contrast mode'}
            className={`p-1.5 rounded-lg border transition-colors shadow-xs ${
              highContrast
                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100 ring-2 ring-amber-400'
                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="sr-only">Toggle high contrast</span>
          </button>

          {/* Text Size Scale Toggle */}
          {onToggleTextScale && (
            <button
              id="header-toggle-text-scale"
              onClick={onToggleTextScale}
              title={`Text size: ${textScale}. Click to enlarge text.`}
              className={`p-1.5 rounded-lg border transition-colors font-bold text-xs shadow-xs ${
                textScale !== 'normal'
                  ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border-teal-400 dark:border-teal-700'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
            >
              <span className="font-serif">A+</span>
              <span className="sr-only">Enlarge text size</span>
            </button>
          )}

          {/* Voice Assistant Button (for Patient) */}
          {role === 'PATIENT' && (
            <button
              id="header-voice-companion-btn"
              onClick={onOpenVoiceCompanion}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-stone-900 font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-sm border border-amber-600 transition-transform active:scale-95"
            >
              <Volume2 className="w-3.5 h-3.5 text-stone-900" />
              <span className="hidden sm:inline">Companion</span>
            </button>
          )}

          {/* Emergency Call Button (for Patient) */}
          {role === 'PATIENT' && (
            <button
              id="header-emergency-call-btn"
              onClick={onEmergencyCall}
              title="Call Caregiver"
              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm border border-rose-700 transition-transform active:scale-95 flex items-center justify-center"
            >
              <PhoneCall className="w-4 h-4" />
              <span className="sr-only">Call caregiver</span>
            </button>
          )}

          {/* Role Switch & Logout */}
          <button
            id="header-switch-role-btn"
            onClick={() => onSwitchRole(role === 'PATIENT' ? 'CAREGIVER' : 'PATIENT')}
            title={`Switch to ${role === 'PATIENT' ? 'Caregiver View' : 'Patient View'}`}
            className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-medium"
          >
            <User className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>{role === 'PATIENT' ? 'Caregiver' : 'Patient'}</span>
          </button>

          <button
            id="header-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            title="Log out"
            className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 text-stone-600 dark:text-stone-300 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Log out</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          id="logout-confirmation-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-900">
              <LogOut className="w-7 h-7" />
            </div>
            <h3
              id="logout-confirm-title"
              className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-2"
            >
              Are you sure you want to log out?
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
              Your daily routines, memories, and progress are securely saved. You can sign back in anytime.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                id="cancel-logout-btn"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-logout-btn"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
