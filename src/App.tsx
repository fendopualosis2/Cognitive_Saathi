import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  CalendarCheck,
  Image as ImageIcon,
  User,
  Settings,
  Bell,
  BarChart3,
  ListTodo,
  Plus,
  Trash2,
  PhoneCall,
  CheckCircle2,
  Circle,
  Volume2,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Send,
  Loader2,
  HeartHandshake,
  Check,
  Gamepad2,
  Mic,
  Users,
  BookOpen,
} from 'lucide-react';
import {
  UserRole,
  LanguageCode,
  ConnectivityStatus,
  PatientProfile,
  CaretakerProfile,
  CaregiverConnectionRequest,
  RoutineTask,
  ReminderItem,
  MemoryMoment,
  PersonInLife,
  GameSessionResult,
  TextScale,
} from './types';
import { OfflineStore, INITIAL_ROUTINES, INITIAL_REMINDERS, INITIAL_MEMORIES } from './services/storage';
import { getTranslation, LANGUAGE_METADATA } from './services/languages';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { VoiceCompanionModal } from './components/VoiceCompanionModal';
import { AuthPage } from './components/AuthPage';
import { CaregiverCircleModal } from './components/CaregiverCircleModal';
import { Games } from './components/Games';
import { MemoryTilesGame } from './components/MemoryTilesGame';
import { RecognizeByDescriptionGame } from './components/RecognizeByDescriptionGame';
import { MusicPatternGame } from './components/MusicPatternGame';
import { PersonalMemoryQuizGame } from './components/PersonalMemoryQuizGame';
import { CaregiverGameAnalytics } from './components/CaregiverGameAnalytics';
import { MemoryVoiceRecorderModal, MemoryVoiceReaderButton } from './components/MemoryVoiceTools';
import {
  PhotoUploadZone,
  MemoryCardPhotoGallery,
  MemoryPhotoViewerModal,
  AddPhotosModal,
} from './components/MemoryPhotoTools';
import { PeopleInLifeView } from './components/PeopleInLifeView';

