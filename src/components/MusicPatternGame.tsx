import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Volume2,
  Sparkles,
  Zap,
  Flame,
  Music,
  Play,
  HelpCircle,
  Award,
} from 'lucide-react';
import { GameSessionResult, PatientProfile, LanguageCode } from '../types';
import { speechService } from '../services/audioSpeech';
import { getTranslation } from '../services/languages';

interface MusicPatternGameProps {
  patient: PatientProfile | null;
  language?: LanguageCode;
  onClose: () => void;
  onComplete: (result: GameSessionResult) => void;
}

export type GridMode = '2x2' | '3x3';

interface InstrumentPad {
  id: number;
  name: string;
  symbol: string;
  colorClass: string;
  activeClass: string;
  noteName: string;
  localizedNames?: Record<LanguageCode, string>;
}

const PADS_2X2: InstrumentPad[] = [
  {
    id: 0,
    name: 'Guitar',
    symbol: '🎸',
    colorClass: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
    activeClass: 'ring-4 ring-amber-200 bg-amber-400 scale-95 shadow-lg',
    noteName: 'Acoustic Guitar',
    localizedNames: {
      en: 'Guitar',
      as: 'গীটাৰ',
      hi: 'गिटार',
      mni: 'গিতার',
    },
  },
  {
    id: 1,
    name: 'Drum',
    symbol: '🥁',
    colorClass: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600',
    activeClass: 'ring-4 ring-rose-200 bg-rose-400 scale-95 shadow-lg',
    noteName: 'Bass Drum',
    localizedNames: {
      en: 'Drum',
      as: 'ঢোল',
      hi: 'ढोल',
      mni: 'পুং',
    },
  },
  {
    id: 2,
    name: 'Flute',
    symbol: '🪈',
    colorClass: 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700',
    activeClass: 'ring-4 ring-teal-200 bg-teal-400 scale-95 shadow-lg',
    noteName: 'Bamboo Flute',
    localizedNames: {
      en: 'Flute',
      as: 'বাঁহী',
      hi: 'बाँसुरी',
      mni: 'তৌরেল',
    },
  },
  {
    id: 3,
    name: 'Bell',
    symbol: '🔔',
    colorClass: 'bg-yellow-400 hover:bg-yellow-500 text-teal-950 border-yellow-500',
    activeClass: 'ring-4 ring-yellow-200 bg-yellow-300 scale-95 shadow-lg',
    noteName: 'Temple Bell',
    localizedNames: {
      en: 'Bell',
      as: 'ঘণ্টা',
      hi: 'घंटी',
      mni: 'ঘন্তা',
    },
  },
];

const PADS_3X3: InstrumentPad[] = [
  {
    id: 0,
    name: 'Drum',
    symbol: '🥁',
    colorClass: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600',
    activeClass: 'ring-4 ring-rose-200 bg-rose-400 scale-95 shadow-lg',
    noteName: 'Bass Drum',
    localizedNames: {
      en: 'Drum',
      as: 'ঢোল',
      hi: 'ढोल',
      mni: 'পুং',
    },
  },
  {
    id: 1,
    name: 'Bongo',
    symbol: '🪘',
    colorClass: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600',
    activeClass: 'ring-4 ring-orange-200 bg-orange-400 scale-95 shadow-lg',
    noteName: 'Bongo Tom',
    localizedNames: {
      en: 'Bongo',
      as: 'বংগো',
      hi: 'बोंगो',
      mni: 'বোঙ্গো',
    },
  },
  {
    id: 2,
    name: 'Guitar',
    symbol: '🎸',
    colorClass: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600',
    activeClass: 'ring-4 ring-amber-200 bg-amber-400 scale-95 shadow-lg',
    noteName: 'Acoustic Guitar',
    localizedNames: {
      en: 'Guitar',
      as: 'গীটাৰ',
      hi: 'गिटार',
      mni: 'গিতার',
    },
  },
  {
    id: 3,
    name: 'Piano',
    symbol: '🎹',
    colorClass: 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700',
    activeClass: 'ring-4 ring-teal-200 bg-teal-400 scale-95 shadow-lg',
    noteName: 'Keys',
    localizedNames: {
      en: 'Piano',
      as: 'পিয়ানো',
      hi: 'पियानो',
      mni: 'পিয়ানো',
    },
  },
  {
    id: 4,
    name: 'Flute',
    symbol: '🪈',
    colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700',
    activeClass: 'ring-4 ring-emerald-200 bg-emerald-400 scale-95 shadow-lg',
    noteName: 'Reed',
    localizedNames: {
      en: 'Flute',
      as: 'বাঁহী',
      hi: 'बाँसुरी',
      mni: 'তৌরেল',
    },
  },
  {
    id: 5,
    name: 'Violin',
    symbol: '🎻',
    colorClass: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700',
    activeClass: 'ring-4 ring-sky-200 bg-sky-400 scale-95 shadow-lg',
    noteName: 'Bow',
    localizedNames: {
      en: 'Violin',
      as: 'বেহেলা',
      hi: 'वायलिन',
      mni: 'ভাইওলিন',
    },
  },
  {
    id: 6,
    name: 'Harp',
    symbol: '🪕',
    colorClass: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700',
    activeClass: 'ring-4 ring-indigo-200 bg-indigo-400 scale-95 shadow-lg',
    noteName: 'Harp',
    localizedNames: {
      en: 'Harp',
      as: 'বীণা',
      hi: 'वीणा',
      mni: 'হার্প',
    },
  },
  {
    id: 7,
    name: 'Xylophone',
    symbol: '🎼',
    colorClass: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700',
    activeClass: 'ring-4 ring-purple-200 bg-purple-400 scale-95 shadow-lg',
    noteName: 'Mallet',
    localizedNames: {
      en: 'Xylophone',
      as: 'জাইলোফোন',
      hi: 'जाइलोफोन',
      mni: 'জাইলোফোন',
    },
  },
  {
    id: 8,
    name: 'Bell',
    symbol: '🔔',
    colorClass: 'bg-yellow-400 hover:bg-yellow-500 text-teal-950 border-yellow-500',
    activeClass: 'ring-4 ring-yellow-200 bg-yellow-300 scale-95 shadow-lg',
    noteName: 'Crystal',
    localizedNames: {
      en: 'Bell',
      as: 'ঘণ্টা',
      hi: 'घंटी',
      mni: 'ঘন্তা',
    },
  },
];

