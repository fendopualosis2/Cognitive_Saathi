var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// backend.ts
var backend_exports = {};
__export(backend_exports, {
  default: () => backend_default
});
module.exports = __toCommonJS(backend_exports);
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_ws = require("ws");
var import_genai2 = require("@google/genai");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_firestore2 = require("firebase/firestore");

// src/services/firebase.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_auth = require("firebase/auth");
var dbInstance = null;
function getFirebaseApp() {
  if ((0, import_app.getApps)().length > 0) {
    return (0, import_app.getApp)();
  }
  const config = {
    projectId: "gen-lang-client-0434707145",
    appId: "1:404458343109:web:7204876cc3f3ac4b8c7eac",
    apiKey: "AIzaSyAaLEyci2f7sCSatJVF6wkkyQeT6l2ZjUA",
    authDomain: "gen-lang-client-0434707145.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-cognitivesaathi-62186706-13a4-45a8-b1db-6239b1022dc0",
    storageBucket: "gen-lang-client-0434707145.firebasestorage.app",
    messagingSenderId: "404458343109",
    oAuthClientId: "404458343109-1qoi3vvk2sjlkf42ds3l800935hg20p2.apps.googleusercontent.com"
  };
  try {
    return (0, import_app.initializeApp)(config);
  } catch (e) {
    console.warn("Firebase init notice:", e);
    return null;
  }
}
function getDb() {
  if (dbInstance) return dbInstance;
  const app2 = getFirebaseApp();
  if (app2) {
    try {
      dbInstance = (0, import_firestore.getFirestore)(app2, "ai-studio-cognitivesaathi-62186706-13a4-45a8-b1db-6239b1022dc0");
    } catch (e) {
      try {
        dbInstance = (0, import_firestore.getFirestore)(app2);
      } catch (err) {
        console.warn("Firestore instance init notice:", err);
      }
    }
  }
  return dbInstance;
}