export default function App() {
  // Core state
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [patientTab, setPatientTab] = useState<'home' | 'activities' | 'my_day' | 'memories' | 'me' | 'settings'>('home');
  const [caregiverTab, setCaregiverTab] = useState<'dashboard' | 'games' | 'routine' | 'reminders' | 'memories' | 'reports' | 'me'>('dashboard');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Profile data
  const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
  const [currentCaretaker, setCurrentCaretaker] = useState<CaretakerProfile | null>(null);
  const [allPatients, setAllPatients] = useState<PatientProfile[]>([]);

  // Telemetry & Content
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [memories, setMemories] = useState<MemoryMoment[]>([]);
  const [people, setPeople] = useState<PersonInLife[]>([]);
  const [memorySubTab, setMemorySubTab] = useState<'memories' | 'people'>('memories');
  const [sessions, setSessions] = useState<GameSessionResult[]>([]);

  // Connectivity & Preferences
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>('CONNECTED');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => OfflineStore.getDarkMode());
  const [textScale, setTextScale] = useState<TextScale>('normal');
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);

  // Clinical Report State (Caregiver)
  const [clinicalReport, setClinicalReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // AI Routine Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isGeneratingRoutines, setIsGeneratingRoutines] = useState(false);

  // Form Inputs for Adding Content
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('09:00 AM');
  const [newRoutineSlot, setNewRoutineSlot] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');

  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('01:00 PM');
  const [newReminderPeriod, setNewReminderPeriod] = useState<'Morning' | 'Afternoon' | 'Evening'>('Afternoon');

  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [newMemoryStory, setNewMemoryStory] = useState('');
  const [newMemoryRegion, setNewMemoryRegion] = useState('Assam');
  const [newMemoryPhotos, setNewMemoryPhotos] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<CaregiverConnectionRequest[]>([]);

  // Photo Lightbox & Memory Photos state
  const [viewerMemory, setViewerMemory] = useState<MemoryMoment | null>(null);
  const [viewerPhotoIndex, setViewerPhotoIndex] = useState(0);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [addPhotosTargetMemory, setAddPhotosTargetMemory] = useState<MemoryMoment | null>(null);
  const [isAddPhotosModalOpen, setIsAddPhotosModalOpen] = useState(false);

  // Voice Reader & Voice Note state for Memory Tab
  const [isVoiceNoteModalOpen, setIsVoiceNoteModalOpen] = useState(false);
  const [activeReadingMemoryId, setActiveReadingMemoryId] = useState<string | null>(null);

  const handleStartReadingMemory = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setActiveReadingMemoryId(id);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setActiveReadingMemoryId(null);
      };
      utterance.onerror = () => {
        setActiveReadingMemoryId(null);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStopReadingMemory = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveReadingMemoryId(null);
  };

  // Synchronize Dark Mode class on HTML and BODY element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    OfflineStore.setDarkMode(darkMode);
  }, [darkMode]);

  // Synchronize High Contrast class on HTML element (BUG #9 FIX)
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
    OfflineStore.setHighContrast(highContrast);
  }, [highContrast]);

  // Synchronize documentElement font size for Tailwind rem scaling
  useEffect(() => {
    if (textScale === 'extralarge') {
      document.documentElement.style.fontSize = '125%';
    } else if (textScale === 'large') {
      document.documentElement.style.fontSize = '112.5%';
    } else {
      document.documentElement.style.fontSize = '100%';
    }
  }, [textScale]);

  const handleToggleTextScale = () => {
    const nextScale: TextScale =
      textScale === 'normal' ? 'large' : textScale === 'large' ? 'extralarge' : 'normal';
    setTextScale(nextScale);
    OfflineStore.setTextScale(nextScale);
  };

  // Load initial settings and data
  useEffect(() => {
    const savedContrast = OfflineStore.getHighContrast();
    setHighContrast(savedContrast);

    const savedDarkMode = OfflineStore.getDarkMode();
    setDarkMode(savedDarkMode);

    const savedScale = OfflineStore.getTextScale();
    setTextScale(savedScale);

    const savedLang = OfflineStore.getLanguage();
    setLanguage(savedLang);

    // Initial auth - check if active session exists
    const session = OfflineStore.getAuthSession();
    if (session) {
      setRole(session.role);
      if (session.role === 'PATIENT') {
        const localPatient = OfflineStore.getPatient();
        if (localPatient) {
          setCurrentPatient(localPatient);
          loadPatientData(localPatient.id);
        } else {
          setCurrentPath('/login');
        }
      } else if (session.role === 'CAREGIVER') {
        const localCaretaker = OfflineStore.getCaretaker();
        if (localCaretaker) {
          setCurrentCaretaker(localCaretaker);
        } else {
          setCurrentPath('/login');
        }
      }
    } else {
      // First thing that shows is dedicated full-page login/register route
      setCurrentPath('/login');
    }

    // Fetch live patients list from backend if available
    fetchPatientsList();
  }, []);

  // Fetch pending connection requests for patient
  const fetchPendingRequests = useCallback(async (patientId: string) => {
    try {
      const res = await fetch(`/api/caregiver-requests/patient/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingRequests(data);
        }
      }
    } catch {
      // ignore network errors
    }
  }, []);

  // Poll for caregiver connection requests when patient is active
  useEffect(() => {
    if (role === 'PATIENT' && currentPatient?.id) {
      fetchPendingRequests(currentPatient.id);
      const timer = setInterval(() => {
        fetchPendingRequests(currentPatient.id);
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [role, currentPatient?.id, fetchPendingRequests]);

  // Patient responding to caregiver connection request
  const handleRespondConnectionRequest = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    if (!currentPatient) return;
    try {
      const res = await fetch(`/api/caregiver-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, patientId: currentPatient.id }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'ACCEPT' && data.patient) {
          setCurrentPatient(data.patient);
          OfflineStore.savePatient(data.patient);
        }
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        // Immediately refresh patient data & patient list
        fetchPatientData(currentPatient.id);
        fetchPatientsList();
      }
    } catch (err) {
      console.error('Error responding to connection request:', err);
    }
  };

  const fetchPatientData = useCallback(async (patientId: string) => {
    if (!patientId) return;

    try {
      // 1. Fetch routines
      const routinesRes = await fetch(`/api/routines/${patientId}`);
      if (routinesRes.ok) {
        const serverRoutines = await routinesRes.json();
        if (Array.isArray(serverRoutines)) {
          setRoutines(serverRoutines);
          OfflineStore.saveRoutines(patientId, serverRoutines);
        }
      }
    } catch {}

    try {
      // 2. Fetch reminders
      const remindersRes = await fetch(`/api/reminders/${patientId}`);
      if (remindersRes.ok) {
        const serverReminders = await remindersRes.json();
        if (Array.isArray(serverReminders)) {
          setReminders(serverReminders);
          OfflineStore.saveReminders(patientId, serverReminders);
        }
      }
    } catch {}

    try {
      // 3. Fetch fresh memories from server
      const memoriesRes = await fetch(`/api/memories/${patientId}`);
      if (memoriesRes.ok) {
        const serverMemories = await memoriesRes.json();
        if (Array.isArray(serverMemories) && serverMemories.length > 0) {
          setMemories(serverMemories);
          OfflineStore.saveMemories(patientId, serverMemories);
        }
      }
    } catch {}

    try {
      // 4. Fetch fresh people from server
      const peopleRes = await fetch(`/api/people/${patientId}`);
      if (peopleRes.ok) {
        const serverPeople = await peopleRes.json();
        if (Array.isArray(serverPeople)) {
          setPeople(serverPeople);
          OfflineStore.savePeople(patientId, serverPeople);
        }
      }
    } catch {}

    try {
      // 5. Fetch fresh sessions from server
      const sessionsRes = await fetch(`/api/sessions/${patientId}`);
      if (sessionsRes.ok) {
        const serverSessions = await sessionsRes.json();
        if (Array.isArray(serverSessions) && serverSessions.length > 0) {
          setSessions(serverSessions);
          serverSessions.forEach((s: any) => OfflineStore.saveSession(s));
        }
      }
    } catch {}
  }, []);

  const loadPatientData = (patientId: string) => {
    const r = OfflineStore.getRoutines(patientId);
    setRoutines(r);

    const rem = OfflineStore.getReminders(patientId);
    setReminders(rem);

    const mem = OfflineStore.getMemories(patientId);
    setMemories(mem);

    const ppl = OfflineStore.getPeople(patientId);
    setPeople(ppl);

    const sess = OfflineStore.getSessions(patientId);
    setSessions(sess);

    // Immediately trigger fresh network fetch
    fetchPatientData(patientId);
  };

  // Instant Background Polling: Fetch fresh patient data every 5 seconds without WebSockets
  useEffect(() => {
    if (!currentPatient?.id) return;

    // 1. Initial immediate fetch on mount / patient change
    fetchPatientData(currentPatient.id);

    // 2. Short polling interval every 5000ms
    const pollInterval = setInterval(() => {
      fetchPatientData(currentPatient.id);
    }, 5000);

    // 3. Cleanup on unmount or patient change
    return () => clearInterval(pollInterval);
  }, [currentPatient?.id, fetchPatientData]);

  const fetchPatientsList = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setAllPatients(list);
        }
      }
    } catch {
      // Offline fallback
      const pat = OfflineStore.getPatient();
      if (pat) setAllPatients([pat]);
    }
  };

  // ADDITIONAL UI BUG 2 FIX: Scroll reset to top when navigating tabs or games
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [patientTab, caregiverTab, activeGameId]);

  // BUG #7 FIX: Android / Browser Back Button handling without exiting SPA
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setCurrentPath(window.location.pathname);

      // If a game is active, exit game to activities tab
      if (activeGameId) {
        setActiveGameId(null);
        return;
      }
      // If voice modal is open, close modal
      if (isVoiceModalOpen) {
        setIsVoiceModalOpen(false);
        return;
      }
      // If circle modal is open, close modal
      if (isCircleModalOpen) {
        setIsCircleModalOpen(false);
        return;
      }
      // If photo viewer is open, close viewer
      if (isPhotoViewerOpen) {
        setIsPhotoViewerOpen(false);
        setViewerMemory(null);
        return;
      }
      // If add photos modal is open, close modal
      if (isAddPhotosModalOpen) {
        setIsAddPhotosModalOpen(false);
        setAddPhotosTargetMemory(null);
        return;
      }
      // If voice note modal is open, close modal
      if (isVoiceNoteModalOpen) {
        setIsVoiceNoteModalOpen(false);
        return;
      }
      // If patient not on home tab, return to home
      if (role === 'PATIENT' && patientTab !== 'home') {
        setPatientTab('home');
        return;
      }
      // If caregiver not on dashboard tab, return to dashboard
      if (role === 'CAREGIVER' && caregiverTab !== 'dashboard') {
        setCaregiverTab('dashboard');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeGameId, isVoiceModalOpen, isCircleModalOpen, isPhotoViewerOpen, isAddPhotosModalOpen, isVoiceNoteModalOpen, patientTab, caregiverTab, role]);

  // Push state on significant navigation
  const navigatePatientTab = (tab: any) => {
    window.history.pushState({ role: 'PATIENT', tab }, '', window.location.pathname);
    setPatientTab(tab);
  };

  const navigateCaregiverTab = (tab: any) => {
    window.history.pushState({ role: 'CAREGIVER', tab }, '', window.location.pathname);
    setCaregiverTab(tab);
  };

  const openGame = (gameId: string) => {
    window.history.pushState({ game: gameId }, '', window.location.pathname);
    setActiveGameId(gameId);
  };

  // BUG #10 FIX: Genuine Test Reconnect / Trigger Sync
  const handleTriggerSync = async () => {
    setConnectivity('SYNCING');
    try {
      // Actually ping the backend server
      const healthRes = await fetch('/api/health', { cache: 'no-store' });
      if (!healthRes.ok) {
        throw new Error('Server returned non-ok health status');
      }

      // Sync data if patient is selected
      if (currentPatient) {
        const syncRes = await fetch(
          `/api/sync?role=${role}&patientId=${currentPatient.id}&caretakerId=${currentCaretaker?.id || ''}`
        );
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.routines && Array.isArray(syncData.routines) && syncData.routines.length > 0) {
            setRoutines(syncData.routines);
            OfflineStore.saveRoutines(currentPatient.id, syncData.routines);
          }
          if (syncData.reminders && Array.isArray(syncData.reminders) && syncData.reminders.length > 0) {
            setReminders(syncData.reminders);
            OfflineStore.saveReminders(currentPatient.id, syncData.reminders);
          }
        }
      }

      setConnectivity('CONNECTED');
    } catch {
      setConnectivity('OFFLINE');
    }
  };

  // BUG #4 FIX: Patient Profile Update Desync (handleUpdatePatient)
  const handleUpdatePatient = async (updatedPatient: PatientProfile) => {
    setCurrentPatient(updatedPatient);
    OfflineStore.savePatient(updatedPatient);

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPatient),
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrentPatient(saved);
        OfflineStore.savePatient(saved);
      }
    } catch {
      // Offline fallback: queued in storage
      OfflineStore.queueSync({
        clientEventId: `update-patient-${Date.now()}`,
        eventType: 'ROUTINE_UPDATED',
        patientId: updatedPatient.id,
        timestamp: new Date().toISOString(),
        payload: updatedPatient as any,
        status: 'pending',
      });
    }
  };

  // BUG #6 FIX: Routines & Reminders empty list persistence
  const handleToggleRoutine = (id: string) => {
    if (!currentPatient) return;
    const updated = routines.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r));
    setRoutines(updated);
    OfflineStore.saveRoutines(currentPatient.id, updated);

    // Sync to backend
    fetch(`/api/routines/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleDeleteRoutine = (id: string) => {
    if (!currentPatient) return;
    const updated = routines.filter((r) => r.id !== id);
    setRoutines(updated);
    // BUG #6 FIX: Saves empty array [] when last item is deleted
    OfflineStore.saveRoutines(currentPatient.id, updated);

    fetch(`/api/routines/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleAddRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !newRoutineTitle.trim()) return;

    const newTask: RoutineTask = {
      id: `rt-${Date.now()}`,
      title: newRoutineTitle.trim(),
      timeSlot: newRoutineSlot,
      time: newRoutineTime,
      icon: 'CalendarCheck',
      completed: false,
    };

    const updated = [...routines, newTask];
    setRoutines(updated);
    OfflineStore.saveRoutines(currentPatient.id, updated);
    setNewRoutineTitle('');

    fetch(`/api/routines/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleToggleReminder = (id: string) => {
    if (!currentPatient) return;
    const updated = reminders.map((rem) =>
      rem.id === id ? { ...rem, completedToday: !rem.completedToday } : rem
    );
    setReminders(updated);
    OfflineStore.saveReminders(currentPatient.id, updated);

    fetch(`/api/reminders/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleDeleteReminder = (id: string) => {
    if (!currentPatient) return;
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    // BUG #6 FIX: Saves empty array [] when last item is deleted
    OfflineStore.saveReminders(currentPatient.id, updated);

    fetch(`/api/reminders/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !newReminderTitle.trim()) return;

    const newRem: ReminderItem = {
      id: `rem-${Date.now()}`,
      patientId: currentPatient.id,
      type: 'MEDICINE',
      title: newReminderTitle.trim(),
      description: 'Scheduled daily reminder',
      time: newReminderTime,
      period: newReminderPeriod,
      completedToday: false,
      enabled: true,
    };

    const updated = [...reminders, newRem];
    setReminders(updated);
    OfflineStore.saveReminders(currentPatient.id, updated);
    setNewReminderTitle('');

    fetch(`/api/reminders/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  // Memories
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient || !newMemoryTitle.trim()) return;

    const finalPhotos =
      newMemoryPhotos.length > 0
        ? newMemoryPhotos
        : ['https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'];

    const newMem: MemoryMoment = {
      id: `mem-${Date.now()}`,
      patientId: currentPatient.id,
      title: newMemoryTitle.trim(),
      category: 'Family',
      region: newMemoryRegion,
      imageUrl: finalPhotos[0],
      images: finalPhotos,
      imageAlt: newMemoryTitle,
      dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      story: newMemoryStory.trim() || 'A peaceful family memory filled with warmth.',
      audioPrompt: 'Remember this joyful moment together?',
      interactiveQuestion: {
        question: 'What do you remember most about this joyful day?',
        options: ['Family togetherness', 'The pleasant weather', 'The warm food'],
        correctIndex: 0,
      },
    };

    const updated = OfflineStore.addMemory(currentPatient.id, newMem);
    setMemories(updated);
    setNewMemoryTitle('');
    setNewMemoryStory('');
    setNewMemoryPhotos([]);

    fetch(`/api/memories/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMem),
    }).catch(() => {});
  };

  const handleSaveUpdatedMemory = (updatedMem: MemoryMoment) => {
    if (!currentPatient) return;
    const updated = OfflineStore.addMemory(currentPatient.id, updatedMem);
    setMemories(updated);

    if (viewerMemory && viewerMemory.id === updatedMem.id) {
      setViewerMemory(updatedMem);
    }

    fetch(`/api/memories/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMem),
    }).catch(() => {});
  };

  const handleAddMemoryFromVoiceNote = (newMemData: Omit<MemoryMoment, 'id'>) => {
    if (!currentPatient) return;

    const newMem: MemoryMoment = {
      ...newMemData,
      id: `mem-${Date.now()}`,
      patientId: currentPatient.id,
    };

    const updated = OfflineStore.addMemory(currentPatient.id, newMem);
    setMemories(updated);

    fetch(`/api/memories/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMem),
    }).catch(() => {});
  };

  const handleDeleteMemory = (id: string) => {
    if (!currentPatient) return;
    const updated = OfflineStore.deleteMemory(currentPatient.id, id);
    setMemories(updated);

    fetch(`/api/memories/${currentPatient.id}/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const handleAddPerson = (person: PersonInLife) => {
    if (!currentPatient) return;
    const updated = OfflineStore.addPerson(currentPatient.id, person);
    setPeople(updated);

    fetch(`/api/people/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
    }).catch(() => {});
  };

  const handleUpdatePerson = (person: PersonInLife) => {
    if (!currentPatient) return;
    const updated = OfflineStore.updatePerson(currentPatient.id, person);
    setPeople(updated);

    fetch(`/api/people/${currentPatient.id}/${person.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
    }).catch(() => {});
  };

  const handleDeletePerson = (personId: string) => {
    if (!currentPatient) return;
    const updated = OfflineStore.deletePerson(currentPatient.id, personId);
    setPeople(updated);

    fetch(`/api/people/${currentPatient.id}/${personId}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  // Game completion
  const handleGameComplete = (result: GameSessionResult) => {
    if (!currentPatient) return;
    OfflineStore.saveSession(result);
    setSessions((prev) => [result, ...prev]);

    // Increment streak
    const updatedPatient: PatientProfile = {
      ...currentPatient,
      dailyStreak: (currentPatient.dailyStreak || 0) + 1,
      todayCompletedCount: (currentPatient.todayCompletedCount || 0) + 1,
    };
    handleUpdatePatient(updatedPatient);

    fetch(`/api/sessions/${currentPatient.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    }).catch(() => {});
  };

  // Generate AI Clinical Report (Caregiver)
  const handleGenerateReport = async () => {
    if (!currentPatient) return;
    setIsGeneratingReport(true);

    try {
      const res = await fetch('/api/ai/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: currentPatient,
          sessions,
          routine: routines,
          reminders,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setClinicalReport(data.report);
      }
    } catch {
      alert('Could not generate report at this time. Using local analytics digest.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Generate AI Routines (Caregiver)
  const handleGenerateAiRoutines = async () => {
    if (!currentPatient) return;
    setIsGeneratingRoutines(true);

    try {
      const res = await fetch('/api/ai/suggest-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: currentPatient,
          focusArea: 'balanced',
        }),
      });

      const data = await res.json();
      if (data.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch {
      alert('Could not fetch suggestions.');
    } finally {
      setIsGeneratingRoutines(false);
    }
  };

  const handleApplyAiSuggestion = (suggestion: any) => {
    if (!currentPatient) return;
    const newTask: RoutineTask = {
      id: `rt-${Date.now()}`,
      title: suggestion.title,
      timeSlot: suggestion.timeSlot || 'Morning',
      time: suggestion.time || '09:00 AM',
      icon: 'CalendarCheck',
      completed: false,
      notes: suggestion.notes,
    };
    const updated = [...routines, newTask];
    setRoutines(updated);
    OfflineStore.saveRoutines(currentPatient.id, updated);
    setAiSuggestions((prev) => prev.filter((s) => s.title !== suggestion.title));
  };

  // BUG #3 FIX: Caregiver Add/Remove Patient sync callbacks
  const handlePatientLinked = (patient: PatientProfile, updatedCaretaker?: CaretakerProfile) => {
    setCurrentPatient(patient);
    OfflineStore.savePatient(patient);
    loadPatientData(patient.id);

    if (updatedCaretaker) {
      setCurrentCaretaker(updatedCaretaker);
      OfflineStore.saveCaretaker(updatedCaretaker);
    }
    fetchPatientsList();
  };

  const handlePatientRemoved = (patientId: string) => {
    if (currentCaretaker) {
      const updatedCaretaker: CaretakerProfile = {
        ...currentCaretaker,
        assignedPatientIds: (currentCaretaker.assignedPatientIds || []).filter((id) => id !== patientId),
      };
      setCurrentCaretaker(updatedCaretaker);
      OfflineStore.saveCaretaker(updatedCaretaker);
    }
    if (currentPatient?.id === patientId) {
      setCurrentPatient(null);
    }
    fetchPatientsList();
  };

  const handleCaregiverUnlinked = (patient: PatientProfile) => {
    setCurrentPatient(patient);
    OfflineStore.savePatient(patient);
  };

  // Emergency phone call trigger
  const handleEmergencyCall = () => {
    const phone = currentPatient?.caregiverPhone || '9876543210';
    window.location.href = `tel:${phone}`;
  };

  // Logout
  const handleLogout = () => {
    OfflineStore.clearAuthSession();
    setCurrentPatient(null);
    setCurrentCaretaker(null);
    setRoutines([]);
    setReminders([]);
    setMemories([]);
    setSessions([]);
    setPendingRequests([]);
    setCurrentPath('/login');
    window.history.pushState(null, '', '/login');
  };

  const handleLoginSuccess = (
    newRole: UserRole,
    pat: PatientProfile | null,
    ct: CaretakerProfile | null,
    token: string
  ) => {
    setRole(newRole);
    if (pat) {
      setCurrentPatient(pat);
      OfflineStore.savePatient(pat);
      loadPatientData(pat.id);
    }
    if (ct) {
      setCurrentCaretaker(ct);
      OfflineStore.saveCaretaker(ct);
    }
    OfflineStore.saveAuthSession({
      role: newRole,
      patientId: pat?.id,
      caretakerId: ct?.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      token,
    });
    fetchPatientsList();
    setCurrentPath('/');
    window.history.replaceState(null, '', '/');
  };

  const handleSwitchRole = (targetRole: UserRole) => {
    setRole(targetRole);
    if (targetRole === 'CAREGIVER' && !currentCaretaker) {
      const localCaretaker = OfflineStore.getCaretaker();
      if (localCaretaker) {
        setCurrentCaretaker(localCaretaker);
      } else {
        setCurrentPath('/login');
        window.history.pushState(null, '', '/login');
      }
    } else if (targetRole === 'PATIENT' && !currentPatient) {
      const localPatient = OfflineStore.getPatient();
      if (localPatient) {
        setCurrentPatient(localPatient);
        loadPatientData(localPatient.id);
      } else {
        setCurrentPath('/login');
        window.history.pushState(null, '', '/login');
      }
    }
  };

  const isAuthenticated = Boolean(
    (role === 'PATIENT' && currentPatient) || (role === 'CAREGIVER' && currentCaretaker)
  );

  // Dedicated Full-Page Authentication View (No popup modal)
  if (!isAuthenticated || currentPath === '/login') {
    return (
      <div
        id="cognitivesaathi-app-root"
        className={`min-h-screen bg-[#FBF9F5] dark:bg-[#0D1117] text-[#292524] dark:text-[#E6EDF3] flex flex-col font-sans transition-colors duration-200 ${
          textScale === 'large'
            ? 'text-lg'
            : textScale === 'extralarge'
            ? 'text-xl'
            : 'text-base'
        }`}
      >
        <AuthPage
          currentLanguage={language}
          onLanguageChange={(newLang) => {
            setLanguage(newLang);
            OfflineStore.setLanguage(newLang);
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast(!highContrast)}
          initialRole={role}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  const t = (key: string) => getTranslation(key, language);

  return (
    <div
      id="cognitivesaathi-app-root"
      className={`min-h-screen bg-[#FBF9F5] dark:bg-[#0D1117] text-[#292524] dark:text-[#E6EDF3] flex flex-col font-sans transition-colors duration-200 ${
        textScale === 'large'
          ? 'text-lg'
          : textScale === 'extralarge'
          ? 'text-xl'
          : 'text-base'
      }`}
    >
      {/* Global Header */}
      <Header
        role={role}
        currentPatient={currentPatient}
        currentCaretaker={currentCaretaker}
        connectivity={connectivity}
        currentLanguage={language}
        onLanguageChange={(newLang) => {
          setLanguage(newLang);
          OfflineStore.setLanguage(newLang);
        }}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        textScale={textScale}
        onToggleTextScale={handleToggleTextScale}
        onOpenVoiceCompanion={() => setIsVoiceModalOpen(true)}
        onEmergencyCall={handleEmergencyCall}
        onTriggerSync={handleTriggerSync}
        onSwitchRole={handleSwitchRole}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main id="main-content-view" className="flex-1 max-w-4xl w-full mx-auto p-4 pb-24">
        {/* Un-dismissible Pending Caregiver Connection Confirmation Requests Banner */}
        {role === 'PATIENT' && pendingRequests.length > 0 && (
          <div id="pending-caregiver-requests-banner" className="mb-6 space-y-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                id={`connection-request-card-${req.id}`}
                className="p-5 sm:p-6 bg-amber-50 dark:bg-amber-950/70 border-3 border-amber-500 dark:border-amber-500 rounded-3xl shadow-lg animate-in fade-in"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md">
                      <HeartHandshake className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200 bg-amber-200 dark:bg-amber-900 px-2.5 py-0.5 rounded-full">
                          Caregiver Connection Request
                        </span>
                        <span className="text-xs text-stone-600 dark:text-stone-400">
                          {new Date(req.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-stone-950 dark:text-stone-100 mt-1.5">
                        {req.caretakerName} has requested to connect with your account to help manage your schedule.
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-300 mt-1 leading-relaxed">
                        Relationship: <span className="font-semibold">{req.caretakerRelation || 'Caregiver'}</span> • Phone: <span className="font-semibold">{req.caretakerPhone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
                    <button
                      id={`accept-caregiver-req-btn-${req.id}`}
                      onClick={() => handleRespondConnectionRequest(req.id, 'ACCEPT')}
                      className="flex-1 sm:flex-initial px-5 py-3 bg-teal-850 hover:bg-teal-900 active:scale-98 text-white text-sm sm:text-base font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-5 h-5 text-amber-300" />
                      <span>Accept Request</span>
                    </button>
                    <button
                      id={`decline-caregiver-req-btn-${req.id}`}
                      onClick={() => handleRespondConnectionRequest(req.id, 'DECLINE')}
                      className="flex-1 sm:flex-initial px-4 py-3 bg-white dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-sm sm:text-base font-bold rounded-2xl transition-all cursor-pointer"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Caregiver Removal Notice (if patient was unlinked) */}
        {role === 'PATIENT' && currentPatient?.caregiverRemovalNotice && (
          <div
            id="caregiver-removal-notice-banner"
            className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Care Circle Update</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {currentPatient.caregiverRemovalNotice.message}
                </p>
              </div>
            </div>
            <button
              id="dismiss-removal-notice-btn"
              onClick={() => {
                if (currentPatient) {
                  OfflineStore.dismissCaregiverRemovalNotice(currentPatient.id);
                  const updated = { ...currentPatient };
                  delete updated.caregiverRemovalNotice;
                  setCurrentPatient(updated);
                  fetch(`/api/patients/${currentPatient.id}/dismiss-notice`, { method: 'POST' }).catch(() => {});
                }
              }}
              className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PATIENT VIEW */}
        {/* ------------------------------------------------------------- */}
        {role === 'PATIENT' && (
          <>
            {/* Tab: Home */}
            {patientTab === 'home' && (
              <div id="patient-home-view" className="space-y-4 animate-in fade-in">
                {/* Reassurance Banner */}
                <div className="bg-gradient-to-br from-teal-900 via-teal-850 to-teal-800 text-white rounded-3xl p-5 sm:p-6 shadow-sm border border-teal-700 relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-700">
                      Gentle Morning Welcome
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold mt-2 text-amber-50 leading-tight">
                      {t('welcome_back')}{' '}
                      <span className="text-amber-300">{currentPatient?.preferredName || 'Friend'}</span>
                    </h2>
                    <p className="text-sm sm:text-base text-teal-100 mt-2 leading-relaxed">
                      {t('calm_reassurance')}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <button
                        id="start-activity-cta-btn"
                        onClick={() => openGame('find-matching')}
                        className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-2 transition-transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-stone-900" />
                        <span>{t('start_daily_exercise')}</span>
                      </button>
                      <button
                        id="open-companion-hero-btn"
                        onClick={() => setIsVoiceModalOpen(true)}
                        className="px-4 py-2.5 bg-teal-800/90 hover:bg-teal-750 text-amber-200 border border-teal-600 font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{t('voice_companion')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Telemetry Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Daily Streak</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {currentPatient?.dailyStreak || 0} Days 🔥
                    </p>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Completed Today</p>
                    <p className="text-xl font-bold text-teal-850 dark:text-teal-400 mt-0.5">
                      {routines.filter((r) => r.completed).length} Tasks
                    </p>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Care Circle</p>
                    <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1 truncate">
                      {currentPatient?.caregiverName ||
                        (currentPatient?.hasCaregiver ? 'Caregiver Linked' : 'No Caregiver Assigned')}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase">Patient ID</p>
                    <p className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 mt-1 truncate">
                      {currentPatient?.patientKey || 'PT-PENDING'}
                    </p>
                  </div>
                </div>

                {/* Today's Schedule Overview */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-teal-850 dark:text-teal-400" />
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                        {t('today_routine')}
                      </h3>
                    </div>
                    <button
                      onClick={() => navigatePatientTab('my_day')}
                      className="text-xs font-semibold text-teal-850 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {routines.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 italic p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center">
                      No routine tasks scheduled yet. Tap My Day to plan your day.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {routines.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          id={`patient-routine-row-${task.id}`}
                          onClick={() => handleToggleRoutine(task.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-colors cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400 line-through'
                              : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-stone-400 dark:text-stone-500 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-semibold">{task.title}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">{task.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cherished Heritage Memories Preview */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-teal-850 dark:text-teal-400" />
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                        {t('family_memories')}
                      </h3>
                    </div>
                    <button
                      onClick={() => navigatePatientTab('memories')}
                      className="text-xs font-semibold text-teal-850 dark:text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>Open Album</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {memories.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 italic p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center">
                      Keepsake album is currently empty.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {memories.slice(0, 2).map((mem) => (
                        <div
                          key={mem.id}
                          className="bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden shadow-2xs flex flex-col"
                        >
                          <img
                            src={mem.imageUrl}
                            alt={mem.imageAlt}
                            className="h-32 w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="p-3">
                            <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wide">
                              {mem.region} • {mem.category}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 mt-0.5 truncate">
                              {mem.title}
                            </h4>
                            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                              {mem.story}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Activities & Games */}
            {patientTab === 'activities' && (
              <div id="patient-activities-view" className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                      {t('activities_title')}
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Gentle cognitive exercises designed with clear layouts, simple objects, and audio cues.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 rounded-xl text-xs font-semibold self-start sm:self-auto">
                    <Volume2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Voice Assistance on Request</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Featured Game: Memory Tiles (Card Matching / Concentration) */}
                  <div
                    id="game-card-memory-tiles"
                    onClick={() => openGame('memory-tiles')}
                    className="sm:col-span-2 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/50 dark:from-stone-900 dark:via-stone-900/90 dark:to-amber-950/30 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 dark:border-amber-700/70 shadow-xs hover:border-amber-500 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-400 text-teal-950 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
                        🎴
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                            Turn-Based Visual Recall
                          </span>
                          <span className="text-[10px] font-bold text-teal-850 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                            2×2 • 3×4 • 4×4 Grids
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                            Simple Everyday Objects
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100 mt-1">
                          Memory Tiles (Everyday Objects)
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed max-w-xl">
                          Uncover and pair identical everyday objects (clock, apple, tea mug, key, camera, shoes) hidden beneath face-down tiles in the fewest moves. Configurable flip delay and voice prompts on demand.
                        </p>
                      </div>
                    </div>
                    <button
                      id="play-memory-tiles-btn"
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs whitespace-nowrap"
                    >
                      Play Memory Tiles
                    </button>
                  </div>

                  {/* New Game: Recognize Objects by Description */}
                  <div
                    id="game-card-recognize-by-description"
                    onClick={() => openGame('recognize-by-description')}
                    className="sm:col-span-2 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 dark:from-teal-950/40 dark:via-stone-900 dark:to-emerald-950/30 rounded-3xl p-5 sm:p-6 border-2 border-teal-300 dark:border-teal-700/70 shadow-xs hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white flex items-center justify-center text-3xl shrink-0 shadow-2xs">
                        🔍
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-200 dark:bg-teal-900/60 text-teal-950 dark:text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-300 dark:border-teal-700">
                            Description Matching
                          </span>
                          <span className="text-[10px] font-bold text-teal-850 dark:text-teal-300 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                            🔊 Read-Aloud Voiceover
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            Authentic Audio Cues
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100 mt-1">
                          Heritage Clues & Object Recognition
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed max-w-xl">
                          Listen or read vivid heritage clues about traditional instruments (Pepa, Dhol, Flute), sacred bell metal crafts, and regional treasures, then identify the matching cultural object.
                        </p>
                      </div>
                    </div>
                    <button
                      id="play-recognize-by-description-btn"
                      className="w-full sm:w-auto px-5 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs whitespace-nowrap"
                    >
                      Play Clue Matcher
                    </button>
                  </div>

                  {/* Personal Memories & Loved Ones Quiz (AI 4-Choice Reminiscence Game) */}
                  <div
                    id="game-card-personal-memory-quiz"
                    onClick={() => openGame('personal-memory-quiz')}
                    className={`sm:col-span-2 rounded-3xl p-5 sm:p-6 border-2 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      (memories.length + people.length) > 0
                        ? 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-amber-950/40 dark:via-stone-900 dark:to-orange-950/30 border-amber-300 dark:border-amber-700/70 shadow-xs hover:border-amber-500 hover:shadow-sm'
                        : 'bg-stone-100/90 dark:bg-stone-900/80 border-dashed border-stone-300 dark:border-stone-700 opacity-90 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-2xs ${
                          (memories.length + people.length) > 0
                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950'
                            : 'bg-stone-300 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {(memories.length + people.length) > 0 ? '📖' : '🔒'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {(memories.length + people.length) > 0 ? (
                            <>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                                AI Life Reminiscence
                              </span>
                              <span className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-850 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                                {people.length} Loved Ones • {memories.length} Memories
                              </span>
                              <span className="text-[10px] font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                4-Choice Recall
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2.5 py-0.5 rounded-full">
                              Awaiting Memories & Loved Ones
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100 mt-1">
                          Personal Memories & Loved Ones Quiz
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 leading-relaxed max-w-xl">
                          {(memories.length + people.length) > 0
                            ? 'Answer gentle 4-choice questions about your family members, loved ones, and life scenarios generated directly by AI from your personal memories.'
                            : 'This personalized game is currently blank because no memories or loved ones have been added in your Memories tab yet. Add family members or life stories to unlock!'}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                      {(memories.length + people.length) > 0 ? (
                        <button
                          id="play-personal-memory-quiz-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGame('personal-memory-quiz');
                          }}
                          className="w-full sm:w-auto px-5 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs whitespace-nowrap cursor-pointer"
                        >
                          Play Memory Quiz
                        </button>
                      ) : (
                        <button
                          id="unlock-personal-memory-quiz-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigatePatientTab('memories');
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl shadow-xs whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                          <span>Add in Memories Tab</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {currentPatient?.hasCaregiver && (
                    <div className="sm:col-span-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-3 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span>
                          Your play frequency, accuracy, and daily streaks are gently shared with your caregiver{' '}
                          <strong>{currentPatient.caregiverName || 'Circle'}</strong>.
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    id="game-card-find-matching"
                    onClick={() => openGame('find-matching')}
                    className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mb-3 border border-amber-300">
                        🍎
                      </div>
                      <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                        Visual Memory • Pairs
                      </span>
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mt-2">
                        Object Memory Match
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                        Match pairs of familiar everyday objects like clock, key, and coffee cup.
                      </p>
                    </div>
                    <button
                      id="play-matching-game-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGame('find-matching');
                      }}
                      className="mt-4 w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                    >
                      Play Matching Game
                    </button>
                  </div>

                  <div
                    id="game-card-pattern-sequence"
                    onClick={() => openGame('pattern-sequence')}
                    className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-850 flex items-center justify-center text-2xl mb-3 border border-teal-300">
                        🎵
                      </div>
                      <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                        2×2 & 3×3 Modes • High Scores
                      </span>
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mt-2">
                        Music Pattern Game
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                        Follow the musical melody as tempo quickens each round until a note is missed. Play 2×2 or 3×3 grids to set high scores!
                      </p>
                    </div>
                    <button
                      id="play-pattern-sequence-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGame('pattern-sequence');
                      }}
                      className="mt-4 w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                    >
                      Play Music Pattern
                    </button>
                  </div>

                  <div
                    id="game-card-object-familiarity"
                    onClick={() => openGame('object-familiarity')}
                    className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center text-2xl mb-3 border border-rose-300">
                        🪷
                      </div>
                      <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                        Cultural Reminiscence
                      </span>
                      <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mt-2">
                        Familiar Objects & Stories
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                        Identify treasured heritage crafts, bell metal utensils, and family celebrations.
                      </p>
                    </div>
                    <button
                      id="play-object-familiarity-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGame('object-familiarity');
                      }}
                      className="mt-4 w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                    >
                      Play Story Recall
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: My Day / Routines */}
            {patientTab === 'my_day' && (
              <div id="patient-my-day-view" className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                    {t('my_day_title')}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Gentle, predictable routines bring comfort and peace to each day.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                      Daily Routine Tasks ({routines.filter((r) => r.completed).length} of{' '}
                      {routines.length})
                    </h3>
                  </div>

                  {routines.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400">
                      No routine tasks scheduled for today.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {routines.map((task) => (
                        <div
                          key={task.id}
                          id={`my-day-routine-${task.id}`}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                            task.completed
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400 line-through'
                              : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleRoutine(task.id)}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-stone-400 dark:text-stone-500 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-semibold">{task.title}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {task.timeSlot} • {task.time}
                              </p>
                              {task.notes && (
                                <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">{task.notes}</p>
                              )}
                            </div>
                          </div>
                          <button
                            id={`delete-routine-btn-${task.id}`}
                            onClick={() => handleDeleteRoutine(task.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Routine Form */}
                <form
                  onSubmit={handleAddRoutine}
                  className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Add a New Routine Task
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      id="new-routine-title-input"
                      type="text"
                      required
                      value={newRoutineTitle}
                      onChange={(e) => setNewRoutineTitle(e.target.value)}
                      placeholder="e.g. Afternoon Tea with Family"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 sm:col-span-2"
                    />
                    <input
                      id="new-routine-time-input"
                      type="text"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                      placeholder="04:00 PM"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <button
                    id="submit-add-routine-btn"
                    type="submit"
                    className="w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </form>

                {/* Medication & Hydration Reminders */}
                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">
                      Medicine & Hydration Schedule
                    </h3>
                  </div>

                  {reminders.length === 0 ? (
                    <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400">
                      No medication or hydration reminders logged.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map((rem) => (
                        <div
                          key={rem.id}
                          id={`my-day-reminder-${rem.id}`}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
                            rem.completedToday
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400 line-through'
                              : 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleReminder(rem.id)}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            {rem.completedToday ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-stone-400 dark:text-stone-500 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-semibold">{rem.title}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {rem.time} • {rem.description}
                              </p>
                            </div>
                          </div>
                          <button
                            id={`delete-reminder-btn-${rem.id}`}
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Reminder Form */}
                <form
                  onSubmit={handleAddReminder}
                  className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Add a New Medication or Hydration Reminder
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      id="new-reminder-title-input"
                      type="text"
                      required
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      placeholder="e.g. Afternoon Water Cup"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 sm:col-span-2"
                    />
                    <input
                      id="new-reminder-time-input"
                      type="text"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      placeholder="02:30 PM"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <button
                    id="submit-add-reminder-btn"
                    type="submit"
                    className="w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Reminder</span>
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Memories */}
            {patientTab === 'memories' && (
              <div id="patient-memories-view" className="space-y-4 animate-in fade-in">
                {/* Two Separate Sub-Tabs: Memories vs People in Life */}
                <div className="flex items-center gap-1.5 p-1.5 bg-stone-200/80 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 w-full sm:w-fit">
                  <button
                    id="patient-subtab-memories-btn"
                    type="button"
                    onClick={() => setMemorySubTab('memories')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      memorySubTab === 'memories'
                        ? 'bg-teal-850 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-stone-700/60'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Memories ({memories.length})</span>
                  </button>

                  <button
                    id="patient-subtab-people-btn"
                    type="button"
                    onClick={() => setMemorySubTab('people')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      memorySubTab === 'people'
                        ? 'bg-teal-850 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-stone-700/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>People ({people.length})</span>
                  </button>
                </div>

                {memorySubTab === 'people' ? (
                  <PeopleInLifeView
                    people={people}
                    patientId={currentPatient?.id || 'patient-1'}
                    patientName={currentPatient?.preferredName || currentPatient?.fullName || 'Elder'}
                    onAddPerson={handleAddPerson}
                    onUpdatePerson={handleUpdatePerson}
                    onDeletePerson={handleDeletePerson}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-teal-900 via-teal-850 to-teal-900 text-white p-4 rounded-3xl shadow-sm">
                      <div>
                        <h2 className="text-xl font-serif font-bold text-white">
                          {t('memories_title')}
                        </h2>
                        <p className="text-xs text-teal-200 mt-0.5">
                          Reconnecting with joyful roots, Northeast festivals, and cherished family moments.
                        </p>
                      </div>
                      <button
                        id="open-voicenote-modal-top-btn"
                        onClick={() => setIsVoiceNoteModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-teal-950 rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all shrink-0"
                      >
                        <Mic className="w-4 h-4 text-rose-700" />
                        <span>Record Voice Note (AI Summarized)</span>
                      </button>
                    </div>

                    {memories.length === 0 ? (
                      <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 text-center shadow-2xs space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300">
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">No Memories Added Yet</h3>
                          <p className="text-xs text-stone-600 dark:text-stone-400">
                            Record cherished moments, cultural festivals, and family stories below to keep your precious memories alive.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {memories.map((mem) => {
                          const isReading = activeReadingMemoryId === mem.id;
                          return (
                            <div
                              key={mem.id}
                              className={`bg-white dark:bg-stone-900 rounded-3xl border overflow-hidden shadow-2xs flex flex-col transition-all ${
                                isReading
                                  ? 'border-amber-400 ring-2 ring-amber-300/60 shadow-md'
                                  : 'border-stone-200 dark:border-stone-800'
                              }`}
                            >
                              <MemoryCardPhotoGallery
                                memory={mem}
                                onOpenViewer={(m, idx) => {
                                  setViewerMemory(m);
                                  setViewerPhotoIndex(idx);
                                  setIsPhotoViewerOpen(true);
                                }}
                                onAddMorePhotos={(m) => {
                                  setAddPhotosTargetMemory(m);
                                  setIsAddPhotosModalOpen(true);
                                }}
                              />
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wide bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                                      {mem.region} • {mem.category}
                                    </span>
                                    <span className="text-xs text-stone-400 dark:text-stone-500">{mem.dateLabel}</span>
                                  </div>
                                  <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 mt-2">
                                    {mem.title}
                                  </h3>
                                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">{mem.story}</p>
                                  {mem.voiceNoteAudioUrl && (
                                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                                      <audio
                                        controls
                                        src={mem.voiceNoteAudioUrl}
                                        className="h-7 w-full max-w-xs text-xs"
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                                  <MemoryVoiceReaderButton
                                    memory={mem}
                                    activeReadingId={activeReadingMemoryId}
                                    onStartReading={handleStartReadingMemory}
                                    onStopReading={handleStopReadingMemory}
                                  />
                                  <button
                                    id={`delete-memory-btn-${mem.id}`}
                                    onClick={() => handleDeleteMemory(mem.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                                    title="Delete memory"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="sr-only">Delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Memory Form */}
                    <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                          Add a Cherished Keepsake Memory
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsVoiceNoteModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-full text-xs font-semibold text-teal-950 dark:text-amber-200 transition-colors shadow-2xs"
                        >
                          <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Record Voice Note with AI</span>
                        </button>
                      </div>

                      <form onSubmit={handleAddMemory} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            id="new-memory-title-input"
                            type="text"
                            required
                            value={newMemoryTitle}
                            onChange={(e) => setNewMemoryTitle(e.target.value)}
                            placeholder="Title (e.g. Rongali Bihu Morning)"
                            className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                          <select
                            id="new-memory-region-select"
                            value={newMemoryRegion}
                            onChange={(e) => setNewMemoryRegion(e.target.value)}
                            className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          >
                            <option value="Assam">Assam</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Tripura">Tripura</option>
                          </select>
                        </div>
                        <textarea
                          id="new-memory-story-input"
                          rows={2}
                          value={newMemoryStory}
                          onChange={(e) => setNewMemoryStory(e.target.value)}
                          placeholder="Short comforting description of what happened..."
                          className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <PhotoUploadZone
                          photos={newMemoryPhotos}
                          onPhotosChange={setNewMemoryPhotos}
                          label="Attach Photos (Multiple Supported)"
                          helperText="Add pictures of loved ones, festive gatherings, or hometown places"
                          idPrefix="patient-add-memory"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            id="submit-add-memory-btn"
                            type="submit"
                            className="flex-1 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Save to Keepsake Album</span>
                          </button>
                          <button
                            type="button"
                            id="open-voicenote-recorder-form-btn"
                            onClick={() => setIsVoiceNoteModalOpen(true)}
                            className="py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-teal-950 font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <Mic className="w-4 h-4 text-teal-950" />
                            <span>Speak Memory Instead</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Profile / Me */}
            {patientTab === 'me' && (
              <div id="patient-profile-view" className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{t('me_title')}</h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Your personal information and connected family circle.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-teal-850 text-amber-300 font-serif font-bold text-xl flex items-center justify-center border-2 border-teal-700">
                      {currentPatient?.preferredName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                        {currentPatient?.fullName}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Age: {currentPatient?.age} • {currentPatient?.region || 'Assam'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                    <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700">
                      <p className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                        Your Patient Key
                      </p>
                      <p className="text-sm font-mono font-bold text-teal-850 dark:text-teal-300 mt-0.5">
                        {currentPatient?.patientKey || 'PT-DEFAULT'}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        Give this key to your caregiver to connect.
                      </p>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700">
                      <p className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                        Linked Family Caregiver
                      </p>
                      <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                        {currentPatient?.caregiverName || 'Self-Care Mode'}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                        {currentPatient?.caregiverPhone ? `Phone: ${currentPatient.caregiverPhone}` : 'No phone connected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="open-caregiver-circle-modal-btn"
                      onClick={() => setIsCircleModalOpen(true)}
                      className="flex-1 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                    >
                      Manage Caregiver Connection
                    </button>
                    <button
                      id="patient-call-caregiver-btn"
                      onClick={handleEmergencyCall}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Call Caregiver</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Settings / Comfort */}
            {patientTab === 'settings' && (
              <div id="patient-settings-view" className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                    {t('settings_title')}
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Adjust text size, contrast, and language for maximum visual comfort.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                  {/* High Contrast */}
                  <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t('high_contrast')}</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Increases clarity with pure high contrast borders.
                      </p>
                    </div>
                    <button
                      id="settings-toggle-high-contrast"
                      onClick={() => setHighContrast(!highContrast)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                        highContrast
                          ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                          : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      {highContrast ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Text Scale */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{t('large_text')}</h4>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          id="text-scale-decrease-btn"
                          onClick={() => {
                            const next: TextScale = textScale === 'extralarge' ? 'large' : 'normal';
                            setTextScale(next);
                            OfflineStore.setTextScale(next);
                          }}
                          disabled={textScale === 'normal'}
                          title="Decrease font size"
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          id="text-scale-increase-btn"
                          onClick={() => {
                            const next: TextScale = textScale === 'normal' ? 'large' : 'extralarge';
                            setTextScale(next);
                            OfflineStore.setTextScale(next);
                          }}
                          disabled={textScale === 'extralarge'}
                          title="Increase font size"
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        >
                          A+
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(['normal', 'large', 'extralarge'] as TextScale[]).map((scale) => (
                        <button
                          key={scale}
                          id={`text-scale-btn-${scale}`}
                          onClick={() => {
                            setTextScale(scale);
                            OfflineStore.setTextScale(scale);
                          }}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border ${
                            textScale === scale
                              ? 'bg-teal-850 text-white border-teal-850 shadow-xs'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                          }`}
                        >
                          {scale === 'extralarge' ? 'Extra Large' : scale}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Regional Language (NER)</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(LANGUAGE_METADATA) as LanguageCode[]).map((code) => (
                        <button
                          key={code}
                          id={`lang-btn-${code}`}
                          onClick={() => {
                            setLanguage(code);
                            OfflineStore.setLanguage(code);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold border text-left flex flex-col ${
                            language === code
                              ? 'bg-teal-850 text-white border-teal-850'
                              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                          }`}
                        >
                          <span className="font-bold">{LANGUAGE_METADATA[code].nativeName}</span>
                          <span className="text-[10px] opacity-80">{LANGUAGE_METADATA[code].name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reconnect & Sync */}
                  <div className="pt-2">
                    <button
                      id="settings-test-reconnect-btn"
                      onClick={handleTriggerSync}
                      className="w-full py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl border border-stone-300 dark:border-stone-700 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                      <span>Test Reconnect & Sync Telemetry</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------- */}
        {/* CAREGIVER VIEW */}
        {/* ------------------------------------------------------------- */}
        {role === 'CAREGIVER' && (
          <>
            {/* Caregiver Tab: Dashboard Overview */}
            {caregiverTab === 'dashboard' && (
              <div id="caregiver-dashboard-view" className="space-y-4 animate-in fade-in">
                <div className="bg-teal-900 text-white rounded-3xl p-5 sm:p-6 border border-teal-800 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-700">
                    Caregiver Co-Pilot • Northeast India
                  </span>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold mt-2">
                    Caring for {currentPatient?.fullName || 'Senior Loved One'}
                  </h2>
                  <p className="text-xs sm:text-sm text-teal-100 mt-1">
                    Caregiver Key: <span className="font-mono font-bold text-amber-200">{currentCaretaker?.caregiverKey || 'CG-ACTIVE'}</span>
                  </p>
                </div>

                {/* Cognitive Stability Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">Stability Score</p>
                    <p className="text-2xl font-bold text-teal-850 dark:text-teal-300 mt-0.5">88/100</p>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                      Stable Trajectory
                    </span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">Routine Adherence</p>
                    <p className="text-2xl font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                      {Math.round(
                        (routines.filter((r) => r.completed).length / Math.max(1, routines.length)) *
                          100
                      )}
                      %
                    </p>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {routines.filter((r) => r.completed).length} of {routines.length} today
                    </span>
                  </div>
                  <div
                    id="caregiver-metric-games-btn"
                    onClick={() => navigateCaregiverTab('games')}
                    className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">Game Sessions</p>
                      <Gamepad2 className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-amber-600 mt-0.5">{sessions.length}</p>
                    <span className="text-[10px] text-teal-850 dark:text-teal-300 font-semibold flex items-center gap-0.5">
                      View Accuracy →
                    </span>
                  </div>
                  <div className="bg-white dark:bg-stone-900 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">Meds Compliance</p>
                    <p className="text-2xl font-bold text-teal-800 dark:text-teal-300 mt-0.5">
                      {reminders.filter((r) => r.completedToday).length}/{reminders.length}
                    </p>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">Scheduled pills taken</span>
                  </div>
                </div>

                {/* Quick Caregiver Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div
                    id="caregiver-quick-games-btn"
                    onClick={() => navigateCaregiverTab('games')}
                    className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-500 cursor-pointer"
                  >
                    <Gamepad2 className="w-5 h-5 text-teal-850 dark:text-teal-400 mb-2" />
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Game Performance</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Visual recall, accuracy rates, and play frequency.
                    </p>
                  </div>
                  <div
                    onClick={() => navigateCaregiverTab('routine')}
                    className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-500 cursor-pointer"
                  >
                    <ListTodo className="w-5 h-5 text-teal-850 dark:text-teal-400 mb-2" />
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Manage Routines</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Customize daily morning, afternoon, and evening routines.
                    </p>
                  </div>
                  <div
                    onClick={() => navigateCaregiverTab('reports')}
                    className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-500 cursor-pointer"
                  >
                    <BarChart3 className="w-5 h-5 text-teal-850 dark:text-teal-400 mb-2" />
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Clinical & AI Digest</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Review MMSE-aligned cognitive telemetry and doctor notes.
                    </p>
                  </div>
                  <div
                    onClick={() => setIsCircleModalOpen(true)}
                    className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-teal-700 dark:hover:border-teal-500 cursor-pointer"
                  >
                    <User className="w-5 h-5 text-teal-850 dark:text-teal-400 mb-2" />
                    <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100">Care Circle Members</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Link or remove seniors under your care.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Caregiver Tab: Game Performance, Accuracy & Play Frequency */}
            {caregiverTab === 'games' && (
              <CaregiverGameAnalytics
                currentPatient={currentPatient}
                currentCaretaker={currentCaretaker}
                sessions={sessions}
                onRefresh={() => {
                  if (currentPatient) {
                    fetch(`/api/sessions/${currentPatient.id}`)
                      .then((res) => (res.ok ? res.json() : []))
                      .then((data) => {
                        if (Array.isArray(data)) {
                          setSessions(data);
                          data.forEach((s) => OfflineStore.saveSession(s));
                        }
                      })
                      .catch(() => {});
                  }
                }}
                onNavigateToRoutine={() => navigateCaregiverTab('routine')}
              />
            )}

            {/* Caregiver Tab: Routines */}
            {caregiverTab === 'routine' && (
              <div id="caregiver-routine-view" className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Daily Routines</h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Routines synchronized for {currentPatient?.fullName || 'Patient'}.
                    </p>
                  </div>
                  <button
                    id="caregiver-suggest-routine-btn"
                    onClick={handleGenerateAiRoutines}
                    disabled={isGeneratingRoutines}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5"
                  >
                    {isGeneratingRoutines ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>AI Routine Suggestions</span>
                  </button>
                </div>

                {/* AI Routine Suggestions Box */}
                {aiSuggestions.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-4 space-y-2">
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                      AI Suggested Cultural Routines for Northeast Dementia Care
                    </p>
                    <div className="space-y-2">
                      {aiSuggestions.map((sug, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-white dark:bg-stone-800 p-3 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs"
                        >
                          <div>
                            <p className="font-bold text-stone-900 dark:text-stone-100">{sug.title}</p>
                            <p className="text-stone-500 dark:text-stone-400">{sug.timeSlot} • {sug.time} • {sug.notes}</p>
                          </div>
                          <button
                            onClick={() => handleApplyAiSuggestion(sug)}
                            className="px-2.5 py-1 bg-teal-850 hover:bg-teal-900 text-white font-semibold rounded-lg shrink-0 ml-2"
                          >
                            Add to Day
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
                  {routines.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-4">No routines set.</p>
                  ) : (
                    routines.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2
                            className={`w-4 h-4 ${task.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-300 dark:text-stone-600'}`}
                          />
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-stone-100">{task.title}</p>
                            <p className="text-stone-500 dark:text-stone-400">{task.timeSlot} • {task.time}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRoutine(task.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Routine Form */}
                <form
                  onSubmit={handleAddRoutine}
                  className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Add Routine Task
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={newRoutineTitle}
                      onChange={(e) => setNewRoutineTitle(e.target.value)}
                      placeholder="e.g. Garden Walk & Tulsi Tea"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 sm:col-span-2"
                    />
                    <input
                      type="text"
                      value={newRoutineTime}
                      onChange={(e) => setNewRoutineTime(e.target.value)}
                      placeholder="08:00 AM"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                  >
                    Save Routine Task
                  </button>
                </form>
              </div>
            )}

            {/* Caregiver Tab: Meds & Reminders */}
            {caregiverTab === 'reminders' && (
              <div id="caregiver-reminders-view" className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Medication & Hydration</h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Ensure adherence to memory and clinical prescriptions.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
                  {reminders.length === 0 ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400 text-center py-4">No reminders logged.</p>
                  ) : (
                    reminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2
                            className={`w-4 h-4 ${rem.completedToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-300 dark:text-stone-600'}`}
                          />
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-stone-100">{rem.title}</p>
                            <p className="text-stone-500 dark:text-stone-400">{rem.time} • {rem.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={handleAddReminder}
                  className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Add Reminder
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      placeholder="e.g. Memory Prescribed Tablet"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 sm:col-span-2"
                    />
                    <input
                      type="text"
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      placeholder="08:30 PM"
                      className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                  >
                    Save Reminder
                  </button>
                </form>
              </div>
            )}

            {/* Caregiver Tab: Album & Loved Ones */}
            {caregiverTab === 'memories' && (
              <div id="caregiver-memories-view" className="space-y-4 animate-in fade-in">
                {/* Two Separate Sub-Tabs: Memories vs People in Life */}
                <div className="flex items-center gap-1.5 p-1.5 bg-stone-200/80 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700 w-full sm:w-fit">
                  <button
                    id="caregiver-subtab-memories-btn"
                    type="button"
                    onClick={() => setMemorySubTab('memories')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      memorySubTab === 'memories'
                        ? 'bg-teal-850 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-stone-700/60'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Memories ({memories.length})</span>
                  </button>

                  <button
                    id="caregiver-subtab-people-btn"
                    type="button"
                    onClick={() => setMemorySubTab('people')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all ${
                      memorySubTab === 'people'
                        ? 'bg-teal-850 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-stone-700/60'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>People ({people.length})</span>
                  </button>
                </div>

                {memorySubTab === 'people' ? (
                  <PeopleInLifeView
                    people={people}
                    patientId={currentPatient?.id || 'patient-1'}
                    patientName={currentPatient?.preferredName || currentPatient?.fullName || 'Patient'}
                    isCaregiverView={true}
                    onAddPerson={handleAddPerson}
                    onUpdatePerson={handleUpdatePerson}
                    onDeletePerson={handleDeletePerson}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                      <div>
                        <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Keepsake Album Management</h2>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          Upload and manage nostalgic family photos and voice notes for reminiscence therapy.
                        </p>
                      </div>
                      <button
                        id="caregiver-open-voicenote-btn"
                        onClick={() => setIsVoiceNoteModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-teal-950 rounded-xl text-xs font-bold shadow-2xs transition-all shrink-0"
                      >
                        <Mic className="w-4 h-4 text-rose-700" />
                        <span>Record Voice Note (AI Summarized)</span>
                      </button>
                    </div>

                    {memories.length === 0 ? (
                      <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 text-center shadow-2xs space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300">
                          <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="max-w-md mx-auto space-y-1">
                          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">No Memories Added Yet</h3>
                          <p className="text-xs text-stone-600 dark:text-stone-400">
                            Upload photos, stories, or voice notes below to build the patient's personal memory album.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {memories.map((mem) => {
                          const isReading = activeReadingMemoryId === mem.id;
                          return (
                            <div
                              key={mem.id}
                              className={`bg-white dark:bg-stone-900 rounded-2xl border overflow-hidden shadow-2xs transition-all flex flex-col justify-between ${
                                isReading ? 'border-amber-400 ring-2 ring-amber-300/60' : 'border-stone-200 dark:border-stone-800'
                              }`}
                            >
                              <div>
                                <MemoryCardPhotoGallery
                                  memory={mem}
                                  onOpenViewer={(m, idx) => {
                                    setViewerMemory(m);
                                    setViewerPhotoIndex(idx);
                                    setIsPhotoViewerOpen(true);
                                  }}
                                  onAddMorePhotos={(m) => {
                                    setAddPhotosTargetMemory(m);
                                    setIsAddPhotosModalOpen(true);
                                  }}
                                  isCaregiverView
                                />
                                <div className="p-3">
                                  <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">{mem.title}</p>
                                  <p className="text-[10px] text-stone-500 dark:text-stone-400">{mem.region} • {mem.category}</p>
                                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">{mem.story}</p>
                                  {mem.voiceNoteAudioUrl && (
                                    <div className="mt-2 pt-1.5 border-t border-stone-100 dark:border-stone-800">
                                      <audio
                                        controls
                                        src={mem.voiceNoteAudioUrl}
                                        className="h-6 w-full max-w-xs text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 pt-0 flex items-center justify-between gap-2 border-t border-stone-50 dark:border-stone-800 mt-1">
                                <MemoryVoiceReaderButton
                                  memory={mem}
                                  activeReadingId={activeReadingMemoryId}
                                  onStartReading={handleStartReadingMemory}
                                  onStopReading={handleStopReadingMemory}
                                />
                                <button
                                  onClick={() => handleDeleteMemory(mem.id)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Delete memory"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Caregiver Add Memory Form with Photo Upload */}
                    <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                            Add New Keepsake Memory for Patient
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            Upload multi-photo family albums or reminiscence prompts.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsVoiceNoteModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-full text-xs font-semibold text-teal-950 dark:text-amber-200 transition-colors shadow-2xs"
                        >
                          <Mic className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Record Voice Note with AI</span>
                        </button>
                      </div>

                      <form onSubmit={handleAddMemory} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            id="caregiver-new-memory-title"
                            type="text"
                            required
                            value={newMemoryTitle}
                            onChange={(e) => setNewMemoryTitle(e.target.value)}
                            placeholder="Title (e.g. Granddaughter's Wedding in Guwahati)"
                            className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          />
                          <select
                            id="caregiver-new-memory-region"
                            value={newMemoryRegion}
                            onChange={(e) => setNewMemoryRegion(e.target.value)}
                            className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                          >
                            <option value="Assam">Assam</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Tripura">Tripura</option>
                          </select>
                        </div>
                        <textarea
                          id="caregiver-new-memory-story"
                          rows={2}
                          value={newMemoryStory}
                          onChange={(e) => setNewMemoryStory(e.target.value)}
                          placeholder="Narrative description to stimulate familiar memories..."
                          className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-teal-700 focus:outline-none bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                        />
                        <PhotoUploadZone
                          photos={newMemoryPhotos}
                          onPhotosChange={setNewMemoryPhotos}
                          label="Attach Photos (Multiple Supported)"
                          helperText="Add family photographs, heirloom moments, or festival pictures"
                          idPrefix="caregiver-add-memory"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            id="caregiver-submit-add-memory-btn"
                            type="submit"
                            className="flex-1 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Save to Patient's Album</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Caregiver Tab: Clinical AI Digest & Reports */}
            {caregiverTab === 'reports' && (
              <div id="caregiver-reports-view" className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                      Clinical AI Digest & Telemetry
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      Evidence-based MMSE cognitive trajectories for geriatric review.
                    </p>
                  </div>
                  <button
                    id="generate-clinical-report-btn"
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport}
                    className="px-3.5 py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2"
                  >
                    {isGeneratingReport ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span>Generate Today's Report</span>
                  </button>
                </div>

                {clinicalReport ? (
                  <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                      <div>
                        <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                          {clinicalReport.summaryTitle}
                        </h3>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Status: {clinicalReport.stabilityStatus}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-teal-850 dark:text-teal-300">
                        Score: {clinicalReport.cognitiveStabilityScore}/100
                      </span>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                      <p className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                        Family Narrative Overview
                      </p>
                      <p className="text-xs text-stone-800 dark:text-stone-200 mt-1 leading-relaxed">
                        {clinicalReport.familyNarrative}
                      </p>
                    </div>

                    <div className="bg-stone-50 dark:bg-stone-800/80 p-4 rounded-2xl border border-stone-200 dark:border-stone-700">
                      <p className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
                        Clinical & Reaction Time Analysis
                      </p>
                      <p className="text-xs text-stone-800 dark:text-stone-200 mt-1 leading-relaxed">
                        {clinicalReport.clinicalAnalysis}
                      </p>
                    </div>

                    {clinicalReport.mmseAlignment && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-850">
                          <p className="text-[10px] font-bold uppercase text-teal-900 dark:text-teal-200">Orientation</p>
                          <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                            {clinicalReport.mmseAlignment.orientationScore}
                          </p>
                        </div>
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-850">
                          <p className="text-[10px] font-bold uppercase text-teal-900 dark:text-teal-200">Recall</p>
                          <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                            {clinicalReport.mmseAlignment.recallScore}
                          </p>
                        </div>
                        <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-850">
                          <p className="text-[10px] font-bold uppercase text-teal-900 dark:text-teal-200">Attention</p>
                          <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                            {clinicalReport.mmseAlignment.attentionScore}
                          </p>
                        </div>
                      </div>
                    )}

                    {clinicalReport.caregiverActionItems && (
                      <div>
                        <p className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1.5">
                          Caregiver Action Items
                        </p>
                        <ul className="space-y-1">
                          {clinicalReport.caregiverActionItems.map((item: string, idx: number) => (
                            <li key={idx} className="text-xs text-stone-700 dark:text-stone-300 flex items-start gap-1.5">
                              <span className="text-teal-700 dark:text-teal-400 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 border border-stone-200 dark:border-stone-800 shadow-2xs text-center">
                    <BarChart3 className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <h3 className="font-serif font-bold text-sm text-stone-800 dark:text-stone-200">
                      No Report Generated Yet
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                      Tap the "Generate Today's Report" button above to produce an AI & clinical analysis for {currentPatient?.fullName || 'the senior'}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Caregiver Tab: Me & Care Circle */}
            {caregiverTab === 'me' && (
              <div id="caregiver-me-view" className="space-y-4 animate-in fade-in">
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Care Circle Management</h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Connect and watch over seniors and family members.
                  </p>
                </div>

                <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Your Caregiver Key</p>
                      <p className="text-xl font-mono font-bold text-teal-850 dark:text-teal-300">
                        {currentCaretaker?.caregiverKey || 'CG-ACTIVE'}
                      </p>
                    </div>
                    <button
                      id="caregiver-open-circle-btn"
                      onClick={() => setIsCircleModalOpen(true)}
                      className="px-3.5 py-2 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs rounded-xl shadow-2xs"
                    >
                      Manage Seniors
                    </button>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Connected Patients ({allPatients.length})
                    </p>
                    <div className="space-y-2">
                      {allPatients.map((pat) => (
                        <div
                          key={pat.id}
                          className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-stone-900 dark:text-stone-100">{pat.fullName}</p>
                            <p className="text-stone-500 dark:text-stone-400">
                              Key: {pat.patientKey || 'PT-DEFAULT'} • Age: {pat.age}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setCurrentPatient(pat);
                              loadPatientData(pat.id);
                            }}
                            className={`px-3 py-1 rounded-lg font-semibold ${
                              currentPatient?.id === pat.id
                                ? 'bg-teal-850 text-white'
                                : 'bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600'
                            }`}
                          >
                            {currentPatient?.id === pat.id ? 'Active' : 'Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        role={role}
        patientTab={patientTab}
        caregiverTab={caregiverTab}
        onSelectPatientTab={navigatePatientTab}
        onSelectCaregiverTab={navigateCaregiverTab}
      />

      {/* Cognitive Games Overlay */}
      {activeGameId === 'personal-memory-quiz' ? (
        <PersonalMemoryQuizGame
          patient={currentPatient}
          memories={memories}
          people={people}
          language={language}
          onClose={() => setActiveGameId(null)}
          onComplete={handleGameComplete}
          onGoToMemoriesTab={() => {
            setActiveGameId(null);
            navigatePatientTab('memories');
          }}
        />
      ) : activeGameId === 'pattern-sequence' ? (
        <MusicPatternGame
          patient={currentPatient}
          language={language}
          onClose={() => setActiveGameId(null)}
          onComplete={handleGameComplete}
        />
      ) : activeGameId === 'memory-tiles' ? (
        <MemoryTilesGame
          patient={currentPatient}
          language={language}
          onClose={() => setActiveGameId(null)}
          onComplete={handleGameComplete}
        />
      ) : activeGameId === 'recognize-by-description' ? (
        <RecognizeByDescriptionGame
          patient={currentPatient}
          language={language}
          onClose={() => setActiveGameId(null)}
          onComplete={handleGameComplete}
        />
      ) : activeGameId ? (
        <Games
          gameId={activeGameId}
          patient={currentPatient}
          language={language}
          onClose={() => setActiveGameId(null)}
          onComplete={handleGameComplete}
        />
      ) : null}

      {/* Voice Companion Modal */}
      <VoiceCompanionModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        patient={currentPatient}
        language={language}
        routines={routines}
        reminders={reminders}
        memories={memories}
        people={people}
        sessions={sessions}
      />

      {/* Caregiver Circle Modal */}
      <CaregiverCircleModal
        isOpen={isCircleModalOpen}
        onClose={() => setIsCircleModalOpen(false)}
        role={role}
        currentPatient={currentPatient}
        currentCaretaker={currentCaretaker}
        allPatients={allPatients}
        onPatientLinked={handlePatientLinked}
        onPatientRemoved={handlePatientRemoved}
        onCaregiverUnlinked={handleCaregiverUnlinked}
      />

      {/* Memory Voice Recorder & AI Summarizer Modal (Memory Tab only) */}
      <MemoryVoiceRecorderModal
        isOpen={isVoiceNoteModalOpen}
        onClose={() => setIsVoiceNoteModalOpen(false)}
        onSaveMemory={handleAddMemoryFromVoiceNote}
        patientId={currentPatient?.id}
        preferredLanguage={language}
        patientName={currentPatient?.preferredName || currentPatient?.fullName}
      />

      {/* Memory Multi-Photo Fullscreen Lightbox & Reminiscence Reader */}
      <MemoryPhotoViewerModal
        isOpen={isPhotoViewerOpen}
        onClose={() => {
          setIsPhotoViewerOpen(false);
          setViewerMemory(null);
        }}
        memory={viewerMemory}
        initialIndex={viewerPhotoIndex}
        activeReadingId={activeReadingMemoryId}
        onStartReading={handleStartReadingMemory}
        onStopReading={handleStopReadingMemory}
      />

      {/* Add Photos to Existing Memory Modal */}
      <AddPhotosModal
        isOpen={isAddPhotosModalOpen}
        onClose={() => {
          setIsAddPhotosModalOpen(false);
          setAddPhotosTargetMemory(null);
        }}
        memory={addPhotosTargetMemory}
        onSaveUpdatedMemory={handleSaveUpdatedMemory}
      />
    </div>
  );
}
