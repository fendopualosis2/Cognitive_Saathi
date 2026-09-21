import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  X,
  Trophy,
  Smile,
  Info,
} from 'lucide-react';
import {
  MemoryMoment,
  PersonInLife,
  PatientProfile,
  GameSessionResult,
  PersonalQuizQuestion,
  LanguageCode,
} from '../types';
import { speechService } from '../services/audioSpeech';
import { getTranslation } from '../services/languages';

interface PersonalMemoryQuizGameProps {
  patient: PatientProfile | null;
  memories: MemoryMoment[];
  people: PersonInLife[];
  language?: LanguageCode;
  onClose: () => void;
  onComplete: (result: GameSessionResult) => void;
  onGoToMemoriesTab?: () => void;
}

export const PersonalMemoryQuizGame: React.FC<PersonalMemoryQuizGameProps> = ({
  patient,
  memories,
  people,
  language = 'en',
  onClose,
  onComplete,
  onGoToMemoriesTab,
}) => {
  const hasContent = memories.length > 0 || people.length > 0;
  const t = getTranslation(language);

  const [questions, setQuestions] = useState<PersonalQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const startTimeRef = useRef<number>(Date.now());
  const questionStartTimeRef = useRef<number>(Date.now());
  const reactionTimesRef = useRef<number[]>([]);

  // Fallback question generator in case network or AI service is unavailable
  const generateClientFallbackQuestions = (): PersonalQuizQuestion[] => {
    const list: PersonalQuizQuestion[] = [];

    const relationDistractorsMap: Record<LanguageCode, string[]> = {
      as: [
        'জীয়াৰী',
        'পুত্ৰ',
        'ভনীয়েক',
        'ককায়েক',
        'স্বামী / পত্নী',
        'নাতি',
        'নাতিনী',
        'পৰিয়ালৰ চিকিৎসক',
        'জীৱনজোৰা বন্ধু',
      ],
      hi: [
        'बेटी',
        'बेटा',
        'बहन',
        'भाई',
        'जीवनसाथी / पति-पत्नी',
        'पोता',
        'पोती',
        'पारिवारिक डॉक्टर',
        'पुराना मित्र',
      ],
      mni: [
        'ইচানুপী',
        'ইচানুপা',
        'ইচে / ইচল',
        'ইনাও / ইবুংগো',
        'লোয়নবী',
        'ইশু নুপা',
        'ইশু নুপী',
        'ইমুংগী দোক্তর',
        'মরুপ',
      ],
      en: [
        'Daughter',
        'Son',
        'Sister',
        'Brother',
        'Spouse / Partner',
        'Grandson',
        'Granddaughter',
        'Family Doctor',
        'Lifelong Friend',
      ],
    };

    const relationDistractors = relationDistractorsMap[language] || relationDistractorsMap.en;

    // Build from People
    people.forEach((p, idx) => {
      if (p.relationship && p.name) {
        const correct = p.relationship;
        const others = relationDistractors
          .filter((r) => r.toLowerCase() !== correct.toLowerCase())
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        const options = [correct, ...others].sort(() => 0.5 - Math.random());

        const questionText =
          language === 'as'
            ? `${p.name} আপোনাৰ পৰিয়ালত কোন হয়?`
            : language === 'hi'
            ? `${p.name} आपके परिवार में कौन हैं?`
            : language === 'mni'
            ? `${p.name} অদোমগী ইমুংদা কনানো?`
            : `Who is ${p.name} in your family circle?`;

        const explanationText =
          language === 'as'
            ? `${p.name} আপোনাৰ মৰমৰ ${correct} হয়।`
            : language === 'hi'
            ? `${p.name} आपके प्रिय ${correct} हैं।`
            : language === 'mni'
            ? `${p.name} অদোমগী নুংশিরবা ${correct}নি।`
            : `${p.name} is your beloved ${correct}.`;

        const hintText =
          language === 'as'
            ? `আপোনাৰ পৰিয়াল আৰু ${p.name}ৰ মৰমৰ কথা মনত পেলাওক।`
            : language === 'hi'
            ? `अपने परिवार और ${p.name} के स्नेह को याद करें।`
            : language === 'mni'
            ? `ইমুংগী মী অমসুং ${p.name}গী মরমদা নীংশিংবীয়ু।`
            : `Think of your close family circle and ${p.name}'s caring role.`;

        list.push({
          id: `client-p-rel-${p.id || idx}`,
          type: 'person',
          sourceTitle: p.name,
          question: questionText,
          options,
          correctIndex: options.indexOf(correct),
          explanation: explanationText,
          hint: hintText,
          imageUrl: p.imageUrl,
          category: language === 'as' ? 'আপোনজন' : language === 'hi' ? 'परिवारजन' : language === 'mni' ? 'ইমুংগী মী' : 'Family Loved One',
        });
      }
    });

    // Build from Memories
    memories.forEach((m, idx) => {
      if (m.interactiveQuestion?.question && m.interactiveQuestion?.options?.length >= 4) {
        list.push({
          id: `client-m-int-${m.id || idx}`,
          type: 'memory',
          sourceTitle: m.title,
          question: m.interactiveQuestion.question,
          options: m.interactiveQuestion.options.slice(0, 4),
          correctIndex: m.interactiveQuestion.correctIndex || 0,
          explanation: `In your memory "${m.title}": ${m.story ? m.story.slice(0, 100) + '...' : 'A treasured milestone.'}`,
          hint: `Reflect on the cherished story of "${m.title}".`,
          imageUrl: m.imageUrl,
          category: m.category || (language === 'as' ? 'সোণালী স্মৃতি' : language === 'hi' ? 'सुखद स्मृति' : 'Cherished Memory'),
        });
      } else if (m.title && m.region) {
        const correct = m.region;
        const others = ['Brahmaputra Riverside', 'Kaziranga Foothills', 'Majuli Island']
          .filter((r) => r !== correct)
          .slice(0, 3);
        const options = [correct, ...others].sort(() => 0.5 - Math.random());

        const questionText =
          language === 'as'
            ? `"${m.title}" এই স্মৃতিটো ক'ত হৈছিল?`
            : language === 'hi'
            ? `"${m.title}" यह सुखद प्रसंग कहाँ हुआ था?`
            : language === 'mni'
            ? `"${m.title}" অসি করম্ব মফমদা থোকখিবগে?`
            : `In your memory "${m.title}", where did this special scenario happen?`;

        list.push({
          id: `client-m-reg-${m.id || idx}`,
          type: 'memory',
          sourceTitle: m.title,
          question: questionText,
          options,
          correctIndex: options.indexOf(correct),
          explanation: `${m.title} - ${correct}.`,
          hint: `Think of "${m.title}".`,
          imageUrl: m.imageUrl,
          category: language === 'as' ? 'স্মৃতিৰ ঠাই' : language === 'hi' ? 'स्थान स्मृति' : 'Memory Places',
        });
      }
    });

    return list.sort(() => 0.5 - Math.random());
  };

  // Fetch AI-generated questions from server
  const loadQuestions = async () => {
    if (!hasContent) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setHintsUsed(0);
    setShowHint(false);
    setIsFinished(false);
    reactionTimesRef.current = [];
    startTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();

    try {
      const response = await fetch('/api/ai/memory-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient?.id,
          patientName: patient?.preferredName || patient?.fullName,
          memories,
          people,
          language: language || 'en',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error fetching AI questions, falling back to local questions:', e);
    }

    // Fallback if network or AI service fails
    const fallback = generateClientFallbackQuestions();
    setQuestions(fallback);
    setIsLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, [memories, people, language]);

  const currentQuestion: PersonalQuizQuestion | undefined = questions[currentIndex];

  // Speak question and options aloud
  const handleSpeakQuestion = () => {
    if (!currentQuestion) return;
    const optLabel =
      language === 'as'
        ? 'বিকল্প'
        : language === 'hi'
        ? 'विकल्प'
        : language === 'mni'
        ? 'অপশন'
        : 'Option';
    const textToSpeak = `${currentQuestion.question}. ${optLabel} 1: ${currentQuestion.options[0]}. ${optLabel} 2: ${currentQuestion.options[1]}. ${optLabel} 3: ${currentQuestion.options[2]}. ${optLabel} 4: ${currentQuestion.options[3]}.`;
    speechService.speak(textToSpeak, { force: true, lang: language });
  };

  // Handle player selection of one of the 4 options
  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQuestion) return;

    const reactionTime = Date.now() - questionStartTimeRef.current;
    reactionTimesRef.current.push(reactionTime);

    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      speechService.playSound('match');
      const praise =
        language === 'as'
          ? 'অতি সুন্দৰ!'
          : language === 'hi'
          ? 'बहुत बढ़िया!'
          : language === 'mni'
          ? 'য়াম্না ফরে!'
          : 'Wonderful!';
      setFeedbackMessage(`${praise} ${currentQuestion.explanation}`);
    } else {
      speechService.playSound('gentle_retry');
      const correctText = currentQuestion.options[currentQuestion.correctIndex];
      const encouragement =
        language === 'as'
          ? 'একো কথা নাই, সুন্দৰ প্ৰয়াস। সঠিক উত্তৰটো হ’ল:'
          : language === 'hi'
          ? 'कोई बात नहीं, प्यारा प्रयास। सही उत्तर है:'
          : language === 'mni'
          ? 'করিসু তৌদে, অচুম্বা উত্তরদি:'
          : "That's close! It's";
      setFeedbackMessage(`${encouragement} ${correctText}. ${currentQuestion.explanation}`);
    }
  };

  // Proceed to next question or complete game
  const handleNext = () => {
    speechService.stop();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowHint(false);
      setFeedbackMessage('');
      questionStartTimeRef.current = Date.now();
    } else {
      // Quiz finished
      handleFinishGame();
    }
  };

  // Finish quiz and record session
  const handleFinishGame = () => {
    setIsFinished(true);
    const totalTimeMs = Date.now() - startTimeRef.current;
    const totalQuestions = questions.length || 1;
    const accuracy = score / totalQuestions;
    const avgReactionTime =
      reactionTimesRef.current.length > 0
        ? Math.round(
            reactionTimesRef.current.reduce((a, b) => a + b, 0) /
              reactionTimesRef.current.length
          )
        : 850;

    const result: GameSessionResult = {
      id: `session-memory-quiz-${Date.now()}`,
      gameId: 'personal-memory-quiz',
      patientId: patient?.id || 'patient-1',
      difficulty: 1,
      accuracy,
      reactionTimeMs: avgReactionTime,
      completionTimeMs: totalTimeMs,
      attempts: totalQuestions,
      mistakes: totalQuestions - score,
      hintsUsed,
      completedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    onComplete(result);
  };

  // =========================================================================
  // BLANK STATE: If no memories and no people are added in the tab
  // =========================================================================
  if (!hasContent) {
    return (
      <div
        id="personal-memory-quiz-blank-modal"
        className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      >
        <div
          id="personal-memory-quiz-blank-card"
          className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-stone-200 shadow-xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-900 flex items-center justify-center text-3xl border border-amber-300 shadow-xs">
            📖
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-950 px-3 py-1 rounded-full border border-amber-300">
              {language === 'as'
                ? 'স্মৃতি আৰু আপোনজনৰ অপেক্ষা'
                : language === 'hi'
                ? 'यादों और परिवार की प्रतीक्षा'
                : language === 'mni'
                ? 'নীংশিং নুমিৎশিং অমসুং ইমুংগী ঙাইরি'
                : 'Awaiting Memories & Loved Ones'}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
              {language === 'as'
                ? 'আপোনজন আৰু স্মৃতি কুইজ'
                : language === 'hi'
                ? 'परिवार और यादों की सुखद प्रश्नोत्तरी'
                : language === 'mni'
                ? 'ইমুংগী মী অমসুং নীংশিং নুমিৎ ক্বিজ'
                : 'Personal Memories & Loved Ones Quiz'}
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
              {language === 'as'
                ? 'এই খেলখন কেৱল আপোনাৰ বাবে, আপোনাৰ নিজৰ জীৱনৰ স্মৃতি, ফটো আৰু পৰিয়ালৰ ওপৰত প্ৰশ্ন সোধা হয়।'
                : language === 'hi'
                ? 'यह खेल विशेष रूप से आपके लिए तैयार किया गया है, जो आपके अपने जीवन की कहानियों, तस्वीरों और परिवारजनों पर आधारित है।'
                : language === 'mni'
                ? 'শান্নপোৎ অসি অদোমগী পুন্সিগী নীংশিং নুমিৎ অমসুং ইমুংগী মরমদা ৱাহং হংনবা শেমখিবনি।'
                : 'This game is crafted just for you, asking gentle questions directly from your own life stories, photos, and loved ones.'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-stone-200 text-left text-xs text-stone-700 space-y-2 w-full">
            <div className="flex items-center gap-2 font-semibold text-teal-900">
              <Info className="w-4 h-4 text-teal-700 shrink-0" />
              <span>
                {language === 'as'
                  ? 'এই খেলখন কেনেকৈ আৰম্ভ কৰিব:'
                  : language === 'hi'
                  ? 'यह खेल कैसे शुरू करें:'
                  : language === 'mni'
                  ? 'শান্নপোৎ অসি করম্না হাংদোক্কদগে:'
                  : 'How to unlock this game:'}
              </span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              {language === 'as'
                ? 'স্মৃতি (Memories) টেবত অন্ততঃ এটা স্মৃতি বা পৰিয়ালৰ সদস্যৰ নাম যোগ কৰক। তাৰ পিছত সাথী এআই-য়ে স্বয়ংক্ৰিয়ভাৱে প্ৰশ্ন প্ৰস্তুত কৰিব!'
                : language === 'hi'
                ? 'स्मृति (Memories) टैब में कम से कम एक सुखद याद या परिवार के सदस्य को जोड़ें। इसके बाद AI अपने आप सुंदर सवाल तैयार करेगा!'
                : language === 'mni'
                ? 'নীংশিং নুমিৎ (Memories) তেবতা ইমুংগী মী নত্রগা নীংশিং নুমিৎ অমা হাপচিল্লবা মতুংদা সাথী AI না মশা মথন্তা ৱাহং শেমগনি!'
                : 'Add at least one memory moment or loved one in the Memories tab. Saathi AI will then automatically weave personalized questions about them for you to enjoy!'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full pt-2">
            {onGoToMemoriesTab && (
              <button
                id="go-to-memories-btn"
                type="button"
                onClick={onGoToMemoriesTab}
                className="w-full sm:flex-1 py-3 px-5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {language === 'as'
                    ? 'স্মৃতি টেব চাওক'
                    : language === 'hi'
                    ? 'यादें टैब पर जाएं'
                    : language === 'mni'
                    ? 'নীংশিং নুমিৎ তেবতা চৎলো'
                    : 'Go to Memories Tab'}
                </span>
              </button>
            )}
            <button
              id="close-blank-quiz-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-sm rounded-xl transition-all cursor-pointer"
            >
              {language === 'as'
                ? 'কাৰ্যসূচীলৈ উভতি যাওক'
                : language === 'hi'
                ? 'वापस जाएं'
                : language === 'mni'
                ? 'হল্লকউ'
                : 'Back to Activities'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE GAME STATE: When memories or people exist
  // =========================================================================
  return (
    <div
      id="personal-memory-quiz-game-container"
      className="fixed inset-0 z-50 bg-[#FAF8F5] overflow-y-auto flex flex-col"
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            id="close-quiz-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer"
            aria-label="Close Quiz"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-stone-900">
                {language === 'as'
                  ? 'আপোনজন আৰু স্মৃতি কুইজ'
                  : language === 'hi'
                  ? 'परिवार और यादों की सुखद प्रश्नोत्तरी'
                  : language === 'mni'
                  ? 'ইমুংগী মী অমসুং নীংশিং নুমিৎ ক্বিজ'
                  : 'Loved Ones & Memories Quiz'}
              </span>
              <span className="text-[10px] font-semibold bg-teal-100 text-teal-850 px-2 py-0.5 rounded-full">
                AI Reminiscence
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block">
              {language === 'as'
                ? 'আপোনাৰ জীৱনৰ সুখদ কাহিনীৰ ৪-বিকল্প প্ৰশ্ন'
                : language === 'hi'
                ? 'आपके व्यक्तिगत जीवन से जुड़े 4-विकल्प वाले सरल प्रश्न'
                : language === 'mni'
                ? 'পুন্সিগী ৱাহং ৪ অপশন'
                : 'Heartwarming 4-choice questions from your personal life book'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {questions.length > 0 && !isFinished && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-950 px-3 py-1 rounded-xl text-xs font-bold">
              <span>{language === 'as' ? 'নম্বৰ:' : language === 'hi' ? 'स्कोर:' : language === 'mni' ? 'স্কোর:' : 'Score:'} {score}</span>
              <span className="text-amber-400">•</span>
              <span>
                {language === 'as'
                  ? `প্ৰশ্ন ${currentIndex + 1} / ${questions.length}`
                  : language === 'hi'
                  ? `प्रश्न ${currentIndex + 1} / ${questions.length}`
                  : language === 'mni'
                  ? `ৱাহং ${currentIndex + 1} / ${questions.length}`
                  : `${currentIndex + 1} / ${questions.length}`}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {isLoading ? (
          <div
            id="quiz-loading-state"
            className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-xs flex flex-col items-center text-center space-y-4 my-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl animate-bounce">
              ✨
            </div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900">
              {language === 'as'
                ? 'আপোনাৰ স্মৃতিবোৰ একত্ৰিত কৰা হৈছে...'
                : language === 'hi'
                ? 'आपके जीवन के सुनहरे पलों को संजोया जा रहा है...'
                : language === 'mni'
                ? 'অদোমগী নীংশিং নুমিৎশিং শেম-শারি...'
                : 'Gathering Your Life Moments...'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm leading-relaxed">
              {language === 'as'
                ? 'সাথী এআই-য়ে আপোনাৰ স্মৃতি আৰু পৰিয়ালৰ পৰা মৰমৰ প্ৰশ্ন প্ৰস্তুত কৰি আছে।'
                : language === 'hi'
                ? 'साथी AI आपकी यादों और परिवार से जुड़े आत्मीय सवाल तैयार कर रहा है।'
                : language === 'mni'
                ? 'সাথী AI না অদোমগী ইমুং অমসুং নীংশিং নুমিৎশিংদগী ৱাহং শেম্লি।'
                : 'Saathi AI is weaving thoughtful questions from your memories and family members.'}
            </p>
          </div>
        ) : isFinished ? (
          /* Completion Summary View */
          <div
            id="quiz-completion-card"
            className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6 animate-in fade-in"
          >
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center text-4xl border border-amber-300 shadow-xs">
                🏆
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-950 px-3 py-1 rounded-full border border-emerald-300">
                {language === 'as'
                  ? 'স্মৃতি প্ৰশ্নোত্তৰী সমাপ্ত'
                  : language === 'hi'
                  ? 'स्मृति यात्रा पूरी हुई'
                  : language === 'mni'
                  ? 'নীংশিং নুমিৎ লোইরে'
                  : 'Heartfelt Recollection Complete'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                {language === 'as'
                  ? 'সুন্দৰভাৱে স্মৃতিবোৰ মনত পেলালে!'
                  : language === 'hi'
                  ? 'प्यारी यादें ताज़ा हुईं!'
                  : language === 'mni'
                  ? 'নীংশিং নুমিৎশিং ফজরনা নীংশিংলে!'
                  : 'Cherished Moments Remembered!'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                {language === 'as'
                  ? 'আজি আপুনি অতি মৰমেৰে পৰিয়াল আৰু স্মৃতিবোৰ পুনৰ উপলব্ধি কৰিলে।'
                  : language === 'hi'
                  ? 'आज आपने अपने प्रियजनों और जीवन की यादों को बहुत सुंदर ढंग से याद किया।'
                  : language === 'mni'
                  ? 'ঙসি অদোমগী ইমুং অমসুং নীংশিং নুমিৎশিং নুংশিনা নীংশিংখ্রে।'
                  : 'You reflected on your loved ones and life stories with remarkable warmth and clarity today.'}
              </p>
            </div>

            {/* Score Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-center">
                <span className="text-xs text-teal-850 font-medium">
                  {language === 'as' ? 'সঠিক উত্তৰ' : language === 'hi' ? 'सही उत्तर' : language === 'mni' ? 'চুম্বা উত্তর' : 'Questions Correct'}
                </span>
                <p className="text-2xl font-bold font-serif text-teal-950 mt-0.5">
                  {score} / {questions.length}
                </p>
              </div>
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-center">
                <span className="text-xs text-amber-850 font-medium">
                  {language === 'as' ? 'স্মৃতি দক্ষতা' : language === 'hi' ? 'स्मृति सटीकता' : language === 'mni' ? 'নীংশিংবা ঙম্বা' : 'Memory Accuracy'}
                </span>
                <p className="text-2xl font-bold font-serif text-amber-950 mt-0.5">
                  {Math.round((score / (questions.length || 1)) * 100)}%
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-4 bg-stone-100 border border-stone-200 rounded-2xl text-center">
                <span className="text-xs text-stone-600 font-medium">
                  {language === 'as' ? 'উৎস' : language === 'hi' ? 'स्रोत' : language === 'mni' ? 'হৌফম' : 'Source Pool'}
                </span>
                <p className="text-lg font-bold font-serif text-stone-800 mt-1">
                  {people.length} {language === 'as' ? 'জন' : language === 'hi' ? 'सदस्य' : 'People'} • {memories.length} {language === 'as' ? 'স্মৃতি' : language === 'hi' ? 'यादें' : 'Memories'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                id="play-again-quiz-btn"
                type="button"
                onClick={loadQuestions}
                className="w-full sm:flex-1 py-3 px-5 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {language === 'as'
                    ? 'নতুন প্ৰশ্নৰে পুনৰ খেলক'
                    : language === 'hi'
                    ? 'नए प्रश्नों के साथ फिर खेलें'
                    : language === 'mni'
                    ? 'অনৌবা ৱাহংগা অমুক্কা শাননবা'
                    : 'Play Again with New Questions'}
                </span>
              </button>
              <button
                id="finish-return-activities-btn"
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                {language === 'as'
                  ? 'কাৰ্যসূচীলৈ উভতি যাওক'
                  : language === 'hi'
                  ? 'गतिविधियों पर लौटें'
                  : language === 'mni'
                  ? 'থবকশিংদা হল্লকউ'
                  : 'Return to Activities'}
              </button>
            </div>
          </div>
        ) : currentQuestion ? (
          /* Active Question Card */
          <div
            id="quiz-question-card"
            className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-xs space-y-5 animate-in fade-in"
          >
            {/* Header badges & Audio button */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-850 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1.5">
                  {currentQuestion.type === 'person' ? (
                    <Users className="w-3.5 h-3.5 text-teal-700" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                  )}
                  <span>{currentQuestion.category || currentQuestion.type}</span>
                </span>
                <span className="text-xs text-stone-500 font-medium">
                  {language === 'as' ? 'বিষয়:' : language === 'hi' ? 'विषय:' : language === 'mni' ? 'মরমদা:' : 'About:'} <strong>{currentQuestion.sourceTitle}</strong>
                </span>
              </div>

              <button
                id="speak-question-btn"
                type="button"
                onClick={handleSpeakQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-all cursor-pointer"
                title={language === 'as' ? 'প্ৰশ্নটো শুনক' : language === 'hi' ? 'प्रश्न सुनें' : language === 'mni' ? 'ৱাহং তাজৌ' : 'Read question aloud'}
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">
                  {language === 'as' ? 'শুনক' : language === 'hi' ? 'सुनें' : language === 'mni' ? 'তাজৌ' : 'Listen'}
                </span>
              </button>
            </div>

            {/* Optional Attached Image of Person or Memory */}
            {currentQuestion.imageUrl && (
              <div className="w-full h-44 sm:h-56 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 relative shadow-2xs">
                <img
                  src={currentQuestion.imageUrl}
                  alt={currentQuestion.sourceTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-stone-900/70 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg">
                  {currentQuestion.sourceTitle}
                </div>
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg sm:text-2xl text-stone-900 leading-snug">
                {currentQuestion.question}
              </h3>
            </div>

            {/* Hint toggler if senior wants a gentle clue */}
            {currentQuestion.hint && (
              <div>
                {!showHint ? (
                  <button
                    id="show-hint-btn"
                    type="button"
                    onClick={() => {
                      setShowHint(true);
                      setHintsUsed((prev) => prev + 1);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-teal-800 hover:text-teal-950 font-semibold cursor-pointer underline underline-offset-2"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {language === 'as'
                        ? 'সহায় বা ক্লু বিচাৰেনে?'
                        : language === 'hi'
                        ? 'क्या आपको संकेत चाहिए?'
                        : language === 'mni'
                        ? 'খরা নীংশিংহন্নবা য়েংবা য়াব্রা?'
                        : 'Need a gentle clue?'}
                    </span>
                  </button>
                ) : (
                  <div
                    id="hint-box"
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{currentQuestion.hint}</span>
                  </div>
                )}
              </div>
            )}

            {/* 4 Answer Options (User selects 1 out of 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctIndex;

                let btnStyles =
                  'bg-white hover:bg-stone-50 border-2 border-stone-200 text-stone-850';

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyles =
                      'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200';
                  } else if (isSelected && !isCorrect) {
                    btnStyles =
                      'bg-rose-50 border-2 border-rose-400 text-rose-950 ring-2 ring-rose-200';
                  } else {
                    btnStyles = 'bg-stone-100/70 border border-stone-200 text-stone-400 opacity-60';
                  }
                }

                const optionLetters = ['A', 'B', 'C', 'D'];

                return (
                  <button
                    key={idx}
                    id={`quiz-option-${idx}`}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`min-h-[58px] p-4 rounded-2xl text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${btnStyles}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isAnswered && isCorrect
                            ? 'bg-emerald-600 text-white'
                            : isAnswered && isSelected && !isCorrect
                            ? 'bg-rose-500 text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {optionLetters[idx]}
                      </span>
                      <span className="text-sm sm:text-base font-medium leading-tight">
                        {option}
                      </span>
                    </div>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback & Explanation Card */}
            {isAnswered && (
              <div
                id="quiz-feedback-box"
                className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start gap-3 animate-in fade-in ${
                  selectedOption === currentQuestion.correctIndex
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50/90 border-amber-300 text-amber-950'
                }`}
              >
                {selectedOption === currentQuestion.correctIndex ? (
                  <Smile className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <Heart className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{feedbackMessage}</p>
                </div>
              </div>
            )}

            {/* Proceed Action Button */}
            {isAnswered && (
              <div className="pt-2 flex justify-end">
                <button
                  id="next-quiz-question-btn"
                  type="button"
                  onClick={handleNext}
                  className="w-full sm:w-auto py-3 px-6 bg-teal-850 hover:bg-teal-900 text-white font-semibold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer animate-in fade-in"
                >
                  <span>
                    {currentIndex + 1 < questions.length
                      ? language === 'as'
                        ? 'পৰৱৰ্তী প্ৰশ্ন'
                        : language === 'hi'
                        ? 'अगला प्रश्न'
                        : language === 'mni'
                        ? 'মথংগী ৱাহং'
                        : 'Next Question'
                      : language === 'as'
                      ? 'কুইজ সমাপ্ত কৰক'
                      : language === 'hi'
                      ? 'प्रश्नोत्तरी समाप्त करें'
                      : language === 'mni'
                      ? 'ক্বিজ লোইরে'
                      : 'Finish Quiz'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};
