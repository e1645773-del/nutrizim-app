import { useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PieChart as PieChartIcon, Radar as RadarIcon } from 'lucide-react';

interface MacroDistributionChartProps {
  dateKey: string;
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  targets: {
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetFibre: number;
  };
}

type ChartViewMode = 'radar' | 'pie';

interface MacroRow {
  key: 'protein' | 'carbs' | 'fat';
  macro: string;
  actualGrams: number;
  targetGrams: number;
  pctOfTarget: number;
  radarActualPct: number;
  radarTargetPct: number;
  actualKcal: number;
  targetKcal: number;
  actualSharePct: number;
  targetSharePct: number;
  color: string;
}

const MACRO_COLORS = {
  protein: '#1E7A4C', // Savanna Green
  carbs: '#D99B26', // Harvest Gold
  fat: '#6B8E23', // Olive Leaf
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: MacroRow & { ringLabel?: string; isEmpty?: boolean } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row || row.isEmpty) return null;

  return (
    <div className="rounded-xl border border-[#E5B84B]/35 bg-[#121C17] px-3.5 py-2.5 text-xs text-[#EDF4EF] shadow-lg">
      <p className="font-display text-sm font-black uppercase text-[#E5B84B]">
        {row.ringLabel ? `${row.ringLabel} · ` : ''}
        {row.macro}
      </p>
      <div className="mt-1 space-y-0.5 font-mono tabular-nums">
        <p>
          Logged: <strong className="text-white">{row.actualGrams}g</strong> ({row.actualKcal} kcal)
        </p>
        <p className="text-slate-300">
          Target: {row.targetGrams}g ({row.targetKcal} kcal)
        </p>
        <p className="text-[#5EE39D]">
          Attainment: {row.pctOfTarget}% of daily target
        </p>
      </div>
    </div>
  );
}

