export interface StreakDayStatus {
  dateKey: string;
  label: string;
  isToday: boolean;
  checkedIn: boolean;
  mealCount: number;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  todayMealCount: number;
  lastCheckInDate: string | null;
  last7Days: StreakDayStatus[];
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getShortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).slice(0, 3);
}

export function computeMealStreak(
  foodLogs: Array<{ dateKey: string }>,
  dailyCheckIns: Array<{ dateKey: string }>,
  todayKey: string = getLocalDateKey(),
  storedLongestStreak: number = 0
): StreakSummary {
  const mealCountsByDay = new Map<string, number>();
  const activeDates = new Set<string>();

  for (const log of foodLogs) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(log.dateKey)) continue;
    activeDates.add(log.dateKey);
    mealCountsByDay.set(log.dateKey, (mealCountsByDay.get(log.dateKey) ?? 0) + 1);
  }

  for (const checkIn of dailyCheckIns) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn.dateKey)) continue;
    activeDates.add(checkIn.dateKey);
  }

  const checkedInToday = activeDates.has(todayKey);
  const todayMealCount = mealCountsByDay.get(todayKey) ?? 0;

  let currentStreak = 0;
  const startCursor = checkedInToday ? todayKey : shiftDateKey(todayKey, -1);
  if (activeDates.has(startCursor)) {
    let cursor = startCursor;
    while (activeDates.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  const sortedDates = Array.from(activeDates).sort();
  let maxHistoricalRun = 0;
  let currentRun = 0;
  let prevDate: string | null = null;

  for (const d of sortedDates) {
    if (prevDate && shiftDateKey(prevDate, 1) === d) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    if (currentRun > maxHistoricalRun) {
      maxHistoricalRun = currentRun;
    }
    prevDate = d;
  }

  const longestStreak = Math.max(maxHistoricalRun, currentStreak, storedLongestStreak || 0);
  const lastCheckInDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  const last7Days: StreakDayStatus[] = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const key = shiftDateKey(todayKey, offset);
    last7Days.push({
      dateKey: key,
      label: getShortDayLabel(key),
      isToday: key === todayKey,
      checkedIn: activeDates.has(key),
      mealCount: mealCountsByDay.get(key) ?? 0,
    });
  }

  return {
    currentStreak,
    longestStreak,
    checkedInToday,
    todayMealCount,
    lastCheckInDate,
    last7Days,
  };
}
