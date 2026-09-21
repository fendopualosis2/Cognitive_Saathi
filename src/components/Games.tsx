import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Timer,
  Heart,
  Music,
  HelpCircle,
} from 'lucide-react';
import { GameSessionResult, PatientProfile, LanguageCode } from '../types';
import { MemoryTilesGame } from './MemoryTilesGame';
import { RecognizeByDescriptionGame } from './RecognizeByDescriptionGame';
import { MusicPatternGame } from './MusicPatternGame';
import { CULTURAL_CATALOG, CulturalItem } from '../data/culturalCatalog';
import { SIMPLE_OBJECTS_CATALOG } from '../data/simpleObjectsCatalog';
import { speechService } from '../services/audioSpeech';

interface GamesProps {
  gameId: string;
  patient: PatientProfile | null;
  language?: LanguageCode;
  onClose: () => void;
  onComplete: (result: GameSessionResult) => void;
}

interface CardItem {
  instanceId: number;
  cardId: string;
  name: string;
  icon: string;
  image: string;
  category: string;
  soundCue?: string;
  flipped: boolean;
  matched: boolean;
}

// 4 Musical instruments for the Sequence game
const SEQUENCE_INSTRUMENTS: Array<{
  id: number;
  name: string;
  localName: string;
  image: string;
  color: string;
  activeColor: string;
  soundCue: CulturalItem['soundCue'];
}> = [
  {
    id: 0,
    name: 'Bihu Dhol',
    localName: 'ঢোল',
    image: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=500&auto=format&fit=crop&q=80',
    color: 'bg-gradient-to-br from-amber-600 to-amber-700',
    activeColor: 'bg-amber-400 ring-4 ring-amber-200 scale-105',
    soundCue: 'instrument_dhol',
  },
  {
    id: 1,
    name: 'Pepa Horn',
    localName: 'পেঁপা',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=80',
    color: 'bg-gradient-to-br from-red-600 to-rose-700',
    activeColor: 'bg-rose-400 ring-4 ring-rose-200 scale-105',
    soundCue: 'instrument_pepa',
  },
  {
    id: 2,
    name: 'Bamboo Flute',
    localName: 'বাঁহী',
    image: 'https://images.unsplash.com/photo-1520523839898-50712825e617?w=500&auto=format&fit=crop&q=80',
    color: 'bg-gradient-to-br from-teal-700 to-emerald-800',
    activeColor: 'bg-emerald-400 ring-4 ring-emerald-200 scale-105',
    soundCue: 'instrument_flute',
  },
  {
    id: 3,
    name: 'Bell Metal Gong',
    localName: 'কাঁহৰ ঘণ্টা',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    color: 'bg-gradient-to-br from-yellow-600 to-amber-800',
    activeColor: 'bg-yellow-400 ring-4 ring-yellow-200 scale-105',
    soundCue: 'instrument_bell',
  },
];

// Rich cultural stories and familiarity questions with images
const FAMILIAR_QUESTIONS = [
  {
    question: 'Which sacred bell-metal dining dish is traditionally presented to honored elders in Assam?',
    image: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&auto=format&fit=crop&q=80',
    options: ['Banbati & Kahi (Sarthebari Bell Metal)', 'Plastic Plate', 'Paper Cup'],
    correct: 0,
    detail: 'Kahi and Banbati handcrafted in Sarthebari are cherished symbols of respect, hospitality, and Ayurvedic wellness.',
  },
  {
    question: 'Which graceful horned bird is honored across Nagaland’s most famous tribal festival?',
    image: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=600&auto=format&fit=crop&q=80',
    options: ['Great Indian Hornbill', 'Penguin', 'Ostrich'],
    correct: 0,
    detail: 'The Hornbill is revered across tribal folklore for its grace, vigilance, and vibrant golden-beaked feathers.',
  },
  {
    question: 'What warm, fragrant beverage is lovingly prepared with freshly plucked leaves when morning guests arrive?',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
    options: ['Fresh Assam CTC Red/Milk Tea with Ginger', 'Cold Carbonated Soda', 'Iced Tap Water'],
    correct: 0,
    detail: 'A warm, fragrant cup of freshly brewed tea with ginger or cardamom warms the soul and begins every conversation.',
  },
  {
    question: 'Which ancient buffalo-horn instrument signals the joyful beginning of spring Bihu dances?',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
    options: ['Pepa (Buffalo Hornpipe)', 'Electric Guitar', 'Synthesizer Keyboard'],
    correct: 0,
    detail: 'Crafted from buffalo horn and bamboo reeds, the Pepa’s spirited tone announces the arrival of spring renewal.',
  },
];

