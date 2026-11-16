import { scaleNutrition } from '../data/zimbabweFoodDb';
import type { FoodLogEntry, UserProfile } from './firebase';
import { shiftDateKey } from './streak';

export interface WeeklyDaySummary {
  dateKey: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  entries: Array<{
    mealGroup: FoodLogEntry['mealGroup'];
    foodName: string;
    portionAmount: number;
    unit: 'g' | 'ml';
    kcalPer100: number;
    scaledKcal: number;
    scaledProtein: number;
    scaledCarbs: number;
    scaledFat: number;
    source: FoodLogEntry['source'];
  }>;
}

export interface WeeklyReportData {
  startDate: string;
  endDate: string;
  days: WeeklyDaySummary[];
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
    mealsLogged: number;
    activeDays: number;
  };
  dailyAverages: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
}

export function buildWeeklyReportData(
  foodLogs: FoodLogEntry[],
  endDateKey: string
): WeeklyReportData {
  const dateKeys: string[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    dateKeys.push(shiftDateKey(endDateKey, -offset));
  }

  const byDate = new Map<string, WeeklyDaySummary>();
  for (const dk of dateKeys) {
    byDate.set(dk, {
      dateKey: dk,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fibre: 0,
      entries: [],
    });
  }

  for (const log of foodLogs) {
    const day = byDate.get(log.dateKey);
    if (!day) continue;
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
    day.kcal += s.kcal;
    day.protein = Math.round((day.protein + s.protein) * 10) / 10;
    day.carbs = Math.round((day.carbs + s.carbs) * 10) / 10;
    day.fat = Math.round((day.fat + s.fat) * 10) / 10;
    day.fibre = Math.round((day.fibre + s.fibre) * 10) / 10;
    day.entries.push({
      mealGroup: log.mealGroup,
      foodName: log.foodName,
      portionAmount: log.portionAmount,
      unit: log.unit,
      kcalPer100: log.kcalPer100,
      scaledKcal: s.kcal,
      scaledProtein: s.protein,
      scaledCarbs: s.carbs,
      scaledFat: s.fat,
      source: log.source,
    });
  }

  const days = dateKeys.map((dk) => byDate.get(dk)!);
  const activeDays = days.filter((d) => d.entries.length > 0).length;
  const mealsLogged = days.reduce((sum, d) => sum + d.entries.length, 0);

  const totals = {
    kcal: days.reduce((sum, d) => sum + d.kcal, 0),
    protein: Math.round(days.reduce((sum, d) => sum + d.protein, 0) * 10) / 10,
    carbs: Math.round(days.reduce((sum, d) => sum + d.carbs, 0) * 10) / 10,
    fat: Math.round(days.reduce((sum, d) => sum + d.fat, 0) * 10) / 10,
    fibre: Math.round(days.reduce((sum, d) => sum + d.fibre, 0) * 10) / 10,
    mealsLogged,
    activeDays,
  };

  const avgDivisor = Math.max(1, activeDays || 7);
  const dailyAverages = {
    kcal: Math.round(totals.kcal / avgDivisor),
    protein: Math.round((totals.protein / avgDivisor) * 10) / 10,
    carbs: Math.round((totals.carbs / avgDivisor) * 10) / 10,
    fat: Math.round((totals.fat / avgDivisor) * 10) / 10,
    fibre: Math.round((totals.fibre / avgDivisor) * 10) / 10,
  };

  return {
    startDate: dateKeys[0],
    endDate: dateKeys[dateKeys.length - 1],
    days,
    totals,
    dailyAverages,
  };
}