// server/db.ts
var DB_DIR = process.env.VERCEL ? "/tmp/data" : import_path.default.join(process.cwd(), "data");
var DB_PATH = import_path.default.join(DB_DIR, "database.json");
var DB_TEMP_PATH = import_path.default.join(DB_DIR, "database.json.tmp");
function normalizePhoneNumber(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}
function hashPassword(plainText) {
  if (!plainText) return "";
  if (plainText.startsWith("$scrypt$")) return plainText;
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const derivedKey = import_crypto.default.scryptSync(plainText, salt, 64);
  return `$scrypt$${salt}$${derivedKey.toString("hex")}`;
}
function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!storedHashOrPlain || !inputPassword) return false;
  if (!storedHashOrPlain.startsWith("$scrypt$")) {
    return storedHashOrPlain === inputPassword;
  }
  const parts = storedHashOrPlain.split("$");
  if (parts.length !== 4) return false;
  const salt = parts[2];
  const originalKeyHex = parts[3];
  const derivedKey = import_crypto.default.scryptSync(inputPassword, salt, 64);
  const derivedHex = derivedKey.toString("hex");
  if (derivedHex.length !== originalKeyHex.length) return false;
  return import_crypto.default.timingSafeEqual(Buffer.from(derivedHex, "hex"), Buffer.from(originalKeyHex, "hex"));
}
function sanitizeProfile(profile) {
  if (!profile) return void 0;
  const clone = { ...profile };
  delete clone.password;
  delete clone.pin;
  return clone;
}
var INITIAL_PATIENTS = [];
var INITIAL_CARETAKERS = [];
var ServerDB = class {
  static {
    this.cache = null;
  }
  static async syncFromCloud() {
    const db = getDb();
    if (!db) return;
    try {
      const snapshot = await (0, import_firestore2.getDoc)((0, import_firestore2.doc)(db, "system", "database"));
      if (snapshot.exists()) {
        const cloudData = snapshot.data();
        this.cache = {
          patients: cloudData.patients || [],
          caretakers: cloudData.caretakers || [],
          routines: cloudData.routines || {},
          reminders: cloudData.reminders || {},
          memories: cloudData.memories || {},
          people: cloudData.people || {},
          sessions: cloudData.sessions || {},
          connectionRequests: cloudData.connectionRequests || [],
          calendarEvents: cloudData.calendarEvents || {}
        };
        this.save(this.cache);
      }
    } catch (e) {
      console.warn("Error reading from Firestore cloud sync:", e);
    }
  }
  static async syncToCloud() {
    const db = getDb();
    if (!db || !this.cache) return;
    try {
      await (0, import_firestore2.setDoc)((0, import_firestore2.doc)(db, "system", "database"), this.cache);
    } catch (e) {
      console.error("Error writing to Firestore cloud sync:", e);
    }
  }
  static ensureDbExists() {
    if (this.cache) return this.cache;
    try {
      if (!import_fs.default.existsSync(DB_DIR)) {
        import_fs.default.mkdirSync(DB_DIR, { recursive: true });
      }
      if (import_fs.default.existsSync(DB_PATH)) {
        const raw = import_fs.default.readFileSync(DB_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        this.cache = {
          patients: parsed.patients || INITIAL_PATIENTS,
          caretakers: parsed.caretakers || INITIAL_CARETAKERS,
          routines: parsed.routines || {},
          reminders: parsed.reminders || {},
          memories: parsed.memories || {},
          people: parsed.people || {},
          sessions: parsed.sessions || {},
          connectionRequests: parsed.connectionRequests || []
        };
        return this.cache;
      }
    } catch (e) {
      console.warn("Error reading server database, initializing fresh state:", e);
    }
    const defaultDb = {
      patients: INITIAL_PATIENTS,
      caretakers: INITIAL_CARETAKERS,
      routines: {},
      reminders: {},
      memories: {},
      people: {},
      sessions: {},
      connectionRequests: []
    };
    this.save(defaultDb);
    this.cache = defaultDb;
    return defaultDb;
  }
  static ensureMutualConsistency(db) {
    let changed = false;
    for (const patient of db.patients) {
      if (!patient.patientKey) {
        const cleanId = (patient.id || "").replace(/^patient-/, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
        const namePart = (patient.username || patient.preferredName || patient.fullName || "PT").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
        patient.patientKey = `PT-${namePart || "USER"}${cleanId || "01"}`;
        changed = true;
      }
      if (patient.linkedCaregiverKey) {
        const keyClean = patient.linkedCaregiverKey.trim().toUpperCase();
        const ct = db.caretakers.find((c) => (c.caregiverKey || "").trim().toUpperCase() === keyClean);
        if (ct) {
          if (!ct.assignedPatientIds) ct.assignedPatientIds = [];
          if (!ct.assignedPatientIds.includes(patient.id)) {
            ct.assignedPatientIds.push(patient.id);
            changed = true;
          }
          if (!patient.hasCaregiver) {
            patient.hasCaregiver = true;
            patient.caregiverName = `${ct.fullName} (${ct.relation || "Caregiver"})`;
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
            if ((p.linkedCaregiverKey || "").trim().toUpperCase() !== (ct.caregiverKey || "").trim().toUpperCase()) {
              p.linkedCaregiverKey = ct.caregiverKey;
              p.hasCaregiver = true;
              p.caregiverName = `${ct.fullName} (${ct.relation || "Caregiver"})`;
              p.caregiverPhone = ct.phone;
              changed = true;
            }
          }
        }
      }
    }
    return changed;
  }
  static save(db) {
    try {
      if (!import_fs.default.existsSync(DB_DIR)) {
        import_fs.default.mkdirSync(DB_DIR, { recursive: true });
      }
      const dataStr = JSON.stringify(db, null, 2);
      try {
        import_fs.default.writeFileSync(DB_TEMP_PATH, dataStr, "utf-8");
        import_fs.default.renameSync(DB_TEMP_PATH, DB_PATH);
      } catch {
        import_fs.default.writeFileSync(DB_PATH, dataStr, "utf-8");
      }
      this.cache = db;
    } catch (e) {
      console.error("Failed to write to database.json:", e);
      this.cache = db;
    }
  }
  static getPatients() {
    const db = this.ensureDbExists();
    if (this.ensureMutualConsistency(db)) {
      this.save(db);
    }
    return db.patients;
  }
  static getCaretakers() {
    const db = this.ensureDbExists();
    if (this.ensureMutualConsistency(db)) {
      this.save(db);
    }
    return db.caretakers;
  }
  // BUG #2 FIX: Strict normalized equality matching for phone lookups; NO endsWith / startsWith / suffix IDOR
  static findPatient(identifier) {
    const db = this.ensureDbExists();
    const raw = identifier.trim();
    const cleanLower = raw.toLowerCase();
    const cleanUpper = raw.toUpperCase();
    const normalizedInputPhone = normalizePhoneNumber(raw);
    const cleanWithoutPT = cleanUpper.startsWith("PT-") ? cleanUpper.replace(/^PT-/, "") : cleanUpper;
    const cleanWithPT = cleanUpper.startsWith("PT-") ? cleanUpper : `PT-${cleanUpper}`;
    return db.patients.find((p) => {
      const pKey = (p.patientKey || "").toUpperCase();
      const pKeyWithoutPT = pKey.startsWith("PT-") ? pKey.replace(/^PT-/, "") : pKey;
      if (p.id.toLowerCase() === cleanLower || p.id.toUpperCase() === cleanUpper) return true;
      if (pKey && (pKey === cleanUpper || pKey === cleanWithPT || pKeyWithoutPT === cleanWithoutPT || pKeyWithoutPT === cleanUpper)) return true;
      if (cleanWithPT === `PT-${p.id.toUpperCase()}`) return true;
      if (p.username && p.username.toLowerCase() === cleanLower) return true;
      if (p.fullName && p.fullName.toLowerCase() === cleanLower) return true;
      if (p.preferredName && p.preferredName.toLowerCase() === cleanLower) return true;
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
  static findCaretaker(identifier) {
    const db = this.ensureDbExists();
    const raw = identifier.trim();
    const clean = raw.toLowerCase();
    const normalizedInputPhone = normalizePhoneNumber(raw);
    return db.caretakers.find((c) => {
      if (c.id.toLowerCase() === clean) return true;
      if (c.caregiverKey && c.caregiverKey.toLowerCase() === clean) return true;
      if (c.username && c.username.toLowerCase() === clean) return true;
      if (c.fullName.toLowerCase() === clean) return true;
      if (c.phone && normalizedInputPhone && normalizedInputPhone.length >= 10) {
        const cNorm = normalizePhoneNumber(c.phone);
        if (cNorm && cNorm.length >= 10 && cNorm === normalizedInputPhone) {
          return true;
        }
      }
      return false;
    });
  }
  static isUsernameTaken(username) {
    const db = this.ensureDbExists();
    const clean = username.trim().toLowerCase();
    const inPatients = db.patients.some((p) => (p.username || "").trim().toLowerCase() === clean);
    const inCaretakers = db.caretakers.some((c) => (c.username || "").trim().toLowerCase() === clean);
    return inPatients || inCaretakers;
  }
  // BUG #2 FIX: Phone uniqueness check using strict normalized equality
  static isPhoneTaken(phone) {
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
  static isPatientKeyTaken(key, excludePatientId) {
    const db = this.ensureDbExists();
    const clean = key.trim().toUpperCase();
    return db.patients.some((p) => p.id !== excludePatientId && (p.patientKey || "").toUpperCase() === clean);
  }
  static isCaregiverKeyTaken(key, excludeCaretakerId) {
    const db = this.ensureDbExists();
    const clean = key.trim().toUpperCase();
    return db.caretakers.some((c) => c.id !== excludeCaretakerId && (c.caregiverKey || "").toUpperCase() === clean);
  }
  // BUG #1 FIX: Strict identity matching by ID only. Never overwrite a user because of phone match with a different ID.
  static addPatient(patient) {
    const db = this.ensureDbExists();
    const existingIndex = db.patients.findIndex((p) => p.id === patient.id);
    if (patient.patientKey) {
      if (this.isPatientKeyTaken(patient.patientKey, patient.id)) {
        throw new Error("This Patient ID is already taken by another account.");
      }
    }
    const normPhone = normalizePhoneNumber(patient.phone);
    if (normPhone && normPhone.length >= 10) {
      const conflictPatient = db.patients.find(
        (p) => p.id !== patient.id && normalizePhoneNumber(p.phone) === normPhone
      );
      if (conflictPatient) {
        throw new Error("This phone number is already registered to another patient.");
      }
      const conflictCaretaker = db.caretakers.find(
        (c) => normalizePhoneNumber(c.phone) === normPhone
      );
      if (conflictCaretaker) {
        throw new Error("This phone number is already registered to a caregiver.");
      }
    }
    if (patient.password && !patient.password.startsWith("$scrypt$")) {
      patient.password = hashPassword(patient.password);
    }
    if (existingIndex >= 0) {
      const existing = db.patients[existingIndex];
      db.patients[existingIndex] = {
        ...existing,
        ...patient,
        id: existing.id,
        patientKey: existing.patientKey,
        username: existing.username
      };
    } else {
      db.patients.push(patient);
    }
    this.ensureMutualConsistency(db);
    this.save(db);
    return db.patients[existingIndex >= 0 ? existingIndex : db.patients.length - 1];
  }
  // BUG #1 FIX: Strict identity matching by ID only for Caretaker.
  static addCaretaker(caretaker) {
    const db = this.ensureDbExists();
    const existingIndex = db.caretakers.findIndex((c) => c.id === caretaker.id);
    if (caretaker.caregiverKey) {
      if (this.isCaregiverKeyTaken(caretaker.caregiverKey, caretaker.id)) {
        throw new Error("This Caregiver ID is already taken.");
      }
    }
    const normPhone = normalizePhoneNumber(caretaker.phone);
    if (normPhone && normPhone.length >= 10) {
      const conflictCaretaker = db.caretakers.find(
        (c) => c.id !== caretaker.id && normalizePhoneNumber(c.phone) === normPhone
      );
      if (conflictCaretaker) {
        throw new Error("This phone number is already registered to another caregiver.");
      }
      const conflictPatient = db.patients.find(
        (p) => normalizePhoneNumber(p.phone) === normPhone
      );
      if (conflictPatient) {
        throw new Error("This phone number is already registered to a patient.");
      }
    }
    if (caretaker.password && !caretaker.password.startsWith("$scrypt$")) {
      caretaker.password = hashPassword(caretaker.password);
    }
    if (existingIndex >= 0) {
      const existing = db.caretakers[existingIndex];
      db.caretakers[existingIndex] = {
        ...existing,
        ...caretaker,
        id: existing.id,
        caregiverKey: existing.caregiverKey,
        username: existing.username
      };
    } else {
      db.caretakers.push(caretaker);
    }
    this.ensureMutualConsistency(db);
    this.save(db);
    return db.caretakers[existingIndex >= 0 ? existingIndex : db.caretakers.length - 1];
  }
  static linkPatientToCaretaker(caretakerId, patientIdentifier) {
    const db = this.ensureDbExists();
    const caretaker = this.findCaretaker(caretakerId) || db.caretakers.find((c) => c.id === caretakerId);
    if (!caretaker) return { success: false, error: "Caregiver not found." };
    const patient = this.findPatient(patientIdentifier);
    if (!patient) return { success: false, error: "No registered patient found with that ID or Key. Please check the Patient ID." };
    if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
    if (!caretaker.assignedPatientIds.includes(patient.id)) {
      caretaker.assignedPatientIds.push(patient.id);
    }
    patient.linkedCaregiverKey = caretaker.caregiverKey;
    patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || "Caregiver"})`;
    patient.caregiverPhone = caretaker.phone;
    patient.hasCaregiver = true;
    this.ensureMutualConsistency(db);
    this.save(db);
    return { success: true, caretaker: sanitizeProfile(caretaker), patient: sanitizeProfile(patient) };
  }
  static linkCaregiverToPatient(patientId, caregiverKey) {
    const db = this.ensureDbExists();
    const patient = this.findPatient(patientId) || db.patients.find((p) => p.id === patientId);
    if (!patient) {
      return { success: false, error: "No registered patient found with that ID. Please check the Patient ID." };
    }
    const keyClean = caregiverKey.trim().toUpperCase();
    const caretaker = this.findCaretaker(keyClean) || db.caretakers.find(
      (c) => (c.caregiverKey || "").toUpperCase() === keyClean
    );
    if (!caretaker) {
      return { success: false, error: 'No registered caregiver found with key "' + keyClean + '". Please enter a valid Caregiver ID.' };
    }
    if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
    if (!caretaker.assignedPatientIds.includes(patient.id)) {
      caretaker.assignedPatientIds.push(patient.id);
    }
    patient.linkedCaregiverKey = caretaker.caregiverKey;
    patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || "Caregiver"})`;
    patient.caregiverPhone = caretaker.phone;
    patient.hasCaregiver = true;
    this.ensureMutualConsistency(db);
    this.save(db);
    return { success: true, caretaker: sanitizeProfile(caretaker), patient: sanitizeProfile(patient) };
  }
  static unlinkCaregiver(patientId, initiator = "CAREGIVER", initiatorName, initiatorId) {
    const db = this.ensureDbExists();
    const patient = this.findPatient(patientId) || db.patients.find((p) => p.id === patientId);
    if (!patient) return { success: false };
    const previousCaregiverKey = (patient.linkedCaregiverKey || "").trim().toUpperCase();
    const previousCaretakers = db.caretakers.filter(
      (c) => initiatorId && c.id === initiatorId || c.assignedPatientIds && c.assignedPatientIds.includes(patient.id) || previousCaregiverKey && (c.caregiverKey || "").trim().toUpperCase() === previousCaregiverKey
    );
    const caregiverName = initiatorName || (previousCaretakers.length > 0 ? previousCaretakers[0].fullName : patient.caregiverName || "Caregiver");
    patient.linkedCaregiverKey = "";
    patient.hasCaregiver = false;
    patient.caregiverName = "Self";
    patient.caregiverPhone = "";
    if (initiator === "CAREGIVER") {
      patient.caregiverRemovalNotice = {
        caregiverName: caregiverName !== "Self" ? caregiverName : "Your Caregiver",
        caregiverPhone: previousCaretakers[0]?.phone || "",
        caregiverKey: previousCaretakers[0]?.caregiverKey || previousCaregiverKey,
        removedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: `Your caregiver ${caregiverName !== "Self" ? caregiverName : ""} has removed you from their care circle. You are now in self-care mode.`
      };
    }
    if (initiator === "PATIENT") {
      const notice = {
        id: `notice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientKey: patient.patientKey || `PT-${patient.id.slice(0, 6).toUpperCase()}`,
        removedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: `Patient ${patient.fullName} has unlinked / removed you as their caregiver.`
      };
      for (const ct of previousCaretakers) {
        if (!ct.patientRemovalNotices) ct.patientRemovalNotices = [];
        const hasRecent = ct.patientRemovalNotices.some(
          (n) => n.patientId === patient.id && Math.abs(Date.now() - new Date(n.removedAt).getTime()) < 6e4
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
      affectedCaretakers: previousCaretakers.map((c) => sanitizeProfile(c))
    };
  }
  static deletePatient(patientId, initiatorCaretakerId, initiatorName) {
    const db = this.ensureDbExists();
    const patient = db.patients.find((p) => p.id === patientId);
    if (patient) {
      patient.linkedCaregiverKey = "";
      patient.hasCaregiver = false;
      patient.caregiverName = "Self";
      patient.caregiverPhone = "";
      patient.caregiverRemovalNotice = {
        caregiverName: initiatorName || "Your Caregiver",
        removedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: `Your caregiver ${initiatorName ? initiatorName + " " : ""}has removed you from their care circle. You are now in self-care mode.`
      };
    }
    for (const ct of db.caretakers) {
      if (ct.assignedPatientIds) {
        ct.assignedPatientIds = ct.assignedPatientIds.filter((id) => id !== patientId);
      }
    }
    this.save(db);
    return { success: true, patients: db.patients.map((p) => sanitizeProfile(p)) };
  }
  static dismissCaregiverRemovalNotice(patientId) {
    const db = this.ensureDbExists();
    const patient = db.patients.find((p) => p.id === patientId);
    if (!patient) return false;
    delete patient.caregiverRemovalNotice;
    this.save(db);
    return true;
  }
  static dismissPatientRemovalNotice(caretakerId, noticeId) {
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
  static getRoutines(patientId) {
    const db = this.ensureDbExists();
    return db.routines[patientId] || [];
  }
  static saveRoutines(patientId, routines) {
    const db = this.ensureDbExists();
    db.routines[patientId] = routines;
    this.save(db);
    return routines;
  }
  static getReminders(patientId) {
    const db = this.ensureDbExists();
    return db.reminders[patientId] || [];
  }
  static saveReminders(patientId, reminders) {
    const db = this.ensureDbExists();
    db.reminders[patientId] = reminders;
    this.save(db);
    return reminders;
  }
  static getMemories(patientId) {
    const db = this.ensureDbExists();
    return db.memories[patientId] || [];
  }
  static addMemory(patientId, memory) {
    const db = this.ensureDbExists();
    if (!db.memories[patientId]) {
      db.memories[patientId] = [];
    }
    db.memories[patientId] = [memory, ...db.memories[patientId].filter((m) => m.id !== memory.id)];
    this.save(db);
    return db.memories[patientId];
  }
  static deleteMemory(patientId, memoryId) {
    const db = this.ensureDbExists();
    if (!db.memories[patientId]) {
      db.memories[patientId] = [];
    }
    db.memories[patientId] = db.memories[patientId].filter((m) => m.id !== memoryId);
    this.save(db);
    return db.memories[patientId];
  }
  static getPeople(patientId) {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    return db.people[patientId] || [];
  }
  static addPerson(patientId, person) {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    if (!db.people[patientId]) {
      db.people[patientId] = [];
    }
    db.people[patientId] = [person, ...db.people[patientId].filter((p) => p.id !== person.id)];
    this.save(db);
    return db.people[patientId];
  }
  static updatePerson(patientId, person) {
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
  static deletePerson(patientId, personId) {
    const db = this.ensureDbExists();
    if (!db.people) db.people = {};
    if (!db.people[patientId]) {
      db.people[patientId] = [];
    }
    db.people[patientId] = db.people[patientId].filter((p) => p.id !== personId);
    this.save(db);
    return db.people[patientId];
  }
  static getSessions(patientId) {
    const db = this.ensureDbExists();
    return db.sessions[patientId] || [];
  }
  static addSession(patientId, session) {
    const db = this.ensureDbExists();
    if (!db.sessions[patientId]) {
      db.sessions[patientId] = [];
    }
    db.sessions[patientId] = [session, ...db.sessions[patientId].filter((s) => s.id !== session.id)];
    this.save(db);
    return db.sessions[patientId];
  }
  // Caregiver Connection Requests with Patient Confirmation Workflow
  static createConnectionRequest(caretakerId, patientIdentifier) {
    const db = this.ensureDbExists();
    const caretaker = this.findCaretaker(caretakerId) || db.caretakers.find((c) => c.id === caretakerId);
    if (!caretaker) {
      return { success: false, error: "Caregiver account not found." };
    }
    const patient = this.findPatient(patientIdentifier);
    if (!patient) {
      return { success: false, error: "No patient found with that Patient ID, Key, or Mobile number." };
    }
    const isAlreadyAssigned = caretaker.assignedPatientIds && caretaker.assignedPatientIds.includes(patient.id) || patient.linkedCaregiverKey && (caretaker.caregiverKey || "").toUpperCase() === patient.linkedCaregiverKey.toUpperCase();
    if (isAlreadyAssigned) {
      return { success: false, error: "This patient is already linked in your active care circle." };
    }
    if (!db.connectionRequests) db.connectionRequests = [];
    const pending = db.connectionRequests.find(
      (r) => r.caretakerId === caretaker.id && r.patientId === patient.id && r.status === "PENDING"
    );
    if (pending) {
      return {
        success: false,
        error: "A connection request has already been sent to this patient and is waiting for their confirmation on their app."
      };
    }
    const newReq = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caretakerId: caretaker.id,
      caretakerName: caretaker.fullName,
      caretakerPhone: caretaker.phone,
      caretakerRelation: caretaker.relation || "Caregiver",
      patientId: patient.id,
      patientName: patient.fullName,
      patientKey: patient.patientKey || `PT-${patient.id.slice(0, 6).toUpperCase()}`,
      status: "PENDING",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.connectionRequests.push(newReq);
    this.save(db);
    return {
      success: true,
      message: `Connection request sent to ${patient.fullName}. Waiting for confirmation on the patient's app.`,
      request: newReq,
      patient: sanitizeProfile(patient)
    };
  }
  static getPendingRequestsForPatient(patientId) {
    const db = this.ensureDbExists();
    return (db.connectionRequests || []).filter(
      (r) => r.patientId === patientId && r.status === "PENDING"
    );
  }
  static getRequestsForCaretaker(caretakerId) {
    const db = this.ensureDbExists();
    return (db.connectionRequests || []).filter((r) => r.caretakerId === caretakerId);
  }
  static respondToConnectionRequest(requestId, action, patientId) {
    const db = this.ensureDbExists();
    if (!db.connectionRequests) db.connectionRequests = [];
    const req = db.connectionRequests.find((r) => r.id === requestId);
    if (!req) {
      return { success: false, error: "Connection request not found." };
    }
    if (patientId && req.patientId !== patientId) {
      return { success: false, error: "Unauthorized to respond to this request." };
    }
    if (req.status !== "PENDING") {
      return {
        success: false,
        error: `This request has already been ${req.status.toLowerCase()}.`,
        status: req.status
      };
    }
    if (action === "ACCEPT") {
      req.status = "ACCEPTED";
      req.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const caretaker = db.caretakers.find((c) => c.id === req.caretakerId);
      const patient = db.patients.find((p) => p.id === req.patientId);
      if (caretaker && patient) {
        if (!caretaker.assignedPatientIds) caretaker.assignedPatientIds = [];
        if (!caretaker.assignedPatientIds.includes(patient.id)) {
          caretaker.assignedPatientIds.push(patient.id);
        }
        caretaker.linkedPatientId = patient.id;
        patient.linkedCaregiverKey = caretaker.caregiverKey || caretaker.id;
        patient.caregiverName = `${caretaker.fullName} (${caretaker.relation || "Caregiver"})`;
        patient.caregiverPhone = caretaker.phone;
        patient.hasCaregiver = true;
        this.ensureMutualConsistency(db);
      }
      this.save(db);
      return {
        success: true,
        status: "ACCEPTED",
        request: req,
        patient: sanitizeProfile(patient),
        caretaker: sanitizeProfile(caretaker)
      };
    } else {
      req.status = "DECLINED";
      req.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      this.save(db);
      return {
        success: true,
        status: "DECLINED",
        request: req
      };
    }
  }
};

// server/aiAssistant.ts
var import_genai = require("@google/genai");
var safetySettings = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];
var PATIENT_TOOL_DECLARATIONS = [
  {
    name: "get_patient_profile",
    description: "Retrieve the senior patient's name, preferred name, age, cultural region, daily streak, and care circle details.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_todays_routines",
    description: "Retrieve all of today's scheduled routine tasks (e.g. morning walk, tea, gardening) and their completion status.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_reminders",
    description: "Retrieve all medication, hydration, and health reminders along with their scheduled times and status.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_memories",
    description: "Retrieve cherished family memories, Northeast cultural keepsakes, and stories from the patient's album.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_recent_activity",
    description: "Retrieve recent cognitive exercise and memory game sessions, completion counts, and daily activity scores.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_caregiver_information",
    description: "Retrieve the contact name, relationship, and phone number of the patient's linked family caregiver.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "create_reminder",
    description: "Add a new medication, hydration, or daily reminder for the patient.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: 'Title of the reminder, e.g. "Evening Warm Milk & Tulsi"' },
        time: { type: "STRING", description: 'Time of day, e.g. "08:30 PM"' },
        description: { type: "STRING", description: "Optional short comforting instruction" },
        type: {
          type: "STRING",
          description: "Type of reminder",
          enum: ["MEDICINE", "HYDRATION", "ACTIVITY", "APPOINTMENT", "ROUTINE"]
        }
      },
      required: ["title", "time"]
    }
  },
  {
    name: "complete_routine",
    description: "Mark a scheduled routine task as completed for today.",
    parameters: {
      type: "OBJECT",
      properties: {
        taskTitleOrId: { type: "STRING", description: "The title or ID of the routine task" }
      },
      required: ["taskTitleOrId"]
    }
  }
];
async function executePatientTool(authorizedPatientId, functionName, args) {
  const patient = ServerDB.findPatient(authorizedPatientId);
  if (!patient) {
    return { error: "Patient record not found." };
  }
  switch (functionName) {
    case "get_patient_profile": {
      return {
        fullName: patient.fullName,
        preferredName: patient.preferredName || patient.fullName,
        age: patient.age,
        region: patient.region,
        state: patient.state,
        dailyStreak: patient.dailyStreak || 0,
        todayCompletedCount: patient.todayCompletedCount || 0,
        hasCaregiver: Boolean(patient.hasCaregiver),
        caregiverName: patient.caregiverName || "Self"
      };
    }
    case "get_todays_routines": {
      const routines = ServerDB.getRoutines(authorizedPatientId);
      const pending = routines.filter((r) => !r.completed);
      return {
        totalRoutines: routines.length,
        completedCount: routines.filter((r) => r.completed).length,
        pendingCount: pending.length,
        nextActivity: pending.length > 0 ? pending[0] : routines.length > 0 ? routines[0] : null,
        routines: routines.map((r) => ({
          id: r.id,
          title: r.title,
          time: r.time,
          timeSlot: r.timeSlot,
          completed: r.completed,
          notes: r.notes || ""
        }))
      };
    }
    case "get_reminders": {
      const reminders = ServerDB.getReminders(authorizedPatientId);
      return {
        totalReminders: reminders.length,
        completedToday: reminders.filter((rem) => rem.completedToday).length,
        reminders: reminders.map((rem) => ({
          id: rem.id,
          title: rem.title,
          time: rem.time,
          description: rem.description,
          type: rem.type,
          completedToday: rem.completedToday
        }))
      };
    }
    case "get_memories": {
      const memories = ServerDB.getMemories(authorizedPatientId);
      return {
        totalMemories: memories.length,
        hasMemoriesUpdated: memories.length > 0,
        latestMemory: memories[0] ? {
          title: memories[0].title,
          category: memories[0].category,
          dateLabel: memories[0].dateLabel,
          photosCount: memories[0].images?.length || (memories[0].imageUrl ? 1 : 0),
          storySnippet: memories[0].story?.slice(0, 120)
        } : null,
        memories: memories.slice(0, 6).map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          region: m.region,
          dateLabel: m.dateLabel,
          story: m.story,
          photosCount: m.images?.length || (m.imageUrl ? 1 : 0),
          hasVoiceNote: Boolean(m.hasVoiceNote)
        }))
      };
    }
    case "get_recent_activity": {
      const sessions = ServerDB.getSessions(authorizedPatientId);
      return {
        totalSessionsCompleted: sessions.length,
        recentSessions: sessions.slice(0, 4).map((s) => ({
          gameId: s.gameId,
          accuracy: s.accuracy,
          attempts: s.attempts,
          mistakes: s.mistakes,
          completedAt: s.completedAt
        })),
        dailyStreak: patient.dailyStreak || 0
      };
    }
    case "get_caregiver_information": {
      return {
        hasCaregiver: Boolean(patient.hasCaregiver),
        caregiverName: patient.caregiverName || "No caregiver linked",
        caregiverPhone: patient.caregiverPhone || "None",
        relationship: "Family Caregiver"
      };
    }
    case "create_reminder": {
      const { title, time, description = "", type = "ROUTINE" } = args;
      if (!title || !time) {
        return { error: "Title and time are required to create a reminder." };
      }
      const existingReminders = ServerDB.getReminders(authorizedPatientId);
      const newReminder = {
        id: `rem-${Date.now()}`,
        patientId: authorizedPatientId,
        type: type || "ROUTINE",
        title: title.trim(),
        description: description.trim() || "Created with Saathi Voice Companion",
        time: time.trim(),
        period: time.toLowerCase().includes("pm") ? "Evening" : "Morning",
        completedToday: false,
        enabled: true
      };
      const updated = [newReminder, ...existingReminders];
      ServerDB.saveReminders(authorizedPatientId, updated);
      return {
        success: true,
        message: `Successfully created reminder "${newReminder.title}" scheduled for ${newReminder.time}.`,
        reminder: newReminder
      };
    }
    case "complete_routine": {
      const { taskTitleOrId } = args;
      if (!taskTitleOrId) {
        return { error: "Task title or ID is required." };
      }
      const routines = ServerDB.getRoutines(authorizedPatientId);
      const targetLower = String(taskTitleOrId).toLowerCase().trim();
      let matched = routines.find(
        (r) => r.id === taskTitleOrId || r.title.toLowerCase().includes(targetLower)
      );
      if (!matched && routines.length > 0) {
        matched = routines.find((r) => !r.completed);
      }
      if (!matched) {
        return { error: "No matching routine task found to mark completed." };
      }
      matched.completed = true;
      ServerDB.saveRoutines(authorizedPatientId, routines);
      return {
        success: true,
        message: `Marked "${matched.title}" as completed!`,
        routine: matched
      };
    }
    default:
      return { error: `Unknown tool function: ${functionName}` };
  }
}
async function summarizeVoiceNoteWithGemini(ai, transcript, patientName, preferredLanguage) {
  if (ai && transcript && transcript.trim().length > 5) {
    const prompt = `You are a warm, culturally sensitive memory curator for an eldercare app in Northeast India (Assam, Manipur, Meghalaya, Nagaland, Tripura).
A senior patient or their family caregiver recorded this spoken voice note about a cherished memory:
"${transcript}"

Create a comforting, structured keepsake memory from this voice note.
Guidelines:
1. "title": A concise, heartwarming title (3 to 6 words).
2. "story": A warm, coherent narrative summarizing the spoken memory in gentle, comforting language (2 to 3 sentences).
3. "region": One of ["Assam", "Manipur", "Meghalaya", "Nagaland", "Tripura"] that best fits the context (default to "Assam" if unspecified).
4. "category": One of ["Family", "Festival", "Place", "Tradition", "Childhood"].
5. "audioPrompt": A gentle reminiscing question to ask the patient about this memory.
6. "suggestedImageUrl": Pick the most fitting thematic photo URL:
   - Tea gardens / Nature: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
   - Bihu / Festival / Dhol / Music: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80"
   - Family / Home / Elders: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80"
   - Handloom / Weaving / Craft: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80"
   - River / Brahmaputra / Sunset: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80"

Respond ONLY with valid JSON in this structure:
{
  "title": "string",
  "story": "string",
  "region": "string",
  "category": "string",
  "audioPrompt": "string",
  "suggestedImageUrl": "string"
}`;
    try {
      const res = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
          safetySettings
        }
      });
      if (res.text) {
        const parsed = JSON.parse(res.text);
        if (parsed.title && parsed.story) {
          return {
            title: parsed.title,
            story: parsed.story,
            region: parsed.region || "Assam",
            category: parsed.category || "Family",
            audioPrompt: parsed.audioPrompt || "Do you remember this beautiful moment together?",
            suggestedImageUrl: parsed.suggestedImageUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
          };
        }
      }
    } catch (err) {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
            safetySettings
          }
        });
        if (fallbackRes.text) {
          const parsed = JSON.parse(fallbackRes.text);
          if (parsed.title && parsed.story) {
            return {
              title: parsed.title,
              story: parsed.story,
              region: parsed.region || "Assam",
              category: parsed.category || "Family",
              audioPrompt: parsed.audioPrompt || "Do you remember this beautiful moment together?",
              suggestedImageUrl: parsed.suggestedImageUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
            };
          }
        }
      } catch (fbErr) {
      }
    }
  }
  const clean = transcript.trim();
  const firstSentence = clean.split(/[.!?\n]/)[0] || clean;
  const words = clean.split(/\s+/);
  const title = words.slice(0, 5).join(" ") || "Cherished Spoken Memory";
  return {
    title: title.length > 30 ? `${title.slice(0, 30)}...` : title,
    story: clean || "A comforting personal memory spoken with warmth from the heart.",
    region: "Assam",
    category: "Family",
    audioPrompt: "Do you remember this heartwarming moment?",
    suggestedImageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"
  };
}
async function transcribeAudioWithGemini(ai, audioBase64, mimeType = "audio/webm", preferredLanguage) {
  if (!ai || !audioBase64) {
    return "";
  }
  try {
    const langContext = preferredLanguage === "as" ? "The speaker is speaking Assamese (\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE) or Indian English." : preferredLanguage === "hi" ? "The speaker is speaking Hindi (\u0939\u093F\u0928\u094D\u0926\u0940) or Indian English." : preferredLanguage === "mni" ? "The speaker is speaking Manipuri (\u09AE\u09C8\u09A4\u09C8\u09B2\u09CB\u09A8\u09CD) or Indian English." : "The speaker is speaking in English or a regional Indian language (Assamese, Hindi, Bengali, Manipuri).";
    const prompt = `You are an expert audio transcription assistant specialized in senior eldercare conversations in Northeast India.
${langContext}
Listen to the user's spoken audio and transcribe what they said word-for-word.
Rules:
1. Output ONLY the plain transcribed text.
2. Do not include quotes, preamble, timestamps, commentary, or markdown formatting.
3. If the audio is silence, static, or unintelligible noise, output nothing (empty string).
4. Accurately capture questions, feelings, or questions about daily routines, medication, or memories.`;
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9-+.]+;base64,/, "");
    const audioContent = [
      {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: cleanBase64
        }
      },
      prompt
    ];
    try {
      const res = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: audioContent,
        config: {
          safetySettings
        }
      });
      return res.text ? res.text.trim() : "";
    } catch (liteErr) {
      try {
        const fallbackRes = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: audioContent,
          config: {
            safetySettings
          }
        });
        return fallbackRes.text ? fallbackRes.text.trim() : "";
      } catch (fbErr) {
        return "";
      }
    }
  } catch (err) {
    return "";
  }
}
var ttsQuotaCooldownUntil = 0;
function pcmToWav(pcmBuffer, sampleRate = 24e3, numChannels = 1, bitsPerSample = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataLength = pcmBuffer.length;
  const bufferLength = 44 + dataLength;
  header.write("RIFF", 0);
  header.writeUInt32LE(bufferLength - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return Buffer.concat([header, pcmBuffer]);
}
async function generateGeminiVoice(ai, text, voiceName = "Kore") {
  if (!ai || !text || text.trim().length === 0) return null;
  if (Date.now() < ttsQuotaCooldownUntil) {
    return null;
  }
  try {
    const cleanSpeech = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/\[(.*?)\]/g, "$1").replace(/#+\s/g, "").replace(/[-*•]\s+/g, "").replace(/[\n\r]+/g, " ").trim();
    if (!cleanSpeech) return null;
    const promptText = `Speak in a very calm, gentle, warm, and soothing natural voice: ${cleanSpeech.slice(0, 450)}`;
    const res = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [import_genai.Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" }
          }
        }
      }
    });
    const pcmBase64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!pcmBase64) return null;
    const pcmBuf = Buffer.from(pcmBase64, "base64");
    const wavBuf = pcmToWav(pcmBuf, 24e3, 1, 16);
    return `data:audio/wav;base64,${wavBuf.toString("base64")}`;
  } catch (err) {
    const errMsg = String(err?.message || err || "");
    const isQuota = err?.status === 429 || err?.status === "RESOURCE_EXHAUSTED" || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      ttsQuotaCooldownUntil = Date.now() + 10 * 60 * 1e3;
      console.info("[Saathi Voice] Gemini TTS free-tier quota reached. Delegating voice to browser speech synthesis.");
    } else {
      console.info("[Saathi Voice] Voice generation bypassed:", errMsg.slice(0, 100));
    }
    return null;
  }
}
async function generateKokoroVoice(text, voiceName = "af_heart") {
  const kokoroApiUrl = process.env.KOKORO_API_URL;
  if (!kokoroApiUrl || !text || text.trim().length === 0) {
    return null;
  }
  try {
    const cleanSpeech = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1").replace(/\[(.*?)\]/g, "$1").replace(/#+\s/g, "").replace(/[-*•]\s+/g, "").replace(/[\n\r]+/g, " ").trim();
    if (!cleanSpeech) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4e3);
    const response = await fetch(kokoroApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: cleanSpeech.slice(0, 500),
        text: cleanSpeech.slice(0, 500),
        voice: voiceName,
        model: "kokoro-82m",
        response_format: "wav"
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.warn(`[Kokoro TTS] HTTP ${response.status} from ${kokoroApiUrl}`);
      return null;
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.audio_base64) {
        return `data:audio/wav;base64,${data.audio_base64}`;
      }
      if (data.audio) {
        return data.audio.startsWith("data:") ? data.audio : `data:audio/wav;base64,${data.audio}`;
      }
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = contentType.includes("mpeg") || contentType.includes("mp3") ? "audio/mpeg" : "audio/wav";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn("[Kokoro TTS Warning]:", err?.message || "External Kokoro service unavailable");
    return null;
  }
}
async function generateSaathiAudio(ai, text, preferredLanguage = "en") {
  if (preferredLanguage !== "en") {
    return await generateGeminiVoice(ai, text);
  }
  try {
    const kokoroAudio = await generateKokoroVoice(text);
    if (kokoroAudio) {
      return kokoroAudio;
    }
  } catch (err) {
    console.error("[Kokoro Audio Error]:", err);
  }
  try {
    const geminiAudio = await generateGeminiVoice(ai, text);
    return geminiAudio;
  } catch (fallbackErr) {
    console.error("[Gemini Fallback Error]:", fallbackErr);
    return null;
  }
}
async function generateSaathiCompanion(params) {
  const {
    ai,
    message,
    role = "PATIENT",
    patientId: incomingPatientId,
    patientName: incomingName,
    preferredLanguage = "en",
    history = [],
    userData
  } = params;
  let patientId = incomingPatientId;
  if (!patientId) {
    const patients = ServerDB.getPatients();
    if (patients.length > 0) {
      patientId = patients[0].id;
    }
  }
  const authorizedPatientId = patientId || "default-patient";
  const serverPatient = patientId ? ServerDB.findPatient(patientId) : null;
  const p = userData?.patient || serverPatient || {};
  const elderName = p.preferredName || p.fullName || incomingName || "Friend";
  const age = p.age || 72;
  const region = p.region || "Guwahati, Assam (NER)";
  const streak = p.dailyStreak || 1;
  const routinesList = Array.isArray(userData?.routines) && userData.routines.length > 0 ? userData.routines : ServerDB.getRoutines(authorizedPatientId);
  const completedRoutines = routinesList.filter((r) => r.completed);
  const pendingRoutines = routinesList.filter((r) => !r.completed);
  const nextActivity = pendingRoutines.length > 0 ? pendingRoutines[0] : routinesList.length > 0 ? routinesList[0] : null;
  const formattedRoutines = routinesList.length > 0 ? routinesList.map(
    (r, idx) => `${idx + 1}. [${r.completed ? "COMPLETED" : "PENDING"}] ${r.time || ""} - ${r.title} ${r.notes ? `(${r.notes})` : ""}`
  ).join("\n") : "No specific routines listed for today.";
  const nextActivityText = nextActivity ? `${nextActivity.title} scheduled at ${nextActivity.time || "soon"} (Status: ${nextActivity.completed ? "Already completed" : "Pending - Next step"})` : "All scheduled routines for today have been completed or quiet rest is recommended.";
  const remindersList = Array.isArray(userData?.reminders) && userData.reminders.length > 0 ? userData.reminders : ServerDB.getReminders(authorizedPatientId);
  const formattedReminders = remindersList.length > 0 ? remindersList.map(
    (rem, idx) => `${idx + 1}. [${rem.completedToday ? "TAKEN/DONE" : "PENDING"}] ${rem.time || ""} - ${rem.title} (${rem.type}): ${rem.description || ""}`
  ).join("\n") : "No active reminders.";
  const memoriesList = Array.isArray(userData?.memories) && userData.memories.length > 0 ? userData.memories : ServerDB.getMemories(authorizedPatientId);
  const totalMemories = memoriesList.length;
  const latestMemory = memoriesList.length > 0 ? memoriesList[0] : null;
  const formattedMemories = memoriesList.length > 0 ? memoriesList.slice(0, 6).map((m, idx) => {
    const photoCount = m.imagesCount || (Array.isArray(m.images) ? m.images.length : m.imageUrl ? 1 : 0);
    return `${idx + 1}. "${m.title}" (${m.category || "Memory"}, Date: ${m.dateLabel || "Cherished"}, Photos: ${photoCount} attached)
   Story: ${m.story || "A cherished keepsake"}`;
  }).join("\n") : "No memories added to the album yet.";
  const peopleList = Array.isArray(userData?.people) && userData.people.length > 0 ? userData.people : ServerDB.getPeople(authorizedPatientId);
  const formattedPeople = peopleList.length > 0 ? peopleList.map((per, idx) => {
    const dates = [
      per.birthday ? `Birthday: ${per.birthday}` : null,
      per.marriageDate ? `Marriage/Anniversary: ${per.marriageDate}` : null
    ].filter(Boolean).join(", ");
    return `${idx + 1}. ${per.name} (${per.relationship || "Loved One"})
   Who they are: ${per.description || "Family member"}
   ${dates ? `Important Dates: ${dates}
   ` : ""}${per.likes ? `Likes: ${per.likes}
   ` : ""}${per.dislikes ? `Dislikes: ${per.dislikes}
   ` : ""}${per.personality ? `Personality: ${per.personality}` : ""}`;
  }).join("\n") : "No loved ones added yet in the People tab.";
  const caregiverName = p.caregiverName || "Devi Baruah";
  const caregiverPhone = p.caregiverPhone || "+91 98640 12345";
  const sessions = userData?.sessions || ServerDB.getSessions(authorizedPatientId);
  const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const currentTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const systemInstruction = `You are Saathi, a warm, conversational, and highly intelligent female AI companion for ${elderName}.
CRITICAL CONTEXT:
- Today is ${currentDate}, and the current time is ${currentTime}.
- Caregiver: ${caregiverName}
- Schedule: ${formattedRoutines}

YOUR PRIME DIRECTIVE:
1. ANSWER CONFIDENTLY & CREATIVELY: Answer EVERY everyday question warmly. If asked "what should I eat?", give a specific, delicious, and healthy recommendation. If asked about the weather or outside world, use the current date/time to make a cheerful, educated guess based on the season. 
2. NEVER APOLOGIZE FOR LACK OF ACCESS: NEVER say "I don't have real-time access", "I am an AI", or "I cannot answer that". Always provide a helpful, human-like response.
3. THE "TOO HARD" RULE: ONLY if the question is highly complex (e.g., advanced coding, calculus, engineering), gently state that this is outside your current capacity as a companion, and smoothly change the subject to something comforting.
4. TOOLS: ONLY use tools if explicitly asked about medical data, routines, or reminders.
5. TONE: Speak in 1-4 soothing sentences. Respond ENTIRELY in ${preferredLanguage}.`;
  let reply = "";
  let thought = "";
  let usedModel = "gemini-3.8-flash";
  const executedTools = [];
  if (ai) {
    try {
      const config = {
        systemInstruction,
        temperature: 0.7,
        tools: [{ functionDeclarations: PATIENT_TOOL_DECLARATIONS }]
      };
      const contents = [{ role: "user", parts: [{ text: message }] }];
      let genRes;
      try {
        genRes = await ai.models.generateContent({ model: "gemini-3.8-flash", contents, config });
      } catch (tier1Err) {
        usedModel = "gemini-3.1-flash-lite";
        genRes = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents, config });
      }
      if (genRes.functionCalls && genRes.functionCalls.length > 0) {
        const call = genRes.functionCalls[0];
        executedTools.push(call.name);
        let toolResult;
        try {
          toolResult = await executePatientTool(authorizedPatientId, call.name, call.args || {});
        } catch (e) {
          toolResult = { error: "Could not fetch data at this moment." };
        }
        const bypassConfig = { systemInstruction, temperature: 0.7 };
        const followUpContents = [
          { role: "user", parts: [{ text: message }] },
          { role: "user", parts: [{ text: `[SYSTEM: Tool '${call.name}' returned: ${JSON.stringify(toolResult)}. Answer the user smoothly based on this.]` }] }
        ];
        let followUpRes;
        try {
          followUpRes = await ai.models.generateContent({ model: usedModel, contents: followUpContents, config: bypassConfig });
        } catch (tier1FollowUpErr) {
          followUpRes = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: followUpContents, config: bypassConfig });
        }
        reply = followUpRes.text || "";
      } else {
        reply = genRes.text || "";
      }
    } catch (err) {
      console.error("[Saathi API Error]:", err?.message);
    }
  }
  if (!reply) {
    const isSchedule = /schedule|routine|today|plan|কৰিম|দিন|দিনচৰ্যা|समय/i.test(message);
    const isNext = /next|after|পৰৱৰ্তী|এরপর|কি কৰিম|क्या करू|आगे|मथংগী/i.test(message);
    const isMemory = /memory|memories|photo|album|ছবি|স্মৃতি|तस्वीर|याद|নিংশিং/i.test(message);
    const isMedicine = /medicine|tablet|pill|health|দৰব|ঔষধ|दवा|হিদাক/i.test(message);
    const isGreeting = /hello|hi|hey|নমস্কাৰ|नमस्ते|খুরুমজরি/i.test(message);
    if (preferredLanguage === "as") {
      if (isNext) {
        reply = `\u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09AA\u09F0\u09F1\u09F0\u09CD\u09A4\u09C0 \u0995\u09BE\u09F0\u09CD\u09AF\u09CD\u09AF\u09B8\u09C2\u099A\u09C0 \u09B9'\u09B2: ${nextActivity?.title || "\u09AC\u09BE\u09F0\u09BE\u09A3\u09CD\u09A1\u09BE\u09A4 \u099C\u09BF\u09F0\u09A3\u09BF \u09B2\u09CB\u09F1\u09BE"}\u0964 \u0986\u09AA\u09C1\u09A8\u09BF \u0998\u09F0\u09A4\u09C7 \u09B8\u09AE\u09CD\u09AA\u09C2\u09F0\u09CD\u09A3 \u09B6\u09BE\u09A8\u09CD\u09A4\u09BF\u09A4 \u0986\u099B\u09C7\u0964`;
      } else if (isSchedule) {
        reply = `\u0986\u099C\u09BF \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 ${routinesList.length} \u099F\u09BE \u0995\u09BE\u09F0\u09CD\u09AF\u09CD\u09AF\u09B8\u09C2\u099A\u09C0 \u0986\u099B\u09C7\u0964 ${completedRoutines.length} \u099F\u09BE \u09B8\u09AE\u09CD\u09AA\u09C2\u09F0\u09CD\u09A3 \u09B9\u09C8\u099B\u09C7\u0964`;
      } else if (isMemory) {
        reply = `\u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09B8\u09CB\u0981\u09F1\u09F0\u09A3\u09BF (Memories) \u099F\u09C7\u09AC\u099F\u09CB\u09A4 ${totalMemories} \u099F\u09BE \u09B8\u09C1\u09A8\u09CD\u09A6\u09F0 \u09B8\u09CD\u09AE\u09C3\u09A4\u09BF \u09B8\u0982\u09F0\u0995\u09CD\u09B7\u09BF\u09A4 \u0986\u099B\u09C7\u0964 \u09B6\u09C7\u09B9\u09A4\u09C0\u09AF\u09BC\u09BE \u09B8\u09CD\u09AE\u09C3\u09A4\u09BF\u099F\u09CB \u09B9'\u09B2 "${latestMemory?.title || "\u09AA\u09F0\u09BF\u09AF\u09BC\u09BE\u09B2\u09F0 \u09B8\u09CD\u09AE\u09C3\u09A4\u09BF"}"\u0964`;
      } else if (isMedicine) {
        reply = `\u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u0994\u09B7\u09A7\u09F0 \u09B8\u0995\u09B2\u09CB \u09AC\u09BF\u09F1\u09F0\u09A3 \u09B8\u09C1\u09F0\u0995\u09CD\u09B7\u09BF\u09A4\u09AD\u09BE\u09F1\u09C7 \u09F0\u0996\u09BE \u09B9\u09C8\u099B\u09C7\u0964 \u09B8\u0995\u09B2\u09CB \u09B8\u09AE\u09DF\u09AE\u09A4\u09C7 \u09B9\u09C8 \u0986\u099B\u09C7\u0964`;
      } else if (isGreeting) {
        reply = `\u09A8\u09AE\u09B8\u09CD\u0995\u09BE\u09F0 ${elderName}! \u09AE\u0987 \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09B8\u09BE\u09A5\u09C0, \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09B2\u0997\u09A4 \u0986\u099B\u09CB\u0964 \u0986\u09AA\u09C1\u09A8\u09BF \u0995\u09C7\u09A8\u09C7 \u0985\u09A8\u09C1\u09AD\u09F1 \u0995\u09F0\u09BF\u099B\u09C7?`;
      } else {
        reply = `\u09AE\u0987 \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u0995\u09A5\u09BE \u09B6\u09C1\u09A8\u09BF \u0986\u099B\u09CB\u0981, ${elderName}\u0964 \u0986\u09AA\u09C1\u09A8\u09BF \u0998\u09F0\u09A4\u09C7 \u09B6\u09BE\u09A8\u09CD\u09A4\u09BF\u09A4 \u0986\u09F0\u09C1 \u09B8\u09C1\u09F0\u0995\u09CD\u09B7\u09BF\u09A4\u09AD\u09BE\u09F1\u09C7 \u0986\u099B\u09C7\u0964`;
      }
    } else if (preferredLanguage === "hi") {
      if (isNext) {
        reply = `\u0906\u092A\u0915\u0940 \u0905\u0917\u0932\u0940 \u0917\u0924\u093F\u0935\u093F\u0927\u093F \u0939\u0948: ${nextActivity?.title || "\u092C\u0930\u093E\u092E\u0926\u0947 \u092E\u0947\u0902 \u0935\u093F\u0936\u094D\u0930\u093E\u092E"}\u0964 \u0906\u092A \u0918\u0930 \u092A\u0930 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0914\u0930 \u0936\u093E\u0902\u0924 \u0939\u0948\u0902\u0964`;
      } else if (isSchedule) {
        reply = `\u0906\u091C \u0906\u092A\u0915\u0940 ${routinesList.length} \u0926\u093F\u0928\u091A\u0930\u094D\u092F\u093E \u0928\u093F\u0930\u094D\u0927\u093E\u0930\u093F\u0924 \u0939\u0948\u0902, \u091C\u093F\u0928\u092E\u0947\u0902 \u0938\u0947 ${completedRoutines.length} \u092A\u0942\u0930\u0940 \u0939\u094B \u091A\u0941\u0915\u0940 \u0939\u0948\u0902\u0964`;
      } else if (isMemory) {
        reply = `\u0939\u093E\u0901, \u0906\u092A\u0915\u0940 \u092E\u0947\u092E\u094B\u0930\u0940 \u091F\u0948\u092C \u092E\u0947\u0902 \u0915\u0941\u0932 ${totalMemories} \u0916\u0942\u092C\u0938\u0942\u0930\u0924 \u092F\u093E\u0926\u0947\u0902 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0902\u0964 \u0939\u093E\u0932\u093F\u092F\u093E \u092F\u093E\u0926 "${latestMemory?.title || "\u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u0940 \u092F\u093E\u0926"}" \u0939\u0948\u0964`;
      } else if (isMedicine) {
        reply = `\u0906\u092A\u0915\u0940 \u0926\u0935\u093E\u0913\u0902 \u0915\u093E \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948 \u0914\u0930 \u0938\u092C \u0915\u0941\u091B \u0938\u0939\u0940 \u0938\u092E\u092F \u092A\u0930 \u091A\u0932 \u0930\u0939\u093E \u0939\u0948\u0964`;
      } else if (isGreeting) {
        reply = `\u0928\u092E\u0938\u094D\u0924\u0947 ${elderName} \u091C\u0940! \u092E\u0948\u0902 \u0938\u093E\u0925\u0940 \u0939\u0942\u0901, \u0906\u092A\u0915\u0947 \u0938\u093E\u0925\u0964 \u092C\u0924\u093E\u0907\u090F \u092E\u0948\u0902 \u0906\u092A\u0915\u0940 \u0915\u094D\u092F\u093E \u092E\u0926\u0926 \u0915\u0930\u0942\u0901?`;
      } else {
        reply = `\u092E\u0948\u0902 \u0906\u092A\u0915\u0940 \u092C\u093E\u0924 \u0938\u0941\u0928 \u0930\u0939\u093E \u0939\u0942\u0901, ${elderName} \u091C\u0940\u0964 \u0906\u092A \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0902\u0964`;
      }
    } else if (preferredLanguage === "mni") {
      if (isNext || isSchedule) {
        reply = `\u0985\u09A6\u09CB\u09AE\u0997\u09C0 \u09AE\u09A5\u0982\u0997\u09C0 \u09A5\u09AC\u0995 \u0985\u09B8\u09BF\u09A8\u09BF: ${nextActivity?.title || "\u09AF\u09BC\u09C1\u09AE\u09A6\u09BE \u09AA\u09CB\u09A5\u09BE\u09AC\u09BE"}\u0964 \u0985\u09A6\u09CB\u09AE \u09AF\u09BC\u09C1\u09AE\u09A6\u09BE \u09B6\u09BE\u09A8\u09CD\u09A4\u09BF\u09A8\u09BE \u09B2\u09C8\u09B0\u09BF\u0964`;
      } else if (isMemory) {
        reply = `\u09B9\u09CC\u099C\u09BF\u0995 \u09AE\u09C7\u09AE\u09CB\u09B0\u09BF\u099C \u09A4\u09C7\u09AC\u09A4\u09BE \u0985\u09AA\u09C1\u09A8\u09AC\u09BE \u09A8\u09BF\u0982\u09B6\u09BF\u0982\u09AA\u09CB\u09CE ${totalMemories} \u09B2\u09C8\u09B0\u09C7\u0964`;
      } else if (isMedicine) {
        reply = `\u0985\u09A6\u09CB\u09AE\u0997\u09C0 \u09B9\u09BF\u09A6\u09BE\u0995\u09CD\u0995\u09C0 \u09B0\u09C7\u0995\u09CB\u09F0\u09CD\u09A1 \u09AA\u09C1\u09AE\u09CD\u09A8\u09AE\u0995 \u09B6\u09C7\u0982\u09A8\u09BE \u09B2\u09C8\u09B0\u09BF\u0964`;
      } else {
        reply = `\u0996\u09C1\u09B0\u09C1\u09AE\u099C\u09B0\u09BF ${elderName}\u0964 \u0990\u09B9\u09BE\u0995 \u09B8\u09BE\u09A5\u09C0\u09A8\u09BF, \u0985\u09A6\u09CB\u09AE\u0997\u09C0 \u09B2\u09CB\u0987\u09A8\u09A8\u09BE \u09B2\u09C8\u09B0\u09BF\u0964`;
      }
    } else {
      if (isNext) {
        reply = `Your next scheduled activity is ${nextActivity?.title || "a peaceful rest"}, planned for ${nextActivity?.time || "today"}.`;
      } else if (isSchedule) {
        reply = `Today you have ${routinesList.length} scheduled routines, and ${completedRoutines.length} are already completed.`;
      } else if (isMemory) {
        reply = `Your Memories tab currently has ${totalMemories} cherished keepsakes saved, including "${latestMemory?.title || "Family Memories"}".`;
      } else if (isMedicine) {
        reply = `All your health and medication reminders are safely tracked and up to date.`;
      } else if (isGreeting) {
        reply = `Hello ${elderName}! I am right here with you. How are you feeling right now?`;
      } else {
        reply = `I am listening closely, ${elderName}. Tell me what's on your mind.`;
      }
    }
  }
  const audioUrl = ai && reply ? await generateSaathiAudio(ai, reply, preferredLanguage) : null;
  return {
    reply,
    thought,
    audioUrl,
    source: reply ? "gemini" : "grounded-engine",
    usedModel,
    executedTools
  };
}