export const MusicPatternGame: React.FC<MusicPatternGameProps> = ({
  patient,
  language = 'en',
  onClose,
  onComplete,
}) => {
  const [gridMode, setGridMode] = useState<GridMode>('2x2');
  const [gameState, setGameState] = useState<'idle' | 'showing-sequence' | 'player-turn' | 'game-over'>('idle');
  const [round, setRound] = useState<number>(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerStep, setPlayerStep] = useState<number>(0);
  const [activePad, setActivePad] = useState<number | null>(null);

  const getInitialStatus = () => {
    if (language === 'as') return 'মোড বাচক আৰু আৰম্ভ কৰিবলৈ টেপ কৰক!';
    if (language === 'hi') return 'मोड चुनें और शुरू करने के लिए टैप करें!';
    if (language === 'mni') return 'মোদ খল্লো অমসুং হৌনবা তেপ তৌবীয়ু!';
    return 'Choose your mode and tap Start!';
  };

  const [statusMessage, setStatusMessage] = useState<string>(getInitialStatus());
  const [highScore, setHighScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  // Update status message when language switches in idle mode
  useEffect(() => {
    if (gameState === 'idle') {
      setStatusMessage(getInitialStatus());
    }
  }, [language, gameState]);

  const isShowingRef = useRef<boolean>(false);
  const activeTimeouts = useRef<NodeJS.Timeout[]>([]);
  const stepStartTimeRef = useRef<number>(Date.now());

  const currentPads = gridMode === '2x2' ? PADS_2X2 : PADS_3X3;
  const padCount = currentPads.length;

  // Load high score from localStorage for current grid mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`music_pattern_highscore_${gridMode}`);
      setHighScore(stored ? parseInt(stored, 10) || 0 : 0);
    }
  }, [gridMode]);

  // Clean up all pending timeouts
  const clearAllTimeouts = useCallback(() => {
    activeTimeouts.current.forEach((t) => clearTimeout(t));
    activeTimeouts.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
      speechService.stop();
    };
  }, [clearAllTimeouts]);

  // Calculate dynamic playback interval based on round
  // Speed formula: starts at 750ms and progressively gets faster until ~230ms
  const getRoundInterval = (r: number): number => {
    return Math.max(230, Math.round(760 - (r - 1) * 55));
  };

  const getTempoLabel = (intervalMs: number): string => {
    if (language === 'as') {
      if (intervalMs >= 650) return 'ধীৰ গতি';
      if (intervalMs >= 500) return 'মধ্যম গতি';
      if (intervalMs >= 380) return 'দ্ৰুত গতি';
      return 'অতি দ্ৰুত গতি!';
    }
    if (language === 'hi') {
      if (intervalMs >= 650) return 'सहज गति';
      if (intervalMs >= 500) return 'मध्यम गति';
      if (intervalMs >= 380) return 'तेज़ गति';
      return 'अत्यधिक तीव्र!';
    }
    if (language === 'mni') {
      if (intervalMs >= 650) return 'তপ্না চৎপা';
      if (intervalMs >= 500) return 'মায়াই ওল্বা';
      if (intervalMs >= 380) return 'য়াংনা চৎপা';
      return 'খ্বাইদগী য়াংবা!';
    }
    if (intervalMs >= 650) return 'Gentle Andante';
    if (intervalMs >= 500) return 'Steady Moderato';
    if (intervalMs >= 380) return 'Brisk Allegro';
    return 'Presto Whirlwind!';
  };

  const currentInterval = getRoundInterval(round);
  const tempoLabel = getTempoLabel(currentInterval);

  // Play a single pad (visual highlight + tone)
  const flashPad = useCallback(
    (padId: number, durationMs: number) => {
      setActivePad(padId);
      const pad = currentPads.find((p) => p.id === padId);
      if (pad) {
        speechService.playInstrument(pad.name, durationMs / 1000);
      } else {
        speechService.playMusicNote(padId, gridMode, durationMs / 1000);
      }

      const t = setTimeout(() => {
        setActivePad((current) => (current === padId ? null : current));
      }, durationMs);
      activeTimeouts.current.push(t);
    },
    [currentPads, gridMode]
  );

  // Start playing the sequence for current round
  const playSequence = useCallback(
    (seq: number[], currentRoundNum: number) => {
      clearAllTimeouts();
      isShowingRef.current = true;
      setGameState('showing-sequence');

      if (language === 'as') {
        setStatusMessage(`ৰাউণ্ড ${currentRoundNum} ৰ সুৰ মন দি শুনক...`);
      } else if (language === 'hi') {
        setStatusMessage(`राउंड ${currentRoundNum} की धुन ध्यान से सुनें...`);
      } else if (language === 'mni') {
        setStatusMessage(`রাউন্দ ${currentRoundNum} গী শৈথা নিংথিনা তাবীয়ু...`);
      } else {
        setStatusMessage(`Listen carefully to Round ${currentRoundNum}...`);
      }

      const intervalMs = getRoundInterval(currentRoundNum);
      const flashMs = Math.max(150, Math.round(intervalMs * 0.65));

      seq.forEach((padId, index) => {
        const timeout = setTimeout(() => {
          flashPad(padId, flashMs);

          // Once last item has flashed, give control to player
          if (index === seq.length - 1) {
            const endTimeout = setTimeout(() => {
              isShowingRef.current = false;
              setGameState('player-turn');
              setPlayerStep(0);
              stepStartTimeRef.current = Date.now();

              if (language === 'as') {
                setStatusMessage('আপোনাৰ পাল! সেই একেই সুৰ বজায়ক...');
              } else if (language === 'hi') {
                setStatusMessage('आपकी बारी! वही धुन दोहराएं...');
              } else if (language === 'mni') {
                setStatusMessage('অদোমগী পালাক্লে! শৈথা অদু হঞ্জিনবীয়ু...');
              } else {
                setStatusMessage('Your turn! Repeat the melody...');
              }
            }, flashMs + 180);
            activeTimeouts.current.push(endTimeout);
          }
        }, (index + 1) * intervalMs);

        activeTimeouts.current.push(timeout);
      });
    },
    [clearAllTimeouts, flashPad, language]
  );

  // Start new game session
  const startNewGame = useCallback(() => {
    clearAllTimeouts();
    speechService.stop();
    setIsNewHighScore(false);
    setRound(1);
    setPlayerStep(0);
    setReactionTimes([]);
    setStartTime(Date.now());

    // Initial sequence of 1 note
    const firstNote = Math.floor(Math.random() * padCount);
    const initialSeq = [firstNote];
    setSequence(initialSeq);

    playSequence(initialSeq, 1);
  }, [clearAllTimeouts, padCount, playSequence]);

  // Advance to next faster round
  const advanceToNextRound = useCallback(
    (nextRound: number, oldSeq: number[]) => {
      clearAllTimeouts();
      setRound(nextRound);
      setPlayerStep(0);

      // Add 1 more random note to sequence
      const nextNote = Math.floor(Math.random() * padCount);
      const nextSeq = [...oldSeq, nextNote];
      setSequence(nextSeq);

      // Update high score in real-time if beaten
      const currentScore = nextRound - 1;
      if (currentScore > highScore) {
        setHighScore(currentScore);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`music_pattern_highscore_${gridMode}`, String(currentScore));
        }
      }

      if (language === 'as') {
        setStatusMessage(`ৰাউণ্ড ${nextRound}! গতি বৃদ্ধি পাইছে...`);
      } else if (language === 'hi') {
        setStatusMessage(`राउंड ${nextRound}! लय तेज़ हो रही है...`);
      } else if (language === 'mni') {
        setStatusMessage(`রাউন্দ ${nextRound}! থুনা চৎপা হৌরক্লে...`);
      } else {
        setStatusMessage(`Round ${nextRound}! Tempo quickens...`);
      }

      const pauseTimeout = setTimeout(() => {
        playSequence(nextSeq, nextRound);
      }, 700);
      activeTimeouts.current.push(pauseTimeout);
    },
    [clearAllTimeouts, gridMode, highScore, language, padCount, playSequence]
  );

  // Repeat the sequence if senior needs to hear it once more
  const handleRepeatMelody = () => {
    if (gameState !== 'player-turn' || sequence.length === 0) return;
    playSequence(sequence, round);
  };

  // Handle player pad click
  const handlePadClick = (padId: number) => {
    if (gameState !== 'player-turn' || isShowingRef.current) return;

    // Record reaction time
    const reactionTime = Date.now() - stepStartTimeRef.current;
    setReactionTimes((prev) => [...prev, reactionTime]);
    stepStartTimeRef.current = Date.now();

    // Flash player's tap
    const intervalMs = getRoundInterval(round);
    const flashMs = Math.max(160, Math.round(intervalMs * 0.6));
    flashPad(padId, flashMs);

    // Check if correct
    const expectedPad = sequence[playerStep];

    if (padId === expectedPad) {
      // Step correct!
      const nextStep = playerStep + 1;

      if (nextStep === sequence.length) {
        // ROUND COMPLETE!
        speechService.playSound('match');
        if (language === 'as') {
          setStatusMessage(`সুন্দৰ! ৰাউণ্ড ${round} সম্পূৰ্ণ হ'ল!`);
        } else if (language === 'hi') {
          setStatusMessage(`बहुत बढ़िया! राउंड ${round} पूरा हुआ!`);
        } else if (language === 'mni') {
          setStatusMessage(`য়াম্না ফরে! রাউন্দ ${round} লোইশিনখ্রে!`);
        } else {
          setStatusMessage(`Spot on! Round ${round} cleared!`);
        }

        const nextRound = round + 1;
        advanceToNextRound(nextRound, sequence);
      } else {
        setPlayerStep(nextStep);
      }
    } else {
      // WRONG PAD: Person loses!
      handleGameOver();
    }
  };

  // Game over triggered upon mistake
  const handleGameOver = () => {
    clearAllTimeouts();
    speechService.playSound('gentle_retry');

    const finalScore = Math.max(0, round - 1);
    const totalElapsed = Date.now() - startTime;
    const avgReaction =
      reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 650;

    // Check high score
    let beatHighScore = false;
    if (finalScore > highScore) {
      beatHighScore = true;
      setHighScore(finalScore);
      setIsNewHighScore(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`music_pattern_highscore_${gridMode}`, String(finalScore));
      }
      setTimeout(() => {
        speechService.playSound('victory');
      }, 350);
    }

    setGameState('game-over');
    if (language === 'as') {
      setStatusMessage(`সুৰ সমাপ্ত। চূড়ান্ত স্কোৰ: ${finalScore}`);
    } else if (language === 'hi') {
      setStatusMessage(`धुन समाप्त। अंतिम स्कोर: ${finalScore}`);
    } else if (language === 'mni') {
      setStatusMessage(`শৈথা লোইরে। ফাইনেল স্কোর: ${finalScore}`);
    } else {
      setStatusMessage(`Melody concluded. Final Score: ${finalScore}`);
    }

    const result: GameSessionResult = {
      id: `session-pattern-${Date.now()}`,
      gameId: 'pattern-sequence',
      patientId: patient?.id || 'senior-guest',
      difficulty: gridMode === '2x2' ? 1 : 2,
      accuracy: finalScore > 0 ? Math.min(100, Math.round((finalScore / round) * 100)) : 40,
      reactionTimeMs: avgReaction,
      completionTimeMs: totalElapsed,
      attempts: round,
      mistakes: 1,
      hintsUsed: 0,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    onComplete(result);
  };

  // Voice Instructions Aloud (ONLY called when explicitly prompted)
  const handleReadInstructions = () => {
    let msg = `Welcome to the Music Pattern game. Listen to each musical instrument as it glows, then tap the pads in the same exact melody. Each round gets a little faster until a note is missed. Play to achieve your highest score!`;
    if (language === 'as') {
      msg = `সংগীতৰ শৈলী খেললৈ স্বাগতম। প্ৰতিটো বাদ্যযন্ত্ৰ জ্বলি উঠাৰ লগে লগে শুনক, তাৰ পিছত একে সুৰত পেডবোৰ স্পৰ্শ কৰক। প্ৰতিটো ৰাউণ্ড দ্ৰুত হ'ব!`;
    } else if (language === 'hi') {
      msg = `संगीत पैटर्न खेल में आपका स्वागत है। वाद्यों की धुन सुनें और उसी क्रम में पैड पर टैप करें। हर राउंड में गति थोड़ी बढ़ती जाएगी!`;
    } else if (language === 'mni') {
      msg = `ম্যুজিক পেতর্ন শানবদা তরাম্না ওকচরি। যন্ত্রশিংগী শৈথা তাবীয়ু অমসুং চপ মান্নবা পরিংদা পেদশিংদা তেপ তৌবীয়ু।`;
    }
    speechService.speak(msg, { force: true, rate: 0.88 });
  };

  // Voice Results Aloud (ONLY called when explicitly prompted)
  const handleReadResultsAloud = () => {
    const finalScore = Math.max(0, round - 1);
    let msg = `Game complete. You reached Round ${round} with a final score of ${finalScore}. Your personal high score in ${gridMode} mode is ${Math.max(
      finalScore,
      highScore
    )}.`;
    if (language === 'as') {
      msg = `খেল সমাপ্ত। আপুনি ৰাউণ্ড ${round} পালে আৰু চূড়ান্ত স্কোৰ হ'ল ${finalScore}। আপোনাৰ সৰ্বোচ্চ স্কোৰ হ'ল ${Math.max(finalScore, highScore)}।`;
    } else if (language === 'hi') {
      msg = `खेल समाप्त। आप राउंड ${round} तक पहुंचे और अंतिम स्कोर ${finalScore} रहा। आपका सर्वश्रेष्ठ स्कोर ${Math.max(finalScore, highScore)} है।`;
    } else if (language === 'mni') {
      msg = `শানবা লোইরে। অদোম্না রাউন্দ ${round} য়ৌখি অমসুং ফাইনেল স্কোর ${finalScore} ওইখি। অদোমগী হাই স্কোরনা ${Math.max(finalScore, highScore)} নি।`;
    }
    speechService.speak(msg, { force: true, rate: 0.9 });
  };

  return (
    <div
      id="music-pattern-game-container"
      className="fixed inset-0 z-50 bg-[#FAF8F5] dark:bg-[#0D1117] flex flex-col overflow-y-auto select-none"
    >
      {/* Top Header */}
      <header className="bg-teal-850 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            id="back-to-activities-btn"
            onClick={() => {
              clearAllTimeouts();
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
            <Music className="w-4 h-4 text-amber-300" />
            <span>
              {language === 'as' ? 'সংগীতৰ শৈলী খেল' : language === 'hi' ? 'संगीत पैटर्न खेल' : language === 'mni' ? 'ম্যুজিক পেতর্ন শানবা' : 'Music Pattern Game'}
            </span>
          </h1>
          <p className="text-[11px] text-teal-200">
            {gridMode === '2x2'
              ? (language === 'as' ? '২×২ গ্ৰিড (৪ পেড)' : language === 'hi' ? '२×२ ग्रिड (४ पैड)' : language === 'mni' ? '২×২ গ্রিদ (৪ পেদ)' : '2×2 Grid Mode (4 Pads)')
              : (language === 'as' ? '৩×৩ গ্ৰিড (৯ পেড)' : language === 'hi' ? '३×३ ग्रिड (९ पैड)' : language === 'mni' ? '৩×৩ গ্রিদ (৯ পেদ)' : '3×3 Grid Mode (9 Pads)')
            } • {language === 'as' ? 'ক্ৰমবৰ্ধমান গতি' : language === 'hi' ? 'प्रगतिशील गति' : language === 'mni' ? 'খোঙজেল য়াংখৎপা' : 'Progressive Speed'}
          </p>
        </div>

        {/* Prompted Voice Instructions Button */}
        <div className="flex items-center gap-2">
          <button
            id="music-read-instructions-btn"
            onClick={handleReadInstructions}
            className="flex items-center gap-1.5 text-xs text-teal-100 hover:text-white bg-teal-800 px-3 py-1.5 rounded-xl border border-teal-700 transition-colors"
            title="Read instructions aloud"
          >
            <Volume2 className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">
              {language === 'as' ? 'কেনেকৈ খেলিব' : language === 'hi' ? 'कैसे खेलें' : language === 'mni' ? 'করম্না শানবা' : 'How to Play'}
            </span>
          </button>
        </div>
      </header>

      {/* Control Ribbon: Grid Mode Selector & Scoreboard */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2.5 shadow-2xs">
        <div className="max-w-xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              {language === 'as' ? 'মোড:' : language === 'hi' ? 'मोड:' : language === 'mni' ? 'মোদ:' : 'Mode:'}
            </span>
            <div className="inline-flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                id="music-mode-2x2-btn"
                onClick={() => {
                  if (gridMode !== '2x2') {
                    clearAllTimeouts();
                    setGridMode('2x2');
                    setGameState('idle');
                    setStatusMessage(
                      language === 'as'
                        ? '২×২ গ্ৰিডলৈ সলনি হ\'ল। আৰম্ভ কৰিবলৈ টেপ কৰক!'
                        : language === 'hi'
                        ? '२×२ ग्रिड पर बदला गया। शुरू करने के लिए टैप करें!'
                        : language === 'mni'
                        ? '২×২ গ্রিদতা হোংদোক্লে। হৌনবা তেপ তৌবীয়ু!'
                        : 'Switched to 2×2 Grid. Tap Start to play!'
                    );
                  }
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  gridMode === '2x2'
                    ? 'bg-teal-850 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {language === 'as' ? '২×২ গ্ৰিড' : language === 'hi' ? '२×२ ग्रिड' : language === 'mni' ? '২×২ গ্রিদ' : '2×2 Grid (4 Pads)'}
              </button>
              <button
                id="music-mode-3x3-btn"
                onClick={() => {
                  if (gridMode !== '3x3') {
                    clearAllTimeouts();
                    setGridMode('3x3');
                    setGameState('idle');
                    setStatusMessage(
                      language === 'as'
                        ? '৩×৩ গ্ৰিডলৈ সলনি হ\'ল। আৰম্ভ কৰিবলৈ টেপ কৰক!'
                        : language === 'hi'
                        ? '३×३ ग्रिड पर बदला गया। शुरू करने के लिए टैप करें!'
                        : language === 'mni'
                        ? '৩×৩ গ্রিদতা হোংদোক্লে। হৌনবা তেপ তৌবীয়ু!'
                        : 'Switched to 3×3 Grid. Tap Start to play!'
                    );
                  }
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  gridMode === '3x3'
                    ? 'bg-teal-850 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                {language === 'as' ? '৩×৩ গ্ৰিড' : language === 'hi' ? '३×३ ग्रिड' : language === 'mni' ? '৩×৩ গ্রিদ' : '3×3 Grid (9 Pads)'}
              </button>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold">
                {language === 'as' ? 'সৰ্বোচ্চ:' : language === 'hi' ? 'सर्वश्रेष्ठ:' : language === 'mni' ? 'খ্বাইদগী য়াম্বা:' : 'Best:'} {highScore}
              </span>
            </div>

            {gameState !== 'idle' && (
              <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-bold">
                  {language === 'as' ? 'ৰাউণ্ড' : language === 'hi' ? 'राउंड' : language === 'mni' ? 'রাউন্দ' : 'Round'} {round}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-xl mx-auto w-full">
        {/* Status Notification Banner */}
        <div className="w-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-3 mb-4 shadow-2xs flex items-center justify-between gap-3 text-center">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100">{statusMessage}</p>
            {gameState !== 'idle' && gameState !== 'game-over' && (
              <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {language === 'as' ? 'গতি:' : language === 'hi' ? 'गति:' : language === 'mni' ? 'খোঙজেল:' : 'Speed:'}{' '}
                <span className="font-medium text-teal-800 dark:text-teal-400">{tempoLabel}</span> ({currentInterval}ms) •{' '}
                {language === 'as' ? 'খোজ' : language === 'hi' ? 'चरण' : language === 'mni' ? 'থাক' : 'Step'}{' '}
                {gameState === 'player-turn' ? playerStep + 1 : 0} / {sequence.length}
              </p>
            )}
          </div>

          {gameState === 'player-turn' && (
            <button
              id="music-repeat-melody-btn"
              onClick={handleRepeatMelody}
              className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-[11px] font-semibold flex items-center gap-1 border border-stone-300 dark:border-stone-700 transition-colors"
              title="Listen to the pattern again"
            >
              <RotateCcw className="w-3 h-3" />
              <span>
                {language === 'as' ? 'পুনৰ শুনক' : language === 'hi' ? 'फिर से सुनें' : language === 'mni' ? 'অমুক হন্না তাবীয়ু' : 'Hear Again'}
              </span>
            </button>
          )}
        </div>

        {gameState === 'idle' ? (
          /* Start Screen */
          <div className="w-full bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2">
              {language === 'as' ? 'সংগীতৰ শৈলী অনুশীলন' : language === 'hi' ? 'संगीत अनुक्रम चुनौती' : language === 'mni' ? 'ম্যুজিক শৈথা শিংনবা' : 'Musical Sequence Challenge'}
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
              {language === 'as'
                ? 'বাদ্যযন্ত্ৰবোৰৰ সুৰ আৰু পোহৰ লক্ষ্য কৰক। একে অনুক্ৰমত পেডবোৰ স্পৰ্শ কৰক। প্ৰতিটো ৰাউণ্ড দ্ৰুত হ’ব!'
                : language === 'hi'
                ? 'वाद्यों की धुन और चमक ध्यान से देखें व सुनें। उसी क्रम में पैड पर टैप करें। हर राउंड में गति थोड़ी बढ़ती जाएगी!'
                : language === 'mni'
                ? 'যন্ত্রশিংনা ঙাল্লকপদা শৈথা অদু তাবীয়ু। চপ মান্নবা মতৌদা পেদশিংদা তেপ তৌবীয়ু। রাউন্দ খুদিংমক খোঙজেল য়াংখৎলক্কনি!'
                : 'Watch and listen as instruments play a rhythm. Tap them in the identical sequence. Each round gets faster until person misses — try to beat your personal high score!'}
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6 text-left">
              <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                  {language === 'as' ? 'নিৰ্বাচিত গ্ৰিড' : language === 'hi' ? 'चुना गया ग्रिड' : language === 'mni' ? 'খল্লবা গ্রিদ' : 'Selected Grid'}
                </span>
                <p className="text-sm font-bold text-teal-850 dark:text-teal-400 mt-0.5">
                  {gridMode === '2x2' ? '2×2 (4 Pads)' : '3×3 (9 Pads)'}
                </p>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">
                  {language === 'as' ? 'মোড ৰেকৰ্ড' : language === 'hi' ? 'मोड रिकॉर्ड' : language === 'mni' ? 'মোদ রেকোর্দ' : 'Mode Record'}
                </span>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {highScore} {language === 'as' ? 'ৰাউণ্ড' : language === 'hi' ? 'राउंड' : language === 'mni' ? 'রাউন্দ' : 'Rounds'}
                </p>
              </div>
            </div>

            <button
              id="music-start-game-btn"
              onClick={startNewGame}
              className="w-full max-w-xs mx-auto py-3.5 bg-amber-400 hover:bg-amber-500 text-teal-950 font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {language === 'as' ? 'সংগীত খেল আৰম্ভ কৰক' : language === 'hi' ? 'संगीत खेल शुरू करें' : language === 'mni' ? 'ম্যুজিক গেম হৌগদবনি' : 'Start Melody Game'}
              </span>
            </button>
          </div>
        ) : gameState === 'game-over' ? (
          /* Game Over Modal with High Score Celebration */
          <div
            id="music-game-over-card"
            className="w-full bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 border border-amber-200 dark:border-amber-800/60 shadow-lg text-center animate-in fade-in zoom-in"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-teal-950 flex items-center justify-center mx-auto mb-3 shadow-xs">
              {isNewHighScore ? <Sparkles className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
            </div>

            {isNewHighScore && (
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>
                  {language === 'as' ? 'নতুন সৰ্বোচ্চ স্কোৰ!' : language === 'hi' ? 'नया उच्च स्कोर!' : language === 'mni' ? 'অনৌবা হাই স্কোর!' : 'New High Score!'}
                </span>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-1">
              {isNewHighScore
                ? (language === 'as' ? 'অসাধাৰণ স্মৃতিশক্তি!' : language === 'hi' ? 'अद्भुत स्मरण शक्ति!' : language === 'mni' ? 'য়াম্না ফজবা নিংশিংবা!' : 'Tremendous Memory!')
                : (language === 'as' ? 'ভাল প্ৰয়াস!' : language === 'hi' ? 'सराहनीय प्रयास!' : language === 'mni' ? 'অফেবা হোৎনবা!' : 'Good Effort!')}
            </h2>

            <p className="text-xs text-stone-600 dark:text-stone-400 mb-4">
              {language === 'as' ? (
                <>আপুনি <span className="font-semibold text-teal-900 dark:text-teal-300">{gridMode} গ্ৰিডত</span> খেলি <span className="font-semibold text-teal-900 dark:text-teal-300">ৰাউণ্ড {round}</span> পালেগৈ।</>
              ) : language === 'hi' ? (
                <>आपने <span className="font-semibold text-teal-900 dark:text-teal-300">{gridMode} ग्रिड मोड</span> में खेलकर <span className="font-semibold text-teal-900 dark:text-teal-300">राउंड {round}</span> हासिल किया।</>
              ) : language === 'mni' ? (
                <>অদোম্না <span className="font-semibold text-teal-900 dark:text-teal-300">{gridMode} গ্রিদ মোদতা</span> শান্দুনা <span className="font-semibold text-teal-900 dark:text-teal-300">রাউন্দ {round}</span> য়ৌরে।</>
              ) : (
                <>You played in <span className="font-semibold text-teal-900 dark:text-teal-300">{gridMode} Grid Mode</span> and reached <span className="font-semibold text-teal-900 dark:text-teal-300">Round {round}</span>.</>
              )}
            </p>

            {/* Prompted Voice Aloud Button */}
            <button
              id="music-read-results-btn"
              onClick={handleReadResultsAloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 rounded-full bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-850 dark:text-teal-300 text-xs font-semibold border border-teal-200 dark:border-teal-800 transition-colors mx-auto"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>
                {language === 'as' ? 'ফলাফল ডাঙৰকৈ পঢ়ক' : language === 'hi' ? 'परिणाम पढ़कर सुनाएं' : language === 'mni' ? 'ফল অদু পাওথম্বীয়ু' : 'Read Results Aloud'}
              </span>
            </button>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 text-center mb-6">
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'স্কোৰ' : language === 'hi' ? 'स्कोर' : language === 'mni' ? 'স্কোর' : 'Score'}
                </span>
                <p className="text-xl font-bold text-teal-850 dark:text-teal-400 mt-0.5">{Math.max(0, round - 1)}</p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">
                  {language === 'as' ? 'উত্তীৰ্ণ ৰাউণ্ড' : language === 'hi' ? 'पूरे किए गए राउंड' : language === 'mni' ? 'লোইশিনখিবা রাউন্দ' : 'Rounds cleared'}
                </span>
              </div>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'সৰ্বোচ্চ স্কোৰ' : language === 'hi' ? 'उच्च स्कोर' : language === 'mni' ? 'হাই স্কোর' : 'High Score'}
                </span>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{highScore}</p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">{gridMode} record</span>
              </div>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <span className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'শীৰ্ষ গতি' : language === 'hi' ? 'शीर्ष गति' : language === 'mni' ? 'খ্বাইদগী য়াংবা' : 'Top Speed'}
                </span>
                <p className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1 truncate">{tempoLabel}</p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">{currentInterval}ms</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                id="music-play-again-btn"
                onClick={startNewGame}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-teal-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {language === 'as' ? `পুনৰ খেলক (${gridMode})` : language === 'hi' ? `फिर से खेलें (${gridMode})` : language === 'mni' ? `অমুক হন্না শানবীয়ু (${gridMode})` : `Play Again (${gridMode})`}
                </span>
              </button>

              <button
                id="music-switch-mode-btn"
                onClick={() => {
                  const nextMode = gridMode === '2x2' ? '3x3' : '2x2';
                  setGridMode(nextMode);
                  setGameState('idle');
                  setStatusMessage(
                    language === 'as'
                      ? `${nextMode} মোডলৈ সলনি হ'ল। আৰম্ভ কৰিবলৈ টেপ কৰক!`
                      : language === 'hi'
                      ? `${nextMode} मोड पर बदला गया। शुरू करने के लिए टैप करें!`
                      : language === 'mni'
                      ? `${nextMode} মোদ্দা হোংদোক্লে। হৌনবা তেপ তৌবীয়ু!`
                      : `Switched to ${nextMode} mode. Tap Start!`
                  );
                }}
                className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
              >
                <span>
                  {language === 'as'
                    ? `${gridMode === '2x2' ? '৩×৩' : '২×২'} লৈ সলনি কৰক`
                    : language === 'hi'
                    ? `${gridMode === '2x2' ? '३×३' : '२×२'} में बदलें`
                    : language === 'mni'
                    ? `${gridMode === '2x2' ? '৩×৩' : '২×২'} দা হোংদোকউ`
                    : `Switch to ${gridMode === '2x2' ? '3×3' : '2×2'}`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Active Pad Grid */
          <div className="w-full flex flex-col items-center">
            <div
              className={`grid gap-3 sm:gap-4 w-full justify-center transition-all ${
                gridMode === '2x2' ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-md'
              }`}
            >
              {currentPads.map((pad) => {
                const isActive = activePad === pad.id;
                const displayName = pad.localizedNames ? pad.localizedNames[language] || pad.name : pad.name;

                return (
                  <button
                    key={pad.id}
                    id={`instrument-pad-${pad.id}`}
                    onClick={() => handlePadClick(pad.id)}
                    disabled={gameState !== 'player-turn'}
                    className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center p-2 border-2 transition-all select-none relative cursor-pointer active:scale-95 shadow-xs ${
                      isActive
                        ? pad.activeClass
                        : `${pad.colorClass} opacity-90 hover:opacity-100`
                    } ${
                      gameState !== 'player-turn' && !isActive
                        ? 'cursor-not-allowed opacity-75'
                        : ''
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 filter drop-shadow-sm">
                      {pad.symbol}
                    </span>
                    <span className="text-xs sm:text-sm font-bold tracking-tight">
                      {displayName}
                    </span>
                    <span className="text-[9px] opacity-80 uppercase tracking-wider font-semibold">
                      {pad.noteName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Gentle Reassurance */}
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-5 text-center">
              {gameState === 'showing-sequence'
                ? (language === 'as'
                    ? '👂 শুনাৰ সময়: জ্বলি থকা পেডবোৰৰ ক্ৰম মনত ৰাখক...'
                    : language === 'hi'
                    ? '👂 सुनने का समय: चमकते पैड का क्रम याद रखें...'
                    : language === 'mni'
                    ? '👂 তারিবনি: ঙাল্লক্লিবা পেদশিংগী পরিং নিংশিংবীয়ু...'
                    : '👂 Listening phase: Remember the order of glowing pads...')
                : (language === 'as'
                    ? '👉 আপোনাৰ পাল: একেই অনুক্ৰমত পেডবোৰ টেপ কৰক!'
                    : language === 'hi'
                    ? '👉 आपकी बारी: उसी क्रम में पैड को टैप करें!'
                    : language === 'mni'
                    ? '👉 অদোমগী পালাক্লে: চপ মান্নবা পরিংদা পেদশিং তেপ তৌবীয়ু!'
                    : '👉 Your turn: Tap the pads in the same sequence!')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
