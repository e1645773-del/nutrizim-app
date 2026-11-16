import { useEffect, useState } from 'react';
import { Check, Droplets, Minus, Plus } from 'lucide-react';
import { saveHydrationLog, type HydrationLogEntry } from '../lib/firebase';

interface WaterIntakeTrackerProps {
  uid: string;
  dateKey: string;
  hydrationLog: HydrationLogEntry | null;
}

const DEFAULT_GLASSES = 0;
const DEFAULT_GOAL = 8;
const GLASS_ML = 250;

export function WaterIntakeTracker({
  uid,
  dateKey,
  hydrationLog,
}: WaterIntakeTrackerProps) {
  const [glasses, setGlasses] = useState<number>(hydrationLog?.glasses ?? DEFAULT_GLASSES);
  const [goalGlasses, setGoalGlasses] = useState<number>(hydrationLog?.goalGlasses ?? DEFAULT_GOAL);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGlasses(hydrationLog?.glasses ?? DEFAULT_GLASSES);
    setGoalGlasses(hydrationLog?.goalGlasses ?? DEFAULT_GOAL);
  }, [hydrationLog, dateKey]);

  const persistHydration = async (nextGlasses: number, nextGoal: number) => {
    const clampedGlasses = Math.max(0, Math.min(40, Math.round(nextGlasses)));
    const clampedGoal = Math.max(1, Math.min(30, Math.round(nextGoal)));
    setGlasses(clampedGlasses);
    setGoalGlasses(clampedGoal);
    setSaving(true);
    try {
      await saveHydrationLog(uid, dateKey, clampedGlasses, clampedGoal, GLASS_ML);
    } finally {
      setSaving(false);
    }
  };

  const totalMl = glasses * GLASS_ML;
  const goalMl = goalGlasses * GLASS_ML;
  const progressPct = Math.min(100, Math.round((glasses / Math.max(1, goalGlasses)) * 100));
  const goalReached = glasses >= goalGlasses;
  const remainingGlasses = Math.max(0, goalGlasses - glasses);

  return (
    <section
      aria-label="Daily water intake tracker"
      className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 flex flex-col justify-between space-y-4"
    >
      {/* Header & Volume Readout */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 border-2 ${
              goalReached
                ? 'bg-[#135D3B] border-[#E5B84B] text-[#E5B84B]'
                : 'bg-[#D8EADB] dark:bg-[#162C21] border-[#1E7A4C]/30 text-[#135D3B] dark:text-[#5EE39D]'
            }`}
          >
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              Daily Hydration ({dateKey})
            </p>
            <h3 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
              Water Intake Tracker
            </h3>
          </div>
        </div>

        <div className="text-right font-mono tabular-nums">
          <p className="text-2xl font-bold text-[#112018] dark:text-white leading-tight">
            {glasses}{' '}
            <span className="text-sm font-normal text-[#587264] dark:text-slate-400">
              / {goalGlasses} glasses
            </span>
          </p>
          <p className="text-xs font-semibold text-[#135D3B] dark:text-[#5EE39D]">
            {totalMl.toLocaleString()} / {goalMl.toLocaleString()} ml ({progressPct}%)
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-[#F2E9D8] dark:bg-[#18251E] overflow-hidden border border-[#135D3B]/10 dark:border-white/5">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: goalReached
                ? 'linear-gradient(90deg, #135D3B 0%, #D99B26 100%)'
                : 'linear-gradient(90deg, #135D3B 0%, #2A9D6F 100%)',
            }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#385043] dark:text-slate-300">
          <span>
            {goalReached ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#135D3B] dark:text-[#5EE39D]">
                <Check className="w-3.5 h-3.5" />
                Daily hydration goal reached ({totalMl.toLocaleString()} ml)
              </span>
            ) : (
              `${remainingGlasses} glass${remainingGlasses === 1 ? '' : 'es'} (${(
                remainingGlasses * GLASS_ML
              ).toLocaleString()} ml) remaining to reach ${goalMl.toLocaleString()} ml goal`
            )}
          </span>
          {saving && (
            <span className="font-mono text-[11px] text-[#B7791F] dark:text-[#E5B84B]">
              Syncing...
            </span>
          )}
        </div>
      </div>

      {/* Interactive Glass Grid (Click any glass N to set count) */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] p-3 border border-[#135D3B]/10 dark:border-white/5"
        role="group"
        aria-label="Interactive daily water glasses"
      >
        {Array.from({ length: goalGlasses }).map((_, idx) => {
          const glassNumber = idx + 1;
          const filled = glassNumber <= glasses;
          return (
            <button
              key={glassNumber}
              type="button"
              onClick={() =>
                persistHydration(
                  filled && glassNumber === glasses ? glassNumber - 1 : glassNumber,
                  goalGlasses
                )
              }
              title={`Set water intake to ${glassNumber} glass(es) (${glassNumber * GLASS_ML} ml)`}
              aria-label={`Glass ${glassNumber} (${filled ? 'filled' : 'empty'})`}
              className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all ${
                filled
                  ? 'bg-[#135D3B] border-[#E5B84B]/60 text-[#E5B84B] shadow-xs'
                  : 'bg-white dark:bg-[#121C17] border-[#135D3B]/20 dark:border-white/15 text-[#587264] dark:text-slate-400 hover:border-[#D99B26]'
              }`}
            >
              <Droplets className={`w-4 h-4 ${filled ? 'fill-current' : ''}`} />
            </button>
          );
        })}
        {glasses > goalGlasses && (
          <span className="ml-1 font-mono text-xs font-bold text-[#135D3B] dark:text-[#E5B84B]">
            +{glasses - goalGlasses} extra
          </span>
        )}
      </div>

      {/* Controls: Decrement / +1 Glass / +500ml Bottle / Goal Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => persistHydration(glasses - 1, goalGlasses)}
            disabled={glasses <= 0 || saving}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full border border-[#135D3B]/20 dark:border-white/15 text-[#385043] dark:text-slate-200 hover:border-[#D99B26] disabled:opacity-40 transition-colors"
            aria-label="Remove one glass of water"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => persistHydration(glasses + 1, goalGlasses)}
            disabled={saving}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#135D3B] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5B84B]" />
            Add 1 Glass (250ml)
          </button>

          <button
            type="button"
            onClick={() => persistHydration(glasses + 2, goalGlasses)}
            disabled={saving}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#F2DFAA] dark:bg-[#2F2512] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#8F6008] dark:text-[#E5B84B] hover:bg-[#E5B84B] hover:text-[#112018] disabled:opacity-60 transition-colors"
          >
            +2 (500ml)
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#587264] dark:text-slate-400 font-medium">Goal:</span>
          {[6, 8, 10, 12].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => persistHydration(glasses, g)}
              className={`min-h-[32px] px-2.5 rounded-full font-mono text-xs font-semibold transition-colors ${
                goalGlasses === g
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#385043] dark:text-slate-300 hover:text-[#135D3B]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
