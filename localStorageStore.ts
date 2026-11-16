import type {
  AppStats,
  CoachMessageEntry,
  DailyCheckInEntry,
  FoodLogEntry,
  HydrationLogEntry,
  MealReminderSettings,
  UserProfile,
  WeightLogEntry,
} from './firebase';

export const LOCAL_GUEST_UID = 'local-guest';

const STORAGE_PREFIX = 'nutrizim_local_v1_';
const memoryFallback = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function notifyChannel(channel: string): void {
  const subs = listeners.get(channel);
  if (!subs) return;
  for (const fn of subs) {
    try {
      fn();
    } catch {
      // Isolate listener errors
    }
  }
}

function subscribeChannel(channel: string, fn: () => void): () => void {
  let subs = listeners.get(channel);
  if (!subs) {
    subs = new Set();
    listeners.set(channel, subs);
  }
  subs.add(fn);
  fn();
  return () => {
    subs?.delete(fn);
  };
}

function readStorage<T>(key: string, fallback: T): T {
  const fullKey = `${STORAGE_PREFIX}${key}`;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(fullKey);
      if (raw) return JSON.parse(raw) as T;
    }
  } catch {
    // Fallback to memory store
  }
  const mem = memoryFallback.get(fullKey);
  if (mem) {
    try {
      return JSON.parse(mem) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function writeStorage<T>(key: string, channel: string, value: T): void {
  const fullKey = `${STORAGE_PREFIX}${key}`;
  const serialized = JSON.stringify(value);
  memoryFallback.set(fullKey, serialized);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(fullKey, serialized);
    }
  } catch {
    // Ignore quota/sandbox restrictions; memoryFallback keeps session alive
  }
  notifyChannel(channel);
}

export function isLocalUid(uid: string | undefined | null): boolean {
  return uid === LOCAL_GUEST_UID;
}

export function getOrCreateLocalProfile(): UserProfile {
  const existing = readStorage<UserProfile | null>('profile', null);
  if (existing && existing.uid === LOCAL_GUEST_UID) {
    return existing;
  }
  const initial: UserProfile = {
    uid: LOCAL_GUEST_UID,
    email: 'local@nutrizim.app',
    displayName: 'Local NutriZim User',
    userNumber: 1,
    tier: 'alpha_free',
    paymentMethod: 'alpha',
    targetKcal: 2200,
    targetProtein: 150,
    targetCarbs: 235,
    targetFat: 70,
    targetFibre: 32,
  };
  writeStorage('profile', 'profile', initial);
  return initial;
}

export function getLocalAppStats(): AppStats {
  const profile = readStorage<UserProfile | null>('profile', null);
  return {
    totalRegisteredUsers: profile ? 1 : 0,
    alphaCap: 10,
  };
}

export function subscribeLocalAppStats(callback: (stats: AppStats) => void): () => void {
  return subscribeChannel('profile', () => callback(getLocalAppStats()));
}

export function subscribeLocalUserProfile(callback: (profile: UserProfile | null) => void): () => void {
  return subscribeChannel('profile', () => callback(getOrCreateLocalProfile()));
}

export function updateLocalUserTargets(targets: {
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFibre: number;
}): void {
  const current = getOrCreateLocalProfile();
  writeStorage('profile', 'profile', {
    ...current,
    targetKcal: Math.max(800, Math.min(8000, Math.round(targets.targetKcal))),
    targetProtein: Math.max(20, Math.min(600, Math.round(targets.targetProtein))),
    targetCarbs: Math.max(0, Math.min(1200, Math.round(targets.targetCarbs))),
    targetFat: Math.max(10, Math.min(400, Math.round(targets.targetFat))),
    targetFibre: Math.max(0, Math.min(150, Math.round(targets.targetFibre))),
  });
}