export function MacroDistributionChart({
  dateKey,
  totals,
  targets,
}: MacroDistributionChartProps) {
  const [viewMode, setViewMode] = useState<ChartViewMode>('radar');

  const macroRows = useMemo<MacroRow[]>(() => {
    const safeProteinTarget = Math.max(1, targets.targetProtein);
    const safeCarbsTarget = Math.max(1, targets.targetCarbs);
    const safeFatTarget = Math.max(1, targets.targetFat);

    const actualP_kcal = Math.round(totals.protein * 4);
    const actualC_kcal = Math.round(totals.carbs * 4);
    const actualF_kcal = Math.round(totals.fat * 9);
    const totalActualKcal = actualP_kcal + actualC_kcal + actualF_kcal;

    const targetP_kcal = Math.round(safeProteinTarget * 4);
    const targetC_kcal = Math.round(safeCarbsTarget * 4);
    const targetF_kcal = Math.round(safeFatTarget * 9);
    const totalTargetKcal = Math.max(1, targetP_kcal + targetC_kcal + targetF_kcal);

    const pctP = Math.round((totals.protein / safeProteinTarget) * 100);
    const pctC = Math.round((totals.carbs / safeCarbsTarget) * 100);
    const pctF = Math.round((totals.fat / safeFatTarget) * 100);

    return [
      {
        key: 'protein',
        macro: 'Protein',
        actualGrams: totals.protein,
        targetGrams: targets.targetProtein,
        pctOfTarget: pctP,
        radarActualPct: Math.min(150, pctP),
        radarTargetPct: 100,
        actualKcal: actualP_kcal,
        targetKcal: targetP_kcal,
        actualSharePct: totalActualKcal > 0 ? Math.round((actualP_kcal / totalActualKcal) * 100) : 0,
        targetSharePct: Math.round((targetP_kcal / totalTargetKcal) * 100),
        color: MACRO_COLORS.protein,
      },
      {
        key: 'carbs',
        macro: 'Carbs',
        actualGrams: totals.carbs,
        targetGrams: targets.targetCarbs,
        pctOfTarget: pctC,
        radarActualPct: Math.min(150, pctC),
        radarTargetPct: 100,
        actualKcal: actualC_kcal,
        targetKcal: targetC_kcal,
        actualSharePct: totalActualKcal > 0 ? Math.round((actualC_kcal / totalActualKcal) * 100) : 0,
        targetSharePct: Math.round((targetC_kcal / totalTargetKcal) * 100),
        color: MACRO_COLORS.carbs,
      },
      {
        key: 'fat',
        macro: 'Fats',
        actualGrams: totals.fat,
        targetGrams: targets.targetFat,
        pctOfTarget: pctF,
        radarActualPct: Math.min(150, pctF),
        radarTargetPct: 100,
        actualKcal: actualF_kcal,
        targetKcal: targetF_kcal,
        actualSharePct: totalActualKcal > 0 ? Math.round((actualF_kcal / totalActualKcal) * 100) : 0,
        targetSharePct: Math.round((targetF_kcal / totalTargetKcal) * 100),
        color: MACRO_COLORS.fat,
      },
    ];
  }, [totals, targets]);

  const hasLoggedMacros = totals.protein > 0 || totals.carbs > 0 || totals.fat > 0;

  const actualPieData = useMemo(() => {
    if (!hasLoggedMacros) {
      return [
        {
          macro: 'No meals logged',
          actualKcal: 1,
          color: 'rgba(148, 163, 184, 0.22)',
          isEmpty: true,
        },
      ];
    }
    return macroRows.map((row) => ({
      ...row,
      ringLabel: 'Logged',
      isEmpty: false,
    }));
  }, [hasLoggedMacros, macroRows]);

  const targetPieData = useMemo(
    () =>
      macroRows.map((row) => ({
        ...row,
        ringLabel: 'Target',
        isEmpty: false,
      })),
    [macroRows]
  );

  const radarDomainMax = useMemo(() => {
    const maxPct = Math.max(100, ...macroRows.map((r) => r.radarActualPct));
    return maxPct > 125 ? 150 : 125;
  }, [macroRows]);

  return (
    <section
      aria-label="Macronutrient distribution vs daily targets"
      className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#135D3B]/10 dark:border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
            Actual vs. Target Distribution ({dateKey})
          </p>
          <h3 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
            Macronutrient Balance
          </h3>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
          <button
            type="button"
            onClick={() => setViewMode('radar')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              viewMode === 'radar'
                ? 'bg-[#135D3B] text-[#E5B84B]'
                : 'text-[#385043] dark:text-slate-300 hover:text-[#135D3B] dark:hover:text-white'
            }`}
          >
            <RadarIcon className="w-3.5 h-3.5" />
            Radar vs Target
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pie')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              viewMode === 'pie'
                ? 'bg-[#135D3B] text-[#E5B84B]'
                : 'text-[#385043] dark:text-slate-300 hover:text-[#135D3B] dark:hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            Pie Split
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Recharts Radar or Dual-Ring Pie Visualization */}
        <div className="lg:col-span-6 min-w-0">
          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'radar' ? (
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={macroRows}>
                  <PolarGrid stroke="rgba(120, 148, 133, 0.35)" />
                  <PolarAngleAxis
                    dataKey="macro"
                    tick={{ fill: '#789485', fontSize: 12, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, radarDomainMax]}
                    tick={{ fill: '#789485', fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Radar
                    name="Daily Target (100%)"
                    dataKey="radarTargetPct"
                    stroke="#D99B26"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    fill="#D99B26"
                    fillOpacity={0.14}
                  />
                  <Radar
                    name="Logged Intake (%)"
                    dataKey="radarActualPct"
                    stroke="#1E7A4C"
                    strokeWidth={2.5}
                    fill="#1E7A4C"
                    fillOpacity={0.42}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </RadarChart>
              ) : (
                <PieChart>
                  {/* Inner Ring: Target Caloric Macro Split */}
                  <Pie
                    data={targetPieData}
                    dataKey="targetKcal"
                    nameKey="macro"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={58}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {targetPieData.map((entry) => (
                      <Cell key={`target-${entry.key}`} fill={entry.color} fillOpacity={0.42} />
                    ))}
                  </Pie>

                  {/* Outer Ring: Logged Caloric Macro Split */}
                  <Pie
                    data={actualPieData}
                    dataKey="actualKcal"
                    nameKey="macro"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={98}
                    paddingAngle={hasLoggedMacros ? 3 : 0}
                    stroke="none"
                  >
                    {actualPieData.map((entry, idx) => (
                      <Cell key={`actual-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium text-[#587264] dark:text-slate-400">
            {viewMode === 'radar' ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#1E7A4C]" />
                  Logged Intake (% of target)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-[#D99B26] bg-[#D99B26]/25" />
                  Target Baseline (100%)
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1E7A4C]" />
                  Outer Ring: Today&apos;s Intake Split
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1E7A4C]/40" />
                  Inner Ring: Target Split
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Structured Macro-by-Macro Breakdown Table (Actual vs Target) */}
        <div className="lg:col-span-6 space-y-3">
          {macroRows.map((row) => {
            const deltaGrams = Math.round((row.targetGrams - row.actualGrams) * 10) / 10;
            const barPct = Math.min(100, row.pctOfTarget);
            return (
              <div
                key={row.key}
                className="rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-display text-base font-extrabold uppercase text-[#112018] dark:text-white">
                      {row.macro}
                    </span>
                  </div>
                  <div className="font-mono text-xs tabular-nums">
                    <strong className="text-[#112018] dark:text-white">{row.actualGrams}g</strong>
                    <span className="text-[#587264] dark:text-slate-400">
                      {' '}
                      / {row.targetGrams}g ({row.pctOfTarget}%)
                    </span>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${barPct}%`, backgroundColor: row.color }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[#587264] dark:text-slate-400 tabular-nums">
                  <span>
                    Energy Share: {hasLoggedMacros ? `${row.actualSharePct}%` : '0%'} vs{' '}
                    {row.targetSharePct}% target
                  </span>
                  <span>
                    {deltaGrams > 0
                      ? `${deltaGrams}g remaining`
                      : deltaGrams === 0
                      ? 'On target'
                      : `+${Math.abs(deltaGrams)}g above target`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
