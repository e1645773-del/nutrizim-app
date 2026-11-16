import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BellRing,
  Camera,
  Check,
  Database,
  Download,
  Flame,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { scaleNutrition } from '../data/zimbabweFoodDb';
import {
  saveDailyCheckIn,
  subscribeToCoachMessages,
  subscribeToDailyCheckIns,
  subscribeToFoodLogs,
  subscribeToHydrationLog,
  subscribeToMealReminderSettings,
  subscribeToWeightLogs,
  syncUserStreakSummary,
  type CoachMessageEntry,
  type DailyCheckInEntry,
  type FoodLogEntry,
  type HydrationLogEntry,
  type MealReminderSettings,
  type UserProfile,
  type WeightLogEntry,
} from '../lib/firebase';
import {
  buildSmartReminderCopy,
  DEFAULT_MEAL_REMINDER_CONFIG,
  dispatchBrowserNotification,
  evaluateDueMealReminders,
  markReminderSlotSent,
  type SmartReminderPayload,
} from '../lib/notifications';
import { computeMealStreak, getLocalDateKey } from '../lib/streak';
import { AnalyticsPanel } from './AnalyticsPanel';
import { CoachPanel } from './CoachPanel';
import { DatabasePanel } from './DatabasePanel';
import { ScannerPanel } from './ScannerPanel';
import { SubscriptionGate } from './SubscriptionGate';

type DashboardTab = 'analytics' | 'scanner' | 'coach' | 'database';