export const Games: React.FC<GamesProps> = ({ gameId, patient, language = 'en', onClose, onComplete }) => {
  // Delegate specific games to dedicated sub-components
  if (gameId === 'memory-tiles') {
    return <MemoryTilesGame patient={patient} language={language} onClose={onClose} onComplete={onComplete} />;
  }

  if (gameId === 'recognize-by-description') {
    return <RecognizeByDescriptionGame patient={patient} language={language} onClose={onClose} onComplete={onComplete} />;
  }

  if (gameId === 'pattern-sequence') {
    return <MusicPatternGame patient={patient} language={language} onClose={onClose} onComplete={onComplete} />;
  }

  const [voiceoverEnabled, setVoiceoverEnabled] = useState<boolean>(
    speechService.isVoiceoverEnabled()
  );
  const [startTime] = useState<number>(Date.now());
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<GameSessionResult | null>(null);

  // Memory match state
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);

  // Sequence game state
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [step, setStep] = useState(1);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gentleRetryNotice, setGentleRetryNotice] = useState<string | null>(null);

  // Object familiarity state
  const [familiarIndex, setFamiliarIndex] = useState(0);
  const [familiarScore, setFamiliarScore] = useState(0);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);

  // Sync voiceover state
  useEffect(() => {
    const unsub = speechService.onVoiceoverToggle(setVoiceoverEnabled);
    return () => {
      unsub();
      speechService.stop();
    };
  }, []);

  // Initialize selected game
  useEffect(() => {
    if (gameId === 'find-matching') {
      // Pick 4 simple everyday objects (Apple, Clock, Key, Coffee Cup)
      const selected = SIMPLE_OBJECTS_CATALOG.slice(0, 4);
      const deck: CardItem[] = [...selected, ...selected]
        .map((c, idx) => ({
          instanceId: idx,
          cardId: c.id,
          name: c.name,
          icon: c.symbol,
          image: c.image,
          category: c.category,
          soundCue: 'match',
          flipped: false,
          matched: false,
        }))
        .sort(() => Math.random() - 0.5);
      setCards(deck);
    } else if (gameId === 'pattern-sequence') {
      startSequenceRound(1);
    } else if (gameId === 'object-familiarity') {
      // object familiarity
    }
  }, [gameId]);

  const readFamiliarQuestion = (idx: number) => {
    const q = FAMILIAR_QUESTIONS[idx];
    if (speechService.isVoiceoverEnabled() && q) {
      speechService.speak(`Question: ${q.question}`, { rate: 0.9 });
    }
  };

  const toggleVoiceover = () => {
    const next = !voiceoverEnabled;
    setVoiceoverEnabled(next);
    speechService.setVoiceoverEnabled(next);
    if (!next) {
      speechService.stop();
    } else {
      speechService.speak('Voiceover active. I will read game steps aloud to you.', { force: true });
    }
  };

  // Memory card click
  const handleCardClick = (index: number) => {
    if (cards[index].flipped || cards[index].matched || flippedIndices.length >= 2) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    const newFlipped = [...flippedIndices, index];
    setCards(newCards);
    setFlippedIndices(newFlipped);

    speechService.playSound('tap');

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped;
      if (newCards[first].cardId === newCards[second].cardId) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setCards(newCards);
        setFlippedIndices([]);

        speechService.playSound('match');

        // Check if won
        if (newCards.every((c) => c.matched)) {
          finishGame(moves + 1, mistakes, 95);
        }
      } else {
        setMistakes((m) => m + 1);
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 1100);
      }
    }
  };

  // Sequence game runner with musical instrument audio & visual cues
  const startSequenceRound = (length: number) => {
    const newSeq = Array.from({ length }, () => Math.floor(Math.random() * 4));
    setSequence(newSeq);
    setUserSequence([]);
    setIsShowingSequence(true);
    setGentleRetryNotice(null);

    if (speechService.isVoiceoverEnabled()) {
      speechService.speak(`Listen and watch the melodic sequence.`, { rate: 0.9 });
    }

    // Play sequence of instruments
    newSeq.forEach((val, i) => {
      setTimeout(() => {
        setActiveButton(val);
        const inst = SEQUENCE_INSTRUMENTS[val];
        if (inst.soundCue) {
          speechService.playSound(inst.soundCue);
        }
        setTimeout(() => setActiveButton(null), 550);
      }, (i + 1) * 900);
    });

    setTimeout(() => {
      setIsShowingSequence(false);
      if (speechService.isVoiceoverEnabled()) {
        speechService.speak(`Now tap the instruments in the same order.`, { rate: 0.9 });
      }
    }, (newSeq.length + 1) * 900);
  };

  const handleSequenceTap = (idx: number) => {
    if (isShowingSequence) return;

    const inst = SEQUENCE_INSTRUMENTS[idx];
    if (inst.soundCue) {
      speechService.playSound(inst.soundCue);
    } else {
      speechService.playSound('tap');
    }

    const nextUser = [...userSequence, idx];
    setUserSequence(nextUser);

    const currentPos = nextUser.length - 1;
    if (nextUser[currentPos] !== sequence[currentPos]) {
      setMistakes((m) => m + 1);
      speechService.playSound('gentle_retry');
      setGentleRetryNotice('Gentle attempt! Let’s listen to that soothing sequence again.');

      if (speechService.isVoiceoverEnabled()) {
        speechService.speak(`Gentle attempt! Let's listen to the sequence again.`, { rate: 0.9 });
      }

      setTimeout(() => {
        startSequenceRound(sequence.length);
      }, 1500);
      return;
    }

    if (nextUser.length === sequence.length) {
      speechService.playSound('match');
      if (step < 3) {
        setStep((s) => s + 1);
        if (speechService.isVoiceoverEnabled()) {
          speechService.speak(`Wonderful harmony! Moving to round ${step + 1}.`, { rate: 0.9 });
        }
        setTimeout(() => startSequenceRound(sequence.length + 1), 900);
      } else {
        finishGame(sequence.length, mistakes, 95);
      }
    }
  };

  // Familiar object choice
  const handleFamiliarAnswer = (index: number) => {
    const q = FAMILIAR_QUESTIONS[familiarIndex];
    setSelectedAnswerIdx(index);

    let newScore = familiarScore;
    if (index === q.correct) {
      newScore += 1;
      setFamiliarScore(newScore);
      speechService.playSound('match');
      if (speechService.isVoiceoverEnabled()) {
        speechService.speak(`Correct! ${q.detail}`, { rate: 0.9 });
      }
    } else {
      setMistakes((m) => m + 1);
      speechService.playSound('gentle_retry');
      if (speechService.isVoiceoverEnabled()) {
        speechService.speak(`A thoughtful choice. ${q.detail}`, { rate: 0.9 });
      }
    }

    setTimeout(() => {
      setSelectedAnswerIdx(null);
      if (familiarIndex + 1 < FAMILIAR_QUESTIONS.length) {
        const nextIdx = familiarIndex + 1;
        setFamiliarIndex(nextIdx);
        readFamiliarQuestion(nextIdx);
      } else {
        const accuracy = Math.round((newScore / FAMILIAR_QUESTIONS.length) * 100);
        finishGame(FAMILIAR_QUESTIONS.length, mistakes, accuracy);
      }
    }, 2200);
  };

  const finishGame = (totalAttempts: number, totalMistakes: number, calculatedAccuracy: number) => {
    const elapsed = Date.now() - startTime;
    const result: GameSessionResult = {
      id: `session-${Date.now()}`,
      gameId,
      patientId: patient?.id || 'senior-guest',
      difficulty: 1,
      accuracy: calculatedAccuracy,
      reactionTimeMs: Math.round(elapsed / Math.max(1, totalAttempts)),
      completionTimeMs: elapsed,
      attempts: totalAttempts,
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
    const text =
      language === 'as'
        ? `বৰ সুন্দৰ কাম! আপুনি ${finalScore.accuracy} শতাংশ শুদ্ধতাৰে ${Math.round(
            finalScore.completionTimeMs / 1000
          )} ছেকেণ্ডত খেলটো সমাপ্ত কৰিলে।`
        : language === 'hi'
        ? `शानदार काम! आपने ${Math.round(
            finalScore.completionTimeMs / 1000
          )} सेकंड में ${finalScore.accuracy} प्रतिशत सटीकता के साथ इसे पूरा किया।`
        : language === 'mni'
        ? `য়াম্না নিংথিরে! অদোম্না সেকেন্দ ${Math.round(
            finalScore.completionTimeMs / 1000
          )} দা চুম্বা চাদা ${finalScore.accuracy} ফংলে।`
        : `Splendid job! You completed this activity with ${finalScore.accuracy} percent accuracy in ${Math.round(
            finalScore.completionTimeMs / 1000
          )} seconds.`;
    speechService.speak(text, { force: true, rate: 0.9 });
  };

  return (
    <div
      id="game-modal-overlay"
      className="fixed inset-0 z-50 bg-[#FAF8F5] flex flex-col overflow-y-auto"
    >
      {/* Header bar */}
      <div className="bg-teal-850 text-white px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <button
          id="close-game-btn"
          onClick={() => {
            speechService.stop();
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold bg-teal-800/80 hover:bg-teal-700 px-3 py-1.5 rounded-xl border border-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {language === 'as'
              ? 'কাৰ্য্যসূচীলৈ উভতি যাওক'
              : language === 'hi'
              ? 'गतिविधियों पर वापस जाएं'
              : language === 'mni'
              ? 'থবকশিংদা হল্লকউ'
              : 'Back to Activities'}
          </span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-serif font-bold tracking-tight">
            {gameId === 'find-matching'
              ? language === 'as'
                ? 'বস্তু চিনাক্তকৰণ আৰু মিল খেল'
                : language === 'hi'
                ? 'वस्तु पहचान और मिलान खेल'
                : language === 'mni'
                ? 'পোৎশক অচুম্বা মশক খঙদোকপা খেল'
                : 'Northeast Heritage Memory Match'
              : gameId === 'pattern-sequence'
              ? language === 'as'
                ? 'সংগীতৰ সুৰ আৰু বিন্যাস খেল'
                : language === 'hi'
                ? 'संगीत पैटर्न अनुक्रम खेल'
                : language === 'mni'
                ? 'সঙ্গীৎকী অমসুং তৌরিবা খেল'
                : 'Calm Musical Pattern Sequence'
              : language === 'as'
              ? 'পৰিচিত ঐতিহ্য আৰু কাহিনী'
              : language === 'hi'
              ? 'परिचित विरासत और कहानियाँ'
              : language === 'mni'
              ? 'ঐতিহ্য অমসুং ৱারীশিং'
              : 'Familiar Heritage & Stories'}
          </h2>
          <p className="text-[11px] text-teal-200">
            {language === 'as'
              ? `সদস্য: ${patient?.preferredName || 'বয়োজ্যেষ্ঠ'}`
              : language === 'hi'
              ? `वरिष्ठ: ${patient?.preferredName || 'वरिष्ठ'}`
              : language === 'mni'
              ? `মীওই: ${patient?.preferredName || 'অহনবা'}`
              : `Patient: ${patient?.preferredName || 'Senior'}`}
          </p>
        </div>

        {/* Master Voiceover Toggle */}
        <div className="flex items-center gap-2">
          <button
            id="games-voiceover-toggle"
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
                  {language === 'as'
                    ? 'কণ্ঠস্বৰ চালুকীয়া'
                    : language === 'hi'
                    ? 'आवाज चालू'
                    : language === 'mni'
                    ? 'খোঞ্জেল য়াওরি'
                    : 'Voiceover On'}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {language === 'as'
                    ? 'কণ্ঠস্বৰ বন্ধ'
                    : language === 'hi'
                    ? 'म्यूट'
                    : language === 'mni'
                    ? 'খোঞ্জেল য়াওদে'
                    : 'Muted'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 max-w-xl w-full mx-auto p-4 flex flex-col justify-center items-center">
        {isFinished && finalScore ? (
          <div
            id="game-completion-card"
            className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-stone-200 text-center w-full max-w-md animate-in fade-in zoom-in"
          >
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-300 shadow-xs">
              <Trophy className="w-8 h-8 text-amber-800" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 mb-1">
              {language === 'as'
                ? `বৰ সুন্দৰ হ'ল, ${patient?.preferredName || 'বন্ধু'}!`
                : language === 'hi'
                ? `बहुत बढ़िया, ${patient?.preferredName || 'मित्र'}!`
                : language === 'mni'
                ? `য়াম্না ফরে, ${patient?.preferredName || 'মরুপ'}!`
                : `Wonderful Job, ${patient?.preferredName || 'Friend'}!`}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mb-5">
              {language === 'as'
                ? 'আপুনি এই বৌদ্ধিক খেলটো শান্তভাৱে আৰু সম্পূৰ্ণ মনোযোগেৰে সমাপ্ত কৰিলে।'
                : language === 'hi'
                ? 'आपने इस मानसिक खेल को शांत और पूरे ध्यान के साथ पूरा किया।'
                : language === 'mni'
                ? 'অদোম্না পুন্সিদগী অসি নিংথিনা অমসুং শান্তিনা লোইশিনখ্রে।'
                : 'You completed this cognitive exercise with calm rhythm and gentle focus.'}
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-stone-200 mb-6">
              <div className="p-2">
                <p className="text-[10px] text-stone-500 font-semibold uppercase">
                  {language === 'as' ? 'শুদ্ধতা' : language === 'hi' ? 'सटीकता' : language === 'mni' ? 'চুম্বা' : 'Accuracy'}
                </p>
                <p className="text-xl font-bold text-teal-850">{finalScore.accuracy}%</p>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-stone-500 font-semibold uppercase">
                  {language === 'as' ? 'সময়' : language === 'hi' ? 'समय' : language === 'mni' ? 'মতম' : 'Time'}
                </p>
                <p className="text-xl font-bold text-stone-800">
                  {Math.round(finalScore.completionTimeMs / 1000)}s
                </p>
              </div>
              <div className="p-2">
                <p className="text-[10px] text-stone-500 font-semibold uppercase">
                  {language === 'as' ? 'ধাৰাবাহিকতা' : language === 'hi' ? 'दैनिक स्ट्रीक' : language === 'mni' ? 'লেপহৌদবা' : 'Daily Streak'}
                </p>
                <p className="text-xl font-bold text-amber-600">{(patient?.dailyStreak || 0) + 1}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="finish-game-read-results-btn"
                onClick={handleReadResultsAloud}
                className="py-3 px-4 bg-teal-50 hover:bg-teal-100 text-teal-850 border border-teal-200 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>
                  {language === 'as'
                    ? 'ফলাফল পঢ়ি শুনাওক'
                    : language === 'hi'
                    ? 'परिणाम बोलकर सुनाएं'
                    : language === 'mni'
                    ? 'ফল খোঞ্জেলনা তারসি'
                    : 'Read Results Aloud'}
                </span>
              </button>
              <button
                id="finish-game-done-btn"
                onClick={onClose}
                className="flex-1 py-3 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
              >
                {language === 'as'
                  ? 'কাৰ্য্যসূচীলৈ উভতি যাওক'
                  : language === 'hi'
                  ? 'गतिविधियों पर वापस जाएं'
                  : language === 'mni'
                  ? 'থবকশিংদা হল্লকউ'
                  : 'Return to Activities'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Game 1: Memory Cards with Real Images */}
            {gameId === 'find-matching' && (
              <div className="w-full">
                <div className="text-center mb-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <p className="text-xs text-stone-600 text-left">
                    {language === 'as'
                      ? 'যিকোনো কাৰ্ডত টিপি ফটোখন চাওক। একে ধৰণৰ বস্তুৰ জোৰা মিল কৰক।'
                      : language === 'hi'
                      ? 'कार्ड पर टैप करके तस्वीर देखें। एक जैसी वस्तुओं की जोड़ी मिलाएं।'
                      : language === 'mni'
                      ? 'কার্দ অসিদা নাম্বা য়ারি। মান্নবা পোৎশকশিং তান্নবা হোৎনৌ।'
                      : 'Tap any card to turn it over. Match pairs of everyday objects.'}
                  </p>
                  <button
                    onClick={() => {
                      const helpTxt =
                        language === 'as'
                          ? 'যিকোনো কাৰ্ডত টিপি ফটোখন চাওক। একে ধৰণৰ বস্তুৰ জোৰা মিল কৰক।'
                          : language === 'hi'
                          ? 'कार्ड पर टैप करके तस्वीर देखें। एक जैसी वस्तुओं की जोड़ी मिलाएं।'
                          : language === 'mni'
                          ? 'কার্দ অসিদা নাম্বা য়ারি। মান্নবা পোৎশকশিং তান্নবা হোৎনৌ।'
                          : 'Tap any card to reveal its image. Find its matching pair across the grid.';
                      speechService.speak(helpTxt, { force: true });
                    }}
                    className="flex items-center gap-1 text-xs text-teal-850 font-semibold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'as'
                        ? 'সহায় শুনক'
                        : language === 'hi'
                        ? 'मदद सुनें'
                        : language === 'mni'
                        ? 'মতেং তানসি'
                        : 'Read Help'}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
                  {cards.map((card, i) => (
                    <button
                      key={card.instanceId}
                      id={`memory-card-${i}`}
                      onClick={() => handleCardClick(i)}
                      className={`h-28 sm:h-32 rounded-2xl flex flex-col items-center justify-between p-1.5 border-2 transition-all transform active:scale-95 shadow-2xs overflow-hidden ${
                        card.flipped || card.matched
                          ? 'bg-amber-50 border-amber-400 text-stone-900 ring-2 ring-amber-200'
                          : 'bg-white border-stone-300 hover:border-teal-700'
                      }`}
                    >
                      {card.flipped || card.matched ? (
                        <div className="flex flex-col items-center justify-between w-full h-full animate-in fade-in zoom-in">
                          <div className="w-full h-16 sm:h-18 rounded-xl overflow-hidden bg-stone-100 relative">
                            <img
                              src={card.image}
                              alt={card.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="absolute bottom-1 right-1 text-base">{card.icon}</span>
                          </div>
                          <span className="text-[10px] font-bold text-stone-800 text-center leading-tight truncate w-full px-0.5 mt-1">
                            {card.name}
                          </span>
                          <span className="text-[9px] text-teal-850 truncate max-w-full">
                            {card.category}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-stone-400">
                          <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-bold text-stone-500 mb-1">
                            ?
                          </div>
                          <span className="text-[9px] font-semibold text-stone-400">CARD {i + 1}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game 2: Calm Musical Pattern Sequence */}
            {gameId === 'pattern-sequence' && (
              <div className="w-full text-center">
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-stone-600">
                    {isShowingSequence
                      ? 'Listen closely and watch the instruments play...'
                      : 'Now tap the traditional instruments in the harmonious order!'}
                  </p>
                  <p className="text-xs font-semibold text-teal-850 mt-1">
                    Musical Round {step} of 3
                  </p>
                </div>

                {/* Gentle retry notification banner */}
                {gentleRetryNotice && (
                  <div className="mb-3 px-4 py-2 bg-amber-100 border border-amber-300 text-amber-950 text-xs font-semibold rounded-2xl animate-in fade-in">
                    {gentleRetryNotice}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto">
                  {SEQUENCE_INSTRUMENTS.map((inst) => (
                    <button
                      key={inst.id}
                      id={`seq-btn-${inst.id}`}
                      disabled={isShowingSequence}
                      onClick={() => handleSequenceTap(inst.id)}
                      className={`h-36 rounded-3xl p-3 text-white shadow-sm transition-all transform active:scale-95 flex flex-col items-center justify-between relative overflow-hidden border-2 border-white/20 ${
                        activeButton === inst.id ? inst.activeColor : inst.color
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="w-full h-20 rounded-2xl overflow-hidden bg-black/20 relative shadow-inner">
                        <img
                          src={inst.image}
                          alt={inst.name}
                          className="w-full h-full object-cover opacity-90"
                        />
                        {activeButton === inst.id && (
                          <div className="absolute inset-0 bg-white/40 flex items-center justify-center animate-ping">
                            <Music className="w-6 h-6 text-amber-900" />
                          </div>
                        )}
                      </div>

                      <div className="text-center w-full mt-1">
                        <p className="text-xs sm:text-sm font-serif font-bold text-white leading-tight">
                          {inst.name}
                        </p>
                        <p className="text-[10px] text-amber-200 font-sans">{inst.localName}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    disabled={isShowingSequence}
                    onClick={() => startSequenceRound(sequence.length)}
                    className="text-xs text-teal-850 hover:text-teal-950 font-semibold flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Repeat Musical Melody</span>
                  </button>
                </div>
              </div>
            )}

            {/* Game 3: Familiar Cultural Objects & Stories */}
            {gameId === 'object-familiarity' && (
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wide bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    {language === 'as'
                      ? `কাহিনী ${familiarIndex + 1} / ${FAMILIAR_QUESTIONS.length}`
                      : language === 'hi'
                      ? `कहानी ${familiarIndex + 1} / ${FAMILIAR_QUESTIONS.length}`
                      : language === 'mni'
                      ? `ৱারী ${familiarIndex + 1} / ${FAMILIAR_QUESTIONS.length}`
                      : `Story ${familiarIndex + 1} of ${FAMILIAR_QUESTIONS.length}`}
                  </span>

                  <button
                    onClick={() => readFamiliarQuestion(familiarIndex)}
                    className="flex items-center gap-1 text-xs text-teal-850 font-semibold bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-xl border border-teal-200 transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>
                      {language === 'as'
                        ? 'পঢ়ি শুনক'
                        : language === 'hi'
                        ? 'मुझे सुनाएं'
                        : language === 'mni'
                        ? 'ঐঙোন্দা তারসি'
                        : 'Read to Me'}
                    </span>
                  </button>
                </div>

                {/* Cultural Photo for the Question */}
                <div className="w-full h-44 rounded-2xl overflow-hidden bg-stone-100 mb-4 border border-stone-200 shadow-2xs">
                  <img
                    src={FAMILIAR_QUESTIONS[familiarIndex].image}
                    alt="Heritage Cultural Artifact"
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 mb-2 leading-snug">
                  {FAMILIAR_QUESTIONS[familiarIndex].question}
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  {language === 'as'
                    ? 'আপোনাৰ মন আৰু স্মৃতিৰ লগত যিটো মিলে বাছনি কৰক।'
                    : language === 'hi'
                    ? 'अपने दिल और यादों के अनुसार सही विकल्प चुनें।'
                    : language === 'mni'
                    ? 'অদোমগী থম্মোয়না য়াবা অদু খল্লু।'
                    : 'Take your time and choose whichever matches your heart and memory.'}
                </p>

                <div className="space-y-2.5">
                  {FAMILIAR_QUESTIONS[familiarIndex].options.map((opt, optIdx) => {
                    const isSelected = selectedAnswerIdx === optIdx;
                    const isCorrect = optIdx === FAMILIAR_QUESTIONS[familiarIndex].correct;

                    let btnStyle = 'border-stone-200 hover:border-teal-700 hover:bg-teal-50/50';
                    if (isSelected) {
                      btnStyle = isCorrect
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200'
                        : 'bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-200';
                    }

                    return (
                      <button
                        key={optIdx}
                        id={`familiar-opt-${optIdx}`}
                        disabled={selectedAnswerIdx !== null}
                        onClick={() => handleFamiliarAnswer(optIdx)}
                        className={`w-full text-left p-3.5 rounded-2xl border ${btnStyle} text-xs sm:text-sm font-medium text-stone-800 transition-all flex items-center justify-between`}
                      >
                        <span>{opt}</span>
                        {isSelected && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {isSelected && !isCorrect && (
                          <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Cultural Insight reveal on answer */}
                {selectedAnswerIdx !== null && (
                  <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 animate-in fade-in flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{FAMILIAR_QUESTIONS[familiarIndex].detail}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
