import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Trophy,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Filter,
  RefreshCw,
  Award,
  ChevronRight,
  Brain,
  Layers,
  Gamepad2,
} from 'lucide-react';
import { GameSessionResult, PatientProfile, CaretakerProfile } from '../types';

interface CaregiverGameAnalyticsProps {
  currentPatient: PatientProfile | null;
  currentCaretaker: CaretakerProfile | null;
  sessions: GameSessionResult[];
  onRefresh?: () => void;
  onNavigateToRoutine?: () => void;
}

export const CaregiverGameAnalytics: React.FC<CaregiverGameAnalyticsProps> = ({
  currentPatient,
  currentCaretaker,
  sessions,
  onRefresh,
  onNavigateToRoutine,
}) => {
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all' | '7days' | 'today'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filtered sessions based on timeframe
  const filteredSessions = useMemo(() => {
    let list = [...sessions];

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (timeframe === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      list = list.filter((s) => new Date(s.completedAt).getTime() >= startOfToday.getTime());
    } else if (timeframe === '7days') {
      list = list.filter((s) => now - new Date(s.completedAt).getTime() <= 7 * oneDayMs);
    }

    if (selectedGameFilter !== 'all') {
      list = list.filter((s) => s.gameId === selectedGameFilter);
    }

    return list.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  }, [sessions, timeframe, selectedGameFilter]);

  // Handle manual refresh
  const handleRefreshClick = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      onRefresh();
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Metrics calculations
  const totalSessionsCount = sessions.length;

  const todaySessionsCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return sessions.filter((s) => new Date(s.completedAt).getTime() >= startOfToday.getTime())
      .length;
  }, [sessions]);

  const past7DaysSessionsCount = useMemo(() => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return sessions.filter((s) => new Date(s.completedAt).getTime() >= sevenDaysAgo).length;
  }, [sessions]);

  const averageAccuracy = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + (s.accuracy || 0), 0);
    return Math.round(sum / sessions.length);
  }, [sessions]);

  const averageCompletionSecs = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + (s.completionTimeMs || 0), 0);
    return Math.round(sum / sessions.length / 1000);
  }, [sessions]);

  const totalPlayMinutes = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, s) => acc + (s.completionTimeMs || 0), 0);
    return (sum / (1000 * 60)).toFixed(1);
  }, [sessions]);

  // Last played relative time
  const lastPlayedSession = useMemo(() => {
    if (sessions.length === 0) return null;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    return sorted[0];
  }, [sessions]);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'No games played yet';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Grouping by game
  const gameStats = useMemo(() => {
    const map: Record<
      string,
      { count: number; totalAcc: number; avgTimeSec: number; bestDiff: number }
    > = {};

    sessions.forEach((s) => {
      const gId = s.gameId;
      if (!map[gId]) {
        map[gId] = { count: 0, totalAcc: 0, avgTimeSec: 0, bestDiff: s.difficulty || 1 };
      }
      map[gId].count += 1;
      map[gId].totalAcc += s.accuracy || 0;
      map[gId].avgTimeSec += Math.round((s.completionTimeMs || 0) / 1000);
      if ((s.difficulty || 1) > map[gId].bestDiff) {
        map[gId].bestDiff = s.difficulty;
      }
    });

    return map;
  }, [sessions]);

  // 7-day play frequency distribution
  const last7DaysDistribution = useMemo(() => {
    const days: { label: string; count: number; dateStr: string; avgAcc: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });

      const daySessions = sessions.filter(
        (s) => s.completedAt && s.completedAt.startsWith(dateStr)
      );
      const dayAcc =
        daySessions.length > 0
          ? Math.round(
              daySessions.reduce((acc, s) => acc + (s.accuracy || 0), 0) / daySessions.length
            )
          : 0;

      days.push({
        label: dayLabel,
        count: daySessions.length,
        dateStr,
        avgAcc: dayAcc,
      });
    }

    return days;
  }, [sessions]);

  // Helper for game title
  const getGameMeta = (gameId: string) => {
    switch (gameId) {
      case 'memory-tiles':
        return {
          title: 'Memory Tiles (Concentration)',
          icon: '🎴',
          category: 'Visual Recall',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'find-matching':
        return {
          title: 'Northeast Heritage Match',
          icon: '👒',
          category: 'Visual Recall',
          badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
        };
      case 'pattern-sequence':
        return {
          title: 'Calm Pattern Sequence',
          icon: '✨',
          category: 'Working Memory',
          badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
        };
      case 'object-familiarity':
        return {
          title: 'Familiar Objects & Stories',
          icon: '🧵',
          category: 'Cultural Recognition',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'recognize-by-description':
        return {
          title: 'Heritage Clues & Object Matcher',
          icon: '🔍',
          category: 'Description Matching',
          badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
        };
      default:
        return {
          title: gameId.replace('-', ' '),
          icon: '🎮',
          category: 'Cognitive',
          badgeColor: 'bg-stone-100 text-stone-800 border-stone-200',
        };
    }
  };

  return (
    <div id="caregiver-game-analytics-tab" className="space-y-5 animate-in fade-in pb-12">
      {/* Tab Header & Senior Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-100 text-teal-850 rounded-xl">
              <Gamepad2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-serif font-bold text-stone-900">
              Cognitive Game Performance
            </h2>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Real-time telemetry on visual recall, accuracy rates, and play frequency for{' '}
            <strong className="text-stone-800">{currentPatient?.fullName || 'Senior'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="caregiver-refresh-analytics-btn"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl border border-stone-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-700' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards: Performance, Accuracy, Frequency */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Overall Accuracy */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Average Accuracy
            </span>
            <span className="p-1 bg-emerald-50 text-emerald-700 rounded-lg">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-serif font-bold text-stone-900">
                {averageAccuracy > 0 ? `${averageAccuracy}%` : '—'}
              </span>
              {averageAccuracy >= 85 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  Sharp Recall
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {sessions.length > 0
                ? `Across ${totalSessionsCount} recorded session${totalSessionsCount > 1 ? 's' : ''}`
                : 'Awaiting first game'}
            </p>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, averageAccuracy)}%` }}
            />
          </div>
        </div>

        {/* 2. Play Frequency ("How Often They Play") */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Play Frequency
            </span>
            <span className="p-1 bg-amber-50 text-amber-700 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-serif font-bold text-teal-850">
                {todaySessionsCount}
              </span>
              <span className="text-xs font-semibold text-stone-600">plays today</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {past7DaysSessionsCount} plays this week • Streak:{' '}
              {currentPatient?.dailyStreak || (todaySessionsCount > 0 ? 1 : 0)}d
            </p>
          </div>
          <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 truncate">
            Last active: {formatRelativeTime(lastPlayedSession?.completedAt)}
          </div>
        </div>

        {/* 3. Memory Tiles Specific Focus */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Memory Tiles
            </span>
            <span className="p-1 bg-teal-50 text-teal-700 rounded-lg">
              <Brain className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            {gameStats['memory-tiles'] ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-serif font-bold text-stone-900">
                    {Math.round(
                      gameStats['memory-tiles'].totalAcc / gameStats['memory-tiles'].count
                    )}
                    %
                  </span>
                  <span className="text-xs text-stone-600">
                    ({gameStats['memory-tiles'].count} rounds)
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Avg time:{' '}
                  {Math.round(
                    gameStats['memory-tiles'].avgTimeSec / gameStats['memory-tiles'].count
                  )}
                  s • Grid: {gameStats['memory-tiles'].bestDiff === 1 ? '2×2' : gameStats['memory-tiles'].bestDiff === 2 ? '3×4' : '4×4'}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-serif font-bold text-stone-400">—</div>
                <p className="text-[11px] text-stone-500 mt-0.5">Ready for patient to play</p>
              </>
            )}
          </div>
          <div className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 truncate">
            Card Matching / Visual Recall
          </div>
        </div>

        {/* 4. Cognitive Pace & Endurance */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Pace & Focus Time
            </span>
            <span className="p-1 bg-sky-50 text-sky-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-serif font-bold text-stone-900">
                {averageCompletionSecs > 0 ? `${averageCompletionSecs}s` : '—'}
              </span>
              <span className="text-xs text-stone-600">avg duration</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              {totalPlayMinutes} total minutes of cognitive engagement
            </p>
          </div>
          <div className="text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 truncate">
            Steady non-rushed pacing
          </div>
        </div>
      </div>

      {/* 7-Day Play Frequency & Cadence Visualizer */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900">
              Weekly Play Cadence & Consistency
            </h3>
            <p className="text-xs text-stone-500">
              Daily frequency of cognitive games played by {currentPatient?.preferredName || 'the senior'}.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 bg-stone-50 px-3 py-1 rounded-xl border border-stone-200">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <span>Target: 2-3 sessions daily</span>
          </div>
        </div>

        {/* Visual Bar Distribution */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2">
          {last7DaysDistribution.map((d, idx) => {
            const hasPlayed = d.count > 0;
            const barHeightClass =
              d.count === 0
                ? 'h-3 bg-stone-100'
                : d.count === 1
                ? 'h-10 bg-teal-400'
                : d.count === 2
                ? 'h-16 bg-teal-600'
                : 'h-24 bg-teal-850';

            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="h-28 flex flex-col justify-end w-full px-1">
                  {d.count > 0 && (
                    <span className="text-[10px] font-bold text-teal-900 text-center mb-1">
                      {d.count}
                    </span>
                  )}
                  <div className={`w-full rounded-xl transition-all ${barHeightClass}`} />
                </div>
                <span className="text-[11px] font-semibold text-stone-700 mt-2">
                  {d.label}
                </span>
                <span className="text-[10px] text-stone-400">
                  {hasPlayed ? `${d.avgAcc}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Game Accuracy & Breakdown Cards */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
        <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900">
          Cognitive Exercise Breakdown & Accuracy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Memory Tiles Card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    Memory Tiles (Card Matching)
                  </h4>
                  <p className="text-[11px] text-stone-500">Concentration & Visual Recall</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md border border-amber-300">
                New
              </span>
            </div>

            {gameStats['memory-tiles'] ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-stone-200 text-center">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Accuracy</p>
                  <p className="text-base font-bold text-teal-850">
                    {Math.round(
                      gameStats['memory-tiles'].totalAcc / gameStats['memory-tiles'].count
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Played</p>
                  <p className="text-base font-bold text-stone-800">
                    {gameStats['memory-tiles'].count} rounds
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Avg Time</p>
                  <p className="text-base font-bold text-stone-800">
                    {Math.round(
                      gameStats['memory-tiles'].avgTimeSec / gameStats['memory-tiles'].count
                    )}
                    s
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
                Patient hasn't played Memory Tiles yet. When they complete a 2x2, 3x4, or 4x4 round, metrics will populate here.
              </p>
            )}
          </div>

          {/* Heritage Match Card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👒</span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    Northeast Heritage Match
                  </h4>
                  <p className="text-[11px] text-stone-500">Pair Identification & Cultural Memory</p>
                </div>
              </div>
            </div>

            {gameStats['find-matching'] ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-stone-200 text-center">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Accuracy</p>
                  <p className="text-base font-bold text-teal-850">
                    {Math.round(
                      gameStats['find-matching'].totalAcc / gameStats['find-matching'].count
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Played</p>
                  <p className="text-base font-bold text-stone-800">
                    {gameStats['find-matching'].count} rounds
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Avg Time</p>
                  <p className="text-base font-bold text-stone-800">
                    {Math.round(
                      gameStats['find-matching'].avgTimeSec / gameStats['find-matching'].count
                    )}
                    s
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
                No Heritage Match sessions recorded yet.
              </p>
            )}
          </div>

          {/* Calm Pattern Sequence */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    Calm Pattern Sequence
                  </h4>
                  <p className="text-[11px] text-stone-500">Sequential Recall & Attention</p>
                </div>
              </div>
            </div>

            {gameStats['pattern-sequence'] ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-stone-200 text-center">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Accuracy</p>
                  <p className="text-base font-bold text-teal-850">
                    {Math.round(
                      gameStats['pattern-sequence'].totalAcc / gameStats['pattern-sequence'].count
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Played</p>
                  <p className="text-base font-bold text-stone-800">
                    {gameStats['pattern-sequence'].count} rounds
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Avg Time</p>
                  <p className="text-base font-bold text-stone-800">
                    {Math.round(
                      gameStats['pattern-sequence'].avgTimeSec / gameStats['pattern-sequence'].count
                    )}
                    s
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
                No Pattern Sequence sessions recorded yet.
              </p>
            )}
          </div>

          {/* Familiar Objects & Stories */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧵</span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    Familiar Objects & Stories
                  </h4>
                  <p className="text-[11px] text-stone-500">Semantic & Episodic Memory</p>
                </div>
              </div>
            </div>

            {gameStats['object-familiarity'] ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-stone-200 text-center">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Accuracy</p>
                  <p className="text-base font-bold text-teal-850">
                    {Math.round(
                      gameStats['object-familiarity'].totalAcc /
                        gameStats['object-familiarity'].count
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Played</p>
                  <p className="text-base font-bold text-stone-800">
                    {gameStats['object-familiarity'].count} rounds
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Avg Time</p>
                  <p className="text-base font-bold text-stone-800">
                    {Math.round(
                      gameStats['object-familiarity'].avgTimeSec /
                        gameStats['object-familiarity'].count
                    )}
                    s
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
                No Familiar Object sessions recorded yet.
              </p>
            )}
          </div>

          {/* Heritage Clues & Object Matcher */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900">
                    Heritage Clues & Matcher
                  </h4>
                  <p className="text-[11px] text-stone-500">Description-Based Audio Recall</p>
                </div>
              </div>
            </div>

            {gameStats['recognize-by-description'] ? (
              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-stone-200 text-center">
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Accuracy</p>
                  <p className="text-base font-bold text-teal-850">
                    {Math.round(
                      gameStats['recognize-by-description'].totalAcc /
                        gameStats['recognize-by-description'].count
                    )}
                    %
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Played</p>
                  <p className="text-base font-bold text-stone-800">
                    {gameStats['recognize-by-description'].count} rounds
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Avg Time</p>
                  <p className="text-base font-bold text-stone-800">
                    {Math.round(
                      gameStats['recognize-by-description'].avgTimeSec /
                        gameStats['recognize-by-description'].count
                    )}
                    s
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic bg-white p-2.5 rounded-xl border border-stone-200">
                No Description Matcher sessions recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Game Sessions History Log */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900">
              Detailed Play Session History ({filteredSessions.length})
            </h3>
            <p className="text-xs text-stone-500">
              Complete log of every game round played with moves, accuracy, and duration.
            </p>
          </div>

          {/* Timeframe & Game Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex bg-stone-100 p-0.5 rounded-xl border border-stone-200">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: '7days', label: 'Past 7d' },
                  { id: 'today', label: 'Today' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    timeframe === t.id
                      ? 'bg-teal-850 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              value={selectedGameFilter}
              onChange={(e) => setSelectedGameFilter(e.target.value)}
              className="px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-xl font-medium text-stone-700 text-xs focus:ring-1 focus:ring-teal-700 focus:outline-hidden"
            >
              <option value="all">All Games</option>
              <option value="memory-tiles">Memory Tiles</option>
              <option value="recognize-by-description">Heritage Clues & Matcher</option>
              <option value="find-matching">Heritage Match</option>
              <option value="pattern-sequence">Pattern Sequence</option>
              <option value="object-familiarity">Familiar Objects</option>
            </select>
          </div>
        </div>

        {/* Sessions List or Empty State */}
        {filteredSessions.length > 0 ? (
          <div className="space-y-2.5">
            {filteredSessions.map((session) => {
              const meta = getGameMeta(session.gameId);
              const sessionDate = new Date(session.completedAt);
              const timeFormatted = sessionDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateFormatted = sessionDate.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={session.id}
                  className="p-3.5 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-white rounded-xl border border-stone-200 shadow-2xs">
                      {meta.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                          {meta.title}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}
                        >
                          {session.difficulty === 1
                            ? 'Beginner'
                            : session.difficulty === 2
                            ? 'Standard'
                            : 'Advanced'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {dateFormatted} at {timeFormatted} • {meta.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Accuracy Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          session.accuracy >= 85
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : session.accuracy >= 70
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        {session.accuracy}% Accuracy
                      </span>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {session.attempts} moves • {Math.round((session.completionTimeMs || 0) / 1000)}s
                        {session.mistakes !== undefined ? ` • ${session.mistakes} misses` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl p-8 border border-stone-200 text-center">
            <Gamepad2 className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <h4 className="font-serif font-bold text-sm text-stone-800">
              No Game Sessions in this timeframe
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              When {currentPatient?.fullName || 'the senior'} plays Memory Tiles or any cognitive game from their Games tab, accuracy and performance telemetry will immediately appear here.
            </p>
          </div>
        )}
      </div>

      {/* Clinical Observations & Care Advice */}
      <div className="bg-teal-50 border border-teal-200 p-5 rounded-3xl shadow-2xs space-y-2 text-xs text-teal-900">
        <div className="flex items-center gap-2 text-teal-900 font-serif font-bold text-sm">
          <Sparkles className="w-4 h-4 text-teal-700" />
          <span>Caregiver Guidance & Cognitive Wellness</span>
        </div>
        <p className="text-teal-800 leading-relaxed">
          {averageAccuracy >= 80
            ? `${currentPatient?.preferredName || 'The patient'} is exhibiting steady visual concentration. Regular short rounds of Memory Tiles (2 to 3 times daily) reinforce short-term recall and keep orientation active.`
            : `Encourage relaxing 2×2 or 3×4 sessions without time pressure. Familiar Northeast cultural symbols trigger warm episodic recall and reduce cognitive fatigue.`}
        </p>
      </div>
    </div>
  );
};