interface DashboardProps {
  profile: UserProfile;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

export function Dashboard({ profile, isDark, onToggleTheme, onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics');
  const todayKey = getLocalDateKey();
  const [dateKey, setDateKey] = useState<string>(todayKey);
  const [foodLogs, setFoodLogs] = useState<FoodLogEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogEntry[]>([]);
  const [coachMessages, setCoachMessages] = useState<CoachMessageEntry[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<DailyCheckInEntry[]>([]);
  const [hydrationLog, setHydrationLog] = useState<HydrationLogEntry | null>(null);
  const [reminderSettings, setReminderSettings] = useState<MealReminderSettings | null>(null);
  const [sentReminderVersion, setSentReminderVersion] = useState(0);
  const [activeReminderToast, setActiveReminderToast] = useState<SmartReminderPayload | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const lastSyncedKeyRef = useRef<string>('');

  const isUnlocked = profile.tier === 'alpha_free' || profile.tier === 'premium_paid';

  useEffect(() => {
    if (!isUnlocked) return;
    const unsubLogs = subscribeToFoodLogs(profile.uid, setFoodLogs);
    const unsubWeights = subscribeToWeightLogs(profile.uid, setWeightLogs);
    const unsubCoach = subscribeToCoachMessages(profile.uid, setCoachMessages);
    const unsubCheckIns = subscribeToDailyCheckIns(profile.uid, setDailyCheckIns);
    const unsubReminders = subscribeToMealReminderSettings(profile.uid, setReminderSettings);
    return () => {
      unsubLogs();
      unsubWeights();
      unsubCoach();
      unsubCheckIns();
      unsubReminders();
    };
  }, [profile.uid, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;
    setHydrationLog(null);
    return subscribeToHydrationLog(profile.uid, dateKey, setHydrationLog);
  }, [profile.uid, isUnlocked, dateKey]);

  const streak = useMemo(
    () =>
      computeMealStreak(
        foodLogs,
        dailyCheckIns,
        todayKey,
        profile.longestStreak ?? 0
      ),
    [foodLogs, dailyCheckIns, todayKey, profile.longestStreak]
  );

  useEffect(() => {
    if (!isUnlocked || !streak.lastCheckInDate) return;
    const targetKey = `${streak.currentStreak}:${streak.longestStreak}:${streak.lastCheckInDate}`;
    const profileKey = `${profile.currentStreak ?? 0}:${profile.longestStreak ?? 0}:${profile.lastCheckInDate ?? ''}`;
    if (targetKey === profileKey || targetKey === lastSyncedKeyRef.current) return;

    lastSyncedKeyRef.current = targetKey;
    syncUserStreakSummary(
      profile.uid,
      streak.currentStreak,
      streak.longestStreak,
      streak.lastCheckInDate
    ).catch(() => {
      // Keep UI responsive even if background streak sync hits transient offline error
    });
  }, [
    isUnlocked,
    profile.uid,
    profile.currentStreak,
    profile.longestStreak,
    profile.lastCheckInDate,
    streak.currentStreak,
    streak.longestStreak,
    streak.lastCheckInDate,
  ]);

  const handleManualCheckIn = async () => {
    if (checkingIn || streak.checkedInToday) return;
    setCheckingIn(true);
    try {
      await saveDailyCheckIn(profile.uid, todayKey, 'manual');
    } finally {
      setCheckingIn(false);
    }
  };

  const dayTotals = useMemo(() => {
    return foodLogs
      .filter((l) => l.dateKey === dateKey)
      .reduce(
        (acc, log) => {
          const s = scaleNutrition(
            {
              kcal: log.kcalPer100,
              protein: log.proteinPer100,
              carbs: log.carbsPer100,
              fat: log.fatPer100,
              fibre: log.fibrePer100,
            },
            log.portionAmount
          );
          acc.kcal += s.kcal;
          acc.protein = Math.round((acc.protein + s.protein) * 10) / 10;
          acc.carbs = Math.round((acc.carbs + s.carbs) * 10) / 10;
          acc.fat = Math.round((acc.fat + s.fat) * 10) / 10;
          acc.fibre = Math.round((acc.fibre + s.fibre) * 10) / 10;
          return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }
      );
  }, [foodLogs, dateKey]);

  const todayRemainingMacros = useMemo(() => {
    const todayTotals = foodLogs
      .filter((l) => l.dateKey === todayKey)
      .reduce(
        (acc, log) => {
          const s = scaleNutrition(
            {
              kcal: log.kcalPer100,
              protein: log.proteinPer100,
              carbs: log.carbsPer100,
              fat: log.fatPer100,
              fibre: log.fibrePer100,
            },
            log.portionAmount
          );
          acc.kcal += s.kcal;
          acc.protein += s.protein;
          acc.carbs += s.carbs;
          acc.fat += s.fat;
          return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      );
    return {
      kcal: Math.round(profile.targetKcal - todayTotals.kcal),
      protein: Math.round((profile.targetProtein - todayTotals.protein) * 10) / 10,
      carbs: Math.round((profile.targetCarbs - todayTotals.carbs) * 10) / 10,
      fat: Math.round((profile.targetFat - todayTotals.fat) * 10) / 10,
    };
  }, [foodLogs, todayKey, profile.targetKcal, profile.targetProtein, profile.targetCarbs, profile.targetFat]);

  const triggerReminderNotification = async (payload: SmartReminderPayload) => {
    setActiveReminderToast(payload);
    return dispatchBrowserNotification(payload, () => {
      setDateKey(todayKey);
      setActiveTab('scanner');
    });
  };

  useEffect(() => {
    if (!isUnlocked) return;
    const activeConfig = reminderSettings
      ? {
          enabled: reminderSettings.enabled,
          smartSkipLogged: reminderSettings.smartSkipLogged,
          breakfastTime: reminderSettings.breakfastTime,
          lunchTime: reminderSettings.lunchTime,
          dinnerTime: reminderSettings.dinnerTime,
          snackTime: reminderSettings.snackTime,
          snackEnabled: reminderSettings.snackEnabled,
        }
      : DEFAULT_MEAL_REMINDER_CONFIG;

    if (!activeConfig.enabled) return;

    const checkAndNotify = () => {
      const dueSlots = evaluateDueMealReminders({
        uid: profile.uid,
        now: new Date(),
        todayKey,
        settings: activeConfig,
        foodLogs,
      });

      if (dueSlots.length === 0) return;

      for (const slot of dueSlots) {
        markReminderSlotSent(profile.uid, todayKey, slot);
        const payload = buildSmartReminderCopy(
          slot,
          todayRemainingMacros,
          streak.currentStreak,
          streak.todayMealCount
        );
        void triggerReminderNotification(payload);
      }
      setSentReminderVersion((v) => v + 1);
    };

    checkAndNotify();
    const timer = window.setInterval(checkAndNotify, 20000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isUnlocked,
    profile.uid,
    todayKey,
    reminderSettings,
    foodLogs,
    todayRemainingMacros,
    streak.currentStreak,
    streak.todayMealCount,
  ]);

  const latestWeightKg = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weightKg : null;

  if (!isUnlocked) {
    return <SubscriptionGate profile={profile} />;
  }

  const tabs: Array<{ id: DashboardTab; label: string; icon: typeof BarChart3 }> = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'scanner', label: 'AI Scanner', icon: Camera },
    { id: 'coach', label: 'AI Coach', icon: MessageSquare },
    { id: 'database', label: 'Food DB', icon: Database },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-24 md:pb-12 space-y-6">
      {/* Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#135D3B]/15 dark:border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-display text-xl font-black uppercase tracking-tight text-[#135D3B] dark:text-[#E5B84B]">
            {profile.displayName}
          </span>
          <span aria-hidden="true" className="text-[#135D3B]/40 dark:text-slate-500">
            ·
          </span>
          <span className="font-mono text-[#385043] dark:text-slate-300 tabular-nums">
            Account #{profile.userNumber}
          </span>
          <span aria-hidden="true" className="text-[#135D3B]/40 dark:text-slate-500">
            ·
          </span>
          <span className="font-semibold text-[#135D3B] dark:text-[#34D399]">
            {profile.tier === 'alpha_free'
              ? 'Free Early-Bird Alpha'
              : `NutriZim Pro (${profile.paymentMethod.toUpperCase()})`}
          </span>
          <span aria-hidden="true" className="text-[#135D3B]/40 dark:text-slate-500">
            ·
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums ${
              streak.currentStreak > 0
                ? 'bg-[#F2DFAA] dark:bg-[#2F2512] text-[#8F6008] dark:text-[#E5B84B]'
                : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#587264] dark:text-slate-400'
            }`}
            title={`Best streak: ${streak.longestStreak} day(s)`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                streak.currentStreak > 0
                  ? 'text-[#D99B26] fill-[#D99B26]'
                  : 'text-[#587264] dark:text-slate-400'
              }`}
            />
            {streak.currentStreak}d streak
          </span>
        </div>

        {/* Desktop Tab Switcher + Theme + Sign Out */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:flex items-center gap-1 rounded-full bg-[#F2E9D8] dark:bg-[#121C17] border border-[#135D3B]/15 dark:border-white/10 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-[#135D3B] text-[#E5B84B]'
                      : 'text-[#385043] dark:text-slate-300 hover:text-[#135D3B] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <a
            href="/api/export-source-zip"
            download="nutrizim-app.zip"
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] px-3.5 text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26]"
            title="Download complete NutriZim application bundle (.zip)"
          >
            <Download className="w-3.5 h-3.5 text-[#D99B26]" />
            App .zip
          </a>

          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] px-3.5 text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B]"
            aria-label="Toggle color theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-[#E5B84B]" /> : <Moon className="w-3.5 h-3.5 text-[#135D3B]" />}
            {isDark ? 'Cream' : 'Dark'}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] px-3.5 text-xs font-semibold text-[#385043] dark:text-slate-200 hover:border-rose-500/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Daily Check-In Streak Banner */}
      <section
        aria-label="Daily meal logging check-in streak"
        className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-[#F2E9D8] dark:bg-[#121C17] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border-2 ${
              streak.checkedInToday
                ? 'bg-[#135D3B] border-[#E5B84B] text-[#E5B84B]'
                : streak.currentStreak > 0
                ? 'bg-[#F2DFAA] dark:bg-[#2F2512] border-[#D99B26] text-[#8F6008] dark:text-[#E5B84B]'
                : 'bg-white dark:bg-[#18251E] border-[#135D3B]/20 dark:border-white/15 text-[#587264] dark:text-slate-400'
            }`}
          >
            <Flame
              className={`w-6 h-6 ${
                streak.currentStreak > 0 || streak.checkedInToday ? 'fill-current' : ''
              }`}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h2 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'} Check-In Streak
              </h2>
              <span className="font-mono text-xs font-semibold text-[#8F6008] dark:text-[#E5B84B]/90 tabular-nums">
                Best: {streak.longestStreak}d
              </span>
            </div>
            <p className="text-xs text-[#385043] dark:text-slate-300 mt-0.5">
              {streak.checkedInToday
                ? streak.todayMealCount > 0
                  ? `Checked in today with ${streak.todayMealCount} logged meal entry(s). Keep going tomorrow.`
                  : 'Checked in for today. Log a meal anytime to record standardized 100g/100ml macros.'
                : streak.currentStreak > 0
                ? 'Log a meal or check in today to extend your active streak.'
                : 'Log your first meal or complete a daily check-in to start a streak.'}
            </p>
          </div>
        </div>

        {/* 7-Day Consistency Strip + Quick Action */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4">
          <div className="flex items-center gap-1.5" role="list" aria-label="Last 7 days check-in status">
            {streak.last7Days.map((day) => (
              <div
                key={day.dateKey}
                role="listitem"
                title={`${day.dateKey}${day.mealCount > 0 ? ` · ${day.mealCount} meal(s)` : day.checkedIn ? ' · Checked in' : ''}`}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={`text-[10px] font-bold uppercase ${
                    day.isToday
                      ? 'text-[#135D3B] dark:text-[#E5B84B]'
                      : 'text-[#587264] dark:text-slate-400'
                  }`}
                >
                  {day.label}
                </span>
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                    day.checkedIn
                      ? 'bg-[#135D3B] text-[#E5B84B]'
                      : day.isToday
                      ? 'border-2 border-dashed border-[#D99B26] bg-white dark:bg-[#18251E] text-[#D99B26]'
                      : 'bg-white/75 dark:bg-[#18251E] border border-[#135D3B]/15 dark:border-white/10 text-transparent'
                  }`}
                >
                  {day.checkedIn ? (
                    <Flame className="w-3.5 h-3.5 fill-current" />
                  ) : day.isToday ? (
                    <Flame className="w-3.5 h-3.5" />
                  ) : (
                    '·'
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!streak.checkedInToday ? (
              <button
                type="button"
                onClick={handleManualCheckIn}
                disabled={checkingIn}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#D99B26] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                {checkingIn ? 'Checking In...' : 'Check In Today'}
              </button>
            ) : (
              <span className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#D8EADB] dark:bg-[#162C21] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#34D399] whitespace-nowrap">
                <Check className="w-3.5 h-3.5" />
                Checked In Today
              </span>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#135D3B] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] transition-colors whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-[#E5B84B]" />
              Log Meal
            </button>
          </div>
        </div>
      </section>

      {/* In-App Meal Reminder Alert Banner */}
      {activeReminderToast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[#D99B26] bg-[#F2DFAA] dark:bg-[#2F2512] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <BellRing className="w-5 h-5 text-[#135D3B] dark:text-[#E5B84B] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B]">
                {activeReminderToast.title}
              </p>
              <p className="text-xs text-[#112018] dark:text-slate-100 mt-0.5">
                {activeReminderToast.body}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDateKey(todayKey);
                setActiveTab('scanner');
                setActiveReminderToast(null);
              }}
              className="min-h-[36px] inline-flex items-center gap-1.5 rounded-full bg-[#135D3B] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D]"
            >
              <Camera className="w-3.5 h-3.5 text-[#E5B84B]" />
              Log Meal Now
            </button>
            <button
              type="button"
              onClick={() => setActiveReminderToast(null)}
              aria-label="Dismiss reminder alert"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full border border-[#135D3B]/20 dark:border-white/15 text-[#135D3B] dark:text-slate-200 hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Tab Content */}
      {activeTab === 'analytics' && (
        <AnalyticsPanel
          profile={profile}
          dateKey={dateKey}
          todayKey={todayKey}
          onChangeDateKey={setDateKey}
          foodLogs={foodLogs}
          weightLogs={weightLogs}
          hydrationLog={hydrationLog}
          reminderSettings={reminderSettings}
          sentReminderVersion={sentReminderVersion}
          todayRemainingMacros={todayRemainingMacros}
          streakDays={streak.currentStreak}
          onTriggerReminder={triggerReminderNotification}
        />
      )}

      {activeTab === 'scanner' && (
        <ScannerPanel
          uid={profile.uid}
          dateKey={dateKey}
          onLogged={() => setActiveTab('analytics')}
        />
      )}

      {activeTab === 'coach' && (
        <CoachPanel
          profile={profile}
          dateKey={dateKey}
          totals={dayTotals}
          latestWeightKg={latestWeightKg}
          messages={coachMessages}
        />
      )}

      {activeTab === 'database' && (
        <DatabasePanel
          uid={profile.uid}
          dateKey={dateKey}
          onLogged={() => setActiveTab('analytics')}
        />
      )}

      {/* Workspace Footer */}
      <footer className="border-t border-[#135D3B]/15 dark:border-white/10 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-[#587264] dark:text-slate-400">
        <p>
          NutriZim · Founded by <strong className="text-[#135D3B] dark:text-[#E5B84B]">Anita &amp; Emmanuel Musungo</strong> ·{' '}
          <a href="tel:+263783833106" className="font-mono hover:underline">
            +263 78 383 3106
          </a>
        </p>
        <a
          href="/api/export-source-zip"
          download="nutrizim-app.zip"
          className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:underline"
        >
          <Download className="w-3.5 h-3.5 text-[#D99B26]" />
          Download App Source (.zip)
        </a>
      </footer>

      {/* Mobile-First Thumb Zone Bottom Navigation Bar (<= 64px height) */}
      <nav
        aria-label="Mobile dashboard navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA]/95 dark:bg-[#0B110E]/95 backdrop-blur-md grid grid-cols-4 items-center"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-[#135D3B] dark:text-[#E5B84B]'
                  : 'text-[#587264] dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
