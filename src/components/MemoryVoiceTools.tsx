import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Loader2,
  X,
  Heart,
  Radio,
  FileAudio,
} from 'lucide-react';
import { MemoryMoment, LanguageCode } from '../types';
import { PhotoUploadZone } from './MemoryPhotoTools';

interface MemoryVoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMemory: (newMemory: Omit<MemoryMoment, 'id'>) => void;
  patientId?: string;
  preferredLanguage?: LanguageCode;
  patientName?: string;
}

export const MemoryVoiceRecorderModal: React.FC<MemoryVoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveMemory,
  patientId,
  preferredLanguage = 'en',
  patientName = 'Senior Companion',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  // Form states populated by AI summarization
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [region, setRegion] = useState('Assam');
  const [category, setCategory] = useState<'Family' | 'Festival' | 'Place' | 'Tradition'>('Family');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'
  );
  const [audioPrompt, setAudioPrompt] = useState('Do you remember this cherished moment?');
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // Audio player state for recorded voice note
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Recognition and media recording refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const handleReset = () => {
    stopRecording();
    setIsRecording(false);
    setRecordingDuration(0);
    setTranscript('');
    setIsSummarizing(false);
    setAudioBlobUrl(null);
    setTitle('');
    setStory('');
    setRegion('Assam');
    setCategory('Family');
    setSummaryGenerated(false);
    setUploadedPhotos([]);
    setIsPlayingAudio(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  };

  const startRecording = async () => {
    handleReset();
    setIsRecording(true);
    setRecordingDuration(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);

    // 1. Start SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          preferredLanguage === 'as'
            ? 'as-IN'
            : preferredLanguage === 'hi'
            ? 'hi-IN'
            : preferredLanguage === 'mni'
            ? 'mni-IN'
            : 'en-IN';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscript(currentTranscript.trim());
        };

        recognition.onerror = (err: any) => {
          console.warn('Speech recognition warning:', err);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }

    // 2. Start MediaRecorder for authentic voice note playback
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioBlobUrl(url);

          // Stop all audio tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      } catch (err) {
        console.warn('Microphone stream access error:', err);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        // ignore
      }
    }

    setIsRecording(false);
  };

  const handleSummarizeWithAi = async () => {
    stopRecording();
    const textToSummarize = transcript.trim();

    if (!textToSummarize) {
      alert('Please speak or type a memory first so the AI can summarize it for you.');
      return;
    }

    setIsSummarizing(true);

    try {
      const res = await fetch('/api/ai/summarize-voicenote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToSummarize,
          patientId,
          language: preferredLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error('Summarization failed');
      }

      const data = await res.json();

      setTitle(data.title || 'Cherished Spoken Memory');
      setStory(data.story || textToSummarize);
      setRegion(data.region || 'Assam');
      setCategory(
        (data.category as any) ||
          (textToSummarize.toLowerCase().includes('festival') ||
          textToSummarize.toLowerCase().includes('bihu')
            ? 'Festival'
            : 'Family')
      );
      if (data.suggestedImageUrl) {
        setImageUrl(data.suggestedImageUrl);
      }
      if (data.audioPrompt) {
        setAudioPrompt(data.audioPrompt);
      }
      setSummaryGenerated(true);
    } catch (err) {
      console.warn('Voice note summarizer notice, using client synthesis fallback:', err);
      // Fallback
      const words = textToSummarize.split(/\s+/);
      const generatedTitle = words.slice(0, 5).join(' ') || 'Cherished Memory';
      setTitle(generatedTitle);
      setStory(textToSummarize);
      setRegion('Assam');
      setCategory('Family');
      setSummaryGenerated(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !story.trim()) {
      alert('Please provide a title and story for the memory.');
      return;
    }

    onSaveMemory({
      patientId,
      title: title.trim(),
      story: story.trim(),
      region,
      category,
      imageUrl: uploadedPhotos.length > 0 ? uploadedPhotos[0] : imageUrl,
      images: uploadedPhotos.length > 0 ? uploadedPhotos : [imageUrl],
      imageAlt: `${title} - Keepsake Memory`,
      dateLabel: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      audioPrompt,
      interactiveQuestion: {
        question: audioPrompt,
        options: ['Yes, I remember well', 'Tell me more about it', 'It warms my heart'],
        correctIndex: 0,
      },
      hasVoiceNote: true,
      voiceNoteAudioUrl: audioBlobUrl || undefined,
      originalVoiceTranscript: transcript.trim() || undefined,
      summarizedByAi: true,
    });

    onClose();
  };

  const togglePlayAudioNote = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="voice-note-recorder-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="voice-note-recorder-modal"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400 text-teal-950 flex items-center justify-center font-bold shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base sm:text-lg leading-tight">
                Add Spoken Memory Voice Note
              </h2>
              <p className="text-xs text-teal-200">
                Speak a heartwarming story • AI gently summarizes into text
              </p>
            </div>
          </div>
          <button
            id="close-voice-note-modal-btn"
            onClick={onClose}
            className="p-1 rounded-full text-teal-200 hover:text-white hover:bg-teal-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: Voice Recording Area */}
          <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-5 text-center flex flex-col items-center">
            <div className="relative mb-3">
              {isRecording && (
                <div className="absolute -inset-3 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              )}
              <button
                id="toggle-voice-record-btn"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all shadow-md ${
                  isRecording
                    ? 'bg-rose-600 text-white ring-4 ring-rose-200'
                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                }`}
                title={isRecording ? 'Click to stop speaking' : 'Click to start speaking'}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <h3 className="font-serif font-bold text-stone-900 text-base">
              {isRecording
                ? `Listening... Speak warmly (${recordingDuration}s)`
                : transcript
                ? 'Voice recorded! Tap to speak more or summarize below'
                : 'Tap the microphone to record a spoken memory'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mt-1">
              Share a memory about family, a festival like Bihu, favorite songs, cooking pitha, or
              nature.
            </p>

            {/* Audio Waveform visualization during recording */}
            {isRecording && (
              <div className="flex items-center gap-1 mt-3 h-6">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                    style={{
                      height: `${12 + ((i * 7) % 18)}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Spoken Transcript preview */}
            <div className="w-full mt-4 text-left">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Spoken Words (Real-Time Transcript):
              </label>
              <textarea
                id="voice-note-transcript-input"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your spoken words will appear here in real-time... (You can also type or edit them directly)"
                rows={3}
                className="w-full text-xs sm:text-sm bg-white border border-stone-300 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-teal-700 text-stone-800 resize-none"
              />
            </div>

            {/* Recorded Audio Player if available */}
            {audioBlobUrl && (
              <div className="w-full mt-3 p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-medium text-stone-700">
                    Recorded Audio Note Ready
                  </span>
                </div>
                <button
                  id="preview-recorded-audio-btn"
                  onClick={togglePlayAudioNote}
                  className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-medium hover:bg-teal-100"
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingAudio ? 'Pause' : 'Play Voice Note'}</span>
                </button>
                <audio
                  ref={audioPlayerRef}
                  src={audioBlobUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="hidden"
                />
              </div>
            )}

            {/* Summarize Action Button */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <button
                id="summarize-voicenote-ai-btn"
                disabled={!transcript.trim() || isSummarizing}
                onClick={handleSummarizeWithAi}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-xs transition-all ${
                  !transcript.trim() || isSummarizing
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-500 text-teal-950 hover:shadow-md'
                }`}
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-950" />
                    <span>AI is crafting memory...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-900" />
                    <span>Summarize with AI into Memory</span>
                  </>
                )}
              </button>

              {transcript && (
                <button
                  id="clear-transcript-btn"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 text-stone-500 hover:text-stone-700 text-xs rounded-full hover:bg-stone-200/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Step 2: AI Summarized Keepsake Memory Preview & Form */}
          {summaryGenerated && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    AI Curated Keepsake Memory
                  </h4>
                </div>
                <span className="text-[11px] font-semibold bg-teal-800 text-white px-2.5 py-0.5 rounded-full">
                  ✨ AI Summarized
                </span>
              </div>

              {/* Memory Preview Card */}
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-xs flex flex-col sm:flex-row">
                <img
                  src={imageUrl}
                  alt={title}
                  className="w-full sm:w-36 h-28 object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider bg-teal-50 px-2 py-0.5 rounded-md">
                        {category} • {region}
                      </span>
                      {audioBlobUrl && (
                        <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <Mic className="w-2.5 h-2.5" />
                          Voice Attached
                        </span>
                      )}
                    </div>
                    <h5 className="font-serif font-bold text-stone-900 text-sm leading-snug">
                      {title}
                    </h5>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-3 leading-relaxed">
                      {story}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Fields for fine tuning */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Memory Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-700 text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-700 text-stone-800"
                  >
                    <option value="Assam">Assam</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Tripura">Tripura</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Summarized Story
                  </label>
                  <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    rows={2}
                    className="w-full text-xs bg-white border border-stone-300 rounded-lg p-2 focus:ring-1 focus:ring-teal-700 text-stone-800 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-stone-200">
                  <PhotoUploadZone
                    photos={uploadedPhotos}
                    onPhotosChange={setUploadedPhotos}
                    label="Attach Photos to this Memory (Optional)"
                    helperText="Upload 1 or more photos from family albums or celebrations"
                    idPrefix="voice-note-memory-photos"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl"
          >
            Cancel
          </button>

          {summaryGenerated ? (
            <button
              id="save-summarized-memory-btn"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>Save to Keepsake Album</span>
            </button>
          ) : (
            <button
              onClick={handleSummarizeWithAi}
              disabled={!transcript.trim() || isSummarizing}
              className="flex items-center gap-1.5 px-5 py-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-teal-950 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Summarize First</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MemoryVoiceReaderProps {
  memory: MemoryMoment;
  activeReadingId: string | null;
  onStartReading: (id: string, text: string) => void;
  onStopReading: () => void;
}

export const MemoryVoiceReaderButton: React.FC<MemoryVoiceReaderProps> = ({
  memory,
  activeReadingId,
  onStartReading,
  onStopReading,
}) => {
  const isReadingThis = activeReadingId === memory.id;

  const handleToggle = () => {
    if (isReadingThis) {
      onStopReading();
    } else {
      const readText = `${memory.title}. From ${memory.region}. ${memory.story}. ${memory.audioPrompt}`;
      onStartReading(memory.id, readText);
    }
  };

  return (
    <button
      id={`voice-reader-btn-${memory.id}`}
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-2xs ${
        isReadingThis
          ? 'bg-rose-600 text-white ring-2 ring-rose-300 animate-pulse'
          : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200'
      }`}
      title={isReadingThis ? 'Stop voice reader' : 'Listen to this memory read aloud'}
    >
      {isReadingThis ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span>Stop Reader</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-teal-700" />
          <span>Voice Reader</span>
        </>
      )}
    </button>
  );
};
