import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PatientProfile, CaretakerProfile, RoutineTask, ReminderItem, MemoryMoment, PersonInLife, GameSessionResult, CaregiverConnectionRequest } from '../src/types';

export interface DatabaseSchema {
  patients: PatientProfile[];
  caretakers: CaretakerProfile[];
  routines: Record<string, RoutineTask[]>;
  reminders: Record<string, ReminderItem[]>;
  memories: Record<string, MemoryMoment[]>;
  people: Record<string, PersonInLife[]>;
  sessions: Record<string, GameSessionResult[]>;
  connectionRequests?: CaregiverConnectionRequest[];
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'database.json');
const DB_TEMP_PATH = path.join(DB_DIR, 'database.json.tmp');

// Normalize phone numbers consistently across formats (+91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX)
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

// Password hashing & verification with backwards-compatible plaintext migration
export function hashPassword(plainText: string): string {
  if (!plainText) return '';
  if (plainText.startsWith('$scrypt$')) return plainText;
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `$scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export function verifyPassword(inputPassword: string, storedHashOrPlain: string | undefined): boolean {
  if (!storedHashOrPlain || !inputPassword) return false;
  if (!storedHashOrPlain.startsWith('$scrypt$')) {
    // Backwards compatibility for existing plaintext passwords
    return storedHashOrPlain === inputPassword;
  }
  const parts = storedHashOrPlain.split('$');
  if (parts.length !== 4) return false;
  const salt = parts[2];
  const originalKeyHex = parts[3];
  const derivedKey = crypto.scryptSync(inputPassword, salt, 64);
  const derivedHex = derivedKey.toString('hex');
  if (derivedHex.length !== originalKeyHex.length) return false;
  return crypto.timingSafeEqual(Buffer.from(derivedHex, 'hex'), Buffer.from(originalKeyHex, 'hex'));
}

export function sanitizeProfile<T extends Record<string, any>>(profile: T | undefined | null): T | undefined {
  if (!profile) return undefined;
  const clone = { ...profile };
  delete clone.password;
  delete clone.pin;
  return clone;
}

// Default initial data: brand new empty database
const INITIAL_PATIENTS: PatientProfile[] = [];
const INITIAL_CARETAKERS: CaretakerProfile[] = [];

export class ServerDB {
  private static cache: DatabaseSchema | null = null;

  public static ensureDbExists(): DatabaseSchema {
    if (this.cache) return this.cache;

    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.cache = {
          patients: parsed.patients || INITIAL_PATIENTS,
          caretakers: parsed.caretakers || INITIAL_CARETAKERS,
          routines: parsed.routines || {},
          reminders: parsed.reminders || {},
          memories: parsed.memories || {},
          people: parsed.people || {},
          sessions: parsed.sessions || {},
          connectionRequests: parsed.connectionRequests || [],
        };
        return this.cache;
      }
    } catch (e) {
      console.warn('Error reading server database, initializing fresh state:', e);
    }

    const defaultDb: DatabaseSchema = {
      patients: INITIAL_PATIENTS,
      caretakers: INITIAL_CARETAKERS,
      routines: {},
      reminders: {},
      memories: {},
      people: {},
      sessions: {},
      connectionRequests: [],
    };
    this.save(defaultDb);
    this.cache = defaultDb;
    return defaultDb;
  }

  static ensureMutualConsistency(db: DatabaseSchema): boolean {
    let changed = false;
    for (const patient of db.patients) {
      if (!patient.patientKey) {
        const cleanId = (patient.id || '').replace(/^patient-/, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
        const namePart = (patient.username || patient.preferredName || patient.fullName || 'PT')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 4);
        patient.patientKey = `PT-${namePart || 'USER'}${cleanId || '01'}`;
        changed = true;
      }
      if (patient.linkedCaregiverKey) {
        const keyClean = patient.linkedCaregiverKey.trim().toUpperCase();
        const ct = db.caretakers.find((c) => (c.caregiverKey || '').trim().toUpperCase() === keyClean);
        if (ct) {
          if (!ct.assignedPatientIds) ct.assignedPatientIds = [];
          if (!ct.assignedPatientIds.includes(patient.id)) {
            ct.assignedPatientIds.push(patient.id);
            changed = true;
          }
          if (!patient.hasCaregiver) {
            patient.hasCaregiver = true;
            patient.caregiverName = `${ct.fullName} (${ct.relation || 'Caregiver'})`;
            patient.caregiverPhone = ct.phone;
            changed = true;
          }
        }
      }
    }
    for (const ct of db.caretakers) {
      if (ct.assignedPatientIds && ct.assignedPatientIds.length > 0) {
        for (const pId of ct.assignedPatientIds) {
          const p = db.patients.find((pat) => pat.id === pId);
          if (p) {
            if ((p.linkedCaregiverKey || '').trim().toUpperCase() !== (ct.caregiverKey || '').trim().toUpperCase()) {
              p.linkedCaregiverKey = ct.caregiverKey;
              p.hasCaregiver = true;
              p.caregiverName = `${ct.fullName} (${ct.relation || 'Caregiver'})`;
              p.caregiverPhone = ct.phone;
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  }

  public static save(db: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const dataStr = JSON.stringify(db, null, 2);
      try {
        fs.writeFileSync(DB_TEMP_PATH, dataStr, 'utf-8');
        fs.renameSync(DB_TEMP_PATH, DB_PATH);
      } catch {
        fs.writeFileSync(DB_PATH, dataStr, 'utf-8');
      }
      this.cache = db;
    } catch (e) {
      console.error('Failed to write to database.json:', e);
      // Keep in-memory cache updated even if ephemeral disk errors
      this.cache = db;
    }
  }

  static getPatients(): PatientProfile[] {
    const db = this.ensureDbExists();
    if (this.ensureMutualConsistency(db)) {
      this.save(db);
    }
    return db.patients;
  }

  static getCaretakers(): CaretakerProfile[] {
    const db = this.ensureDbExists();
    if (this.ensureMutualConsistency(db)) {
      this.save(db);
    }
    return db.caretakers;
  }

  // BUG #2 FIX: Strict normalized equality matching for phone lookups; NO endsWith / startsWith / suffix IDOR
  static findPatient(identifier: string): PatientProfile | undefined {
    const db = this.ensureDbExists();
    const raw = identifier.trim();
    const cleanLower = raw.toLowerCase();
    const cleanUpper = raw.toUpperCase();
    const normalizedInputPhone = normalizePhoneNumber(raw);
    const cleanWithoutPT = cleanUpper.startsWith('PT-') ? cleanUpper.replace(/^PT-/, '') : cleanUpper;
    const cleanWithPT = cleanUpper.startsWith('PT-') ? cleanUpper : `PT-${cleanUpper}`;

    return db.patients.find((p) => {
      const pKey = (p.patientKey || '').toUpperCase();
      const pKeyWithoutPT = pKey.startsWith('PT-') ? pKey.replace(/^PT-/, '') : pKey;

      if (p.id.toLowerCase() === cleanLower || p.id.toUpperCase() === cleanUpper) return true;
      if (pKey && (pKey === cleanUpper || pKey === cleanWithPT || pKeyWithoutPT === cleanWithoutPT || pKeyWithoutPT === cleanUpper)) return true;
      if (cleanWithPT === `PT-${p.id.toUpperCase()}`) return true;
      if (p.username && p.username.toLowerCase() === cleanLower) return true;
      if (p.fullName && p.fullName.toLowerCase() === cleanLower) return true;
      if (p.preferredName && p.preferredName.toLowerCase() === cleanLower) return true;

      // Phone lookup: Strict normalized equality ONLY. Short inputs like "0" will never match a 10-digit number
      if (p.phone && normalizedInputPhone && normalizedInputPhone.length >= 10) {
        const pNorm = normalizePhoneNumber(p.phone);
        if (pNorm && pNorm.length >= 10 && pNorm === normalizedInputPhone) {
          return true;
        }
      }
      return false;
    });
  }

  // BUG #2 FIX: Strict normalized equality matching for caretaker phone lookups
  static findCaretaker(identifier: string): CaretakerProfile | undefined {
    const db = this.ensureDbExists();
    const raw = identifier.trim();
    const clean = raw.toLowerCase();
    const normalizedInputPhone = normalizePhoneNumber(raw);

    return db.caretakers.find((c) => {
      if (c.id.toLowerCase() === clean) return true;
      if (c.caregiverKey && c.caregiverKey.toLowerCase() === clean) return true;
      if (c.username && c.username.toLowerCase() === clean) return true;
      if (c.fullName.toLowerCase() === clean) return true;

      // Phone lookup: Strict normalized equality ONLY
      if (c.phone && normalizedInputPhone && normalizedInputPhone.length >= 10) {
        const cNorm = normalizePhoneNumber(c.phone);
        if (cNorm && cNorm.length >= 10 && cNorm === normalizedInputPhone) {
          return true;
        }
      }
      return false;
    });
  }

  static isUsernameTaken(username: string): boolean {
    const db = this.ensureDbExists();
    const clean = username.trim().toLowerCase();
    const inPatients = db.patients.some((p) => (p.username || '').trim().toLowerCase() === clean);
    const inCaretakers = db.caretakers.some((c) => (c.username || '').trim().toLowerCase() === clean);
    return inPatients || inCaretakers;
  }

  // BUG #2 FIX: Phone uniqueness check using strict normalized equality
  static isPhoneTaken(phone: string): boolean {
    const db = this.ensureDbExists();
    const norm = normalizePhoneNumber(phone);
    if (!norm || norm.length < 10) return false;

    const inPatients = db.patients.some((p) => {
      const d = normalizePhoneNumber(p.phone);
      return d.length >= 10 && d === norm;
    });

    const inCaretakers = db.caretakers.some((c) => {
      const d = normalizePhoneNumber(c.phone);
      return d.length >= 10 && d === norm;
    });

    return inPatients || inCaretakers;
  }

  // BUG #1 FIX: Strict identity matching by ID only. Never overwrite a user because of phone match with a different ID.
  static addPatient(patient: PatientProfile): PatientProfile {
    const db = this.ensureDbExists();

    // Check if updating existing user by explicit ID match
    const existingIndex = db.patients.findIndex((p) => p.id === patient.id);

    const normPhone = normalizePhoneNumber(patient.phone);
    if (normPhone && normPhone.length >= 10) {
      // Reject if phone belongs to another patient with a DIFFERENT ID
      const conflictPatient = db.patients.find(
        (p) => p.id !== patient.id && normalizePhoneNumber(p.phone) === normPhone
      );
      if (conflictPatient) {
        throw new Error('This phone number is already registered to another patient.');
      }
      const conflictCaretaker = db.caretakers.find(
        (c) => normalizePhoneNumber(c.phone) === normPhone
      );
      if (conflictCaretaker) {
        throw new Error('This phone number is already registered to a caregiver.');
      }
    }

    // Password security: hash password if provided and not already hashed
    if (patient.password && !patient.password.startsWith('$scrypt$')) {
      patient.password = hashPassword(patient.password);
    }

    if (existingIndex >= 0) {
      // UPDATE: Merge only onto the exact matching ID record
      db.patients[existingIndex] = { ...db.patients[existingIndex], ...patient };
    } else {
      // CREATE: New patient
      db.patients.push(patient);
    }

    this.ensureMutualConsistency(db);
    this.save(db);
    return db.patients[existingIndex >= 0 ? existingIndex : db.patients.length - 1];
  }

  // BUG #1 FIX: Strict identity matching by ID only for Caretaker.
  static addCaretaker(caretaker: CaretakerProfile): CaretakerProfile {
    const db = this.ensureDbExists();

    // Check if updating existing caretaker by explicit ID match
    const existingIndex = db.caretakers.findIndex((c) => c.id === caretaker.id);

    const normPhone = normalizePhoneNumber(caretaker.phone);
    if (normPhone && normPhone.length >= 10) {
      // Reject if phone belongs to another caretaker with a DIFFERENT ID
      const conflictCaretaker = db.caretakers.find(
        (c) => c.id !== caretaker.id && normalizePhoneNumber(c.phone) === normPhone
      );
      if (conflictCaretaker) {
        throw new Error('This phone number is already registered to another caregiver.');
      }
      const conflictPatient = db.patients.find(
        (p) => normalizePhoneNumber(p.phone) === normPhone
      );
      if (conflictPatient) {
        throw new Error('This phone number is already registered to a patient.');
      }
    }

    // Password security: hash password if provided and not already hashed
    if (caretaker.password && !caretaker.password.startsWith('$scrypt$')) {
      caretaker.password = hashPassword(caretaker.password);
    }

    if (existingIndex >= 0) {
      // UPDATE: Merge only onto the exact matching ID record
      db.caretakers[existingIndex] = { ...db.caretakers[existingIndex], ...caretaker };
    } else {
      // CREATE: New caretaker
      db.caretakers.push(caretaker);
    }

    this.ensureMutualConsistency(db);
    this.save(db);
    return db.caretakers[existingIndex >= 0 ? existingIndex : db.caretakers.length - 1];
  }

  static linkPatientToCaretaker(
    caretakerId: string,
    patientIdentifier: string
  ): { success: boolean; error?: string; caretaker?: CaretakerProfile; patient?: PatientProfile } {
    const db = this.ensureDbExists();
    const caretaker = this.findCaretaker(caretakerId) || db.caretakers.find((c) => c.id === caretakerId);
    if (!caretaker) return { success: false, error: 'Caregiver not found.' };

    const patient = this.findPatient(patientIdentifier);
    if (!patient) return { success: false, error: 'No patient found with that key, mobile number, or username.' };

    if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
    if (!caretaker.assignedPatientIds.includes(patient.id)) {
      caretaker.assignedPatientIds.push(patient.id);
    }

    patient.linkedCaregiverKey = caretaker.caregiverKey;
    patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || 'Caregiver'})`;
    patient.caregiverPhone = caretaker.phone;
    patient.hasCaregiver = true;

    this.ensureMutualConsistency(db);
    this.save(db);
    return { success: true, caretaker: sanitizeProfile(caretaker), patient: sanitizeProfile(patient) };
  }

  static linkCaregiverToPatient(
    patientId: string,
    caregiverKey: string
  ): { success: boolean; error?: string; caretaker?: CaretakerProfile; patient?: PatientProfile } {
    const db = this.ensureDbExists();
    let patient = this.findPatient(patientId) || db.patients.find((p) => p.id === patientId);
    if (!patient) {
      patient = {
        id: patientId,
        fullName: 'Loved One',
        preferredName: 'Patient',
        username: patientId,
        age: 70,
        region: '',
        state: '',
        preferredLanguage: 'en',
        caregiverName: '',
        caregiverPhone: '',
        avatarUrl: '',
        dailyStreak: 0,
        todayCompletedCount: 0,
      };
      db.patients.push(patient);
    }

    const keyClean = caregiverKey.trim().toUpperCase();
    let caretaker = this.findCaretaker(keyClean) || db.caretakers.find(
      (c) => (c.caregiverKey || '').toUpperCase() === keyClean
    );
    if (!caretaker) {
      caretaker = {
        id: `caretaker-${keyClean.toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now()}`,
        fullName: 'Family Caregiver',
        username: 'caregiver',
        relation: 'Family Caregiver',
        phone: '9876543210',
        caregiverKey: keyClean,
        assignedPatientIds: [patient.id],
        pin: '1234',
      };
      db.caretakers.push(caretaker);
    }

    if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
    if (!caretaker.assignedPatientIds.includes(patient.id)) {
      caretaker.assignedPatientIds.push(patient.id);
    }

    patient.linkedCaregiverKey = caretaker.caregiverKey;
    patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || 'Caregiver'})`;
    patient.caregiverPhone = caretaker.phone;
    patient.hasCaregiver = true;

    this.ensureMutualConsistency(db);
    this.save(db);
    return { success: true, caretaker: sanitizeProfile(caretaker), patient: sanitizeProfile(patient) };
  }

  static unlinkCaregiver(
    patientId: string,
    initiator: 'CAREGIVER' | 'PATIENT' = 'CAREGIVER',
    initiatorName?: string,
    initiatorId?: string
  ): { success: boolean; patient?: PatientProfile; affectedCaretakers?: CaretakerProfile[] } {
    const db = this.ensureDbExists();
    const patient = this.findPatient(patientId) || db.patients.find((p) => p.id === patientId);
    if (!patient) return { success: false };

    // Find the caretaker(s) previously linked to this patient
    const previousCaregiverKey = (patient.linkedCaregiverKey || '').trim().toUpperCase();
    const previousCaretakers = db.caretakers.filter(
      (c) =>
        (initiatorId && c.id === initiatorId) ||
        (c.assignedPatientIds && c.assignedPatientIds.includes(patient.id)) ||
        (previousCaregiverKey && (c.caregiverKey || '').trim().toUpperCase() === previousCaregiverKey)
    );

    const caregiverName = initiatorName || (previousCaretakers.length > 0 ? previousCaretakers[0].fullName : patient.caregiverName || 'Caregiver');

    patient.linkedCaregiverKey = '';
    patient.hasCaregiver = false;
    patient.caregiverName = 'Self';
    patient.caregiverPhone = '';

    if (initiator === 'CAREGIVER') {
      patient.caregiverRemovalNotice = {
        caregiverName: caregiverName !== 'Self' ? caregiverName : 'Your Caregiver',
        caregiverPhone: previousCaretakers[0]?.phone || '',
        caregiverKey: previousCaretakers[0]?.caregiverKey || previousCaregiverKey,
        removedAt: new Date().toISOString(),
        message: `Your caregiver ${caregiverName !== 'Self' ? caregiverName : ''} has removed you from their care circle. You are now in self-care mode.`,
      };
    }

    if (initiator === 'PATIENT') {
      const notice = {
        id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientKey: patient.patientKey || `PT-${patient.id.slice(0, 6).toUpperCase()}`,
        removedAt: new Date().toISOString(),
        message: `Patient ${patient.fullName} has unlinked / removed you as their caregiver.`,
      };

      for (const ct of previousCaretakers) {
        if (!ct.patientRemovalNotices) ct.patientRemovalNotices = [];
        const hasRecent = ct.patientRemovalNotices.some(
          (n) => n.patientId === patient.id && Math.abs(Date.now() - new Date(n.removedAt).getTime()) < 60000
        );
        if (!hasRecent) {
          ct.patientRemovalNotices.unshift(notice);
        }
      }
    }

    for (const ct of db.caretakers) {
      if (ct.assignedPatientIds) {
        ct.assignedPatientIds = ct.assignedPatientIds.filter((id) => id !== patient.id);
      }
    }

    this.save(db);
    return {
      success: true,
      patient: sanitizeProfile(patient),
      affectedCaretakers: previousCaretakers.map(c => sanitizeProfile(c)!),
    };
  }

  static deletePatient(
    patientId: string,
    initiatorCaretakerId?: string,
    initiatorName?: string
  ): { success: boolean; patients: PatientProfile[] } {
    const db = this.ensureDbExists();
    const patient = db.patients.find((p) => p.id === patientId);
    if (patient) {
      patient.linkedCaregiverKey = '';
      patient.hasCaregiver = false;
      patient.caregiverName = 'Self';
      patient.caregiverPhone = '';
      patient.caregiverRemovalNotice = {
        caregiverName: initiatorName || 'Your Caregiver',
        removedAt: new Date().toISOString(),
        message: `Your caregiver ${initiatorName ? initiatorName + ' ' : ''}has removed you from their care circle. You are now in self-care mode.`,
      };
    }

    for (const ct of db.caretakers) {
      if (ct.assignedPatientIds) {
        ct.assignedPatientIds = ct.assignedPatientIds.filter((id) => id !== patientId);
      }
    }

    this.save(db);
    return { success: true, patients: db.patients.map(p => sanitizeProfile(p)!) };
  }

  static dismissCaregiverRemovalNotice(patientId: string): boolean {
    const db = this.ensureDbExists();
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) return false;
    delete patient.caregiverRemovalNotice;
    this.save(db);
    return true;
  }

  static dismissPatientRemovalNotice(caretakerId: string, noticeId?: string): boolean {
    const db = this.ensureDbExists();
    const caretaker = db.caretakers.find((c) => c.id === caretakerId);
    if (!caretaker) return false;
    if (noticeId) {
      caretaker.patientRemovalNotices = (caretaker.patientRemovalNotices || []).filter((n) => n.id !== noticeId);
    } else {
      caretaker.patientRemovalNotices = [];
    }
    this.save(db);
    return true;
  }

  static getRoutines(patientId: string): RoutineTask[] {
    const db = this.ensureDbExists();
    return db.routines[patientId] || [];
  }

  static saveRoutines(patientId: string, routines: RoutineTask[]): RoutineTask[] {
    const db = this.ensureDbExists();
    db.routines[patientId] = routines;
    this.save(db);
    return routines;
  }

  static getReminders(patientId: string): ReminderItem[] {
    const db = this.ensureDbExists();
    return db.reminders[patientId] || [];
  }

  static saveReminders(patientId: string, reminders: ReminderItem[]): ReminderItem[] {
    const db = this.ensureDbExists();
    db.reminders[patientId] = reminders;
    this.save(db);
    return reminders;
  }

  static getMemories(patientId: string): MemoryMoment[] {
    const db = this.ensureDbExists();
    return db.memories[patientId] || [];
  }

  static addMemory(patientId: string, memory: MemoryMoment): MemoryMoment[] {
    const db = this.ensureDbExists();
    if (!db.memories[patientId]) {
      db.memories[patientId] = [];
    }
    db.memories[patientId] = [memory, ...db.memories[patientId].filter((m) => m.id !== memory.id)];
    this.save(db);
    return db.memories[patientId];
  }

  static deleteMemory(patientId: string, memoryId: string): MemoryMoment[] {
    const db = this.ensureDbExists();
    if (!db.memories[patientId]) {
      db.memories[patientId] = [];
    }
    db.memories[patientId] = db.memories[patientId].filter((m) => m.id !== memoryId);
    this.save(db);
    return db.memories[patientId];
  }

  static getPeople(patientId: string): PersonInLife[] {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    return db.people[patientId] || [];
  }

  static addPerson(patientId: string, person: PersonInLife): PersonInLife[] {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    if (!db.people[patientId]) {
      db.people[patientId] = [];
    }
    db.people[patientId] = [person, ...db.people[patientId].filter((p) => p.id !== person.id)];
    this.save(db);
    return db.people[patientId];
  }

  static updatePerson(patientId: string, person: PersonInLife): PersonInLife[] {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    if (!db.people[patientId]) {
      db.people[patientId] = [];
    }
    const idx = db.people[patientId].findIndex((p) => p.id === person.id);
    if (idx >= 0) {
      db.people[patientId][idx] = { ...db.people[patientId][idx], ...person };
    } else {
      db.people[patientId].unshift(person);
    }
    this.save(db);
    return db.people[patientId];
  }

  static deletePerson(patientId: string, personId: string): PersonInLife[] {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    if (!db.people[patientId]) {
      db.people[patientId] = [];
    }
    db.people[patientId] = db.people[patientId].filter((p) => p.id !== personId);
    this.save(db);
    return db.people[patientId];
  }

  static getSessions(patientId: string): GameSessionResult[] {
    const db = this.ensureDbExists();
    return db.sessions[patientId] || [];
  }

  static addSession(patientId: string, session: GameSessionResult): GameSessionResult[] {
    const db = this.ensureDbExists();
    if (!db.sessions[patientId]) {
      db.sessions[patientId] = [];
    }
    db.sessions[patientId] = [session, ...db.sessions[patientId].filter((s) => s.id !== session.id)];
    this.save(db);
    return db.sessions[patientId];
  }

  // Caregiver Connection Requests with Patient Confirmation Workflow
  static createConnectionRequest(
    caretakerId: string,
    patientIdentifier: string
  ): { success: boolean; error?: string; message?: string; request?: CaregiverConnectionRequest; patient?: PatientProfile } {
    const db = this.ensureDbExists();
    const caretaker = this.findCaretaker(caretakerId) || db.caretakers.find((c) => c.id === caretakerId);
    if (!caretaker) {
      return { success: false, error: 'Caregiver account not found.' };
    }

    const patient = this.findPatient(patientIdentifier);
    if (!patient) {
      return { success: false, error: 'No patient found with that Patient ID, Key, or Mobile number.' };
    }

    // Check if already assigned
    const isAlreadyAssigned =
      (caretaker.assignedPatientIds && caretaker.assignedPatientIds.includes(patient.id)) ||
      (patient.linkedCaregiverKey &&
        (caretaker.caregiverKey || '').toUpperCase() === patient.linkedCaregiverKey.toUpperCase());

    if (isAlreadyAssigned) {
      return { success: false, error: 'This patient is already linked in your active care circle.' };
    }

    // Check if there is already a pending request
    if (!db.connectionRequests) db.connectionRequests = [];
    const pending = db.connectionRequests.find(
      (r) => r.caretakerId === caretaker.id && r.patientId === patient.id && r.status === 'PENDING'
    );
    if (pending) {
      return {
        success: false,
        error: 'A connection request has already been sent to this patient and is waiting for their confirmation on their app.',
      };
    }

    const newReq: CaregiverConnectionRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caretakerId: caretaker.id,
      caretakerName: caretaker.fullName,
      caretakerPhone: caretaker.phone,
      caretakerRelation: caretaker.relation || 'Caregiver',
      patientId: patient.id,
      patientName: patient.fullName,
      patientKey: patient.patientKey || `PT-${patient.id.slice(0, 6).toUpperCase()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    db.connectionRequests.push(newReq);
    this.save(db);

    return {
      success: true,
      message: `Connection request sent to ${patient.fullName}. Waiting for confirmation on the patient's app.`,
      request: newReq,
      patient: sanitizeProfile(patient),
    };
  }

  static getPendingRequestsForPatient(patientId: string): CaregiverConnectionRequest[] {
    const db = this.ensureDbExists();
    return (db.connectionRequests || []).filter(
      (r) => r.patientId === patientId && r.status === 'PENDING'
    );
  }

  static getRequestsForCaretaker(caretakerId: string): CaregiverConnectionRequest[] {
    const db = this.ensureDbExists();
    return (db.connectionRequests || []).filter((r) => r.caretakerId === caretakerId);
  }

  static respondToConnectionRequest(
    requestId: string,
    action: 'ACCEPT' | 'DECLINE',
    patientId?: string
  ): {
    success: boolean;
    error?: string;
    status?: 'ACCEPTED' | 'DECLINE' | 'DECLINED';
    request?: CaregiverConnectionRequest;
    patient?: PatientProfile;
    caretaker?: CaretakerProfile;
  } {
    const db = this.ensureDbExists();
    if (!db.connectionRequests) db.connectionRequests = [];

    const req = db.connectionRequests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: 'Connection request not found.' };
    }

    if (patientId && req.patientId !== patientId) {
      return { success: false, error: 'Unauthorized to respond to this request.' };
    }

    if (req.status !== 'PENDING') {
      return {
        success: false,
        error: `This request has already been ${req.status.toLowerCase()}.`,
        status: req.status,
      };
    }

    if (action === 'ACCEPT') {
      req.status = 'ACCEPTED';
      req.updatedAt = new Date().toISOString();

      const caretaker = db.caretakers.find((c) => c.id === req.caretakerId);
      const patient = db.patients.find((p) => p.id === req.patientId);

      if (caretaker && patient) {
        if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
        if (!caretaker.assignedPatientIds.includes(patient.id)) {
          caretaker.assignedPatientIds.push(patient.id);
        }

        patient.linkedCaregiverKey = caretaker.caregiverKey;
        patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || 'Caregiver'})`;
        patient.caregiverPhone = caretaker.phone;
        patient.hasCaregiver = true;

        this.ensureMutualConsistency(db);
      }

      this.save(db);

      return {
        success: true,
        status: 'ACCEPTED',
        request: req,
        patient: sanitizeProfile(patient),
        caretaker: sanitizeProfile(caretaker),
      };
    } else {
      req.status = 'DECLINED';
      req.updatedAt = new Date().toISOString();
      this.save(db);

      return {
        success: true,
        status: 'DECLINED',
        request: req,
      };
    }
  }
}
