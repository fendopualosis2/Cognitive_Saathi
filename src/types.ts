/**
 * CognitiveSaathi Types & Domain Models
 * Problem Statement ID: 26003 (MDoNER)
 */

export type UserRole = 'PATIENT' | 'CAREGIVER' | 'HEALTHCARE_WORKER';

export type LanguageCode = 'en' | 'as' | 'hi' | 'mni';

export type ConnectivityStatus = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'SYNC_PENDING' | 'SYNCED';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';

export type TextScale = 'normal' | 'large' | 'extralarge';

export type GameCategory = 
  | 'MEMORY' 
  | 'ATTENTION' 
  | 'PATTERN' 
  | 'RECOGNITION' 
  | 'ROUTINE';

export type GameId = 
  | 'memory-tiles'
  | 'find-matching'
  | 'memory-recall' 
  | 'pattern-sequence' 
  | 'attention-focus' 
  | 'daily-routine' 
  | 'object-familiarity'
  | 'recognize-by-description'
  | 'personal-memory-quiz';

export interface PersonalQuizQuestion {
  id: string;
  type: 'person' | 'memory';
  sourceTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  imageUrl?: string;
  category?: string;
}

export interface GameDefinition {
  id: GameId | string;
  title: string;
  category: GameCategory;
  shortDescription: string;
  estimatedMinutes: number;
  iconName: string;
  culturalTag: string;
  difficultyLevels: number;
}

export interface GameSessionResult {
  id: string;
  gameId: GameId | string;
  patientId: string;
  difficulty: number;
  accuracy: number; // 0.0 to 1.0
  reactionTimeMs: number;
  completionTimeMs: number;
  attempts: number;
  mistakes: number;
  hintsUsed: number;
  completedAt: string;
  syncStatus: 'synced' | 'pending';
}

export type ReminderType = 'MEDICINE' | 'HYDRATION' | 'ACTIVITY' | 'APPOINTMENT' | 'ROUTINE';

export interface ReminderItem {
  id: string;
  patientId: string;
  type: ReminderType;
  title: string;
  description: string;
  time: string; // e.g. "08:00 AM"
  period: 'Morning' | 'Afternoon' | 'Evening';
  completedToday: boolean;
  enabled: boolean;
  categoryLabel?: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  timeSlot: 'Morning' | 'Afternoon' | 'Evening';
  time: string;
  icon: string;
  completed: boolean;
  notes?: string;
}

export interface MemoryMoment {
  id: string;
  patientId?: string;
  title: string;
  category: 'Family' | 'Festival' | 'Place' | 'Tradition' | string;
  region: string;
  imageUrl: string;
  images?: string[];
  imageAlt: string;
  dateLabel: string;
  memoryDate?: string; // YYYY-MM-DD format: the date when the memory occurred
  story: string;
  audioPrompt: string;
  interactiveQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
  };
  hasVoiceNote?: boolean;
  voiceNoteAudioUrl?: string;
  originalVoiceTranscript?: string;
  summarizedByAi?: boolean;
}

export type CalendarEventType =
  | 'DOCTOR'
  | 'MEDICINE'
  | 'FAMILY'
  | 'FESTIVAL'
  | 'BIRTHDAY'
  | 'MILESTONE'
  | 'GENERAL';

export interface CalendarEvent {
  id: string;
  patientId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "10:30 AM"
  type: CalendarEventType;
  notes?: string;
  createdBy: 'CAREGIVER' | 'PATIENT';
  createdByName?: string;
  isImportant?: boolean;
  createdAt: string;
}

export interface PersonImportantDate {
  id: string;
  label: string; // e.g., "Birthday", "Wedding Anniversary", "Graduation", "Retirement"
  date: string;
  notes?: string;
}

export interface PersonInLife {
  id: string;
  patientId?: string;
  name: string;
  relationship: string; // e.g. "Spouse", "Daughter", "Son", "Grandson", "Sister", "Friend", "Primary Caregiver", "Doctor"
  imageUrl?: string;
  description: string;
  birthday?: string;
  marriageDate?: string;
  importantDates?: PersonImportantDate[];
  likes?: string;
  dislikes?: string;
  personality?: string;
  phone?: string;
  location?: string;
  notes?: string;
  createdAt?: string;
}

export interface CaregiverRemovalNotice {
  caregiverName: string;
  caregiverPhone?: string;
  caregiverKey?: string;
  removedAt: string;
  message: string;
}

export interface PatientRemovalNotice {
  id: string;
  patientId: string;
  patientName: string;
  patientKey?: string;
  removedAt: string;
  message: string;
}

export interface CaregiverConnectionRequest {
  id: string;
  caretakerId: string;
  caretakerName: string;
  caretakerPhone: string;
  caretakerRelation: string;
  patientId: string;
  patientName: string;
  patientKey?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  updatedAt?: string;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  preferredName: string;
  username?: string;
  password?: string;
  pin?: string;
  patientKey?: string;
  linkedCaregiverKey?: string;
  age: number;
  region: string;
  state: 'Assam' | 'Manipur' | 'Meghalaya' | 'Nagaland' | 'Tripura' | 'Arunachal Pradesh' | 'Mizoram' | 'Sikkim' | string;
  preferredLanguage: LanguageCode;
  fallbackLanguage?: LanguageCode;
  caregiverName: string;
  caregiverPhone: string;
  hasCaregiver?: boolean;
  emergencyContact?: string;
  notes?: string;
  avatarUrl?: string;
  dailyStreak: number;
  todayCompletedCount: number;
  lastLoginTimestamp?: number;
  lastLoginDate?: string;
  phone?: string;
  caregiverRemovalNotice?: CaregiverRemovalNotice;
}

export interface CaretakerProfile {
  id: string;
  fullName: string;
  username?: string;
  password?: string;
  phone: string;
  email?: string;
  pin: string;
  caregiverKey: string;
  relation: string;
  avatarUrl?: string;
  assignedPatientIds: string[];
  patientRemovalNotices?: PatientRemovalNotice[];
}

export type LanguagePackValidationStatus = 'draft' | 'reviewed' | 'approved';
export type LanguagePackDownloadStatus = 'downloaded' | 'not_downloaded' | 'downloading';

export interface LanguagePack {
  language_code: LanguageCode;
  language_name: string;
  translations: Record<string, string>;
  audio_assets: Record<string, string>; // e.g. key: instruction_key, value: audio data or synthesizer key
  version: string;
  validation_status: LanguagePackValidationStatus;
  download_status: LanguagePackDownloadStatus;
  isPilot?: boolean;
}

export interface AuthSession {
  role: UserRole;
  patientId?: string;
  caretakerId?: string;
  expiresAt: number;
  userName?: string;
  token?: string;
}

export interface TabNavigationState {
  role?: UserRole;
  patientTab?: 'home' | 'activities' | 'my_day' | 'memories' | 'me' | 'settings';
  caregiverTab?: 'dashboard' | 'games' | 'activities' | 'memories' | 'routine' | 'reminders' | 'patient_detail' | 'reports' | 'me';
  activeGameId?: string | null;
}

export interface SyncEvent {
  clientEventId: string;
  eventType: 'GAME_COMPLETED' | 'ROUTINE_UPDATED' | 'REMINDER_TOGGLED';
  patientId: string;
  timestamp: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'synced';
}

export interface CaregiverAlert {
  id: string;
  type: 'INFO' | 'ATTENTION' | 'ROUTINE_MISSED' | 'OBSERVATION';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionRequired?: boolean;
}
