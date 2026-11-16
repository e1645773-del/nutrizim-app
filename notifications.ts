import type { FoodLogEntry } from './firebase';

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealReminderConfig {
  enabled: boolean;
  smartSkipLogged: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  snackTime: string;
  snackEnabled: boolean;
}

export const DEFAULT_MEAL_REMINDER_CONFIG: MealReminderConfig = {
  enabled: false,
  smartSkipLogged: true,
  breakfastTime: '08:00',
  lunchTime: '13:00',
  dinnerTime: '19:00',
  snackTime: '16:00',
  snackEnabled: false,
};

export interface SmartReminderPayload {
  slot: MealSlot | 'Test';
  title: string;
  body: string;
  tag: string;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((hhmm || '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function getLoggedMealSlots(foodLogs: FoodLogEntry[], dateKey: string): Set<MealSlot> {
  const slots = new Set<MealSlot>();
  for (const log of foodLogs) {
    if (log.dateKey === dateKey) {
      slots.add(log.mealGroup);
    }
  }
  return slots;
}

function getStorageKey(uid: string, dateKey: string): string {
  return `nutrizim_notified_slots_${uid}_${dateKey}`;
}

export function getSentReminderSlots(uid: string, dateKey: string): Set<MealSlot> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(getStorageKey(uid, dateKey));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((s): s is MealSlot => typeof s === 'string'));
  } catch {
    return new Set();
  }
}

export function markReminderSlotSent(uid: string, dateKey: string, slot: MealSlot): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getSentReminderSlots(uid, dateKey);
    current.add(slot);
    window.localStorage.setItem(getStorageKey(uid, dateKey), JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage quota errors in restricted browsing contexts
  }
}

export function clearReminderSlotSent(uid: string, dateKey: string, slot?: MealSlot): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (!slot) {
      window.localStorage.removeItem(getStorageKey(uid, dateKey));
      return;
    }
    const current = getSentReminderSlots(uid, dateKey);
    current.delete(slot);
    window.localStorage.setItem(getStorageKey(uid, dateKey), JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage errors
  }
}

export function evaluateDueMealReminders(params: {
  uid: string;
  now: Date;
  todayKey: string;
  settings: MealReminderConfig;
  foodLogs: FoodLogEntry[];
  alreadyNotifiedSlots?: Set<MealSlot>;
  graceWindowMinutes?: number;
}): MealSlot[] {
  const {
    uid,
    now,
    todayKey,
    settings,
    foodLogs,
    alreadyNotifiedSlots = getSentReminderSlots(uid, todayKey),
    graceWindowMinutes = 45,
  } = params;

  if (!settings.enabled) return [];

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const loggedSlots = getLoggedMealSlots(foodLogs, todayKey);

  const schedule: Array<{ slot: MealSlot; time: string; active: boolean }> = [
    { slot: 'Breakfast', time: settings.breakfastTime, active: true },
    { slot: 'Lunch', time: settings.lunchTime, active: true },
    { slot: 'Snack', time: settings.snackTime, active: settings.snackEnabled },
    { slot: 'Dinner', time: settings.dinnerTime, active: true },
  ];

  const due: Array<{ slot: MealSlot; targetMinutes: number }> = [];

  for (const item of schedule) {
    if (!item.active) continue;
    if (alreadyNotifiedSlots.has(item.slot)) continue;
    if (settings.smartSkipLogged && loggedSlots.has(item.slot)) continue;

    const targetMinutes = parseTimeToMinutes(item.time);
    if (targetMinutes === null) continue;

    if (nowMinutes >= targetMinutes && nowMinutes <= targetMinutes + graceWindowMinutes) {
      due.push({ slot: item.slot, targetMinutes });
    }
  }

  due.sort((a, b) => a.targetMinutes - b.targetMinutes);
  return due.map((d) => d.slot);
}

export function buildSmartReminderCopy(
  slot: MealSlot | 'Test',
  remaining: { kcal: number; protein: number; carbs: number; fat: number },
  streakDays: number,
  todayMealCount: number
): SmartReminderPayload {
  const kcalLeft = Math.max(0, Math.round(remaining.kcal));
  const proteinLeft = Math.max(0, Math.round(remaining.protein));
  const streakNote =
    streakDays > 0
      ? ` Keep your ${streakDays}d streak alive!`
      : ' Start a daily logging streak today!';

  if (slot === 'Breakfast') {
    return {
      slot,
      title: 'NutriZim · Breakfast Check-In',
      body:
        todayMealCount === 0
          ? `Morning fuel check: log porridge, eggs, or mahewu (${kcalLeft.toLocaleString()} kcal & ${proteinLeft}g protein left today).${streakNote}`
          : `Breakfast reminder: ${kcalLeft.toLocaleString()} kcal & ${proteinLeft}g protein remaining today. Tap to snap or speak your meal.`,
      tag: `nutrizim-meal-breakfast`,
    };
  }

  if (slot === 'Lunch') {
    return {
      slot,
      title: 'NutriZim · Lunchtime Reminder',
      body: `Time to log Lunch! You have ${kcalLeft.toLocaleString()} kcal and ${proteinLeft}g protein remaining today.${streakNote}`,
      tag: `nutrizim-meal-lunch`,
    };
  }

  if (slot === 'Snack') {
    return {
      slot,
      title: 'NutriZim · Afternoon Snack Check-In',
      body: `Quick hydration & snack check: ${proteinLeft}g protein & ${kcalLeft.toLocaleString()} kcal left today. Try roasted nuts, biltong, or mazhanje.`,
      tag: `nutrizim-meal-snack`,
    };
  }

  if (slot === 'Dinner') {
    return {
      slot,
      title: 'NutriZim · Dinner & Target Wrap-Up',
      body: `Dinner check-in: ${kcalLeft.toLocaleString()} kcal & ${proteinLeft}g protein remaining to hit today's target. Open NutriZim Suggestions for macro-matched dishes!`,
      tag: `nutrizim-meal-dinner`,
    };
  }

  return {
    slot: 'Test',
    title: 'NutriZim · Smart Meal Reminder Active',
    body: `Live preview: ${kcalLeft.toLocaleString()} kcal & ${proteinLeft}g protein remaining today.${streakNote}`,
    tag: `nutrizim-meal-test-${Date.now()}`,
  };
}

export async function dispatchBrowserNotification(
  payload: SmartReminderPayload,
  onSelect?: () => void
): Promise<'browser' | 'blocked' | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission !== 'granted') return 'blocked';

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // ignore focus errors inside embedded contexts
      }
      notification.close();
      onSelect?.();
    };
    return 'browser';
  } catch {
    // Fallback for environments requiring ServiceWorkerRegistration.showNotification
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(payload.title, {
            body: payload.body,
            tag: payload.tag,
          });
          return 'browser';
        }
      }
    } catch {
      // ignore fallback errors
    }
    return 'blocked';
  }
}