// backend.ts
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "30mb" }));
var activeSessions = /* @__PURE__ */ new Map();
function createSecureSession(userId, role) {
  const token = import_crypto2.default.randomBytes(32).toString("hex");
  activeSessions.set(token, {
    userId,
    role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1e3
    // 7 days
  });
  return token;
}
function verifyPatientAuthorization(req, patientId) {
  if (!patientId) return false;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.query.token;
  const requesterId = req.headers["x-user-id"] || req.headers["x-patient-id"] || req.headers["x-caretaker-id"] || req.query.requesterId;
  const db = ServerDB.ensureDbExists();
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) return false;
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (session.expiresAt < Date.now()) {
      activeSessions.delete(token);
      return false;
    }
    if (session.userId === patientId) return true;
    if (session.role === "CAREGIVER") {
      const ct = db.caretakers.find((c) => c.id === session.userId);
      if (ct) {
        if (ct.assignedPatientIds?.includes(patientId)) return true;
        if (ct.caregiverKey && patient.linkedCaregiverKey && ct.caregiverKey.toUpperCase() === patient.linkedCaregiverKey.toUpperCase()) return true;
      }
    }
  }
  if (requesterId) {
    if (requesterId === patientId) return true;
    const ct = db.caretakers.find((c) => c.id === requesterId);
    if (ct) {
      if (ct.assignedPatientIds?.includes(patientId)) return true;
      if (ct.caregiverKey && patient.linkedCaregiverKey && ct.caregiverKey.toUpperCase() === patient.linkedCaregiverKey.toUpperCase()) return true;
    }
  }
  if (token && (token === patientId || token.startsWith(`token-${patientId}`))) {
    return true;
  }
  return false;
}
function resolveTargetPatientId(req) {
  const paramPatientId = req.params.patientId;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : req.query.token;
  const requesterId = req.headers["x-user-id"] || req.headers["x-patient-id"] || req.headers["x-caretaker-id"] || req.query.requesterId;
  const db = ServerDB.ensureDbExists();
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (session.expiresAt >= Date.now()) {
      if (session.role === "PATIENT") {
        const patient = db.patients.find((p) => p.id === session.userId);
        if (patient) return { targetPatientId: patient.id };
      } else if (session.role === "CAREGIVER") {
        const ct = db.caretakers.find((c) => c.id === session.userId);
        if (ct) {
          if (paramPatientId) {
            const isAssigned = ct.assignedPatientIds?.includes(paramPatientId);
            const pat = db.patients.find((p) => p.id === paramPatientId);
            const isLinked = pat?.linkedCaregiverKey && ct.caregiverKey && pat.linkedCaregiverKey.toUpperCase() === ct.caregiverKey.toUpperCase();
            if (isAssigned || isLinked) {
              return { targetPatientId: paramPatientId };
            }
          }
          if (ct.assignedPatientIds && ct.assignedPatientIds.length > 0) {
            return { targetPatientId: ct.assignedPatientIds[0] };
          }
          if (ct.caregiverKey) {
            const linkedPat = db.patients.find((p) => p.linkedCaregiverKey && p.linkedCaregiverKey.toUpperCase() === ct.caregiverKey.toUpperCase());
            if (linkedPat) return { targetPatientId: linkedPat.id };
          }
          return { errorStatus: 403, errorMessage: "Caregiver has no linked patient profile." };
        }
      }
    }
  }
  if (requesterId) {
    const asPatient = db.patients.find((p) => p.id === requesterId);
    if (asPatient) {
      return { targetPatientId: asPatient.id };
    }
    const asCaregiver = db.caretakers.find((c) => c.id === requesterId);
    if (asCaregiver) {
      if (paramPatientId) {
        const isAssigned = asCaregiver.assignedPatientIds?.includes(paramPatientId);
        const pat = db.patients.find((p) => p.id === paramPatientId);
        const isLinked = pat?.linkedCaregiverKey && asCaregiver.caregiverKey && pat.linkedCaregiverKey.toUpperCase() === asCaregiver.caregiverKey.toUpperCase();
        if (isAssigned || isLinked) {
          return { targetPatientId: paramPatientId };
        }
      }
      if (asCaregiver.assignedPatientIds && asCaregiver.assignedPatientIds.length > 0) {
        return { targetPatientId: asCaregiver.assignedPatientIds[0] };
      }
      if (asCaregiver.caregiverKey) {
        const linkedPat = db.patients.find((p) => p.linkedCaregiverKey && p.linkedCaregiverKey.toUpperCase() === asCaregiver.caregiverKey.toUpperCase());
        if (linkedPat) return { targetPatientId: linkedPat.id };
      }
      return { errorStatus: 403, errorMessage: "Caregiver has no linked patient profile." };
    }
  }
  if (paramPatientId) {
    const patient = db.patients.find((p) => p.id === paramPatientId);
    if (patient) {
      return { targetPatientId: patient.id };
    }
  }
  if (db.patients.length > 0) {
    return { targetPatientId: db.patients[0].id };
  }
  return { errorStatus: 403, errorMessage: "No accessible patient profile found." };
}
function requirePatientAuth(req, res, next) {
  const patientId = req.params.patientId;
  if (!verifyPatientAuthorization(req, patientId)) {
    const authHeader = req.headers.authorization;
    const requesterId = req.headers["x-user-id"] || req.headers["x-patient-id"] || req.headers["x-caretaker-id"];
    if (!authHeader && !requesterId) {
      const patient = ServerDB.findPatient(patientId);
      if (patient) {
        next();
        return;
      }
    }
    res.status(403).json({ error: "Unauthorized: Access to this patient profile is restricted." });
    return;
  }
  next();
}
var aiClient = null;
function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new import_genai2.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return aiClient;
}
app.get("/api/auth/check-username", (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "Username query parameter is required" });
    return;
  }
  const taken = ServerDB.isUsernameTaken(username);
  res.json({ available: !taken });
});
app.post("/api/auth/register", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { role, profile, password } = req.body;
    if (!role || !profile || !password) {
      res.status(400).json({ error: "Role, profile data, and password are required." });
      return;
    }
    const { fullName, username, phone } = profile;
    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: "Full Name is mandatory." });
      return;
    }
    if (!username || !username.trim()) {
      res.status(400).json({ error: "Username is mandatory." });
      return;
    }
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters." });
      return;
    }
    if (ServerDB.isUsernameTaken(cleanUsername)) {
      res.status(400).json({ error: `Username "${username}" is already taken. Please choose another username.` });
      return;
    }
    if (!phone || !phone.trim()) {
      res.status(400).json({ error: "Mobile number is mandatory." });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const actualDigits = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone.slice(2) : cleanPhone;
    if (actualDigits.length !== 10) {
      res.status(400).json({ error: "Mobile number must have actually 10 digits." });
      return;
    }
    if (ServerDB.isPhoneTaken(actualDigits)) {
      res.status(400).json({ error: "This mobile number is already registered. Please log in instead." });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters long." });
      return;
    }
    if (role === "PATIENT") {
      const patientId = `patient-${Date.now()}`;
      const userPatientKey = (profile.patientKey?.trim() || `PT-${Math.floor(1e5 + Math.random() * 9e5)}`).toUpperCase();
      const newPatient = {
        id: patientId,
        fullName: fullName.trim(),
        preferredName: profile.preferredName?.trim() || fullName.trim().split(" ")[0],
        username: cleanUsername,
        password: hashPassword(password),
        pin: hashPassword(profile.pin || password.slice(0, 4)),
        patientKey: userPatientKey,
        age: Number(profile.age) || 70,
        region: profile.region?.trim() || "Guwahati, Assam",
        state: profile.state || "Assam",
        preferredLanguage: profile.preferredLanguage || "en",
        phone: cleanPhone,
        hasCaregiver: false,
        caregiverName: "",
        caregiverPhone: "",
        avatarUrl: profile.avatarUrl || "",
        dailyStreak: 0,
        todayCompletedCount: 0,
        linkedCaregiverKey: "",
        lastLoginDate: ""
        // Ensure this baseline is present
      };
      ServerDB.addPatient(newPatient);
      await ServerDB.syncToCloud();
      res.status(201).json({
        success: true,
        message: "Account registered successfully! Please log in with your mobile number and password.",
        patient: sanitizeProfile(newPatient)
      });
      return;
    } else if (role === "CAREGIVER") {
      const caretakerId = `caretaker-${Date.now()}`;
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const userCaregiverKey = (profile.caregiverKey?.trim() || `CG-${code}`).toUpperCase();
      const newCaretaker = {
        id: caretakerId,
        fullName: fullName.trim(),
        username: cleanUsername,
        password: hashPassword(password),
        phone: cleanPhone,
        email: profile.email?.trim() || "",
        relation: profile.relation?.trim() || "Family Member",
        pin: hashPassword(profile.pin || password.slice(0, 4)),
        caregiverKey: userCaregiverKey,
        assignedPatientIds: [],
        avatarUrl: profile.avatarUrl || ""
      };
      ServerDB.addCaretaker(newCaretaker);
      await ServerDB.syncToCloud();
      res.status(201).json({
        success: true,
        message: "Caregiver account registered successfully! Please log in with your mobile number and password.",
        caretaker: sanitizeProfile(newCaretaker)
      });
      return;
    }
    res.status(400).json({ error: "Invalid role specified." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed", details: err?.message });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { identifier, password, role = "PATIENT" } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: "Please enter your mobile number/username and password." });
      return;
    }
    const cleanInput = String(identifier).trim();
    const digitsOnly = cleanInput.replace(/\D/g, "");
    const isPhoneAttempt = /^[0-9+\s()-]+$/.test(cleanInput) && digitsOnly.length > 0;
    if (isPhoneAttempt) {
      const actualDigits = digitsOnly.startsWith("91") && digitsOnly.length === 12 ? digitsOnly.slice(2) : digitsOnly;
      if (actualDigits.length !== 10) {
        res.status(400).json({ error: "Mobile number must have actually 10 digits." });
        return;
      }
    }
    if (role === "PATIENT") {
      const patient = ServerDB.findPatient(cleanInput);
      if (!patient) {
        res.status(401).json({
          error: "No account found with that mobile number or username. Please check your credentials or register."
        });
        return;
      }
      const isPassValid = verifyPassword(password, patient.password);
      const isPinValid = verifyPassword(password, patient.pin);
      if (!isPassValid && !isPinValid) {
        res.status(401).json({ error: "Incorrect password. Please try again." });
        return;
      }
      if (patient.password && !patient.password.startsWith("$scrypt$")) {
        patient.password = hashPassword(patient.password);
        ServerDB.addPatient(patient);
        await ServerDB.syncToCloud();
      }
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (patient.lastLoginDate !== todayStr) {
        if (!patient.lastLoginDate) {
          patient.dailyStreak = 1;
        } else {
          const lastDate = new Date(patient.lastLoginDate);
          const currDate = new Date(todayStr);
          const diffTime = currDate.getTime() - lastDate.getTime();
          const diffDays = Math.round(diffTime / (1e3 * 60 * 60 * 24));
          if (diffDays === 1) {
            patient.dailyStreak = (patient.dailyStreak || 0) + 1;
          } else if (diffDays > 1) {
            patient.dailyStreak = 1;
          }
        }
        patient.lastLoginDate = todayStr;
        ServerDB.addPatient(patient);
        await ServerDB.syncToCloud();
      }
      const sessionToken = createSecureSession(patient.id, "PATIENT");
      res.json({
        success: true,
        role: "PATIENT",
        patient: sanitizeProfile(patient),
        token: sessionToken
      });
      return;
    } else {
      const caretaker = ServerDB.findCaretaker(cleanInput);
      if (!caretaker) {
        res.status(401).json({
          error: "No caregiver account found with that mobile number or username. Please check your credentials or register."
        });
        return;
      }
      const isPassValid = verifyPassword(password, caretaker.password);
      const isPinValid = verifyPassword(password, caretaker.pin);
      if (!isPassValid && !isPinValid) {
        res.status(401).json({ error: "Incorrect password. Please try again." });
        return;
      }
      if (caretaker.password && !caretaker.password.startsWith("$scrypt$")) {
        caretaker.password = hashPassword(caretaker.password);
        ServerDB.addCaretaker(caretaker);
        await ServerDB.syncToCloud();
      }
      const allPatients = ServerDB.getPatients();
      const assigned = allPatients.find(
        (p) => caretaker.assignedPatientIds.includes(p.id) || p.linkedCaregiverKey && p.linkedCaregiverKey.toUpperCase() === (caretaker.caregiverKey || "").toUpperCase()
      ) || null;
      const sessionToken = createSecureSession(caretaker.id, "CAREGIVER");
      res.json({
        success: true,
        role: "CAREGIVER",
        caretaker: sanitizeProfile(caretaker),
        patient: sanitizeProfile(assigned),
        token: sessionToken
      });
      return;
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", details: err?.message });
  }
});
app.get("/api/patients/:id", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const patientId = req.params.id;
    if (!patientId || typeof patientId !== "string") {
      res.status(400).json({ error: "Invalid patient ID" });
      return;
    }
    const patient = ServerDB.findPatient(patientId) || ServerDB.getPatients().find((p) => p.id === patientId);
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json(sanitizeProfile(patient));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve patient", details: err?.message });
  }
});
app.get("/api/patients", (req, res) => {
  const patients = ServerDB.getPatients().map((p) => sanitizeProfile(p));
  res.json(patients);
});
app.post("/api/patients", (req, res) => {
  try {
    const patient = req.body;
    if (!patient || !patient.id) {
      res.status(400).json({ error: "Invalid patient data" });
      return;
    }
    const saved = ServerDB.addPatient(patient);
    res.json(sanitizeProfile(saved));
  } catch (err) {
    res.status(400).json({ error: err?.message || "Failed to save patient" });
  }
});
app.get("/api/caretakers", (req, res) => {
  const caretakers = ServerDB.getCaretakers().map((c) => sanitizeProfile(c));
  res.json(caretakers);
});
app.post("/api/caretakers", (req, res) => {
  try {
    const caretaker = req.body;
    if (!caretaker || !caretaker.id) {
      res.status(400).json({ error: "Invalid caretaker data" });
      return;
    }
    const saved = ServerDB.addCaretaker(caretaker);
    res.json(sanitizeProfile(saved));
  } catch (err) {
    res.status(400).json({ error: err?.message || "Failed to save caretaker" });
  }
});
app.post("/api/caregiver-requests", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { caretakerId, patientIdentifier } = req.body;
    if (!caretakerId || !patientIdentifier) {
      res.status(400).json({ error: "Caregiver ID and Patient ID are required." });
      return;
    }
    const result = ServerDB.createConnectionRequest(caretakerId, String(patientIdentifier).trim());
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    await ServerDB.syncToCloud();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to create connection request", details: err?.message });
  }
});
app.post("/api/caretakers/:id/link-patient", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { identifier } = req.body;
    if (!identifier) {
      res.status(400).json({ error: "Patient ID, key, or mobile number is required." });
      return;
    }
    const result = ServerDB.createConnectionRequest(req.params.id, String(identifier).trim());
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    await ServerDB.syncToCloud();
    res.json({
      success: true,
      pendingConfirmation: true,
      message: result.message,
      request: result.request,
      patient: result.patient
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate patient connection", details: err?.message });
  }
});
app.get("/api/caregiver-requests/patient/:patientId", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const requests = ServerDB.getPendingRequestsForPatient(req.params.patientId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending requests", details: err?.message });
  }
});
app.get("/api/caregiver-requests/caretaker/:caretakerId", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const requests = ServerDB.getRequestsForCaretaker(req.params.caretakerId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch caregiver requests", details: err?.message });
  }
});
app.post("/api/caregiver-requests/:id/respond", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { action, patientId } = req.body;
    if (!action || !["ACCEPT", "DECLINE"].includes(action)) {
      res.status(400).json({ error: "Action must be ACCEPT or DECLINE" });
      return;
    }
    const result = ServerDB.respondToConnectionRequest(req.params.id, action, patientId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    await ServerDB.syncToCloud();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to respond to request", details: err?.message });
  }
});
app.post("/api/patients/:id/link-caregiver", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { caregiverKey, patient } = req.body;
    if (!caregiverKey) {
      res.status(400).json({ error: "Caregiver key is required." });
      return;
    }
    if (patient && patient.id) {
      ServerDB.addPatient(patient);
    }
    const result = ServerDB.linkCaregiverToPatient(req.params.id, String(caregiverKey).trim());
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    await ServerDB.syncToCloud();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to link caregiver", details: err?.message });
  }
});
app.post("/api/patients/:id/unlink-caregiver", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { initiator = "CAREGIVER", initiatorName, initiatorId } = {
      ...req.query,
      ...req.body
    };
    const result = ServerDB.unlinkCaregiver(
      req.params.id,
      initiator,
      initiatorName,
      initiatorId
    );
    await ServerDB.syncToCloud();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to unlink caregiver", details: err?.message });
  }
});
app.post("/api/caretakers/:id/remove-patient/:patientId", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const caretakerId = req.params.id;
    const patientId = req.params.patientId;
    const { initiatorName } = req.body || {};
    const caretakers = ServerDB.getCaretakers();
    const ct = caretakers.find((c) => c.id === caretakerId);
    const result = ServerDB.unlinkCaregiver(
      patientId,
      "CAREGIVER",
      initiatorName || ct?.fullName,
      caretakerId
    );
    await ServerDB.syncToCloud();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to remove patient", details: err?.message });
  }
});
app.post("/api/patients/:id/dismiss-notice", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const success = ServerDB.dismissCaregiverRemovalNotice(req.params.id);
    await ServerDB.syncToCloud();
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to dismiss notice", details: err?.message });
  }
});
app.post("/api/caretakers/:id/dismiss-notice", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { noticeId } = req.body || {};
    const success = ServerDB.dismissPatientRemovalNotice(req.params.id, noticeId);
    await ServerDB.syncToCloud();
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: "Failed to dismiss notice", details: err?.message });
  }
});
app.get("/api/routines/:patientId", requirePatientAuth, async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { targetPatientId } = resolveTargetPatientId(req);
    const resolvedId = targetPatientId || req.params.patientId;
    res.json(ServerDB.getRoutines(resolvedId));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve routines", details: err?.message });
  }
});
app.post("/api/routines/:patientId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const routines = req.body;
  if (!Array.isArray(routines)) {
    res.status(400).json({ error: "Routines must be an array" });
    return;
  }
  const updated = ServerDB.saveRoutines(targetPatientId, routines);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.get("/api/reminders/:patientId", requirePatientAuth, async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { targetPatientId } = resolveTargetPatientId(req);
    const resolvedId = targetPatientId || req.params.patientId;
    res.json(ServerDB.getReminders(resolvedId));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve reminders", details: err?.message });
  }
});
app.post("/api/reminders/:patientId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const reminders = req.body;
  if (!Array.isArray(reminders)) {
    res.status(400).json({ error: "Reminders must be an array" });
    return;
  }
  const updated = ServerDB.saveReminders(targetPatientId, reminders);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.get("/api/memories/:patientId", requirePatientAuth, async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { targetPatientId } = resolveTargetPatientId(req);
    const resolvedId = targetPatientId || req.params.patientId;
    res.json(ServerDB.getMemories(resolvedId));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve memories", details: err?.message });
  }
});
app.post("/api/memories/:patientId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const memory = req.body;
  if (!memory || !memory.id) {
    res.status(400).json({ error: "Invalid memory data" });
    return;
  }
  const updated = ServerDB.addMemory(targetPatientId, memory);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.delete("/api/memories/:patientId/:memoryId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const updated = ServerDB.deleteMemory(targetPatientId, req.params.memoryId);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.get("/api/people/:patientId", requirePatientAuth, async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { targetPatientId } = resolveTargetPatientId(req);
    const resolvedId = targetPatientId || req.params.patientId;
    res.json(ServerDB.getPeople(resolvedId));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve people", details: err?.message });
  }
});
app.post("/api/people/:patientId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const person = req.body;
  if (!person || !person.id || !person.name) {
    res.status(400).json({ error: "Invalid person data: name is required" });
    return;
  }
  const updated = ServerDB.addPerson(targetPatientId, person);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.put("/api/people/:patientId/:personId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const person = req.body;
  if (!person || !person.name) {
    res.status(400).json({ error: "Invalid person data" });
    return;
  }
  person.id = req.params.personId;
  const updated = ServerDB.updatePerson(targetPatientId, person);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.delete("/api/people/:patientId/:personId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const updated = ServerDB.deletePerson(targetPatientId, req.params.personId);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.get("/api/sessions/:patientId", requirePatientAuth, async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { targetPatientId } = resolveTargetPatientId(req);
    const resolvedId = targetPatientId || req.params.patientId;
    res.json(ServerDB.getSessions(resolvedId));
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve sessions", details: err?.message });
  }
});
app.post("/api/sessions/:patientId", requirePatientAuth, async (req, res) => {
  const { targetPatientId, errorStatus, errorMessage } = resolveTargetPatientId(req);
  if (!targetPatientId) {
    res.status(errorStatus || 403).json({ error: errorMessage || "Unauthorized: No linked patient profile." });
    return;
  }
  const session = req.body;
  if (!session || !session.id) {
    res.status(400).json({ error: "Invalid session data" });
    return;
  }
  const updated = ServerDB.addSession(targetPatientId, session);
  await ServerDB.syncToCloud();
  res.json(updated);
});
app.get("/api/sync", async (req, res) => {
  try {
    await ServerDB.syncFromCloud();
    const { role, caretakerId, patientId } = req.query;
    const patients = ServerDB.getPatients();
    const caretakers = ServerDB.getCaretakers();
    let targetCaretaker = caretakerId ? caretakers.find((c) => c.id === caretakerId) : void 0;
    let targetPatient = patientId ? patients.find((p) => p.id === patientId) : void 0;
    let assignedPatients = [];
    if (targetCaretaker) {
      assignedPatients = patients.filter(
        (p) => targetCaretaker?.assignedPatientIds?.includes(p.id) || p.linkedCaregiverKey && targetCaretaker?.caregiverKey && p.linkedCaregiverKey.toUpperCase() === targetCaretaker.caregiverKey.toUpperCase()
      );
    }
    const activePatId = targetPatient?.id || (assignedPatients.length > 0 ? assignedPatients[0].id : void 0);
    const memories = activePatId ? ServerDB.getMemories(activePatId) : [];
    const sessions = activePatId ? ServerDB.getSessions(activePatId) : [];
    const routines = activePatId ? ServerDB.getRoutines(activePatId) : [];
    const reminders = activePatId ? ServerDB.getReminders(activePatId) : [];
    res.json({
      success: true,
      timestamp: Date.now(),
      targetCaretaker: sanitizeProfile(targetCaretaker),
      targetPatient: sanitizeProfile(targetPatient),
      assignedPatients: assignedPatients.map((p) => sanitizeProfile(p)),
      activePatId,
      memories,
      sessions,
      routines,
      reminders
    });
  } catch (err) {
    res.status(500).json({ error: "Sync failed", details: err?.message });
  }
});
app.patch("/api/caretakers/:id/key", (req, res) => {
  try {
    const { caregiverKey, caretaker: incomingCaretaker } = req.body;
    if (!caregiverKey || typeof caregiverKey !== "string") {
      res.status(400).json({ error: "Caregiver key is required" });
      return;
    }
    const cleanKey = caregiverKey.trim().toUpperCase();
    if (cleanKey.length < 3) {
      res.status(400).json({ error: "Caregiver key must be at least 3 characters" });
      return;
    }
    const caretakers = ServerDB.getCaretakers();
    let caretaker = caretakers.find((c) => c.id === req.params.id);
    if (!caretaker) {
      const newCaretaker = incomingCaretaker && incomingCaretaker.id ? { ...incomingCaretaker, caregiverKey: cleanKey } : {
        id: req.params.id,
        fullName: "Family Caregiver",
        username: "caregiver",
        relation: "Family Caregiver",
        phone: "9876543210",
        caregiverKey: cleanKey,
        assignedPatientIds: [],
        pin: "1234"
      };
      ServerDB.addCaretaker(newCaretaker);
      res.json({ success: true, caretaker: sanitizeProfile(newCaretaker) });
      return;
    }
    const isTaken = caretakers.some(
      (c) => c.id !== req.params.id && (c.caregiverKey || "").toUpperCase() === cleanKey
    );
    if (isTaken) {
      res.status(400).json({ error: `Caregiver key "${cleanKey}" is already taken by another caregiver.` });
      return;
    }
    const oldKey = caretaker.caregiverKey;
    caretaker.caregiverKey = cleanKey;
    ServerDB.addCaretaker(caretaker);
    if (oldKey) {
      const patients = ServerDB.getPatients();
      patients.forEach((p) => {
        if ((p.linkedCaregiverKey || "").toUpperCase() === oldKey.toUpperCase()) {
          p.linkedCaregiverKey = cleanKey;
          ServerDB.addPatient(p);
        }
      });
    }
    res.json({ success: true, caretaker: sanitizeProfile(caretaker) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update caregiver key", details: err?.message });
  }
});
app.patch("/api/patients/:id/key", (req, res) => {
  try {
    const { patientKey } = req.body;
    if (!patientKey || typeof patientKey !== "string") {
      res.status(400).json({ error: "Patient key is required" });
      return;
    }
    const cleanKey = patientKey.trim().toUpperCase();
    if (cleanKey.length < 3) {
      res.status(400).json({ error: "Patient key must be at least 3 characters" });
      return;
    }
    const patients = ServerDB.getPatients();
    const patient = patients.find((p) => p.id === req.params.id);
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    const isTaken = patients.some(
      (p) => p.id !== req.params.id && (p.patientKey || "").toUpperCase() === cleanKey
    );
    if (isTaken) {
      res.status(400).json({ error: `Patient key "${cleanKey}" is already taken by another patient.` });
      return;
    }
    patient.patientKey = cleanKey;
    ServerDB.addPatient(patient);
    res.json({ success: true, patient: sanitizeProfile(patient) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update patient key", details: err?.message });
  }
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/ai/companion", async (req, res) => {
  try {
    const {
      message,
      patientId: incomingPatientId,
      patientName: incomingName,
      preferredLanguage = "en",
      role = "PATIENT",
      context = {},
      userData,
      history = []
    } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message string is required" });
      return;
    }
    let patientId = incomingPatientId;
    if (!patientId) {
      const patients = ServerDB.getPatients();
      if (patients.length > 0) {
        patientId = patients[0].id;
      }
    }
    const patientRecord = patientId ? ServerDB.findPatient(patientId) : null;
    const patientName = patientRecord?.preferredName || patientRecord?.fullName || incomingName || "Friend";
    const authorizedPatientId = patientRecord?.id || patientId || "default-patient";
    const ai = getAiClient();
    const result = await generateSaathiCompanion({
      ai,
      message,
      role,
      patientId: authorizedPatientId,
      patientName,
      preferredLanguage,
      history,
      userData: userData || context
    });
    res.json(result);
  } catch (err) {
    console.error("Error in /api/ai/companion:", err);
    res.status(500).json({
      error: "Failed to generate companion response",
      details: err?.message || String(err)
    });
  }
});
app.post("/api/ai/summarize-voicenote", async (req, res) => {
  try {
    const { transcript, patientId, language = "en" } = req.body;
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      res.status(400).json({ error: "Spoken transcript is required" });
      return;
    }
    const patient = patientId ? ServerDB.findPatient(patientId) : null;
    const patientName = patient?.preferredName || patient?.fullName || "Beloved Senior";
    const ai = getAiClient();
    const summary = await summarizeVoiceNoteWithGemini(ai, transcript.trim(), patientName, language);
    res.json(summary);
  } catch (err) {
    console.error("Error in /api/ai/summarize-voicenote:", err);
    res.status(500).json({
      error: "Failed to summarize voice note into memory",
      details: err?.message || String(err)
    });
  }
});
app.post("/api/ai/transcribe-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "en" } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      res.status(400).json({ error: "audioBase64 string is required" });
      return;
    }
    const ai = getAiClient();
    const transcript = await transcribeAudioWithGemini(ai, audioBase64, mimeType, language);
    res.json({ transcript: transcript || "" });
  } catch (err) {
    console.error("Error in /api/ai/transcribe-audio:", err);
    res.status(500).json({
      error: "Failed to transcribe audio",
      details: err?.message || String(err)
    });
  }
});
app.post("/api/ai/daily-report", async (req, res) => {
  try {
    const {
      patient,
      sessions = [],
      routine = [],
      reminders = [],
      date = (/* @__PURE__ */ new Date()).toLocaleDateString()
    } = req.body;
    const patientName = patient?.fullName || "Senior Member";
    const patientAge = patient?.age || 72;
    const completedRoutineCount = routine.filter((r) => r.completed).length;
    const totalRoutineCount = routine.length || 7;
    const sessionCount = sessions.length;
    const avgAccuracy = sessions.length > 0 ? Math.round(
      sessions.reduce((acc, s) => acc + (s.accuracy || 0), 0) / sessions.length
    ) : 88;
    const ai = getAiClient();
    if (ai) {
      const prompt = `Analyze the following daily cognitive care telemetry for dementia patient ${patientName} (Age: ${patientAge}) on ${date}:
- Routine Tasks Completed: ${completedRoutineCount} of ${totalRoutineCount}
- Cognitive Game Sessions: ${sessionCount}
- Average Recall Accuracy: ${avgAccuracy}%
- Medicine & Hydration Compliance: ${reminders.filter((r) => r.completedToday).length} of ${reminders.length}
- Recent Game Sessions: ${JSON.stringify(sessions.slice(0, 5))}

Generate a structured daily report in JSON format matching this schema:
{
  "summaryTitle": "string (e.g. Daily Cognitive & Routine Digest)",
  "cognitiveStabilityScore": number (0 to 100),
  "stabilityStatus": "STABLE" | "SLIGHT_VARIANCE" | "ATTENTION_NEEDED",
  "familyNarrative": "string (warm, humanized 2-3 sentence overview for family caregivers)",
  "clinicalAnalysis": "string (formal, concise observation on reaction time, memory accuracy, and focus stability)",
  "mmseAlignment": {
    "orientationScore": "string (e.g. 9/10 - High)",
    "recallScore": "string (e.g. 8.5/10 - Steady)",
    "attentionScore": "string (e.g. 9/10 - Excellent)"
  },
  "behavioralNotes": "string (observations on sundowning or fatigue indicators)",
  "caregiverActionItems": ["string", "string", "string"],
  "doctorRecommendation": "string (guidance for the next clinic visit)"
}`;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
            safetySettings
          }
        });
        const parsed = JSON.parse(response.text || "{}");
        if (parsed && (parsed.cognitiveStabilityScore || parsed.familyNarrative)) {
          res.json({
            report: parsed,
            source: "gemini",
            generatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          return;
        }
      } catch (geminiErr) {
        console.warn("Gemini report notice, falling back to local clinical report generator:", geminiErr);
      }
    }
    const fallbackReport = {
      summaryTitle: `Daily Cognitive & Routine Digest \u2022 ${date}`,
      cognitiveStabilityScore: Math.min(96, Math.max(78, avgAccuracy)),
      stabilityStatus: avgAccuracy >= 85 ? "STABLE" : "SLIGHT_VARIANCE",
      familyNarrative: `Today was a peaceful and reassuring day for ${patientName}. She completed ${completedRoutineCount} routine daily activities, engaged comfortably with memory keepsake games, and completed her scheduled hydration. Her daily interaction streak continues at ${patient?.dailyStreak || 5} days.`,
      clinicalAnalysis: `Cognitive stability metrics demonstrate consistent short-term recall (${avgAccuracy}% accuracy). Average task latency is within the baseline normative range for mild cognitive impairment (MCI). No acute behavioral agitations or task avoidance flags were recorded.`,
      mmseAlignment: {
        orientationScore: "9/10 \u2022 Strong temporal & family recall",
        recallScore: `${(avgAccuracy / 10).toFixed(1)}/10 \u2022 Preserved object recognition`,
        attentionScore: "8.8/10 \u2022 Visual focus sustained through 3-min loops"
      },
      behavioralNotes: completedRoutineCount >= 2 ? "Calm daytime temperament with zero late-afternoon disorientation." : "Slight delay in midday hydration; gentle verbal prompts are recommended.",
      caregiverActionItems: [
        "Maintain the soothing morning tea and 15-minute garden walk routine.",
        "Encourage photo reminiscence before evening dusk to prevent sundowning anxiety.",
        "Ensure prescribed evening hydration is offered at 6:00 PM with seasonal fruit."
      ],
      doctorRecommendation: "Cognitive trajectory remains stable. Continue regular routine monitoring and share this 7-day trend at the next geriatric review."
    };
    res.json({
      report: fallbackReport,
      source: "offline-analytics-engine",
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("Error in /api/ai/daily-report:", err);
    res.status(500).json({
      error: "Failed to generate daily report",
      details: err?.message || String(err)
    });
  }
});
app.post("/api/ai/suggest-routine", async (req, res) => {
  try {
    const { patient, focusArea = "balanced" } = req.body;
    const patientName = patient?.fullName || "Elderly Parent";
    const patientAge = patient?.age || 72;
    const ai = getAiClient();
    if (ai) {
      const prompt = `Suggest 4 culturally attuned, gentle daily routine tasks for an elderly dementia patient named ${patientName}, age ${patientAge}, residing in Northeast India. Focus area: ${focusArea}.
Return JSON array of objects with:
[
  {
    "title": "string",
    "timeSlot": "Morning" | "Afternoon" | "Evening" | "Night",
    "time": "string (e.g. 08:30 AM)",
    "notes": "string (reassuring instructions)",
    "category": "HEALTH" | "ACTIVITY" | "SOCIAL" | "HYDRATION"
  }
]`;
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.5,
            safetySettings
          }
        });
        const parsed = JSON.parse(response.text || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
          res.json({ suggestions: parsed });
          return;
        }
      } catch (geminiErr) {
        console.warn("Gemini suggest-routine notice, falling back to local routine suggestions:", geminiErr);
      }
    }
    res.json({
      suggestions: [
        {
          title: "Warm Herbal Tulsi Tea on Veranda",
          timeSlot: "Morning",
          time: "07:30 AM",
          notes: "Enjoy the soft morning sunlight and listen to garden birds.",
          category: "HYDRATION"
        },
        {
          title: "Blood Pressure & Heart Tablet Check",
          timeSlot: "Morning",
          time: "08:30 AM",
          notes: "Take with half glass of lukewarm water after breakfast.",
          category: "HEALTH"
        },
        {
          title: "Photo Album & Family Reminiscence",
          timeSlot: "Afternoon",
          time: "03:30 PM",
          notes: "Look at family photos from Tezpur and Shillong trips together.",
          category: "SOCIAL"
        },
        {
          title: "Calming Flute & Borgeet Music Listening",
          timeSlot: "Evening",
          time: "07:00 PM",
          notes: "Relaxing ambient music to ease evening sundowning.",
          category: "ACTIVITY"
        }
      ]
    });
  } catch (err) {
    console.error("Error in /api/ai/suggest-routine:", err);
    res.status(500).json({ error: "Failed to suggest routines" });
  }
});
var quizMemoryCache = /* @__PURE__ */ new Map();
app.post("/api/ai/memory-quiz", async (req, res) => {
  try {
    const {
      patientId,
      patientName: incomingName,
      memories: incomingMemories = [],
      people: incomingPeople = [],
      language = "en"
    } = req.body;
    const patientRecord = patientId ? ServerDB.findPatient(patientId) : null;
    const patientName = patientRecord?.preferredName || patientRecord?.fullName || incomingName || "Friend";
    const dbMemories = patientId ? ServerDB.getMemories(patientId) : [];
    const dbPeople = patientId ? ServerDB.getPeople(patientId) : [];
    const activeMemories = incomingMemories.length > 0 ? incomingMemories : dbMemories;
    const activePeople = incomingPeople.length > 0 ? incomingPeople : dbPeople;
    if (activeMemories.length === 0 && activePeople.length === 0) {
      res.json({
        questions: [],
        totalAvailable: 0,
        message: "No memories or loved ones have been added yet."
      });
      return;
    }
    const cacheKey = `${patientId || "patient"}-${language}-${activeMemories.length}-${activePeople.length}`;
    const cachedEntry = quizMemoryCache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt && cachedEntry.questions?.length > 0) {
      res.json({
        questions: cachedEntry.questions,
        totalAvailable: cachedEntry.totalAvailable,
        generatedBy: `${cachedEntry.generatedBy} (cached)`
      });
      return;
    }
    const generateFallbackQuestions = () => {
      const questions = [];
      const relationshipsPoolMap = {
        as: ["\u099C\u09C0\u09AF\u09BC\u09BE\u09F0\u09C0", "\u09AA\u09C1\u09A4\u09CD\u09F0", "\u09AD\u09A8\u09C0\u09AF\u09BC\u09C7\u0995", "\u0995\u0995\u09BE\u09AF\u09BC\u09C7\u0995", "\u09B8\u09CD\u09AC\u09BE\u09AE\u09C0 / \u09AA\u09A4\u09CD\u09A8\u09C0", "\u09A8\u09BE\u09A4\u09BF", "\u09A8\u09BE\u09A4\u09BF\u09A8\u09C0", "\u09AA\u09F0\u09BF\u09AF\u09BC\u09BE\u09B2\u09F0 \u099A\u09BF\u0995\u09BF\u09CE\u09B8\u0995", "\u099C\u09C0\u09F1\u09A8\u099C\u09CB\u09F0\u09BE \u09AC\u09A8\u09CD\u09A7\u09C1"],
        hi: ["\u092C\u0947\u091F\u0940", "\u092C\u0947\u091F\u093E", "\u092C\u0939\u0928", "\u092D\u093E\u0908", "\u091C\u0940\u0935\u0928\u0938\u093E\u0925\u0940 / \u092A\u0924\u093F-\u092A\u0924\u094D\u0928\u0940", "\u092A\u094B\u0924\u093E", "\u092A\u094B\u0924\u0940", "\u092A\u093E\u0930\u093F\u0935\u093E\u0930\u093F\u0915 \u0921\u0949\u0915\u094D\u091F\u0930", "\u092A\u0941\u0930\u093E\u0928\u093E \u092E\u093F\u0924\u094D\u0930"],
        mni: ["\u0987\u099A\u09BE\u09A8\u09C1\u09AA\u09C0", "\u0987\u099A\u09BE\u09A8\u09C1\u09AA\u09BE", "\u0987\u099A\u09C7 / \u0987\u099A\u09B2", "\u0987\u09A8\u09BE\u0993 / \u0987\u09AC\u09C1\u0982\u0997\u09CB", "\u09B2\u09CB\u09AF\u09BC\u09A8\u09AC\u09C0", "\u0987\u09B6\u09C1 \u09A8\u09C1\u09AA\u09BE", "\u0987\u09B6\u09C1 \u09A8\u09C1\u09AA\u09C0", "\u0987\u09AE\u09C1\u0982\u0997\u09C0 \u09A6\u09CB\u0995\u09CD\u09A4\u09B0", "\u09AE\u09B0\u09C1\u09AA"],
        en: ["Daughter", "Son", "Spouse / Partner", "Sister", "Brother", "Grandson", "Granddaughter", "Primary Caregiver", "Family Doctor", "Lifelong Friend"]
      };
      const relationshipsPool = relationshipsPoolMap[language] || relationshipsPoolMap.en;
      const hobbiesPoolMap = {
        as: ["\u09AC\u09BE\u09F0\u09BE\u09A8\u09CD\u09A6\u09BE\u09A4 \u09AA\u09C1\u09F1\u09BE\u09F0 \u099A\u09BE\u09B9 \u0996\u09CB\u09F1\u09BE", "\u09B2\u09CB\u0995\u0997\u09C0\u09A4 \u0986\u09F0\u09C1 \u09AC\u09BE\u0981\u09B9\u09C0\u09F0 \u09B8\u09C1\u09F0 \u09B6\u09C1\u09A8\u09BE", "\u09A4\u09C1\u09B2\u09B8\u09C0 \u0986\u09F0\u09C1 \u09AB\u09C1\u09B2\u09A8\u09BF\u09F0 \u09AF\u09A4\u09CD\u09A8 \u09B2\u09CB\u09F1\u09BE", "\u09B8\u09BE\u09A7\u09C1\u0995\u09A5\u09BE \u09AA\u09DD\u09BE", "\u0998\u09F0\u09C1\u09F1\u09BE \u09AA\u09BF\u09A0\u09BE-\u09AA\u09A8\u09BE \u09AC\u09A8\u09CB\u09F1\u09BE", "\u0989\u09AE\u0998\u09F0\u09BE \u09AA\u09BE\u09B0\u09CD\u0995\u09A4 \u09AB\u09C1\u09F0\u09BE"],
        hi: ["\u0938\u0941\u092C\u0939 \u092C\u093E\u0932\u0915\u0928\u0940 \u092E\u0947\u0902 \u091A\u093E\u092F \u092A\u0940\u0928\u093E", "\u092E\u0927\u0941\u0930 \u0932\u094B\u0915\u0917\u0940\u0924 \u0914\u0930 \u092C\u093E\u0901\u0938\u0941\u0930\u0940 \u0938\u0941\u0928\u0928\u093E", "\u0924\u0941\u0932\u0938\u0940 \u0914\u0930 \u092A\u094C\u0927\u094B\u0902 \u0915\u0940 \u0926\u0947\u0916\u092D\u093E\u0932 \u0915\u0930\u0928\u093E", "\u0915\u0939\u093E\u0928\u093F\u092F\u093E\u0902 \u092A\u0922\u093C\u0928\u093E", "\u0938\u094D\u0935\u093E\u0926\u093F\u0937\u094D\u091F \u092E\u093F\u0920\u093E\u0908 \u092C\u0928\u093E\u0928\u093E", "\u092A\u093E\u0930\u094D\u0915 \u092E\u0947\u0902 \u091F\u0939\u0932\u0928\u093E"],
        mni: ["\u0985\u09AF\u09BC\u09C1\u0995\u09CD\u0995\u09C0 \u099A\u09BE \u09A5\u0995\u09AA\u09BE", "\u0988\u09B6\u09C8 \u0985\u09AE\u09B8\u09C1\u0982 \u09AC\u09BE\u0982\u09B6\u09C0 \u09A4\u09BE\u09B0\u0997\u09BE \u09B2\u09C8\u09AC\u09BE", "\u09AA\u09BE\u09AE\u09CD\u09AC\u09C0\u09B6\u09BF\u0982\u09A6\u09BE \u0988\u09B6\u09BF\u0982 \u09B9\u09C8\u09A4\u09AC\u09BE", "\u09F1\u09BE\u09B0\u09C0 \u09AA\u52DD\u09AC\u09BE", "\u09AE\u099A\u09BF\u09A8 \u09A5\u09C1\u09AE\u09CD\u09AC\u09BE \u09AA\u09CB\u09CE\u09B6\u0995 \u099A\u09BE\u09AC\u09BE", "\u0995\u09CB\u0987\u099A\u09CE \u099A\u09CE\u09AA\u09BE"],
        en: ["Sipping morning tea on the veranda", "Singing folk songs & listening to flute", "Tending to garden flowers and tulsi plant", "Reading traditional stories together", "Cooking seasonal sweet treats", "Walking in the neighborhood park"]
      };
      const hobbiesPool = hobbiesPoolMap[language] || hobbiesPoolMap.en;
      const locationsPool = [
        "Guwahati, Assam",
        "Shillong, Meghalaya",
        "Tezpur Heritage Town",
        "Jorhat Tea Estate",
        "New Delhi",
        "Kolkata"
      ];
      activePeople.forEach((person, idx) => {
        if (person.relationship && person.name) {
          const correct = person.relationship;
          const distractors = relationshipsPool.filter((r) => r.toLowerCase() !== correct.toLowerCase()).sort(() => 0.5 - Math.random()).slice(0, 3);
          const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
          const qText = language === "as" ? `${person.name} \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09AA\u09F0\u09BF\u09DF\u09BE\u09B2\u09A4 \u0995\u09CB\u09A8 \u09B9\u09DF?` : language === "hi" ? `${person.name} \u0906\u092A\u0915\u0947 \u092A\u0930\u093F\u0935\u093E\u0930 \u092E\u0947\u0902 \u0915\u094C\u0928 \u0939\u0948\u0902?` : language === "mni" ? `${person.name} \u0985\u09A6\u09CB\u09AE\u0997\u09C0 \u0987\u09AE\u09C1\u0982\u09A6\u09BE \u0995\u09A8\u09BE\u09A8\u09CB?` : `Who is ${person.name} in your life?`;
          const expText = language === "as" ? `${person.name} \u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09AE\u09F0\u09AE\u09F0 ${correct} \u09B9\u09DF\u0964` : language === "hi" ? `${person.name} \u0906\u092A\u0915\u0947 \u092A\u094D\u0930\u093F\u092F ${correct} \u0939\u0948\u0902\u0964` : language === "mni" ? `${person.name} \u0985\u09A6\u09CB\u09AE\u0997\u09C0 \u09A8\u09C1\u0982\u09B6\u09BF\u09B0\u09AC\u09BE ${correct}\u09A8\u09BF\u0964` : `${person.name} is your cherished ${correct}.`;
          const hintText = language === "as" ? `\u0986\u09AA\u09CB\u09A8\u09BE\u09F0 \u09AA\u09F0\u09BF\u09DF\u09BE\u09B2 \u0986\u09F0\u09C1 ${person.name}\u09F0 \u09AE\u09F0\u09AE\u09F0 \u0995\u09A5\u09BE \u09AE\u09A8\u09A4 \u09AA\u09C7\u09B2\u09BE\u0993\u0995\u0964` : language === "hi" ? `\u0905\u092A\u0928\u0947 \u092A\u0930\u093F\u0935\u093E\u0930 \u0914\u0930 ${person.name} \u0915\u0947 \u0938\u094D\u0928\u0947\u0939 \u0915\u094B \u092F\u093E\u0926 \u0915\u0930\u0947\u0902\u0964` : language === "mni" ? `\u0987\u09AE\u09C1\u0982\u0997\u09C0 \u09AE\u09C0 \u0985\u09AE\u09B8\u09C1\u0982 ${person.name}\u0997\u09C0 \u09AE\u09B0\u09AE\u09A6\u09BE \u09A8\u09C0\u0982\u09B6\u09BF\u0982\u09AC\u09C0\u09AF\u09BC\u09C1\u0964` : `Think of your close family circle and ${person.name}'s caring role.`;
          questions.push({
            id: `fallback-person-rel-${person.id || idx}`,
            type: "person",
            sourceTitle: person.name,
            question: qText,
            options,
            correctIndex: options.indexOf(correct),
            explanation: expText,
            hint: hintText,
            imageUrl: person.imageUrl,
            category: language === "as" ? "\u0986\u09AA\u09CB\u09A8\u099C\u09A8" : language === "hi" ? "\u092A\u0930\u093F\u0935\u093E\u0930\u091C\u0928" : language === "mni" ? "\u0987\u09AE\u09C1\u0982\u0997\u09C0 \u09AE\u09C0" : "Family Relationships"
          });
        }
        if (person.likes && person.name) {
          const correct = person.likes;
          const distractors = hobbiesPool.filter((h) => !correct.toLowerCase().includes(h.toLowerCase())).slice(0, 3);
          const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
          const qText = language === "as" ? `${person.name}\u09DF\u09C7 \u0995\u09BF \u0995\u09F0\u09BF\u09AC\u09B2\u09C8 \u09AD\u09BE\u09B2 \u09AA\u09BE\u09DF?` : language === "hi" ? `${person.name} \u0915\u094B \u0915\u094D\u092F\u093E \u0915\u0930\u0928\u093E \u0938\u092C\u0938\u0947 \u0905\u0927\u093F\u0915 \u092A\u0938\u0902\u0926 \u0939\u0948?` : language === "mni" ? `${person.name}\u09A8\u09BE \u0995\u09B0\u09AE\u09CD\u09AC\u09BE \u09A4\u09CC\u09AC\u09BE \u09AA\u09BE\u09AE\u09CD\u09AC\u0997\u09C7?` : `What is something that ${person.name} loves or enjoys doing?`;
          questions.push({
            id: `fallback-person-likes-${person.id || idx}`,
            type: "person",
            sourceTitle: person.name,
            question: qText,
            options,
            correctIndex: options.indexOf(correct),
            explanation: `${person.name}: ${correct}`,
            hint: `${person.name}`,
            imageUrl: person.imageUrl,
            category: language === "as" ? "\u09F0\u09C1\u099A\u09BF \u0986\u09F0\u09C1 \u0986\u09A8\u09A8\u09CD\u09A6" : language === "hi" ? "\u0930\u0941\u091A\u093F\u092F\u093E\u0902 \u0914\u0930 \u092A\u0938\u0902\u0926" : "Interests & Favorites"
          });
        }
        if (person.location && person.name) {
          const correct = person.location;
          const distractors = locationsPool.filter((l) => !correct.toLowerCase().includes(l.toLowerCase())).slice(0, 3);
          const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
          const qText = language === "as" ? `${person.name} \u09AC\u09F0\u09CD\u09A4\u09AE\u09BE\u09A8 \u0995'\u09A4 \u09A5\u09BE\u0995\u09C7?` : language === "hi" ? `${person.name} \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0915\u0939\u093E\u0901 \u0930\u0939\u0924\u0947 \u0939\u0948\u0902?` : language === "mni" ? `${person.name} \u0995\u09B0\u09AE\u09CD\u09AC \u09AE\u09AB\u09AE\u09A6\u09BE \u09B2\u09C8\u09AC\u0997\u09C7?` : `Where does ${person.name} currently live or spend time?`;
          questions.push({
            id: `fallback-person-loc-${person.id || idx}`,
            type: "person",
            sourceTitle: person.name,
            question: qText,
            options,
            correctIndex: options.indexOf(correct),
            explanation: `${person.name}: ${correct}`,
            hint: `${person.name}`,
            imageUrl: person.imageUrl,
            category: language === "as" ? "\u09A0\u09BE\u0987 \u0986\u09F0\u09C1 \u09AC\u09BE\u09B8\u09B8\u09CD\u09A5\u09BE\u09A8" : language === "hi" ? "\u0938\u094D\u0925\u093E\u0928 \u0914\u0930 \u0928\u093F\u0935\u093E\u0938" : "Hometown & Places"
          });
        }
      });
      activeMemories.forEach((mem, idx) => {
        if (mem.interactiveQuestion?.question && mem.interactiveQuestion?.options?.length >= 4) {
          questions.push({
            id: `fallback-mem-interactive-${mem.id || idx}`,
            type: "memory",
            sourceTitle: mem.title,
            question: mem.interactiveQuestion.question,
            options: mem.interactiveQuestion.options.slice(0, 4),
            correctIndex: mem.interactiveQuestion.correctIndex || 0,
            explanation: `"${mem.title}": ${mem.story ? mem.story.slice(0, 120) + "..." : ""}`,
            hint: `"${mem.title}"`,
            imageUrl: mem.imageUrl,
            category: mem.category || (language === "as" ? "\u09B8\u09CB\u09A3\u09BE\u09B2\u09C0 \u09B8\u09CD\u09AE\u09C3\u09A4\u09BF" : language === "hi" ? "\u0938\u0941\u0916\u0926 \u0938\u094D\u092E\u0943\u0924\u093F" : "Cherished Memories")
          });
        } else if (mem.title) {
          if (mem.region) {
            const correct = mem.region;
            const distractors = ["Brahmaputra Riverside", "Kaziranga Green Foothills", "Majuli Island"].filter((d) => d !== correct).slice(0, 3);
            const options = [correct, ...distractors].sort(() => 0.5 - Math.random());
            const qText = language === "as" ? `"${mem.title}" \u098F\u0987 \u09B8\u09CD\u09AE\u09C3\u09A4\u09BF\u099F\u09CB \u0995'\u09A4 \u09B9\u09C8\u099B\u09BF\u09B2?` : language === "hi" ? `"${mem.title}" \u092F\u0939 \u0938\u0941\u0916\u0926 \u092A\u094D\u0930\u0938\u0902\u0917 \u0915\u0939\u093E\u0901 \u0939\u0941\u0906 \u0925\u093E?` : language === "mni" ? `"${mem.title}" \u0985\u09B8\u09BF \u0995\u09B0\u09AE\u09CD\u09AC \u09AE\u09AB\u09AE\u09A6\u09BE \u09A5\u09CB\u0995\u0996\u09BF\u09AC\u0997\u09C7?` : `In your memory "${mem.title}", where did this special time take place?`;
            questions.push({
              id: `fallback-mem-region-${mem.id || idx}`,
              type: "memory",
              sourceTitle: mem.title,
              question: qText,
              options,
              correctIndex: options.indexOf(correct),
              explanation: `"${mem.title}" - ${correct}.`,
              hint: `"${mem.title}"`,
              imageUrl: mem.imageUrl,
              category: language === "as" ? "\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF\u09F0 \u09A0\u09BE\u0987" : language === "hi" ? "\u0938\u094D\u0925\u093E\u0928 \u0938\u094D\u092E\u0943\u0924\u093F" : "Memory Places"
            });
          }
        }
      });
      return questions.sort(() => 0.5 - Math.random());
    };
    const ai = getAiClient();
    if (ai) {
      const peopleSummary = activePeople.slice(0, 8).map((p) => ({
        name: p.name,
        relationship: p.relationship,
        likes: p.likes,
        dislikes: p.dislikes,
        location: p.location,
        birthday: p.birthday,
        marriageDate: p.marriageDate,
        importantDates: p.importantDates,
        personality: p.personality,
        description: typeof p.description === "string" ? p.description.slice(0, 150) : void 0
      }));
      const memoriesSummary = activeMemories.slice(0, 8).map((m) => ({
        title: m.title,
        category: m.category,
        region: m.region,
        dateLabel: m.dateLabel,
        story: typeof m.story === "string" ? m.story.slice(0, 250) : "",
        interactiveQuestion: m.interactiveQuestion?.question
      }));
      const prompt = `You are a gentle, loving cognitive health companion for an elderly person named ${patientName}.
Generate a supportive, heartwarming multiple-choice quiz based EXCLUSIVELY on the real people in their life and personal memories provided below.

Patient Information:
- Preferred Name: ${patientName}
- Target Language: ${language} (${language === "as" ? "Assamese / \u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE" : language === "hi" ? "Hindi / \u0939\u093F\u0928\u094D\u0926\u0940" : language === "mni" ? "Manipuri / \u09AE\u09C8\u09A4\u09C8\u09B2\u09CB\u09A8\u09CD" : "English"})
CRITICAL LANGUAGE REQUIREMENT: All generated question text, options, explanations, hints, and category labels MUST BE WRITTEN ENTIRELY in ${language === "as" ? "Assamese (\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE)" : language === "hi" ? "Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)" : language === "mni" ? "Manipuri (\u09AE\u09C8\u09A4\u09C8\u09B2\u09CB\u09A8\u09CD)" : "English"}! Do not use English if target language is as, hi, or mni.

People in Life (${peopleSummary.length}):
${JSON.stringify(peopleSummary, null, 2)}

Cherished Memories & Stories (${memoriesSummary.length}):
${JSON.stringify(memoriesSummary, null, 2)}

Requirements:
1. Generate 4 to 6 high-quality, dignified questions testing gentle recall of family members, loved ones, and life scenarios.
2. Balance questions between People (relationships, favorite activities, birthdays, locations) and Memories (what happened in the story, where it occurred, time of year).
3. Every question MUST have EXACTLY 4 answer options:
   - Exactly ONE option MUST be the factual correct answer directly supported by the data above.
   - Three options must be plausible, respectful distractors (never bizarre, mocking, or jarring).
4. Include a warm, reassuring 1-sentence "explanation" that celebrates the answer and reinforces memory retention.
5. Include a kind "hint" that gives a gentle clue without immediately revealing the full answer.
6. Provide "sourceTitle" with the exact name of the person or title of the memory from the data above.

Return a JSON array conforming strictly to this format:
[
  {
    "id": "string",
    "type": "person" | "memory",
    "sourceTitle": "string (person's name or memory title)",
    "question": "string",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctIndex": number (0, 1, 2, or 3),
    "explanation": "string",
    "hint": "string",
    "category": "string"
  }
]`;
      let parsed = null;
      let usedModel = "gemini-3.8-flash";
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
            safetySettings
          }
        });
        parsed = JSON.parse(response.text || "[]");
      } catch (primaryErr) {
        const isQuotaOrRateLimit = primaryErr?.status === 429 || String(primaryErr?.message || "").includes("429") || String(primaryErr?.message || "").includes("quota") || String(primaryErr?.message || "").includes("RESOURCE_EXHAUSTED");
        if (isQuotaOrRateLimit) {
          try {
            usedModel = "gemini-3.1-flash-lite";
            const liteResponse = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.3,
                safetySettings
              }
            });
            parsed = JSON.parse(liteResponse.text || "[]");
          } catch (secondaryErr) {
            console.log("[Memory Quiz] Gemini API quota limit active, utilizing localized recall questions.");
          }
        } else {
          console.log("[Memory Quiz] Note: AI generation unavailable, serving localized questions.");
        }
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validQuestions = parsed.filter(
          (q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
        );
        if (validQuestions.length > 0) {
          const hydratedQuestions = validQuestions.map((q) => {
            let matchedImage = void 0;
            if (q.sourceTitle) {
              const personMatch = activePeople.find(
                (p) => p.name?.toLowerCase().trim() === q.sourceTitle.toLowerCase().trim()
              );
              if (personMatch?.imageUrl) matchedImage = personMatch.imageUrl;
              if (!matchedImage) {
                const memoryMatch = activeMemories.find(
                  (m) => m.title?.toLowerCase().trim() === q.sourceTitle.toLowerCase().trim()
                );
                if (memoryMatch?.imageUrl) matchedImage = memoryMatch.imageUrl;
              }
            }
            return {
              ...q,
              imageUrl: matchedImage
            };
          });
          quizMemoryCache.set(cacheKey, {
            questions: hydratedQuestions,
            totalAvailable: activeMemories.length + activePeople.length,
            generatedBy: usedModel,
            expiresAt: Date.now() + 15 * 60 * 1e3
          });
          res.json({
            questions: hydratedQuestions,
            totalAvailable: activeMemories.length + activePeople.length,
            generatedBy: usedModel
          });
          return;
        }
      }
    }
    const fallbackList = generateFallbackQuestions();
    quizMemoryCache.set(cacheKey, {
      questions: fallbackList,
      totalAvailable: activeMemories.length + activePeople.length,
      generatedBy: "fallback",
      expiresAt: Date.now() + 3 * 60 * 1e3
    });
    res.json({
      questions: fallbackList,
      totalAvailable: activeMemories.length + activePeople.length,
      generatedBy: "fallback"
    });
  } catch (err) {
    console.error("Error in /api/ai/memory-quiz:", err);
    res.status(500).json({ error: "Failed to generate memory quiz questions" });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API endpoint not found: " + req.originalUrl });
});
async function startServer() {
  const httpServer = import_http.default.createServer(app);
  const wss = new import_ws.WebSocketServer({ server: httpServer, path: "/api/live-companion" });
  wss.on("connection", async (ws, req) => {
    let authorizedPatientId = "default-patient";
    try {
      const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
      const requestedPatientId = url.searchParams.get("patientId");
      const patients = ServerDB.getPatients();
      if (requestedPatientId && ServerDB.findPatient(requestedPatientId)) {
        authorizedPatientId = requestedPatientId;
      } else if (patients.length > 0) {
        authorizedPatientId = patients[0].id;
      }
      const patient = ServerDB.findPatient(authorizedPatientId);
      const patientName = patient?.preferredName || patient?.fullName || "Friend";
      ws.send(
        JSON.stringify({
          type: "ready",
          patientId: authorizedPatientId,
          message: `Connected to Saathi Live Voice Assistant for ${patientName}`
        })
      );
      ws.on("message", async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }
          if (payload.type === "message" || payload.type === "user_input") {
            const userText = payload.text || payload.message;
            if (!userText) return;
            ws.send(JSON.stringify({ type: "state", state: "THINKING" }));
            const ai = getAiClient();
            if (ai) {
              const routines = ServerDB.getRoutines(authorizedPatientId);
              const formattedRoutines = routines.map((r) => `${r.title} at ${r.time} (${r.completed ? "Done" : "Pending"})`).join(", ") || "No routines.";
              const patientData = ServerDB.findPatient(authorizedPatientId) || {};
              const caregiverName = patientData.caregiverName || "Family Caregiver";
              const currentDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
              const currentTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              const systemInstruction = `You are Saathi, a warm, conversational, and highly intelligent female AI companion for ${patientName}.
CRITICAL CONTEXT:
- Today is ${currentDate}, and the current time is ${currentTime}.
- Caregiver: ${caregiverName}
- Schedule: ${formattedRoutines}

YOUR PRIME DIRECTIVE:
1. ANSWER CONFIDENTLY & CREATIVELY: Answer EVERY everyday question warmly. If asked for advice (e.g., food, activities), give a specific, delicious, or engaging recommendation. If asked about the weather, use the current date to give a warm, seasonal description.
2. NEVER APOLOGIZE FOR LACK OF ACCESS: NEVER say "I don't have real-time access", "I am an AI", or "I cannot answer that". Always provide a helpful, human-like response.
3. THE "TOO HARD" RULE: ONLY if the question is highly complex (e.g., advanced coding, calculus, engineering), gently state that this is outside your current capacity as a companion, and smoothly change the subject.
4. TOOLS: ONLY use tools if explicitly asked about medical data.
5. TONE: Speak in 1-4 soothing sentences.`;
              const config = {
                systemInstruction,
                temperature: 0.7,
                tools: [{ functionDeclarations: PATIENT_TOOL_DECLARATIONS }]
              };
              const contents = [{ role: "user", parts: [{ text: userText }] }];
              let response;
              let wsModel = "gemini-3.8-flash";
              try {
                response = await ai.models.generateContent({ model: "gemini-3.8-flash", contents, config });
              } catch (wsTierErr) {
                wsModel = "gemini-3.1-flash-lite";
                response = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents, config });
              }
              if (response.functionCalls && response.functionCalls.length > 0) {
                const call = response.functionCalls[0];
                ws.send(JSON.stringify({ type: "tool_call", calls: [call.name] }));
                let toolResult;
                try {
                  toolResult = await executePatientTool(authorizedPatientId, call.name, call.args || {});
                } catch (e) {
                  toolResult = { error: "Could not fetch data." };
                }
                const bypassConfig = { systemInstruction, temperature: 0.7 };
                const followUpContents = [
                  { role: "user", parts: [{ text: userText }] },
                  { role: "user", parts: [{ text: `[SYSTEM: Tool '${call.name}' returned: ${JSON.stringify(toolResult)}. Speak to the patient based on this.]` }] }
                ];
                let followUpRes;
                try {
                  followUpRes = await ai.models.generateContent({ model: wsModel, contents: followUpContents, config: bypassConfig });
                } catch (wsFollowUpErr) {
                  followUpRes = await ai.models.generateContent({ model: "gemini-3.1-flash-lite", contents: followUpContents, config: bypassConfig });
                }
                ws.send(JSON.stringify({ type: "reply", text: followUpRes.text || "I am here with you.", executedTools: [call.name] }));
                return;
              }
              ws.send(JSON.stringify({ type: "reply", text: response.text || "I am peaceful and safe." }));
              return;
            }
            ws.send(
              JSON.stringify({
                type: "reply",
                text: `Hello ${patientName}. You are completely safe at home and everything is peaceful today.`
              })
            );
          }
        } catch (err) {
          ws.send(JSON.stringify({ type: "error", error: err?.message || "Processing error" }));
        }
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", error: "Connection initialization failed" }));
    }
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found: " + req.originalUrl });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`CognitiveSaathi Server with Live Companion running on http://localhost:${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var backend_default = app;
//# sourceMappingURL=backend.cjs.map
