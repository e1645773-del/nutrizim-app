import { useMemo, useState } from 'react';
import { Scale, Sliders, Trash2 } from 'lucide-react';
import { scaleNutrition } from '../data/zimbabweFoodDb';
import {
  deleteFoodLog,
  saveWeightLog,
  updateFoodLogPortion,
  updateUserTargets,
  type FoodLogEntry,
  type HydrationLogEntry,
  type MealReminderSettings,
  type UserProfile,
  type WeightLogEntry,
} from '../lib/firebase';
import type { SmartReminderPayload } from '../lib/notifications';
import { MacroDistributionChart } from './MacroDistributionChart';
import { MealRemindersCard } from './MealRemindersCard';
import { NutriZimSuggestions } from './NutriZimSuggestions';
import { WaterIntakeTracker } from './WaterIntakeTracker';
import { WeeklySummaryCard } from './WeeklySummaryCard';

interface AnalyticsPanelProps {
  profile: UserProfile;
  dateKey: string;
  todayKey: string;
  onChangeDateKey: (next: string) => void;
  foodLogs: FoodLogEntry[];
  weightLogs: WeightLogEntry[];
  hydrationLog: HydrationLogEntry | null;
  reminderSettings: MealReminderSettings | null;
  sentReminderVersion: number;
  todayRemainingMacros: { kcal: number; protein: number; carbs: number; fat: number };
  streakDays: number;
  onTriggerReminder: (
    payload: SmartReminderPayload
  ) => Promise<'browser' | 'blocked' | 'unsupported'>;
}