export function activateLocalSubscription(
  method: 'stripe' | 'ecocash',
  ecocashRef?: string
): void {
  const current = getOrCreateLocalProfile();
  writeStorage('profile', 'profile', {
    ...current,
    tier: 'premium_paid',
    paymentMethod: method,
    ...(ecocashRef ? { ecocashRef: ecocashRef.slice(0, 80) } : {}),
  });
}

export function syncLocalUserStreakSummary(
  currentStreak: number,
  longestStreak: number,
  lastCheckInDate: string
): void {
  const current = getOrCreateLocalProfile();
  writeStorage('profile', 'profile', {
    ...current,
    currentStreak: Math.max(0, Math.min(10000, Math.round(currentStreak))),
    longestStreak: Math.max(0, Math.min(10000, Math.round(longestStreak))),
    lastCheckInDate,
  });
}

export function subscribeLocalFoodLogs(callback: (logs: FoodLogEntry[]) => void): () => void {
  return subscribeChannel('food_logs', () => {
    const items = readStorage<FoodLogEntry[]>('food_logs', []);
    callback(items);
  });
}

export function addLocalFoodLogsBatch(
  entries: Array<Omit<FoodLogEntry, 'id' | 'userId' | 'createdAt'>>
): void {
  const current = readStorage<FoodLogEntry[]>('food_logs', []);
  const now = Date.now();
  const created: FoodLogEntry[] = entries.map((entry, idx) => ({
    id: `local_food_${now}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    userId: LOCAL_GUEST_UID,
    dateKey: entry.dateKey,
    mealGroup: entry.mealGroup,
    foodId: Math.max(0, Math.round(entry.foodId)),
    foodName: entry.foodName.slice(0, 140),
    unit: entry.unit === 'ml' ? 'ml' : 'g',
    portionAmount: Math.max(1, Math.min(10000, Math.round(entry.portionAmount))),
    kcalPer100: Math.max(0, Math.min(1200, Number(entry.kcalPer100))),
    proteinPer100: Math.max(0, Math.min(120, Number(entry.proteinPer100))),
    carbsPer100: Math.max(0, Math.min(120, Number(entry.carbsPer100))),
    fatPer100: Math.max(0, Math.min(120, Number(entry.fatPer100))),
    fibrePer100: Math.max(0, Math.min(120, Number(entry.fibrePer100))),
    vitamins: (entry.vitamins || 'Balanced').slice(0, 120),
    source: entry.source,
  }));
  writeStorage('food_logs', 'food_logs', [...created, ...current].slice(0, 500));
}

export function updateLocalFoodLogPortion(
  logId: string,
  portionAmount: number,
  mealGroup: FoodLogEntry['mealGroup']
): void {
  const current = readStorage<FoodLogEntry[]>('food_logs', []);
  const next = current.map((item) =>
    item.id === logId
      ? {
          ...item,
          portionAmount: Math.max(1, Math.min(10000, Math.round(portionAmount))),
          mealGroup,
        }
      : item
  );
  writeStorage('food_logs', 'food_logs', next);
}

export function deleteLocalFoodLog(logId: string): void {
  const current = readStorage<FoodLogEntry[]>('food_logs', []);
  writeStorage(
    'food_logs',
    'food_logs',
    current.filter((item) => item.id !== logId)
  );
}

export function subscribeLocalWeightLogs(callback: (logs: WeightLogEntry[]) => void): () => void {
  return subscribeChannel('weight_logs', () => {
    const items = readStorage<WeightLogEntry[]>('weight_logs', []);
    callback([...items].sort((a, b) => a.dateKey.localeCompare(b.dateKey)));
  });
}

export function saveLocalWeightLog(
  dateKey: string,
  weightKg: number,
  note: string,
  existingId?: string
): void {
  const current = readStorage<WeightLogEntry[]>('weight_logs', []);
  const docId = existingId || dateKey;
  const cleanWeight = Math.max(20, Math.min(400, Math.round(weightKg * 10) / 10));
  const cleanNote = note.slice(0, 240);
  const idx = current.findIndex((w) => w.id === docId || w.dateKey === dateKey);
  if (idx >= 0) {
    current[idx] = { ...current[idx], weightKg: cleanWeight, note: cleanNote };
  } else {
    current.push({
      id: docId,
      userId: LOCAL_GUEST_UID,
      dateKey,
      weightKg: cleanWeight,
      note: cleanNote,
    });
  }
  writeStorage('weight_logs', 'weight_logs', current);
}

export function subscribeLocalCoachMessages(
  callback: (msgs: CoachMessageEntry[]) => void
): () => void {
  return subscribeChannel('coach_messages', () => {
    callback(readStorage<CoachMessageEntry[]>('coach_messages', []));
  });
}

export function saveLocalCoachMessage(role: 'user' | 'assistant', content: string): void {
  const current = readStorage<CoachMessageEntry[]>('coach_messages', []);
  current.push({
    id: `local_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: LOCAL_GUEST_UID,
    role,
    content: content.slice(0, 4000),
  });
  writeStorage('coach_messages', 'coach_messages', current.slice(-60));
}

export function subscribeLocalDailyCheckIns(
  callback: (checkIns: DailyCheckInEntry[]) => void
): () => void {
  return subscribeChannel('daily_checkins', () => {
    const items = readStorage<DailyCheckInEntry[]>('daily_checkins', []);
    callback([...items].sort((a, b) => b.dateKey.localeCompare(a.dateKey)));
  });
}

export function saveLocalDailyCheckIn(dateKey: string, source: 'meal' | 'manual' = 'manual'): void {
  const current = readStorage<DailyCheckInEntry[]>('daily_checkins', []);
  if (current.some((c) => c.dateKey === dateKey)) return;
  current.push({
    id: dateKey,
    userId: LOCAL_GUEST_UID,
    dateKey,
    source,
  });
  writeStorage('daily_checkins', 'daily_checkins', current);
}

export function subscribeLocalHydrationLog(
  dateKey: string,
  callback: (entry: HydrationLogEntry | null) => void
): () => void {
  return subscribeChannel('hydration_logs', () => {
    const all = readStorage<Record<string, HydrationLogEntry>>('hydration_logs', {});
    callback(all[dateKey] ?? null);
  });
}

export function saveLocalHydrationLog(
  dateKey: string,
  glasses: number,
  goalGlasses: number,
  glassMl = 250
): void {
  const all = readStorage<Record<string, HydrationLogEntry>>('hydration_logs', {});
  all[dateKey] = {
    id: dateKey,
    userId: LOCAL_GUEST_UID,
    dateKey,
    glasses: Math.max(0, Math.min(40, Math.round(glasses))),
    goalGlasses: Math.max(1, Math.min(30, Math.round(goalGlasses))),
    glassMl: Math.max(50, Math.min(1000, Math.round(glassMl))),
  };
  writeStorage('hydration_logs', 'hydration_logs', all);
}

export function subscribeLocalMealReminderSettings(
  callback: (settings: MealReminderSettings | null) => void
): () => void {
  return subscribeChannel('reminder_settings', () => {
    callback(readStorage<MealReminderSettings | null>('reminder_settings', null));
  });
}

export function saveLocalMealReminderSettings(settings: {
  enabled: boolean;
  smartSkipLogged: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  snackTime: string;
  snackEnabled: boolean;
}): void {
  writeStorage<MealReminderSettings>('reminder_settings', 'reminder_settings', {
    id: 'meal_reminders',
    userId: LOCAL_GUEST_UID,
    enabled: Boolean(settings.enabled),
    smartSkipLogged: Boolean(settings.smartSkipLogged),
    breakfastTime: settings.breakfastTime,
    lunchTime: settings.lunchTime,
    dinnerTime: settings.dinnerTime,
    snackTime: settings.snackTime,
    snackEnabled: Boolean(settings.snackEnabled),
  });
}
