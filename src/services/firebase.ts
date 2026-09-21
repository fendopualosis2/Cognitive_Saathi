import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  // Load configuration safely from firebase-applet-config.json
  const config = {
    projectId: "gen-lang-client-0434707145",
    appId: "1:404458343109:web:7204876cc3f3ac4b8c7eac",
    apiKey: "AIzaSyAaLEyci2f7sCSatJVF6wkkyQeT6l2ZjUA",
    authDomain: "gen-lang-client-0434707145.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-cognitivesaathi-62186706-13a4-45a8-b1db-6239b1022dc0",
    storageBucket: "gen-lang-client-0434707145.firebasestorage.app",
    messagingSenderId: "404458343109",
    oAuthClientId: "404458343109-1qoi3vvk2sjlkf42ds3l800935hg20p2.apps.googleusercontent.com",
  };

  try {
    return initializeApp(config);
  } catch (e) {
    console.warn('Firebase init notice:', e);
    return null;
  }
}

export function getDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (app) {
    try {
      dbInstance = getFirestore(app);
    } catch (e) {
      console.warn('Firestore instance notice:', e);
    }
  }
  return dbInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (app) {
    try {
      authInstance = getAuth(app);
    } catch (e) {
      console.warn('Firebase Auth instance notice:', e);
    }
  }
  return authInstance;
}