export function AnalyticsPanel({
  profile,
  dateKey,
  todayKey,
  onChangeDateKey,
  foodLogs,
  weightLogs,
  hydrationLog,
  reminderSettings,
  sentReminderVersion,
  todayRemainingMacros,
  streakDays,
  onTriggerReminder,
}: AnalyticsPanelProps) {
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState({
    targetKcal: profile.targetKcal,
    targetProtein: profile.targetProtein,
    targetCarbs: profile.targetCarbs,
    targetFat: profile.targetFat,
    targetFibre: profile.targetFibre,
  });

  const existingTodayWeight = weightLogs.find((w) => w.dateKey === dateKey);
  const [weightInput, setWeightInput] = useState(
    existingTodayWeight ? String(existingTodayWeight.weightKg) : ''
  );
  const [weightNote, setWeightNote] = useState(existingTodayWeight?.note ?? '');
  const [savingWeight, setSavingWeight] = useState(false);

  const dayLogs = useMemo(
    () => foodLogs.filter((l) => l.dateKey === dateKey),
    [foodLogs, dateKey]
  );

  const dayTotals = useMemo(() => {
    return dayLogs.reduce(
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
  }, [dayLogs]);

  // 7-day rolling intake & expenditure estimate (MacroFactor-style objective trend)
  const rollingStats = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const log of foodLogs) {
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
      byDate.set(log.dateKey, (byDate.get(log.dateKey) ?? 0) + s.kcal);
    }
    const intakeDays = Array.from(byDate.values());
    const avgIntake =
      intakeDays.length > 0
        ? Math.round(intakeDays.reduce((a, b) => a + b, 0) / intakeDays.length)
        : profile.targetKcal;

    let weightDeltaPerWeek = 0;
    if (weightLogs.length >= 2) {
      const first = weightLogs[0];
      const last = weightLogs[weightLogs.length - 1];
      const daysDiff = Math.max(
        1,
        (new Date(last.dateKey).getTime() - new Date(first.dateKey).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      weightDeltaPerWeek = ((last.weightKg - first.weightKg) / daysDiff) * 7;
    }

    // 1kg body mass ~= 7700 kcal => daily energy balance offset
    const dailyBalanceOffset = Math.round((weightDeltaPerWeek * 7700) / 7);
    const estimatedExpenditure = Math.max(1200, avgIntake - dailyBalanceOffset);

    return {
      avgIntake,
      estimatedExpenditure,
      weightDeltaPerWeek: Math.round(weightDeltaPerWeek * 100) / 100,
      loggedDays: intakeDays.length,
    };
  }, [foodLogs, weightLogs, profile.targetKcal]);

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserTargets(profile.uid, targetDraft);
    setEditingTargets(false);
  };

  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = Number(weightInput);
    if (!kg || kg < 20 || kg > 400) return;
    setSavingWeight(true);
    try {
      await saveWeightLog(
        profile.uid,
        dateKey,
        kg,
        weightNote,
        existingTodayWeight?.id
      );
    } finally {
      setSavingWeight(false);
    }
  };

  const adherencePct = Math.min(
    140,
    Math.round((dayTotals.kcal / Math.max(1, profile.targetKcal)) * 100)
  );

  // SVG chart scaling for weight trend
  const chartWeights = weightLogs.slice(-14);
  const minW = chartWeights.length ? Math.min(...chartWeights.map((w) => w.weightKg)) - 1 : 65;
  const maxW = chartWeights.length ? Math.max(...chartWeights.map((w) => w.weightKg)) + 1 : 75;

  return (
    <div className="space-y-6">
      {/* Top Analytical Overview Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
            Objective Metabolic &amp; Macro Adherence
          </p>
          <h2 className="font-display text-3xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
            Daily Standardization Ledger
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateKey}
            onChange={(e) => onChangeDateKey(e.target.value)}
            className="min-h-[40px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 font-mono text-xs text-[#112018] dark:text-white"
          />
          <button
            type="button"
            onClick={() => {
              setTargetDraft({
                targetKcal: profile.targetKcal,
                targetProtein: profile.targetProtein,
                targetCarbs: profile.targetCarbs,
                targetFat: profile.targetFat,
                targetFibre: profile.targetFibre,
              });
              setEditingTargets((v) => !v);
            }}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full border border-[#135D3B]/20 dark:border-white/15 px-4 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#D99B26]" />
            Edit Targets
          </button>
        </div>
      </div>

      {editingTargets && (
        <form
          onSubmit={handleSaveTargets}
          className="rounded-2xl border border-[#D99B26]/50 bg-[#F2E9D8] dark:bg-[#121C17] p-5 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end"
        >
          {[
            { key: 'targetKcal', label: 'Calories (kcal)' },
            { key: 'targetProtein', label: 'Protein (g)' },
            { key: 'targetCarbs', label: 'Carbs (g)' },
            { key: 'targetFat', label: 'Fat (g)' },
            { key: 'targetFibre', label: 'Fibre (g)' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold text-[#385043] dark:text-slate-300 mb-1">
                {f.label}
              </label>
              <input
                type="number"
                value={(targetDraft as any)[f.key]}
                onChange={(e) =>
                  setTargetDraft((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                }
                className="w-full min-h-[38px] rounded-lg border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#0B110E] px-2.5 font-mono text-sm text-[#112018] dark:text-white"
              />
            </div>
          ))}
          <button
            type="submit"
            className="min-h-[38px] rounded-full bg-[#135D3B] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D]"
          >
            Save Targets
          </button>
        </form>
      )}

      {/* Macro Progress & Rolling Expenditure Row (Non-judgmental palette) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-medium text-[#587264] dark:text-slate-400">Caloric Intake</span>
              <p className="font-mono text-3xl font-bold text-[#112018] dark:text-white tabular-nums">
                {dayTotals.kcal}{' '}
                <span className="text-base font-normal text-[#587264] dark:text-slate-400">
                  / {profile.targetKcal} kcal ({adherencePct}%)
                </span>
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#587264] dark:text-slate-400 tabular-nums">
              <span className="block">Est. Expenditure</span>
              <span className="text-sm font-bold text-[#135D3B] dark:text-[#34D399]">
                {rollingStats.estimatedExpenditure} kcal/day
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              {
                label: 'Protein',
                val: dayTotals.protein,
                target: profile.targetProtein,
                color: '#135D3B',
                bgClass: 'bg-[#D8EADB] dark:bg-[#162C21]',
              },
              {
                label: 'Carbohydrates',
                val: dayTotals.carbs,
                target: profile.targetCarbs,
                color: '#D99B26',
                bgClass: 'bg-[#F2DFAA] dark:bg-[#232013]',
              },
              {
                label: 'Fat',
                val: dayTotals.fat,
                target: profile.targetFat,
                color: '#1E7A4C',
                bgClass: 'bg-[#F2E9D8] dark:bg-[#18251E]',
              },
              {
                label: 'Fibre',
                val: dayTotals.fibre,
                target: profile.targetFibre,
                color: '#B7791F',
                bgClass: 'bg-[#FAF4EA] dark:bg-[#18251E]',
              },
            ].map((m) => {
              const pct = Math.min(100, Math.round((m.val / Math.max(1, m.target)) * 100));
              return (
                <div key={m.label} className={`rounded-xl ${m.bgClass} p-3`}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#112018] dark:text-slate-200">{m.label}</span>
                    <span className="font-mono text-[#385043] dark:text-slate-300 tabular-nums">{pct}%</span>
                  </div>
                  <p className="font-mono text-sm font-bold text-[#112018] dark:text-white tabular-nums">
                    {m.val}g <span className="font-normal text-[#587264] dark:text-slate-400">/ {m.target}g</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body Weight Trend Logger & Correlation SVG */}
        <div className="lg:col-span-5 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#D99B26]" />
              <h3 className="font-display text-xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
                Body-Weight Trend Logger
              </h3>
            </div>
            <span className="font-mono text-xs text-[#385043] dark:text-slate-400 tabular-nums">
              {rollingStats.weightDeltaPerWeek >= 0 ? '+' : ''}
              {rollingStats.weightDeltaPerWeek} kg/wk
            </span>
          </div>

          {/* Trend Sparkline */}
          <div className="h-24 rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] p-2 flex items-center justify-center border border-[#135D3B]/10">
            {chartWeights.length >= 2 ? (
              <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible">
                <polyline
                  fill="none"
                  stroke="#135D3B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartWeights
                    .map((w, idx) => {
                      const x = (idx / (chartWeights.length - 1)) * 280 + 10;
                      const y = 70 - ((w.weightKg - minW) / Math.max(0.5, maxW - minW)) * 58;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {chartWeights.map((w, idx) => {
                  const x = (idx / (chartWeights.length - 1)) * 280 + 10;
                  const y = 70 - ((w.weightKg - minW) / Math.max(0.5, maxW - minW)) * 58;
                  return <circle key={w.id} cx={x} cy={y} r="3.5" fill="#D99B26" />;
                })}
              </svg>
            ) : (
              <p className="text-xs text-[#587264] dark:text-slate-400">
                Log at least 2 daily weights to plot body-mass correlation vs. intake.
              </p>
            )}
          </div>

          <form onSubmit={handleLogWeight} className="flex flex-wrap gap-2">
            <input
              type="number"
              step="0.1"
              min="25"
              max="350"
              required
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="Weight (kg)"
              className="w-28 min-h-[40px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 font-mono text-sm text-[#112018] dark:text-white"
            />
            <input
              type="text"
              value={weightNote}
              onChange={(e) => setWeightNote(e.target.value)}
              placeholder="Optional note (e.g. morning fasted)"
              className="flex-1 min-w-[140px] min-h-[40px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 text-xs text-[#112018] dark:text-white"
            />
            <button
              type="submit"
              disabled={savingWeight}
              className="min-h-[40px] rounded-full bg-[#135D3B] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-50"
            >
              {savingWeight ? 'Saving...' : 'Log Weight'}
            </button>
          </form>
        </div>
      </div>

      {/* Recharts Macronutrient Distribution (Radar vs Target & Dual-Ring Pie Split) */}
      <MacroDistributionChart
        dateKey={dateKey}
        totals={dayTotals}
        targets={{
          targetKcal: profile.targetKcal,
          targetProtein: profile.targetProtein,
          targetCarbs: profile.targetCarbs,
          targetFat: profile.targetFat,
          targetFibre: profile.targetFibre,
        }}
      />

      {/* Daily Water Intake Tracker & Weekly Report Export Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <WaterIntakeTracker
            uid={profile.uid}
            dateKey={dateKey}
            hydrationLog={hydrationLog}
          />
        </div>
        <div className="lg:col-span-6">
          <WeeklySummaryCard
            profile={profile}
            dateKey={dateKey}
            foodLogs={foodLogs}
          />
        </div>
      </div>

      {/* NutriZim Authentic Recipe Suggestions Matched to Remaining Macros */}
      <NutriZimSuggestions
        uid={profile.uid}
        dateKey={dateKey}
        totals={dayTotals}
        targets={{
          targetKcal: profile.targetKcal,
          targetProtein: profile.targetProtein,
          targetCarbs: profile.targetCarbs,
          targetFat: profile.targetFat,
          targetFibre: profile.targetFibre,
        }}
      />

      {/* Smart Meal Push Notification Reminders */}
      <MealRemindersCard
        uid={profile.uid}
        todayKey={todayKey}
        settings={reminderSettings}
        foodLogs={foodLogs}
        remainingMacros={todayRemainingMacros}
        streakDays={streakDays}
        sentVersion={sentReminderVersion}
        onTriggerNotification={onTriggerReminder}
      />

      {/* Standardized 100g/100ml Food Log Table */}
      <div className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] overflow-hidden">
        <div className="border-b border-[#135D3B]/10 dark:border-white/10 px-5 py-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
            Logged Items for {dateKey}
          </h3>
          <span className="font-mono text-xs text-[#587264] dark:text-slate-400 tabular-nums">
            {dayLogs.length} item(s) · Dual 100g/ml &amp; portion view
          </span>
        </div>

        {dayLogs.length === 0 ? (
          <div className="py-12 px-4 text-center text-sm text-[#587264] dark:text-slate-400">
            No food entries logged for {dateKey}. Use the AI Camera Scanner, Trilingual Coach, or
            Zimbabwean Food Database tab to add your first meal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F2E9D8] dark:bg-[#18251E] text-[#135D3B] dark:text-[#E5B84B] font-bold uppercase border-b border-[#135D3B]/10 dark:border-white/10">
                <tr>
                  <th className="py-3 px-4">Dish &amp; Meal</th>
                  <th className="py-3 px-3">Portion</th>
                  <th className="py-3 px-3">Baseline (per 100g/ml)</th>
                  <th className="py-3 px-3 text-right">Total Kcal</th>
                  <th className="py-3 px-3 text-right">P / C / F / Fib</th>
                  <th className="py-3 px-3">Vitamins</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#135D3B]/10 dark:divide-white/5 font-mono tabular-nums">
                {dayLogs.map((log) => {
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
                  return (
                    <tr key={log.id} className="hover:bg-[#FAF4EA] dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-sans">
                        <p className="font-semibold text-sm text-[#112018] dark:text-white">
                          {log.foodName}
                        </p>
                        <p className="text-[11px] text-[#587264] dark:text-slate-400">
                          {log.mealGroup} · via {log.source}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={5000}
                            defaultValue={log.portionAmount}
                            onBlur={(e) => {
                              const next = Number(e.target.value);
                              if (next > 0 && next !== log.portionAmount) {
                                updateFoodLogPortion(profile.uid, log.id, next, log.mealGroup);
                              }
                            }}
                            className="w-16 rounded border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-1.5 py-1 text-right text-xs text-[#112018] dark:text-white"
                          />
                          <span className="text-[#587264]">{log.unit}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#587264] dark:text-slate-400">
                        {log.kcalPer100} kcal · {log.proteinPer100}P/{log.carbsPer100}C/{log.fatPer100}F
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#135D3B] dark:text-[#E5B84B]">
                        {s.kcal}
                      </td>
                      <td className="py-3 px-3 text-right text-[#385043] dark:text-slate-200">
                        {s.protein}g / {s.carbs}g / {s.fat}g / {s.fibre}g
                      </td>
                      <td className="py-3 px-3 font-sans text-[#385043] dark:text-slate-300">
                        {log.vitamins}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteFoodLog(profile.uid, log.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                          aria-label={`Delete ${log.foodName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