function buildReportLines(
  profile: UserProfile,
  report: WeeklyReportData
): Array<{ text: string; bold?: boolean }> {
  const lines: Array<{ text: string; bold?: boolean }> = [
    { text: 'NUTRIZIM WEEKLY NUTRITION & FOOD LOG REPORT', bold: true },
    { text: `Member: ${profile.displayName} (${profile.email})` },
    { text: `Period: ${report.startDate} to ${report.endDate}` },
    {
      text: `Daily Targets: ${profile.targetKcal} kcal | ${profile.targetProtein}g P | ${profile.targetCarbs}g C | ${profile.targetFat}g F | ${profile.targetFibre}g Fibre`,
    },
    { text: '' },
    { text: '7-DAY MACRONUTRIENT SUMMARY', bold: true },
    {
      text: `Active Logging Days: ${report.totals.activeDays}/7 | Total Meals Logged: ${report.totals.mealsLogged}`,
    },
    {
      text: `7-Day Total: ${report.totals.kcal} kcal | ${report.totals.protein}g Protein | ${report.totals.carbs}g Carbs | ${report.totals.fat}g Fat | ${report.totals.fibre}g Fibre`,
    },
    {
      text: `Active-Day Average: ${report.dailyAverages.kcal} kcal/day | ${report.dailyAverages.protein}g P | ${report.dailyAverages.carbs}g C | ${report.dailyAverages.fat}g F | ${report.dailyAverages.fibre}g Fib`,
    },
    { text: '' },
    { text: 'DAILY BREAKDOWN & ITEMIZED FOOD LOG HISTORY', bold: true },
  ];

  for (const day of report.days) {
    lines.push({
      text: `${day.dateKey} — ${day.kcal} kcal (${day.protein}g P / ${day.carbs}g C / ${day.fat}g F / ${day.fibre}g Fib) [${day.entries.length} item(s)]`,
      bold: true,
    });
    if (day.entries.length === 0) {
      lines.push({ text: '   No food entries logged on this date.' });
    } else {
      for (const e of day.entries) {
        lines.push({
          text: `   - [${e.mealGroup}] ${e.foodName} (${e.portionAmount}${e.unit}) = ${e.scaledKcal} kcal (${e.scaledProtein}g P, ${e.scaledCarbs}g C, ${e.scaledFat}g F) [100${e.unit}=${e.kcalPer100}kcal] via ${e.source}`,
        });
      }
    }
    lines.push({ text: '' });
  }

  return lines;
}

export function generateWeeklySummaryText(
  profile: UserProfile,
  report: WeeklyReportData
): string {
  return buildReportLines(profile, report)
    .map((l) => l.text)
    .join('\n');
}

function escapePdfString(input: string): string {
  // Replace non-ASCII punctuation cleanly for standard Helvetica WinAnsi PDF encoding
  const ascii = input
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapTextLine(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const indentMatch = text.match(/^(\s+)/);
  const indent = indentMatch ? `${indentMatch[1]}  ` : '';
  const words = text.trim().split(/\s+/);
  const wrapped: string[] = [];
  let current = indentMatch ? indentMatch[1] : '';

  for (const word of words) {
    if ((current + word).length > maxChars && current.trim().length > 0) {
      wrapped.push(current);
      current = `${indent}${word} `;
    } else {
      current += `${word} `;
    }
  }
  if (current.trim().length > 0 || wrapped.length === 0) {
    wrapped.push(current.trimEnd());
  }
  return wrapped;
}

export function generateWeeklySummaryPdfBlob(
  profile: UserProfile,
  report: WeeklyReportData
): Blob {
  const rawLines = buildReportLines(profile, report);
  const formattedLines: Array<{ text: string; bold: boolean }> = [];
  for (const item of rawLines) {
    const wrapped = wrapTextLine(item.text, 88);
    for (const part of wrapped) {
      formattedLines.push({ text: part, bold: Boolean(item.bold) });
    }
  }

  const pageHeight = 792;
  const pageWidth = 612;
  const marginLeft = 44;
  const startY = 744;
  const lineHeight = 14;
  const linesPerPage = 48;

  const pages: Array<Array<{ text: string; bold: boolean }>> = [];
  for (let i = 0; i < formattedLines.length; i += linesPerPage) {
    pages.push(formattedLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) {
    pages.push([{ text: 'No food log data available.', bold: false }]);
  }

  // Build valid PDF 1.4 objects
  // 1: Catalog, 2: Pages, 3: Font Regular, 4: Font Bold, followed by pairs (PageObj, ContentObj)
  const objects: string[] = [];
  const totalPages = pages.length;
  const pageObjIds: number[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageObjId = 5 + p * 2;
    pageObjIds.push(pageObjId);
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  for (let p = 0; p < totalPages; p++) {
    const pageObjId = 5 + p * 2;
    const contentObjId = pageObjId + 1;
    const pageLines = pages[p];

    const streamOps: string[] = ['BT'];
    let y = startY;
    for (const line of pageLines) {
      const fontRef = line.bold ? '/F2 10.5 Tf' : '/F1 9.5 Tf';
      const escaped = escapePdfString(line.text);
      streamOps.push(`${fontRef} 1 0 0 1 ${marginLeft} ${y} Tm (${escaped}) Tj`);
      y -= lineHeight;
    }
    streamOps.push(`/F1 8.5 Tf 1 0 0 1 ${marginLeft} 28 Tm (Page ${p + 1} of ${totalPages} - NutriZim Standardized 100g/100ml Ledger) Tj`);
    streamOps.push('ET');
    const streamBody = streamOps.join('\n');

    objects[pageObjId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`;
    objects[contentObjId] = `<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream`;
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
