import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Sparkles,
  Timer,
  Sliders,
  CheckCircle2,
  Award,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameSessionResult, PatientProfile, LanguageCode } from '../types';
import { SIMPLE_OBJECTS_CATALOG } from '../data/simpleObjectsCatalog';
import { speechService } from '../services/audioSpeech';

interface MemoryTilesGameProps {
  patient: PatientProfile | null;
  language?: LanguageCode;
  onClose: () => void;
  onComplete: (result: GameSessionResult) => void;
}

export type GridDifficulty = '2x2' | '3x4' | '4x4';

interface TileInstance {
  instanceId: number;
  tileId: string;
  name: string;
  symbol: string;
  image: string;
  category: string;
  soundCue?: 'tap' | 'match' | 'instrument_bell';
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryTilesGame: React.FC<MemoryTilesGameProps> = ({
  patient,
  language = 'en',
  onClose,
  onComplete,
}) => {
  const [difficulty, setDifficulty] = useState<GridDifficulty>('3x4');
  const [flipDelayMs, setFlipDelayMs] = useState<number>(1000); // 800 - 1200ms
  const [tiles, setTiles] = useState<TileInstance[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [matchesFound, setMatchesFound] = useState<number>(0);
  const [isProcessingMismatch, setIsProcessingMismatch] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<GameSessionResult | null>(null);
  const [lastMatchNotice, setLastMatchNotice] = useState<string | null>(null);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState<boolean>(
    speechService.isVoiceoverEnabled()
  );

  const OBJECT_LOCALIZED_NAMES: Record<string, Record<LanguageCode, string>> = {
    apple: { en: 'Apple', as: 'আপেল', hi: 'सेब', mni: 'শেব' },
    clock: { en: 'Clock', as: 'ঘড়ী', hi: 'घड़ी', mni: 'পুং' },
    key: { en: 'Key', as: 'চাবি', hi: 'चाबी', mni: 'চাবি' },
    cup: { en: 'Coffee Cup', as: 'কাপ', hi: 'प्याला', mni: 'কুপ' },
    book: { en: 'Book', as: 'কিতাপ', hi: 'किताब', mni: 'লাইরিক' },
    flower: { en: 'Flower', as: 'ফুল', hi: 'फूल', mni: 'লৈ' },
    sun: { en: 'Sun', as: 'সূৰ্য', hi: 'सूरज', mni: 'নুমিত' },
    tree: { en: 'Tree', as: 'গছ', hi: 'पेड़', mni: 'উপাল' },
    bell: { en: 'Bell', as: 'ঘণ্টা', hi: 'घंटी', mni: 'খোংবা' },
    house: { en: 'House', as: 'ঘৰ', hi: 'घर', mni: 'য়ুম' },
    lamp: { en: 'Lamp', as: 'চাকি', hi: 'दीपक', mni: 'থাবা' },
    umbrella: { en: 'Umbrella', as: 'ছাতি', hi: 'छाता', mni: 'শেকপিন' },
    guitar: { en: 'Guitar', as: 'গীটাৰ', hi: 'गिटार', mni: 'গিতার' },
    bicycle: { en: 'Bicycle', as: 'চাইকেল', hi: 'साइकिल', mni: 'সাইকেল' },
    heart: { en: 'Heart', as: 'হৃদয়', hi: 'दिल', mni: 'থমোই' },
    star: { en: 'Star', as: 'তৰা', hi: 'तारा', mni: 'থৌৱানমিচাক' },
  };

  const getLocalizedObjectName = (id: string, defaultName: string) => {
    return OBJECT_LOCALIZED_NAMES[id]?.[language] || defaultName;
  };

  // Sync voiceover state
  useEffect(() => {
    const unsub = speechService.onVoiceoverToggle(setVoiceoverEnabled);
    return () => {
      unsub();
      speechService.stop();
    };
  }, []);

  // Total pairs depending on difficulty
  const getPairCount = (diff: GridDifficulty): number => {
    switch (diff) {
      case '2x2':
        return 2; // 4 tiles
      case '3x4':
        return 6; // 12 tiles
      case '4x4':
        return 8; // 16 tiles
      default:
        return 6;
    }
  };

  const totalPairs = getPairCount(difficulty);

  // Initialize or restart board with simple everyday objects
  const setupBoard = useCallback((chosenDiff: GridDifficulty) => {
    speechService.stop();
    const pairsNeeded = getPairCount(chosenDiff);

    // Shuffle simple objects catalog and select pairsNeeded items
    const shuffledCatalog = [...SIMPLE_OBJECTS_CATALOG].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledCatalog.slice(0, pairsNeeded);

    // Duplicate each selected item to form pairs
    const deck: TileInstance[] = [];
    let currentInstanceId = 0;

    selectedItems.forEach((item) => {
      deck.push({
        instanceId: currentInstanceId++,
        tileId: item.id,
        name: item.name,
        symbol: item.symbol,
        image: item.image,
        category: item.category,
        soundCue: 'match',
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        instanceId: currentInstanceId++,
        tileId: item.id,
        name: item.name,
        symbol: item.symbol,
        image: item.image,
        category: item.category,
        soundCue: 'match',
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle the combined deck
    const randomizedTiles = deck.sort(() => Math.random() - 0.5);

    setTiles(randomizedTiles);
    setFlippedIndices([]);
    setMoves(0);
    setMistakes(0);
    setMatchesFound(0);
    setIsProcessingMismatch(false);
    setIsFinished(false);
    setFinalScore(null);
    setLastMatchNotice(null);
    setStartTime(Date.now());
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    setupBoard(difficulty);
  }, [difficulty, setupBoard]);

  // Live timer tick
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  // Read instructions aloud
  const handleReadInstructions = () => {
    let msg = `Tap any card to turn it face up. Remember its position and find its matching identical pair. Matched cards will lock in place with a gentle chime.`;
    if (language === 'as') {
      msg = `কাৰ্ড এখন লুটিয়াই চাওক। ইয়াৰ স্থান মনত ৰাখক আৰু একে জোৰাটো বিচাৰি উলিয়াওক। মিল পোৱা কাৰ্ডবোৰ সুৰৰ সৈতে বন্ধ হৈ যাব।`;
    } else if (language === 'hi') {
      msg = `किसी भी कार्ड पर टैप करके उसे पलटें। उसका स्थान याद रखें और उसका सही जोड़ा ढूंढें। सही जोड़े मिलने पर मधुर धुन बजेगी।`;
    } else if (language === 'mni') {
      msg = `কার্দ অমা ওনথোকউ। মফম অদু নিংশিংবীয়ু অমসুং চপ মান্নবা কার্দ অদুগা পুন্সিনবীয়ু।`;
    }
    speechService.speak(msg, { force: true, rate: 0.88 });
  };

  // Toggle voiceover
  const toggleVoiceover = () => {
    const next = !voiceoverEnabled;
    setVoiceoverEnabled(next);
    speechService.setVoiceoverEnabled(next);
    if (!next) {
      speechService.stop();
    } else {
      let msg = 'Voiceover active. I will speak tile names and match celebrations.';
      if (language === 'as') msg = 'ভইচ অভাৰ সক্ৰিয়। মই কাৰ্ডৰ নাম আৰু মিল ঘোষণা কৰিম।';
      else if (language === 'hi') msg = 'वॉइसओवर सक्रिय। मैं टाइल के नाम और सफलता की जानकारी दूंगा।';
      else if (language === 'mni') msg = 'ভোইসওভর সক্রিয় ওইরে।';
      speechService.speak(msg, { force: true });
    }
  };

  // Handle Tile Click (Player Loop)
  const handleTileClick = (index: number) => {
    if (
      isProcessingMismatch ||
      tiles[index].isFlipped ||
      tiles[index].isMatched ||
      flippedIndices.length >= 2
    ) {
      return;
    }

    // Step 1: Flip and reveal face
    const updatedTiles = [...tiles];
    updatedTiles[index].isFlipped = true;
    const newFlipped = [...flippedIndices, index];

    setTiles(updatedTiles);
    setFlippedIndices(newFlipped);

    // Audio click / chime
    speechService.playSound('tap');

    // Step 2: Second tile revealed -> Evaluate match
    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      const firstTile = updatedTiles[firstIdx];
      const secondTile = updatedTiles[secondIdx];

      if (firstTile.tileId === secondTile.tileId) {
        // MATCH!
        firstTile.isMatched = true;
        secondTile.isMatched = true;
        const newMatches = matchesFound + 1;
        setMatchesFound(newMatches);
        setFlippedIndices([]);

        const localizedName = getLocalizedObjectName(firstTile.tileId, firstTile.name);
        let matchMsg = `${firstTile.symbol} Matched ${localizedName}!`;
        if (language === 'as') matchMsg = `${firstTile.symbol} ${localizedName} মিলি গ’ল!`;
        else if (language === 'hi') matchMsg = `${firstTile.symbol} ${localizedName} मिल गया!`;
        else if (language === 'mni') matchMsg = `${firstTile.symbol} ${localizedName} চপ মান্নরে!`;
        setLastMatchNotice(matchMsg);

        // Play gentle match chime
        speechService.playSound('match');

        setTimeout(() => {
          setLastMatchNotice(null);
        }, 1800);

        // Check Objective
        if (newMatches === totalPairs) {
          finishGame(moves + 1, mistakes, newMatches);
        }
      } else {
        // MISMATCH
        setMistakes((m) => m + 1);
        setIsProcessingMismatch(true);

        setTimeout(() => {
          setTiles((prev) => {
            const next = [...prev];
            if (next[firstIdx]) next[firstIdx].isFlipped = false;
            if (next[secondIdx]) next[secondIdx].isFlipped = false;
            return next;
          });
          setFlippedIndices([]);
          setIsProcessingMismatch(false);
        }, flipDelayMs);
      }
    }
  };

  // Game completion calculation
  const finishGame = (totalMoves: number, totalMistakes: number, pairsCount: number) => {
    const elapsedMs = Math.max(1000, Date.now() - startTime);
    const calculatedAccuracy = Math.min(
      100,
      Math.max(25, Math.round((pairsCount / Math.max(pairsCount, totalMoves)) * 100))
    );
    const avgReaction = Math.round(elapsedMs / Math.max(1, totalMoves));

    const diffLevel = difficulty === '2x2' ? 1 : difficulty === '3x4' ? 2 : 3;

    const result: GameSessionResult = {
      id: `session-tiles-${Date.now()}`,
      gameId: 'memory-tiles',
      patientId: patient?.id || 'senior-guest',
      difficulty: diffLevel,
      accuracy: calculatedAccuracy,
      reactionTimeMs: avgReaction,
      completionTimeMs: elapsedMs,
      attempts: totalMoves,
      mistakes: totalMistakes,
      hintsUsed: 0,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    setFinalScore(result);
    setIsFinished(true);
    speechService.playSound('victory');

    onComplete(result);
  };

  const handleReadResultsAloud = () => {
    if (!finalScore) return;
    const secs = Math.round(finalScore.completionTimeMs / 1000);
    let msg = `Great effort! You paired all ${totalPairs} everyday objects with ${finalScore.accuracy} percent accuracy in ${secs} seconds.`;
    if (language === 'as') {
      msg = `অসাধাৰণ কাম! আপুনি সকলো ${totalPairs} টা বস্তু ${finalScore.accuracy} শতাংশ সঠিকতাৰে ${secs} চেকেণ্ডত মিলালে।`;
    } else if (language === 'hi') {
      msg = `शानदार प्रयास! आपने सभी ${totalPairs} वस्तुओं को ${finalScore.accuracy} प्रतिशत सटीकता के साथ ${secs} सेकंड में मिलाया।`;
    } else if (language === 'mni') {
      msg = `য়াম্না ফরে! অদোম্না পোতশক ${totalPairs} মক সেকেন্দ ${secs} দা লোইশিনবীয়ু।`;
    }
    speechService.speak(msg, { force: true, rate: 0.9 });
  };

  // Grid column CSS classes based on difficulty
  const getGridColsClass = () => {
    switch (difficulty) {
      case '2x2':
        return 'grid-cols-2 max-w-sm';
      case '3x4':
        return 'grid-cols-3 sm:grid-cols-4 max-w-xl';
      case '4x4':
        return 'grid-cols-4 max-w-2xl';
      default:
        return 'grid-cols-3 sm:grid-cols-4 max-w-xl';
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      id="memory-tiles-game-container"
      className="fixed inset-0 z-50 bg-[#FAF8F5] dark:bg-[#0D1117] flex flex-col overflow-y-auto"
    >
      {/* Top Header */}
      <header className="bg-teal-850 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            id="back-to-activities-btn"
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
          <h1 className="text-sm sm:text-base font-serif font-bold tracking-tight">
            {language === 'as'
              ? 'স্মৃতি কাৰ্ড মিলোৱা (Memory Tiles)'
              : language === 'hi'
              ? 'स्मृति टाइल मिलान (Memory Tiles)'
              : language === 'mni'
              ? 'মেমোরি তাইল মেচিং (Memory Tiles)'
              : 'Memory Tiles (Everyday Objects)'}
          </h1>
          <p className="text-[11px] text-teal-200">
            {patient?.preferredName || 'Senior'} • {language === 'as' ? 'দৃশ্য চিনাক্তকৰণ আৰু যোৰ মিলোৱা' : language === 'hi' ? 'दृश्य पहचान और जोड़ी मिलान' : language === 'mni' ? 'উবা অমসুং মান্নবা পুন্সিনবা' : 'Visual Recall & Pair Matching'}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            id="tiles-read-instructions-btn"
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

      {/* Control Ribbon: Grid Difficulty & Delay */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-2.5 shadow-2xs">
        <div className="max-w-xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Grid Size selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>{language === 'as' ? 'গ্ৰিড:' : language === 'hi' ? 'ग्रिड:' : language === 'mni' ? 'গ্রিদ:' : 'Grid:'}</span>
            </span>
            <div className="inline-flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              {(
                [
                  { id: '2x2', label: language === 'as' ? '২×২ (২ যোৰ)' : language === 'hi' ? '२×२ (२ जोड़े)' : language === 'mni' ? '২×২ (যোৰা ২)' : '2×2 (2 pairs)' },
                  { id: '3x4', label: language === 'as' ? '৩×৪ (৬ যোৰ)' : language === 'hi' ? '३×४ (६ जोड़े)' : language === 'mni' ? '৩×৪ (যোৰা ৬)' : '3×4 (6 pairs)' },
                  { id: '4x4', label: language === 'as' ? '৪×৪ (৮ যোৰ)' : language === 'hi' ? '४×४ (८ जोड़े)' : language === 'mni' ? '৪×৪ (যোৰা ৮)' : '4×4 (8 pairs)' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  id={`difficulty-${mode.id}`}
                  onClick={() => setDifficulty(mode.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    difficulty === mode.id
                      ? 'bg-teal-850 text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Configurable Flip Delay */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
              {language === 'as' ? 'লুটিওৱাৰ গতি:' : language === 'hi' ? 'पलटने की गति:' : language === 'mni' ? 'ওনথোকপগী খোঙজেল:' : 'Flip Speed:'}
            </span>
            <div className="inline-flex bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700">
              {[
                { ms: 800, label: language === 'as' ? 'দ্ৰুত (০.৮s)' : language === 'hi' ? 'तेज़ (०.८s)' : language === 'mni' ? 'য়াংবা (০.৮s)' : 'Fast (0.8s)' },
                { ms: 1000, label: language === 'as' ? 'স্বাভাৱিক (১.০s)' : language === 'hi' ? 'सहज (१.०s)' : language === 'mni' ? 'মায়াই ওল্বা (১.০s)' : 'Calm (1.0s)' },
                { ms: 1200, label: language === 'as' ? 'ধীৰ (১.২s)' : language === 'hi' ? 'शांत (१.২s)' : language === 'mni' ? 'তপ্না (১.২s)' : 'Relaxed (1.2s)' },
              ].map((d) => (
                <button
                  key={d.ms}
                  id={`delay-btn-${d.ms}`}
                  onClick={() => setFlipDelayMs(d.ms)}
                  title={`Flip back delay: ${d.ms}ms`}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                    flipDelayMs === d.ms
                      ? 'bg-amber-400 text-teal-950 font-bold shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="max-w-xl w-full mx-auto px-4 pt-3 flex items-center justify-between text-stone-700 dark:text-stone-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
            <Timer className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold uppercase mr-1">
              {language === 'as' ? 'চেষ্টা:' : language === 'hi' ? 'चालें:' : language === 'mni' ? 'খোঙথাং:' : 'Moves:'}
            </span>
            <span className="font-bold text-stone-900 dark:text-stone-100">{moves}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 shadow-2xs text-amber-900 dark:text-amber-200">
            <span className="text-[11px] font-semibold uppercase mr-1">
              {language === 'as' ? 'মিলা জোৰা:' : language === 'hi' ? 'मिलाए गए:' : language === 'mni' ? 'চপ মান্নবা:' : 'Matched:'}
            </span>
            <span className="font-bold text-sm">
              {matchesFound} / {totalPairs}
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center">
        {/* Match celebration notice */}
        {lastMatchNotice && (
          <div
            id="match-feedback-banner"
            className="mb-3 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold rounded-full shadow-2xs flex items-center gap-1.5 animate-in fade-in zoom-in"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
            <span>{lastMatchNotice}</span>
          </div>
        )}

        {isFinished && finalScore ? (
          /* Victory Completion Modal */
          <div
            id="memory-tiles-victory-card"
            className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-7 shadow-lg border border-amber-200 dark:border-amber-800/60 text-center w-full max-w-md animate-in fade-in zoom-in"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-amber-500 text-teal-950 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Trophy className="w-9 h-9" />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
              {language === 'as' ? 'স্মৃতি চৰ্চা সম্পূৰ্ণ হ’ল' : language === 'hi' ? 'स्मृति अभ्यास संपन्न' : language === 'mni' ? 'নিংশিংবা লোইশিনখ্রে' : 'Visual Recall Completed'}
            </span>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2 mb-1">
              {language === 'as'
                ? `সুন্দৰ কাম, ${patient?.preferredName || 'জ্যেষ্ঠ'}!`
                : language === 'hi'
                ? `अद्भुत प्रदर्शन, ${patient?.preferredName || 'वरिष्ठ'}!`
                : language === 'mni'
                ? `য়াম্না ফরে, ${patient?.preferredName || 'সিনিয়র'}!`
                : `Splendid Work, ${patient?.preferredName || 'Senior'}!`}
            </h3>

            <p className="text-xs text-stone-600 dark:text-stone-400 mb-4">
              {language === 'as'
                ? `আপুনি শান্ত মনেৰে সকলো ${totalPairs} টা বস্তুৰ জোৰা মিলালে।`
                : language === 'hi'
                ? `आपने शांत चित्त और ध्यान के साथ सभी ${totalPairs} वस्तुओं के जोड़े मिलाए।`
                : language === 'mni'
                ? `অদোম্না পুন্সিনবা লোইশিনখ্রে পোতশক ${totalPairs} মক।`
                : `You paired all ${totalPairs} everyday objects with steady concentration and calm rhythm.`}
            </p>

            {/* Read aloud on demand button */}
            <button
              id="memory-tiles-read-results-btn"
              onClick={handleReadResultsAloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-5 rounded-full bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-850 dark:text-teal-300 text-xs font-semibold border border-teal-200 dark:border-teal-800 transition-colors mx-auto"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>
                {language === 'as' ? 'ফলাফল ডাঙৰকৈ পঢ়ক' : language === 'hi' ? 'परिणाम पढ़कर सुनाएं' : language === 'mni' ? 'ফল অদু পাওথম্বীয়ু' : 'Read Results Aloud'}
              </span>
            </button>

            {/* Performance metrics breakdown */}
            <div className="grid grid-cols-3 gap-2.5 text-center mb-5">
              <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'সঠিকতা' : language === 'hi' ? 'सटीकता' : language === 'mni' ? 'চুম্বা' : 'Accuracy'}
                </p>
                <p className="text-xl font-bold text-teal-850 dark:text-teal-400 mt-0.5">{finalScore.accuracy}%</p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">
                  {moves} {language === 'as' ? 'মুঠ চেষ্টা' : language === 'hi' ? 'कुल चालें' : language === 'mni' ? 'মুৎ খোঙথাং' : 'total moves'}
                </span>
              </div>

              <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'কাৰ্ড মোড' : language === 'hi' ? 'कठिनाई' : language === 'mni' ? 'মোদ' : 'Difficulty'}
                </p>
                <p className="text-xl font-bold text-stone-800 dark:text-stone-200 mt-0.5">{difficulty}</p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">
                  {totalPairs} {language === 'as' ? 'যোৰা' : language === 'hi' ? 'जोड़े' : language === 'mni' ? 'যোৰা' : 'pairs'}
                </span>
              </div>

              <div className="p-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 shadow-2xs">
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase">
                  {language === 'as' ? 'সময়' : language === 'hi' ? 'समय' : language === 'mni' ? 'মতম' : 'Time'}
                </p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {Math.round(finalScore.completionTimeMs / 1000)}s
                </p>
                <span className="text-[9px] text-stone-500 dark:text-stone-400">
                  {Math.round(finalScore.reactionTimeMs / 1000)}s/turn
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                id="memory-tiles-play-again-btn"
                onClick={() => setupBoard(difficulty)}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-teal-950 font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {language === 'as' ? 'পুনৰ খেলক' : language === 'hi' ? 'फिर से खेलें' : language === 'mni' ? 'অমুক হন্না শানবীয়ু' : 'Play Again'}
                </span>
              </button>
              <button
                id="memory-tiles-finish-return-btn"
                onClick={onClose}
                className="flex-1 py-3 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
              >
                {language === 'as' ? 'কাৰ্য্যসূচীলৈ উভতি যাওক' : language === 'hi' ? 'गतिविधियों पर वापस' : language === 'mni' ? 'থবকশিংদা হঞ্জিনবা' : 'Return to Activities'}
              </button>
            </div>
          </div>
        ) : (
          /* Active Grid Board with Real Images */
          <div className="w-full flex flex-col items-center">
            <div
              className={`grid ${getGridColsClass()} gap-2.5 sm:gap-3.5 w-full justify-center transition-all`}
            >
              {tiles.map((tile, index) => {
                const isRevealed = tile.isFlipped || tile.isMatched;
                const displayName = getLocalizedObjectName(tile.tileId, tile.name);

                return (
                  <button
                    key={tile.instanceId}
                    id={`tile-card-${index}`}
                    onClick={() => handleTileClick(index)}
                    disabled={isProcessingMismatch || tile.isMatched}
                    className={`h-28 sm:h-32 rounded-2xl flex flex-col items-center justify-between p-1.5 sm:p-2 border-2 transition-all transform active:scale-95 shadow-2xs relative select-none overflow-hidden ${
                      tile.isMatched
                        ? 'bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-400 dark:border-emerald-600 text-teal-950 dark:text-teal-200 shadow-xs cursor-default ring-2 ring-emerald-200 dark:ring-emerald-800'
                        : isRevealed
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-stone-900 dark:text-stone-100 ring-2 ring-amber-200 dark:ring-amber-800'
                        : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 hover:border-teal-700 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    {isRevealed ? (
                      <div className="flex flex-col items-center justify-between w-full h-full animate-in fade-in zoom-in">
                        {/* Real Image Container */}
                        <div className="w-full h-16 sm:h-18 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-700 relative">
                          <img
                            src={tile.image}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Visual fallback if image load fails
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="absolute bottom-1 right-1 text-base drop-shadow-md">
                            {tile.symbol}
                          </span>
                        </div>

                        <span className="text-[10px] sm:text-[11px] font-bold text-stone-800 dark:text-stone-200 text-center leading-tight truncate w-full px-0.5 mt-1">
                          {displayName}
                        </span>

                        <span className="text-[9px] text-teal-850 dark:text-teal-400 font-medium truncate max-w-full">
                          {tile.category}
                        </span>
                      </div>
                    ) : (
                      /* Card Back Face */
                      <div className="flex flex-col items-center justify-center w-full h-full text-stone-400 dark:text-stone-500 hover:text-teal-800 dark:hover:text-teal-400 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center text-lg mb-1">
                          🎴
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                          {language === 'as' ? 'কাৰ্ড' : language === 'hi' ? 'कार्ड' : language === 'mni' ? 'কার্দ' : 'Tile'} {index + 1}
                        </span>
                      </div>
                    )}

                    {/* Matched Lock Badge */}
                    {tile.isMatched && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Gentle Reassurance */}
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-4 text-center">
              Take your time • Tap any face-down tile to uncover its treasure
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
