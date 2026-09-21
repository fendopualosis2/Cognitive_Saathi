import React from 'react';
import {
  Heart,
  Volume2,
  PhoneCall,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Languages,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';
import { UserRole, ConnectivityStatus, LanguageCode, PatientProfile, CaretakerProfile } from '../types';
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
  onOpenVoiceCompanion,
  onEmergencyCall,
  onTriggerSync,
  onSwitchRole,
  onLogout,
}) => {
  return (
    <header
      id="main-app-header"
      className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur border-b border-stone-200 px-4 py-2.5 transition-colors"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-800 text-amber-200 flex items-center justify-center shadow-sm shrink-0 border border-teal-700">
            <span className="font-serif font-bold text-lg tracking-tight">সা</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-serif font-bold text-stone-900 truncate leading-tight">
                CognitiveSaathi
              </h1>
              <span
                className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                  role === 'PATIENT'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-teal-100 text-teal-900 border border-teal-300'
                }`}
              >
                {role === 'PATIENT' ? 'Companion' : 'Care Circle'}
              </span>
            </div>
            <p className="text-xs text-stone-600 truncate hidden sm:block">
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
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : connectivity === 'SYNCING'
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
          >
            {connectivity === 'CONNECTED' || connectivity === 'SYNCED' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : connectivity === 'SYNCING' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-stone-500" />
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
            <Languages className="w-3.5 h-3.5 text-stone-500 absolute left-2 pointer-events-none" />
            <select
              id="language-select"
              value={currentLanguage}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="pl-7 pr-2 py-1 text-xs font-medium bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-700 cursor-pointer"
            >
              {(Object.keys(LANGUAGE_METADATA) as LanguageCode[]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_METADATA[code].nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* High Contrast Toggle */}
          <button
            id="toggle-high-contrast"
            onClick={onToggleHighContrast}
            title={highContrast ? 'Disable high contrast' : 'Enable high contrast mode'}
            className={`p-1.5 rounded-lg border transition-colors ${
              highContrast
                ? 'bg-stone-900 text-white border-stone-900 ring-2 ring-amber-400'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="sr-only">Toggle high contrast</span>
          </button>

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
            className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-medium"
          >
            <User className="w-3.5 h-3.5 text-stone-500" />
            <span>{role === 'PATIENT' ? 'Caregiver' : 'Patient'}</span>
          </button>

          <button
            id="header-logout-btn"
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-rose-50 hover:text-rose-700 text-stone-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
