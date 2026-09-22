import {
  PatientProfile,
  CaretakerProfile,
  RoutineTask,
  ReminderItem,
  MemoryMoment,
  PersonInLife,
  GameSessionResult,
  AuthSession,
  SyncEvent,
  TextScale,
  LanguageCode,
} from '../types';

const STORAGE_KEYS = {
  PATIENT: 'saathi_patient_profile',
  CARETAKER: 'saathi_caretaker_profile',
  ALL_CARETAKERS: 'saathi_all_caretakers',
  AUTH: 'saathi_auth_session',
  ROUTINES: 'saathi_routines_',
  REMINDERS: 'saathi_reminders_',
  MEMORIES: 'saathi_memories_',
  PEOPLE: 'saathi_people_',
  SESSIONS: 'saathi_game_sessions_',
  SYNC_QUEUE: 'saathi_sync_queue',
  HIGH_CONTRAST: 'saathi_pref_high_contrast',
  DARK_MODE: 'saathi_pref_dark_mode',
  TEXT_SCALE: 'saathi_pref_text_scale',
  LANGUAGE: 'saathi_pref_language',
};

export const INITIAL_ROUTINES: RoutineTask[] = [];

export const INITIAL_REMINDERS: ReminderItem[] = [];

export const INITIAL_PEOPLE: PersonInLife[] = [];

export const INITIAL_MEMORIES: MemoryMoment[] = [
  {
    id: 'mem-bihu-celebration',
    title: 'Rongali Bihu Spring Gathering',
    category: 'Festival',
    region: 'Assam',
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80',
    ],
    imageAlt: 'Rongali Bihu celebration with family',
    dateLabel: 'Bohag Spring',
    story: 'The family gathered together on the verandah under the warm April sun. Fragrant coconut laddu and pitha were shared, and elder relatives presented handwoven red-bordered gamosas with blessings.',
    audioPrompt: 'Do you remember the dhol and pepa melodies playing during Bihu?',
    interactiveQuestion: {
      question: 'Which traditional sweet do we enjoy during Rongali Bihu?',
      options: ['Pitha and Laru', 'Sandesh', 'Jalebi'],
      correctIndex: 0,
    },
    hasVoiceNote: true,
    originalVoiceTranscript: 'Every Bihu morning we would wear fresh muga silk and greet all the neighborhood elders.',
    summarizedByAi: true,
  },
  {
    id: 'mem-tea-garden-walk',
    title: 'Morning Walk in Jorhat Tea Gardens',
    category: 'Place',
    region: 'Assam',
    imageUrl: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    ],
    imageAlt: 'Emerald green tea estate in Assam',
    dateLabel: 'Winter Morning',
    story: 'A peaceful stroll through the mist-covered green tea rows. The cool crisp morning breeze and the earthy fragrance of fresh tea leaves followed by a hot brass cup of spiced milk tea.',
    audioPrompt: 'Remember the fresh aroma of tea leaves on crisp winter mornings?',
    interactiveQuestion: {
      question: 'What time of day was most peaceful in the tea gardens?',
      options: ['Early morning mist', 'Late afternoon heat', 'Midnight'],
      correctIndex: 0,
    },
  },
];

