import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  Trophy,
  Timer,
  ChevronRight,
  Music,
  Scissors,
  Trees,
  Award,
} from 'lucide-react';
import { GameSessionResult, PatientProfile, LanguageCode } from '../types';
import { CULTURAL_CATALOG, CulturalItem } from '../data/culturalCatalog';
import { speechService } from '../services/audioSpeech';

interface RecognizeGameProps {
  patient: PatientProfile | null;
  language?: LanguageCode;
  onClose: () => void;
  onComplete: (result: GameSessionResult) => void;
}

export const RecognizeByDescriptionGame: React.FC<RecognizeGameProps> = ({
  patient,
  language = 'en',
  onClose,
  onComplete,
}) => {
  const [voiceoverEnabled, setVoiceoverEnabled] = useState<boolean>(
    speechService.isVoiceoverEnabled()
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'music' | 'craft' | 'nature'>('all');
  const [difficulty, setDifficulty] = useState<2 | 3 | 4>(3); // Number of choices
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [totalRounds] = useState<number>(5);

  // Round specific state
  const [targetItem, setTargetItem] = useState<CulturalItem | null>(null);
  const [options, setOptions] = useState<CulturalItem[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [answeredRounds, setAnsweredRounds] = useState<number>(0);

  // Performance metrics
  const [score, setScore] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [finalResult, setFinalResult] = useState<GameSessionResult | null>(null);

  const roundStartTimeRef = useRef<number>(Date.now());
  const reactionTimesRef = useRef<number[]>([]);

  // Listen to speech service updates
  useEffect(() => {
    const unsubToggle = speechService.onVoiceoverToggle(setVoiceoverEnabled);
    const unsubSpeaking = speechService.onSpeakingChange(setIsSpeaking);
    return () => {
      unsubToggle();
      unsubSpeaking();
      speechService.stop();
    };
  }, []);

  // Live timer
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  // Generate a round
  const setupRound = (roundIndex: number, cat = categoryFilter, diff = difficulty) => {
    speechService.stop();
    setSelectedOptionId(null);
    setIsCorrect(null);
    setShowHint(false);
    roundStartTimeRef.current = Date.now();

    // Filter available pool
    const pool = cat === 'all' ? CULTURAL_CATALOG : CULTURAL_CATALOG.filter((i) => i.category === cat);
    if (pool.length === 0) return;

    // Pick target item
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const target = shuffledPool[roundIndex % shuffledPool.length];
    setTargetItem(target);

    // Pick distractors
    const distractors = CULTURAL_CATALOG.filter((i) => i.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, diff - 1);

    const roundOptions = [target, ...distractors].sort(() => Math.random() - 0.5);
    setOptions(roundOptions);
  };

  // Initialize first round
  useEffect(() => {
    setupRound(0);
  }, [categoryFilter, difficulty]);

  // Read current clue aloud
  const handleReadClueAloud = () => {
    if (!targetItem) return;
    let intro = 'Listen closely to the description: ';
    if (language === 'as') intro = 'মনোযোগ দি বৰ্ণনা শুনক: ';
    else if (language === 'hi') intro = 'विवरण को ध्यान से सुनें: ';
    else if (language === 'mni') intro = 'মরীক চুম্না তাবীয়ু: ';
    speechService.speak(`${intro}${targetItem.clue}`, {
      force: true,
      rate: 0.88,
    });
  };

  // Read options aloud
  const handleReadOptionsAloud = () => {
    if (options.length === 0) return;
    const choiceWord = language === 'as' ? 'বিকল্প' : language === 'hi' ? 'विकल्प' : language === 'mni' ? 'অপশন' : 'Choice';
    const names = options.map((o, idx) => `${choiceWord} ${idx + 1}: ${o.name}`).join('. ');
    let prefix = 'The choices are: ';
    if (language === 'as') prefix = 'বিকল্পসমূহ হ’ল: ';
    else if (language === 'hi') prefix = 'विकल्प हैं: ';
    else if (language === 'mni') prefix = 'অপশনশিংদি: ';
    speechService.speak(`${prefix}${names}`, { force: true, rate: 0.9 });
  };

  // Handle player choice
  const handleSelectOption = (item: CulturalItem) => {
    if (isCorrect !== null || isFinished) return; // Prevent double clicks

    const reactionTime = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reactionTime);

    setSelectedOptionId(item.id);

    if (item.id === targetItem?.id) {
      // Correct!
      setIsCorrect(true);
      setScore((s) => s + 1);
      setAnsweredRounds((r) => r + 1);

      // Play instrument sound or victory chime
      if (item.soundCue) {
        speechService.playSound(item.soundCue);
      } else {
        speechService.playSound('match');
      }
    } else {
      // Incorrect attempt
      setIsCorrect(false);
      setMistakes((m) => m + 1);
      speechService.playSound('gentle_retry');
    }
  };

  // Advance to next round or finish
  const handleNextRound = () => {
    if (currentRound + 1 < totalRounds) {
      const next = currentRound + 1;
      setCurrentRound(next);
      setupRound(next);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    const totalElapsed = Date.now() - startTime;
    const calculatedAccuracy = Math.max(
      20,
      Math.min(100, Math.round((score / Math.max(1, score + mistakes)) * 100))
    );
    const avgReaction =
      reactionTimesRef.current.length > 0
        ? Math.round(
            reactionTimesRef.current.reduce((a, b) => a + b, 0) /
              reactionTimesRef.current.length
          )
        : 2500;

    const result: GameSessionResult = {
      id: `session-recognize-${Date.now()}`,
      gameId: 'recognize-by-description',
      patientId: patient?.id || 'senior-guest',
      difficulty: difficulty === 2 ? 1 : difficulty === 3 ? 2 : 3,
      accuracy: calculatedAccuracy,
      reactionTimeMs: avgReaction,
      completionTimeMs: totalElapsed,
      attempts: score + mistakes,
      mistakes,
      hintsUsed: showHint ? 1 : 0,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    setFinalResult(result);
    setIsFinished(true);
    speechService.playSound('victory');

    onComplete(result);
  };

  const toggleVoiceover = () => {
    const next = !voiceoverEnabled;
    setVoiceoverEnabled(next);
    speechService.setVoiceoverEnabled(next);
    if (!next) {
      speechService.stop();
    } else {
      let msg = 'Voiceover enabled. I will read clues and descriptions to you.';
      if (language === 'as') msg = 'ভইচ অভাৰ সক্ৰিয়। মই ইংগিত আৰু বিৱৰণ পঢ়ি শুনাম।';
      else if (language === 'hi') msg = 'वॉइसओवर सक्रिय। मैं पहेली और विवरण पढ़कर सुनाऊंगा।';
      else if (language === 'mni') msg = 'ভোইসওভর সক্রিয় ওইরে।';
      speechService.speak(msg, { force: true });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="recognize-game-container"
      className="fixed inset-0 z-50 bg-[#FAF8F5] dark:bg-[#0D1117] flex flex-col overflow-y-auto"
    >
      {/* Top Header */}
      <header className="bg-teal-850 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            id="recognize-back-btn"
            onClick={() => {
              speechService.stop();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-teal-800/80 hover:bg-teal-700 px-3 py-1.5 rounded-xl border border-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'as' ? 'কাৰ্য্যসূচীলৈ উভতি যাওক' : language === 'hi' ? 'गतिविधियों पर वापस' : language === 'mni' ? 'থবকশিংদা হঞ্জিনবা' : 'Back to Activities'}
            </span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-sm sm:text-base font-serif font-bold tracking-tight flex items-center justify-center gap-1.5">
            <span>
              {language === 'as'
                ? 'ঐতিহ্য চিনাক্তকৰণ (Heritage Clues)'
                : language === 'hi'
                ? 'विरासत पहेली व पहचान (Heritage Clues)'
                : language === 'mni'
                ? 'হেরিতেজ ক্লু ওবজেক্ত মেচিং'
                : 'Heritage Clues & Object Matcher'}
            </span>
          </h1>
          <p className="text-[11px] text-teal-200">
            {patient?.preferredName || 'Senior'} • {language === 'as' ? `পৰ্ব ${currentRound + 1} / ${totalRounds}` : language === 'hi' ? `दौर ${currentRound + 1} / ${totalRounds}` : language === 'mni' ? `রাউন্দ ${currentRound + 1} / ${totalRounds}` : `Round ${currentRound + 1} of ${totalRounds}`}
          </p>
        </div>

        {/* Voiceover Master Toggle */}
        <div className="flex items-center gap-2">
          <button
            id="voiceover-toggle-btn"
            onClick={toggleVoiceover}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              voiceoverEnabled
                ? 'bg-amber-400 text-teal-950 border-amber-300 shadow-2xs'
                : 'bg-teal-800 text-teal-200 border-teal-700'
            }`}
            title={voiceoverEnabled ? 'Voiceover active' : 'Voiceover muted'}
          >
            {voiceoverEnabled ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="hidden sm:inline">
                  {language === 'as' ? 'ভইচ অন' : language === 'hi' ? 'वॉइस ऑन' : language === 'mni' ? 'ভোইস অন' : 'Voiceover On'}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'as' ? 'ভইচ বন্ধ' : language === 'hi' ? 'वॉइस म्यूट' : language === 'mni' ? 'ভোইস লেপপা' : 'Voiceover Muted'}
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Game Surface */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        {!isFinished ? (
          <div className="space-y-5">
            {/* Top Control Bar: Category & Difficulty & Timer */}
            <div className="bg-white dark:bg-stone-900 p-3.5 sm:p-4 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills with Icons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setCurrentRound(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                    categoryFilter === 'all'
                      ? 'bg-teal-850 text-white shadow-2xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  All Treasures
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('music');
                    setCurrentRound(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                    categoryFilter === 'music'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  Musical Instruments
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('craft');
                    setCurrentRound(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                    categoryFilter === 'craft'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Heritage Crafts
                </button>
                <button
                  onClick={() => {
                    setCategoryFilter('nature');
                    setCurrentRound(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                    categoryFilter === 'nature'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  Nature & Wildlife
                </button>
              </div>

              {/* Difficulty & Timer */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase px-1">Choices:</span>
                  {[2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => {
                        setDifficulty(cnt as 2 | 3 | 4);
                        setupRound(currentRound, categoryFilter, cnt as 2 | 3 | 4);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        difficulty === cnt
                          ? 'bg-white dark:bg-stone-700 text-teal-850 dark:text-teal-300 shadow-2xs'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 font-mono text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
                  <Timer className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>{formatTime(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Description Clue Card (The Riddle) */}
            {targetItem && (
              <div
                id="riddle-clue-card"
                className="bg-gradient-to-br from-white via-amber-50/50 to-amber-100/40 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/20 rounded-3xl p-6 sm:p-7 border-2 border-amber-300 dark:border-amber-700/60 shadow-xs relative"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                      Riddle {currentRound + 1} of {totalRounds}
                    </span>
                    <span className="text-[11px] font-semibold text-teal-850 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 px-3 py-1 rounded-full">
                      {targetItem.categoryLabel}
                    </span>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      id="read-clue-aloud-btn"
                      onClick={handleReadClueAloud}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isSpeaking
                          ? 'bg-amber-400 text-teal-950 animate-pulse ring-2 ring-amber-300'
                          : 'bg-teal-850 hover:bg-teal-900 text-white shadow-2xs'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isSpeaking ? 'Speaking...' : 'Read Clue Aloud'}</span>
                    </button>

                    <button
                      id="read-options-btn"
                      onClick={handleReadOptionsAloud}
                      className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-white/80 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 px-3 py-1.5 rounded-xl transition-colors"
                      title="Read option titles aloud"
                    >
                      <span>Read Options</span>
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="font-serif text-lg sm:text-2xl text-stone-900 dark:text-stone-100 leading-relaxed font-semibold italic">
                    "{targetItem.clue}"
                  </p>
                </div>

                {/* Cultural Origin Note & Hint Button */}
                <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                    <span className="font-semibold text-teal-850 dark:text-teal-400">Cultural Origin:</span>
                    <span className="bg-white/80 dark:bg-stone-800/80 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-medium text-stone-700 dark:text-stone-300">
                      {targetItem.culturalTag}
                    </span>
                  </div>

                  {!showHint ? (
                    <button
                      onClick={() => {
                        setShowHint(true);
                        if (speechService.isVoiceoverEnabled()) {
                          speechService.speak(`Gentle hint: ${targetItem.hint}`, { rate: 0.9 });
                        }
                      }}
                      className="flex items-center gap-1 text-teal-850 dark:text-teal-400 hover:text-teal-950 dark:hover:text-teal-300 font-semibold underline underline-offset-2"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Need a gentle hint?</span>
                    </button>
                  ) : (
                    <div className="bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
                      <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      <span>
                        <strong>Gentle Hint:</strong> {targetItem.hint}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Answer Options Grid with Real Images */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Which treasured object matches this description?
              </p>

              <div
                className={`grid gap-4 ${
                  difficulty === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : difficulty === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4'
                }`}
              >
                {options.map((item) => {
                  const isSelected = selectedOptionId === item.id;
                  const isItemTarget = item.id === targetItem?.id;

                  let borderStyle = 'border-stone-200 dark:border-stone-800 hover:border-teal-700 dark:hover:border-teal-500';
                  let bgStyle = 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/60';

                  if (isSelected) {
                    if (isCorrect) {
                      borderStyle = 'border-emerald-500 ring-4 ring-emerald-200/80 dark:ring-emerald-800/80';
                      bgStyle = 'bg-emerald-50 dark:bg-emerald-950/40';
                    } else {
                      borderStyle = 'border-rose-400 ring-4 ring-rose-100 dark:ring-rose-950/60';
                      bgStyle = 'bg-rose-50 dark:bg-rose-950/40';
                    }
                  } else if (isCorrect && isItemTarget) {
                    borderStyle = 'border-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700';
                    bgStyle = 'bg-emerald-50/70 dark:bg-emerald-950/30';
                  }

                  return (
                    <div
                      key={item.id}
                      id={`option-card-${item.id}`}
                      onClick={() => handleSelectOption(item)}
                      className={`rounded-3xl p-4 border-2 ${borderStyle} ${bgStyle} shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between group select-none min-h-[220px]`}
                    >
                      {/* Image Container with Visual Fallback */}
                      <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 mb-3 group-hover:scale-[1.02] transition-transform">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to stylized container if image network drops
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-xs px-2 py-0.5 rounded-full font-sans flex items-center gap-1">
                          <span>{item.symbol}</span>
                          <span className="text-[10px] font-medium">{item.categoryLabel}</span>
                        </div>
                      </div>

                      {/* Title and Cultural Details */}
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 leading-snug">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-xs text-teal-850 dark:text-teal-400 font-medium font-serif mt-0.5">
                          {item.localName}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                          {item.culturalTag}
                        </p>
                      </div>

                      {/* State Feedback Indicator */}
                      <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 group-hover:text-teal-850 dark:group-hover:text-teal-400 font-semibold">
                          {language === 'as' ? 'বাছি লবলৈ টিপক' : language === 'hi' ? 'चुनने के लिए टैप करें' : language === 'mni' ? 'খন্নবা নমবীয়ু' : 'Tap to select'}
                        </span>
                        {isSelected && isCorrect && (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {language === 'as' ? 'সঠিক!' : language === 'hi' ? 'सही जवाब!' : language === 'mni' ? 'চুম্মে!' : 'Correct!'}
                          </span>
                        )}
                        {isSelected && !isCorrect && (
                          <span className="text-xs text-rose-700 dark:text-rose-300 font-bold bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                            {language === 'as' ? 'পুনৰ চেষ্টা কৰক' : language === 'hi' ? 'फिर प्रयास करें' : language === 'mni' ? 'অমুক হন্না হৌবীয়ু' : 'Try again'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Answer Resolution & Insight Banner */}
            {isCorrect !== null && (
              <div
                className={`p-5 rounded-3xl border-2 animate-in fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCorrect ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-850 dark:text-emerald-300' : 'bg-amber-200 dark:bg-amber-900/60 text-amber-850 dark:text-amber-300'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <HelpCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base">
                      {isCorrect
                        ? (language === 'as' ? 'অসাধাৰণ চিনাক্তকৰণ!' : language === 'hi' ? 'शानदार पहचान!' : language === 'mni' ? 'য়াম্না ফরে!' : 'Splendid Recognition!')
                        : (language === 'as' ? 'ধৈৰ্য্যৰে পুনৰ ভাবি চাওক' : language === 'hi' ? 'शांत प्रयास — फिर से सोचें' : language === 'mni' ? 'হন্না খনবীয়ু' : 'Gentle Attempt — Keep Exploring!')}
                    </h4>
                    <p className="text-xs sm:text-sm mt-1 leading-relaxed max-w-xl">
                      {isCorrect
                        ? targetItem?.detail
                        : (language === 'as' ? 'ইংগিতটো আকৌ শুনক বা বিকল্পবোৰ লক্ষ্য কৰক।' : language === 'hi' ? 'पहेली को दोबारा सुनें या विकल्पों पर ध्यान दें।' : language === 'mni' ? 'ক্লু অদু অমুক হন্না তাবীয়ু।' : 'Take your time to re-read the clue or listen to the spoken audio above.')}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="w-full sm:w-auto shrink-0">
                  {isCorrect ? (
                    <button
                      id="next-riddle-btn"
                      onClick={handleNextRound}
                      className="w-full sm:w-auto px-6 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>
                        {currentRound + 1 < totalRounds
                          ? (language === 'as' ? 'পৰৱৰ্তী ঐতিহ্য প্ৰশ্ন' : language === 'hi' ? 'अगली विरासत पहेली' : language === 'mni' ? 'মথংগী ৱাফম' : 'Next Cultural Riddle')
                          : (language === 'as' ? 'ফলাফল চাওক' : language === 'hi' ? 'परिणाम देखें' : language === 'mni' ? 'ফল য়েংবীয়ু' : 'View Results')}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      id="retry-riddle-btn"
                      onClick={() => {
                        setSelectedOptionId(null);
                        setIsCorrect(null);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{language === 'as' ? 'আন এটা বাছক' : language === 'hi' ? 'दूसरा विकल्प चुनें' : language === 'mni' ? 'অতোপ্পা অমুক হন্না' : 'Try Another Choice'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Final Results Screen */
          <div
            id="recognize-results-screen"
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-sm text-center space-y-6 animate-in zoom-in-95 max-w-lg mx-auto"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 mx-auto flex items-center justify-center text-3xl shadow-xs border border-amber-300 dark:border-amber-800">
              <Trophy className="w-8 h-8 text-amber-700 dark:text-amber-400" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950/40 text-teal-850 dark:text-teal-300 px-3 py-1 rounded-full">
                {language === 'as' ? 'মানসিক অনুশীলন সম্পন্ন' : language === 'hi' ? 'संज्ञानात्मक अभ्यास संपन्न' : language === 'mni' ? 'এক্সরসাইজ লোইশিনখ্রে' : 'Cognitive Exercise Complete'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
                {language === 'as'
                  ? `সুন্দৰ কাম, ${patient?.preferredName || 'জ্যেষ্ঠ'}!`
                  : language === 'hi'
                  ? `अद्भुत, ${patient?.preferredName || 'वरिष्ठ'}!`
                  : language === 'mni'
                  ? `য়াম্না ফরে, ${patient?.preferredName || 'সিনিয়র'}!`
                  : `Well Done, ${patient?.preferredName || 'Senior'}!`}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                {language === 'as'
                  ? 'আপুনি ঐতিহ্য আৰু লোকসংস্কৃতিৰ বস্তুসমূহ সুন্দৰভাৱে চিনাক্ত কৰিলে।'
                  : language === 'hi'
                  ? 'आपने सांस्कृतिक धरोहर और विवरणों को सफलता के साथ पहचाना।'
                  : language === 'mni'
                  ? 'অদোম্না হেরিতেজ ওবজেক্তশিং মায় পাক্না শক্লোতখ্রে।'
                  : 'You successfully connected rich folklore and oral descriptions with their iconic cultural treasures.'}
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FAF8F5] dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'সঠিকতা' : language === 'hi' ? 'सटीकता' : language === 'mni' ? 'চুম্বা' : 'Accuracy'}
                </p>
                <p className="text-2xl font-bold text-teal-850 dark:text-teal-400 mt-1">
                  {finalResult?.accuracy ?? 90}%
                </p>
              </div>
              <div className="bg-[#FAF8F5] dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'মুঠ পৰ্ব' : language === 'hi' ? 'दौर' : language === 'mni' ? 'রাউন্দ' : 'Rounds'}
                </p>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200 mt-1">{totalRounds}</p>
              </div>
              <div className="bg-[#FAF8F5] dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'সময়' : language === 'hi' ? 'समय' : language === 'mni' ? 'মতম' : 'Time'}
                </p>
                <p className="text-2xl font-bold text-stone-800 dark:text-stone-200 mt-1">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>

            {/* Caregiver Synced note */}
            {patient?.hasCaregiver && (
              <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-3 text-xs text-teal-900 dark:text-teal-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <span>
                  {language === 'as'
                    ? `আপোনাৰ যত্নশীল ${patient.caregiverName || 'ছাৰ্কেল'}ৰ বাবে অগ্ৰগতি সংৰক্ষণ কৰা হ’ল।`
                    : language === 'hi'
                    ? `आपके देखभालकर्ता ${patient.caregiverName || 'सर्कल'} के लिए परिणाम दर्ज किया गया।`
                    : language === 'mni'
                    ? `অদোমগী কেয়ারগিভরগীদমক পাওখুম রেকোর্দ তৌরে।`
                    : `Telemetry and accuracy recorded for your caregiver ${patient.caregiverName || 'Circle'}.`}
                </span>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                id="play-again-btn"
                onClick={() => {
                  setCurrentRound(0);
                  setScore(0);
                  setMistakes(0);
                  setIsFinished(false);
                  setElapsedSeconds(0);
                  setupRound(0);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {language === 'as' ? 'পুনৰ খেলক' : language === 'hi' ? 'फिर से खेलें' : language === 'mni' ? 'অমুক হন্না শানবীয়ু' : 'Play Again'}
                </span>
              </button>
              <button
                id="finish-to-activities-btn"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-850 hover:bg-teal-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
              >
                {language === 'as' ? 'কাৰ্য্যসূচীলৈ উভতি যাওক' : language === 'hi' ? 'गतिविधियों पर वापस' : language === 'mni' ? 'থবকশিংদা হঞ্জিনবা' : 'Back to Activities'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
