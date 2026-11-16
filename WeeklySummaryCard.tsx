import { useMemo, useState } from 'react';
import { CalendarRange, Download, FileText } from 'lucide-react';
import type { FoodLogEntry, UserProfile } from '../lib/firebase';
import {
  buildWeeklyReportData,
  generateWeeklySummaryPdfBlob,
  generateWeeklySummaryText,
} from '../lib/weeklyReport';

interface WeeklySummaryCardProps {
  profile: UserProfile;
  dateKey: string;
  foodLogs: FoodLogEntry[];
}

export function WeeklySummaryCard({
  profile,
  dateKey,
  foodLogs,
}: WeeklySummaryCardProps) {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const report = useMemo(
    () => buildWeeklyReportData(foodLogs, dateKey),
    [foodLogs, dateKey]
  );

  const triggerDownload = (blob: Blob, filename: string, label: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    setDownloadStatus(`Downloaded ${label} (${filename})`);
    setTimeout(() => setDownloadStatus(null), 3200);
  };

  const handleDownloadPdf = () => {
    const pdfBlob = generateWeeklySummaryPdfBlob(profile, report);
    triggerDownload(
      pdfBlob,
      `nutrizim-weekly-summary-${report.endDate}.pdf`,
      'Weekly PDF Report'
    );
  };

  const handleDownloadText = () => {
    const textContent = generateWeeklySummaryText(profile, report);
    const textBlob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    triggerDownload(
      textBlob,
      `nutrizim-weekly-summary-${report.endDate}.txt`,
      'Weekly Text Summary'
    );
  };

  return (
    <section
      aria-label="Weekly macronutrient summary and export"
      className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 flex flex-col justify-between space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[#F2DFAA] dark:bg-[#2F2512] text-[#8F6008] dark:text-[#E5B84B] flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              7-Day Window ({report.startDate} → {report.endDate})
            </p>
            <h3 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
              Weekly Report &amp; History Export
            </h3>
          </div>
        </div>

        <span className="rounded-full bg-[#FAF4EA] dark:bg-[#18251E] border border-[#135D3B]/15 dark:border-white/10 px-3 py-1 font-mono text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
          {report.totals.activeDays}/7 active · {report.totals.mealsLogged} meals
        </span>
      </div>

      {/* 7-Day Average Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
        <div className="rounded-xl bg-[#D8EADB] dark:bg-[#162C21] p-3">
          <span className="block text-[10px] font-sans font-semibold uppercase text-[#264635] dark:text-slate-300">
            Avg Intake / Day
          </span>
          <span className="text-lg font-bold text-[#135D3B] dark:text-[#E5B84B]">
            {report.dailyAverages.kcal} kcal
          </span>
        </div>
        <div className="rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] p-3 border border-[#135D3B]/10 dark:border-white/5">
          <span className="block text-[10px] font-sans font-semibold uppercase text-[#587264] dark:text-slate-400">
            Weekly Protein
          </span>
          <span className="text-lg font-bold text-[#112018] dark:text-white">
            {report.totals.protein}g
          </span>
        </div>
        <div className="rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] p-3 border border-[#135D3B]/10 dark:border-white/5">
          <span className="block text-[10px] font-sans font-semibold uppercase text-[#587264] dark:text-slate-400">
            Weekly Carbs
          </span>
          <span className="text-lg font-bold text-[#112018] dark:text-white">
            {report.totals.carbs}g
          </span>
        </div>
        <div className="rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] p-3 border border-[#135D3B]/10 dark:border-white/5">
          <span className="block text-[10px] font-sans font-semibold uppercase text-[#587264] dark:text-slate-400">
            Weekly Fats
          </span>
          <span className="text-lg font-bold text-[#112018] dark:text-white">
            {report.totals.fat}g
          </span>
        </div>
      </div>

      {/* Mini 7-Day Spark Strip */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] tabular-nums">
        {report.days.map((d) => {
          const pct = Math.min(100, Math.round((d.kcal / Math.max(1, profile.targetKcal)) * 100));
          return (
            <div
              key={d.dateKey}
              title={`${d.dateKey}: ${d.kcal} kcal · ${d.entries.length} meal(s)`}
              className="rounded-lg bg-[#FAF4EA] dark:bg-[#18251E] border border-[#135D3B]/10 dark:border-white/5 px-1 py-2 flex flex-col items-center gap-1"
            >
              <span className="text-[#587264] dark:text-slate-400">{d.dateKey.slice(5)}</span>
              <div className="w-2.5 h-10 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex items-end">
                <div
                  className="w-full rounded-full bg-[#135D3B] dark:bg-[#E5B84B]"
                  style={{ height: `${Math.max(d.kcal > 0 ? 12 : 0, pct)}%` }}
                />
              </div>
              <span className="font-bold text-[#112018] dark:text-white">
                {d.kcal > 0 ? d.kcal : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Export Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-full bg-[#135D3B] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] transition-colors"
          >
            <Download className="w-4 h-4 text-[#E5B84B]" />
            Download PDF Report
          </button>

          <button
            type="button"
            onClick={handleDownloadText}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-[#FAF4EA] dark:bg-[#18251E] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26] transition-colors"
          >
            <FileText className="w-4 h-4 text-[#D99B26]" />
            Download Text (.txt)
          </button>
        </div>

        {downloadStatus && (
          <p className="text-xs font-medium text-[#135D3B] dark:text-[#5EE39D]">
            {downloadStatus}
          </p>
        )}
      </div>
    </section>
  );
}