export class OfflineStore {
  // Patient Profile
  static getPatient(): PatientProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static savePatient(patient: PatientProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PATIENT, JSON.stringify(patient));
    } catch (e) {
      console.warn('LocalStorage savePatient notice:', e);
    }
  }

  // Caretaker Profile
  static getCaretaker(): CaretakerProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CARETAKER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveCaretaker(caretaker: CaretakerProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CARETAKER, JSON.stringify(caretaker));
    } catch (e) {
      console.warn('LocalStorage saveCaretaker notice:', e);
    }
  }

  static getAllCaretakers(): CaretakerProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALL_CARETAKERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveAllCaretakers(caretakers: CaretakerProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ALL_CARETAKERS, JSON.stringify(caretakers));
    } catch (e) {
      console.warn('LocalStorage saveAllCaretakers notice:', e);
    }
  }

  // Auth Session
  static getAuthSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!data) return null;
      const session: AuthSession = JSON.parse(data);
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.clearAuthSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  static saveAuthSession(session: AuthSession): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
    } catch (e) {
      console.warn('LocalStorage saveAuthSession notice:', e);
    }
  }

  static clearAuthSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
      localStorage.removeItem(STORAGE_KEYS.PATIENT);
      localStorage.removeItem(STORAGE_KEYS.CARETAKER);
    } catch (e) {
      console.warn('LocalStorage clearAuthSession notice:', e);
    }
  }

  // Routines
  static getRoutines(patientId: string): RoutineTask[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.ROUTINES}${patientId}`);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static saveRoutines(patientId: string, routines: RoutineTask[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.ROUTINES}${patientId}`, JSON.stringify(routines));
    } catch (e) {
      console.warn('LocalStorage saveRoutines notice:', e);
    }
  }

  // Reminders
  static getReminders(patientId: string): ReminderItem[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.REMINDERS}${patientId}`);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static saveReminders(patientId: string, reminders: ReminderItem[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.REMINDERS}${patientId}`, JSON.stringify(reminders));
    } catch (e) {
      console.warn('LocalStorage saveReminders notice:', e);
    }
  }

  // Memories
  static getMemories(patientId: string): MemoryMoment[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.MEMORIES}${patientId}`);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch {}
    // Seed initial memories if brand new
    if (INITIAL_MEMORIES.length > 0) {
      this.saveMemories(patientId, INITIAL_MEMORIES);
      return INITIAL_MEMORIES;
    }
    return [];
  }

  static saveMemories(patientId: string, memories: MemoryMoment[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.MEMORIES}${patientId}`, JSON.stringify(memories));
    } catch (e) {
      console.warn('LocalStorage saveMemories notice:', e);
    }
  }

  static addMemory(patientId: string, memory: MemoryMoment): MemoryMoment[] {
    const list = this.getMemories(patientId);
    const updated = [memory, ...list.filter(m => m.id !== memory.id)];
    this.saveMemories(patientId, updated);
    return updated;
  }

  static deleteMemory(patientId: string, memoryId: string): MemoryMoment[] {
    const list = this.getMemories(patientId);
    const updated = list.filter(m => m.id !== memoryId);
    this.saveMemories(patientId, updated);
    return updated;
  }

  // People in Patient's Life (Blank at first, only fills when added)
  static getPeople(patientId: string): PersonInLife[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.PEOPLE}${patientId}`);
      if (data !== null) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  }

  static savePeople(patientId: string, people: PersonInLife[]): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.PEOPLE}${patientId}`, JSON.stringify(people));
    } catch (e) {
      console.warn('LocalStorage savePeople notice:', e);
    }
  }

  static addPerson(patientId: string, person: PersonInLife): PersonInLife[] {
    const list = this.getPeople(patientId);
    const updated = [person, ...list.filter(p => p.id !== person.id)];
    this.savePeople(patientId, updated);
    return updated;
  }

  static updatePerson(patientId: string, person: PersonInLife): PersonInLife[] {
    const list = this.getPeople(patientId);
    const idx = list.findIndex(p => p.id === person.id);
    let updated: PersonInLife[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...updated[idx], ...person };
    } else {
      updated = [person, ...list];
    }
    this.savePeople(patientId, updated);
    return updated;
  }

  static deletePerson(patientId: string, personId: string): PersonInLife[] {
    const list = this.getPeople(patientId);
    const updated = list.filter(p => p.id !== personId);
    this.savePeople(patientId, updated);
    return updated;
  }

  // Sessions
  static getSessions(patientId: string): GameSessionResult[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.SESSIONS}${patientId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveSession(session: GameSessionResult): void {
    try {
      const list = this.getSessions(session.patientId);
      const updated = [session, ...list.filter(s => s.id !== session.id)];
      localStorage.setItem(`${STORAGE_KEYS.SESSIONS}${session.patientId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage saveSession notice:', e);
    }
  }

  // Sync Queue
  static getSyncQueue(): SyncEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static queueSync(event: SyncEvent): void {
    try {
      const queue = this.getSyncQueue();
      queue.push(event);
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.warn('LocalStorage queueSync notice:', e);
    }
  }

  static clearSyncQueue(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    } catch (e) {
      console.warn('LocalStorage clearSyncQueue notice:', e);
    }
  }

  // Preferences
  static getHighContrast(): boolean {
    return localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true';
  }

  static setHighContrast(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(val));
  }

  static getDarkMode(): boolean {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    if (saved !== null) {
      return saved === 'true';
    }
    // Also detect system preference or existing document class
    return (
      document.documentElement.classList.contains('dark') ||
      (typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  }

  static setDarkMode(val: boolean): void {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(val));
  }

  static getTextScale(): TextScale {
    const val = localStorage.getItem(STORAGE_KEYS.TEXT_SCALE);
    if (val === 'large' || val === 'extralarge') return val;
    return 'normal';
  }

  static setTextScale(val: TextScale): void {
    localStorage.setItem(STORAGE_KEYS.TEXT_SCALE, val);
  }

  static getLanguage(): LanguageCode {
    const val = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as LanguageCode;
    if (val === 'as' || val === 'hi' || val === 'mni') return val;
    return 'en';
  }

  static setLanguage(val: LanguageCode): void {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, val);
  }

  static dismissCaregiverRemovalNotice(patientId: string): void {
    const p = this.getPatient();
    if (p && p.id === patientId) {
      delete p.caregiverRemovalNotice;
      this.savePatient(p);
    }
  }

  static dismissPatientRemovalNotice(caretakerId: string, noticeId?: string): void {
    const c = this.getCaretaker();
    if (c && c.id === caretakerId) {
      if (noticeId) {
        c.patientRemovalNotices = (c.patientRemovalNotices || []).filter(n => n.id !== noticeId);
      } else {
        c.patientRemovalNotices = [];
      }
      this.saveCaretaker(c);
    }
  }
}
