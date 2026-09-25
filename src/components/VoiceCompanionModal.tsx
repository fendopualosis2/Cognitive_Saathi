import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Sparkles,
  Check,
  RefreshCw,
  Clock,
  Brain,
  ChevronDown,
  ChevronUp,
  Square,
} from 'lucide-react';
import { LanguageCode, PatientProfile } from '../types';

export interface CompanionMessage {
  id: string;
  sender: 'user' | 'saathi';
  text: string;
  thought?: string;
  audioUrl?: string;
  hasVoice?: boolean;
}

interface VoiceCompanionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfile | null;
  language: LanguageCode;
  routines?: any[];
  reminders?: any[];
  memories?: any[];
  people?: any[];
  sessions?: any[];
}

export const VoiceCompanionModal: React.FC<VoiceCompanionModalProps> = ({
  isOpen,
  onClose,
  patient,
  language,
  routines = [],
  reminders = [],
  memories = [],
  people = [],
  sessions = [],
}) => {
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [voiceProfile, setVoiceProfile] = useState('soothing-female');

  // Audio recording & Speech recognition references
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const spokenMessageIdsRef = useRef<Set<string>>(new Set());

  // Stop all active speech (both HTML5 Audio and Web Speech Synthesis)
  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
    setPlayingMessageId(null);
  };

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      const name = patient?.preferredName || 'my friend';
      const greeting =
        language === 'as'
          ? `নমস্কাৰ ${name}। মই সাথী, আপোনাৰ সংগী। আজি আপোনাৰ দিনটো কেনে গৈছে? মই আপোনাক কেনেকৈ সহায় কৰিব পাৰোঁ?`
          : language === 'hi'
          ? `नमस्ते ${name}। मैं साथी हूँ, आपका मददगार। आप कैसा महसूस कर रहे हैं? मैं आपकी क्या मदद करूँ?`
          : language === 'mni'
          ? `খুরুমজরি ${name}। ঐহাক সাথীনি, অদোমগী মরুপ। ঙসি অদোমগী নুমিৎ করম্না চত্থরি?`
          : `Hello ${name}. I am Saathi, your companion. You are safe at home, and I am right here with you. How can I comfort or help you today?`;

      if (messages.length === 0) {
        const welcomeId = `msg-welcome-${Date.now()}`;
        const initialGreeting: CompanionMessage = {
          id: welcomeId,
          sender: 'saathi',
          text: greeting,
        };
        setMessages([initialGreeting]);
        if (autoSpeak && !spokenMessageIdsRef.current.has(welcomeId)) {
          spokenMessageIdsRef.current.add(welcomeId);
          speakText(greeting, welcomeId);
        }
      } else if (messages.length === 1 && messages[0].sender === 'saathi') {
        setMessages([{ ...messages[0], text: greeting }]);
      }
    }
  }, [isOpen, language, patient?.preferredName]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, interimTranscript, isListening]);

  // Clean up recording and speech on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopAllAudioInput();
      stopSpeaking();
    }
    return () => {
      stopAllAudioInput();
      stopSpeaking();
    };
  }, [isOpen]);

  const stopAllAudioInput = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(false);
  };

  const playAudio = (audioUrl: string, messageId?: string) => {
    stopSpeaking();
    try {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setIsSpeaking(true);
      if (messageId) setPlayingMessageId(messageId);

      audio.onended = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        currentAudioRef.current = null;
      };
      audio.play().catch((err) => {
        console.info('Audio playback note:', err);
        setIsSpeaking(false);
        setPlayingMessageId(null);
      });
    } catch (err) {
      console.info('Audio player note:', err);
      setIsSpeaking(false);
      setPlayingMessageId(null);
    }
  };

  const speakText = (text: string, messageId?: string) => {
    stopSpeaking();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Clean text of markdown, asterisks, and emojis for natural pronunciation
    const cleanText = text
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[*#•—_`~]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.88; // Calming, relaxed pace
      utterance.pitch = 1.05; // Pleasant, gentle tone

      // Select best available natural female voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const targetLang =
          language === 'hi'
            ? 'hi'
            : language === 'as'
            ? 'as'
            : language === 'mni'
            ? 'mni'
            : 'en';

        const matchedVoice =
          voices.find(
            (v) =>
              v.lang.startsWith(targetLang) &&
              (v.name.includes('Female') ||
                v.name.includes('Samantha') ||
                v.name.includes('Victoria') ||
                v.name.includes('Zira') ||
                v.name.includes('Google') ||
                v.name.includes('Swara') ||
                v.name.includes('Natural'))
          ) ||
          voices.find((v) => v.lang.startsWith(targetLang)) ||
          voices.find(
            (v) =>
              (v.lang.includes('IN') || v.lang.startsWith('en')) &&
              (v.name.includes('Female') ||
                v.name.includes('Samantha') ||
                v.name.includes('Natural') ||
                v.name.includes('Google'))
          ) ||
          voices.find((v) => v.lang.startsWith('en'));

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (messageId) setPlayingMessageId(messageId);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setPlayingMessageId(null);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    // Stop speaking before sending new request
    stopSpeaking();
    setInput('');
    setInterimTranscript('');
    setSpeechError(null);
    const userMsg: CompanionMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'user',
      text,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          patientId: patient?.id,
          patientName: patient?.fullName || patient?.preferredName || 'Beloved Senior',
          preferredLanguage: language,
          voiceProfile,
          role: 'PATIENT',
          userData: {
            patient,
            routines,
            reminders,
            memories,
            people,
            sessions,
            currentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            currentDate: new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
          },
          history: messages.slice(-10).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const saathiMsg: CompanionMessage = {
          id: msgId,
          sender: 'saathi',
          text: data.reply,
          thought: data.thought,
          audioUrl: data.audioUrl,
          hasVoice: Boolean(data.audioUrl),
        };
        setMessages((prev) => [...prev, saathiMsg]);

        if (autoSpeak && !spokenMessageIdsRef.current.has(msgId)) {
          spokenMessageIdsRef.current.add(msgId);
          if (data.audioUrl) {
            playAudio(data.audioUrl, msgId);
          } else {
            speakText(data.reply, msgId);
          }
        }
      } else {
        throw new Error('No reply received');
      }
    } catch {
      const fallback =
        language === 'as'
          ? 'মই আপোনাৰ লগত আছো। আপুনি ঘৰত সম্পূৰ্ণ সুৰক্ষিত আৰু শান্তিত আছে।'
          : language === 'hi'
          ? 'मैं आपके साथ हूँ। आप घर पर पूरी तरह सुरक्षित हैं और सब ठीक है।'
          : language === 'mni'
          ? 'ঐহাক অদোমগী লোইননা লৈরি। অদোম য়ুমদা য়াম্না শাংনা অমসুং শান্তিনা লৈরি।'
          : 'I am right here with you. You are completely safe at home and everything is peaceful.';
      const fallbackId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const fallbackMsg: CompanionMessage = {
        id: fallbackId,
        sender: 'saathi',
        text: fallback,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (autoSpeak && !spokenMessageIdsRef.current.has(fallbackId)) {
        spokenMessageIdsRef.current.add(fallbackId);
        speakText(fallback, fallbackId);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start listening using Dual-Engine architecture:
   * 1. Stop any current audio output immediately
   * 2. Request microphone stream via getUserMedia
   * 3. Start MediaRecorder for high-fidelity audio chunks
   * 4. Start SpeechRecognition for real-time live preview words
   */
  const startListening = async () => {
    stopSpeaking();
    setSpeechError(null);
    setMicPermissionDenied(false);
    setInterimTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    // 1. Acquire microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      console.warn('Microphone access denied or unavailable:', err);
      setMicPermissionDenied(true);
      setSpeechError(
        'Microphone access was denied. Please allow microphone permission in your browser address bar to speak with Saathi.'
      );
      return;
    }

    setIsListening(true);

    // 2. Start duration timer
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        // Auto-stop after 25 seconds of continuous recording to protect elders
        if (prev >= 25) {
          stopListeningAndProcess();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    // 3. Start MediaRecorder for server-side audio transcription fallback
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // Slice chunks every 250ms
    } catch (recorderErr) {
      console.warn('MediaRecorder error:', recorderErr);
    }

    // 4. Start Browser SpeechRecognition for instant live transcript preview
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          language === 'as'
            ? 'as-IN'
            : language === 'hi'
            ? 'hi-IN'
            : language === 'mni'
            ? 'mni-IN'
            : 'en-IN';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          const trimmed = currentTranscript.trim();
          if (trimmed) {
            setInterimTranscript(trimmed);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition warning:', event?.error);
          if (event?.error === 'not-allowed') {
            setMicPermissionDenied(true);
          }
        };

        recognition.start();
      } catch (recErr) {
        console.warn('SpeechRecognition start failed, relying on audio capture:', recErr);
      }
    }
  };

  /**
   * Stop listening and determine transcript via live text or server audio transcription
   */
  const stopListeningAndProcess = async () => {
    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setIsListening(false);

    // Stop MediaRecorder and grab audio blob
    const recorder = mediaRecorderRef.current;
    let audioBlob: Blob | null = null;

    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => {
          audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          resolve();
        };
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    } else if (audioChunksRef.current.length > 0) {
      audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    }

    // Stop microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Check if we already got high-confidence text from SpeechRecognition
    const directSpeechText = interimTranscript.trim();
    if (directSpeechText) {
      handleSend(directSpeechText);
      return;
    }

    // If no direct text, use audio transcription endpoint
    if (audioBlob && audioBlob.size > 500) {
      setIsTranscribing(true);
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob!);
        });

        const audioBase64 = await base64Promise;
        const res = await fetch('/api/ai/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64,
            mimeType: audioBlob.type || 'audio/webm',
            language,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const transcript = (data.transcript || '').trim();
          if (transcript) {
            handleSend(transcript);
            return;
          }
        }
      } catch (err) {
        console.warn('AI transcription error:', err);
      } finally {
        setIsTranscribing(false);
      }
    }

    // If neither engine caught any words
    setSpeechError('I could not hear any spoken words. Please tap the microphone and speak gently, or choose a prompt below.');
  };

  const cancelListening = () => {
    stopAllAudioInput();
    setInterimTranscript('');
    setSpeechError(null);
  };

  const toggleThought = (id: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const quickPrompts = [
    { label: '📅 What is my schedule like?', query: 'What is my schedule like today?' },
    { label: '🚶 What is my next activity?', query: 'What is my next activity?' },
    { label: '📸 Has memories tab updated?', query: 'Has the memories tab been updated recently?' },
    { label: '💊 Did I take my medicine?', query: 'Did I take my medicine today?' },
    { label: '👵 Who is looking after me?', query: 'Who is looking after me today?' },
    { label: '🌸 Tell me a peaceful story', query: 'Tell me a peaceful short story about Assam tea gardens' },
  ];

  if (!isOpen) return null;

  return (
    <div
      id="voice-companion-modal-overlay"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        id="voice-companion-modal-container"
        className="bg-[#FAF8F5] dark:bg-[#0D1117] w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[88vh] border border-stone-200 dark:border-stone-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-teal-850 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center font-bold font-serif text-lg shadow-xs">
              সা
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-base leading-tight">Companion</h2>
                <span className="bg-teal-700/70 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Brain className="w-2.5 h-2.5" />
                  <span>Thinking</span>
                </span>
              </div>
              <p className="text-xs text-teal-200">Grounded in your real schedule, routines & memories</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Direct Stop Speaking Button when audio is active */}
            {isSpeaking && (
              <button
                id="voice-stop-speech-header-btn"
                type="button"
                onClick={stopSpeaking}
                title="Stop speaking"
                className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs animate-pulse"
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="text-[11px]">Stop</span>
              </button>
            )}

            <button
              id="voice-toggle-autospeak-btn"
              type="button"
              onClick={() => {
                if (autoSpeak) {
                  stopSpeaking();
                }
                setAutoSpeak(!autoSpeak);
              }}
              title={autoSpeak ? 'Voice response enabled (Tap to mute)' : 'Muted (Tap to speak aloud)'}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                autoSpeak
                  ? 'bg-teal-700/80 text-amber-300 hover:bg-teal-700'
                  : 'bg-teal-900 text-teal-400 hover:text-teal-200'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px]">{autoSpeak ? 'Voice On' : 'Muted'}</span>
            </button>
            <button
              id="close-voice-companion-btn"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              className="p-1.5 rounded-full text-teal-200 hover:text-white hover:bg-teal-700/50"
            >
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* Voice Selection Bar */}
        <div className="bg-teal-900 text-teal-100 px-4 py-2 flex items-center justify-between gap-2 border-b border-teal-800 text-xs">
          <label htmlFor="voice-profile-select" className="text-[11px] font-semibold text-teal-200 shrink-0 flex items-center gap-1.5 cursor-pointer">
            <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Voice:</span>
          </label>
          <select
            id="voice-profile-select"
            value={voiceProfile}
            onChange={(e) => setVoiceProfile(e.target.value)}
            className="bg-teal-950 text-amber-300 border border-teal-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer truncate max-w-[240px] sm:max-w-xs"
          >
            <option value="soothing-female">Soothing Maternal (Female)</option>
            <option value="gentle-male">Calm & Gentle (Male)</option>
            <option value="friendly-male">Friendly & Casual (Male)</option>
            <option value="warm-female">Warm & Approachable (Female)</option>
            <option value="bright-female">Bright & Clear (Female)</option>
          </select>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[46vh]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === 'user'
                    ? 'bg-teal-800 text-white rounded-br-none'
                    : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 shadow-xs rounded-bl-none'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                {m.sender === 'saathi' && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-3">
                      {isSpeaking && playingMessageId === m.id ? (
                        <button
                          type="button"
                          onClick={stopSpeaking}
                          className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                        >
                          <Square className="w-3.5 h-3.5 fill-current animate-pulse" />
                          <span>Stop speaking</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (m.audioUrl) {
                              playAudio(m.audioUrl, m.id);
                            } else {
                              speakText(m.text, m.id);
                            }
                          }}
                          className="flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{m.hasVoice ? 'Listen to Companion' : 'Listen aloud'}</span>
                        </button>
                      )}

                      {m.hasVoice && (
                        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                          Voice
                        </span>
                      )}
                    </div>

                    {/* Thinking / Reasoning Breakdown */}
                    {m.thought && (
                      <div className="pt-1.5 border-t border-stone-100 dark:border-stone-700">
                        <button
                          type="button"
                          onClick={() => toggleThought(m.id)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-stone-600 dark:text-stone-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
                        >
                          <Brain className="w-3 h-3 text-amber-600" />
                          <span>Thinking</span>
                          {expandedThoughts[m.id] ? (
                            <ChevronUp className="w-3 h-3 text-stone-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-stone-400" />
                          )}
                        </button>

                        {expandedThoughts[m.id] && (
                          <div className="mt-1.5 p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
                            <p className="font-semibold text-amber-900 dark:text-amber-200 mb-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Reasoning & Grounding:
                            </p>
                            <p className="text-stone-700 dark:text-stone-300 italic">{m.thought}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading reply state */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2.5 shadow-2xs">
                <Brain className="w-4 h-4 animate-pulse text-amber-600" />
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  Thinking through your schedule & memories...
                </span>
              </div>
            </div>
          )}

          {/* Transcribing state */}
          {isTranscribing && (
            <div className="flex justify-center my-2">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-teal-950 dark:text-teal-200 rounded-2xl px-4 py-2 text-xs flex items-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span className="font-semibold">Transcribing your voice...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Permission Denied Notice */}
        {micPermissionDenied && (
          <div className="mx-4 my-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Microphone Access Needed</p>
              <p className="mt-0.5 text-[11px] text-rose-800 dark:text-rose-300 leading-snug">
                Please click the camera/lock icon in your browser address bar to allow microphone access, then tap
                Retry.
              </p>
            </div>
            <button
              onClick={startListening}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* General Speech Error Notice */}
        {speechError && !micPermissionDenied && (
          <div className="mx-4 my-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-[11px]">{speechError}</p>
            </div>
            <button
              onClick={() => setSpeechError(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Listening Audio Banner with Visualizer */}
        {isListening && (
          <div className="bg-teal-900 text-white px-4 py-3 mx-3 mb-2 rounded-2xl shadow-md border border-teal-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="font-bold text-xs tracking-wide text-amber-300">
                  Saathi is listening to you...
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-teal-200 font-mono bg-teal-950/60 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
              </div>
            </div>

            {/* Live Interim Transcript Display */}
            {interimTranscript ? (
              <div className="bg-teal-950/70 p-2.5 rounded-xl border border-teal-700/60">
                <p className="text-[11px] text-teal-300 font-semibold uppercase tracking-wider mb-0.5">
                  Hearing your voice:
                </p>
                <p className="text-sm font-medium text-white italic">
                  "{interimTranscript}"
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-1">
                <div className="w-1.5 h-4 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-7 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-5 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-1.5 h-8 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <div className="w-1.5 h-6 bg-teal-400 rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
                <div className="w-1.5 h-3 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                <span className="text-xs text-teal-200 ml-2">Speak gently in English, Assamese, or Hindi</span>
              </div>
            )}

            {/* Action buttons while listening */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                id="finish-voice-speaking-btn"
                onClick={stopListeningAndProcess}
                className="flex-1 py-2 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
              >
                <Check className="w-4 h-4 text-teal-950" />
                <span>Finish Speaking & Send</span>
              </button>
              <button
                type="button"
                id="cancel-voice-listening-btn"
                onClick={cancelListening}
                className="px-3 py-2 bg-teal-800 hover:bg-teal-750 text-teal-200 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Quick Voice Prompts */}
        <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Try asking:</span>
          </span>
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              id={`quick-prompt-${i}`}
              onClick={() => handleSend(qp.query)}
              className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-full text-stone-700 dark:text-stone-200 shrink-0 shadow-2xs transition-colors hover:border-teal-700"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input & Voice Control Bar */}
        <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <button
            id="voice-mic-toggle-btn"
            type="button"
            onClick={() => {
              if (isListening) {
                stopListeningAndProcess();
              } else {
                startListening();
              }
            }}
            disabled={isTranscribing || loading}
            className={`p-3 rounded-full shrink-0 transition-all flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200 shadow-md scale-105'
                : isTranscribing
                ? 'bg-amber-200 text-stone-700'
                : 'bg-amber-400 hover:bg-amber-500 text-teal-950 shadow-sm active:scale-95'
            }`}
            title={isListening ? 'Listening... Tap when finished speaking' : 'Tap to speak to Saathi'}
          >
            {isListening ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5 text-teal-950" />
            )}
            <span className="sr-only">Toggle Microphone</span>
          </button>

          <input
            id="voice-companion-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={
              isListening
                ? 'Listening to you... or type here'
                : 'Speak or type a gentle thought...'
            }
            className="flex-1 px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700 focus:bg-white dark:focus:bg-stone-800 transition-colors"
          />

          <button
            id="voice-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || isListening || isTranscribing}
            className="p-2.5 bg-teal-850 hover:bg-teal-900 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-transform active:scale-95 shadow-2xs"
          >
            <Send className="w-4 h-4" />
            <span className="sr-only">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
