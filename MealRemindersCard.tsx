import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, BellRing, Check, Clock, Send, Sparkles } from 'lucide-react';
import {
  saveMealReminderSettings,
  type FoodLogEntry,
  type MealReminderSettings,
} from '../lib/firebase';
import {
  buildSmartReminderCopy,
  clearReminderSlotSent,
  DEFAULT_MEAL_REMINDER_CONFIG,
  getLoggedMealSlots,
  getNotificationPermission,
  getSentReminderSlots,
  requestBrowserNotificationPermission,
  type MealReminderConfig,
  type MealSlot,
  type SmartReminderPayload,
} from '../lib/notifications';

interface MealRemindersCardProps {
  uid: string;
  todayKey: string;
  settings: MealReminderSettings | null;
  foodLogs: FoodLogEntry[];
  remainingMacros: { kcal: number; protein: number; carbs: number; fat: number };
  streakDays: number;
  sentVersion: number;
  onTriggerNotification: (
    payload: SmartReminderPayload
  ) => Promise<'browser' | 'blocked' | 'unsupported'>;
}

export function MealRemindersCard({
  uid,
  todayKey,
  settings,
  foodLogs,
  remainingMacros,
  streakDays,
  sentVersion,
  onTriggerNotification,
}: MealRemindersCardProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );
  const [draft, setDraft] = useState<MealReminderConfig>(DEFAULT_MEAL_REMINDER_CONFIG);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setDraft({
        enabled: settings.enabled,
        smartSkipLogged: settings.smartSkipLogged,
        breakfastTime: settings.breakfastTime,
        lunchTime: settings.lunchTime,
        dinnerTime: settings.dinnerTime,
        snackTime: settings.snackTime,
        snackEnabled: settings.snackEnabled,
      });
    } else {
      setDraft(DEFAULT_MEAL_REMINDER_CONFIG);
    }
  }, [settings]);

  const loggedSlots = useMemo(
    () => getLoggedMealSlots(foodLogs, todayKey),
    [foodLogs, todayKey]
  );

  const sentSlots = useMemo(
    () => getSentReminderSlots(uid, todayKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, todayKey, sentVersion]
  );

  const persistConfig = async (next: MealReminderConfig, notice: string) => {
    setDraft(next);
    setSaving(true);
    try {
      await saveMealReminderSettings(uid, next);
      setStatusMessage(notice);
      setTimeout(() => setStatusMessage((curr) => (curr === notice ? null : curr)), 3200);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaster = async () => {
    const nextEnabled = !draft.enabled;
    let nextPermission = permission;

    if (nextEnabled && permission === 'default') {
      nextPermission = await requestBrowserNotificationPermission();
      setPermission(nextPermission);
    }

    const notice = nextEnabled
      ? nextPermission === 'granted'
        ? 'Smart browser meal reminders enabled.'
        : 'Smart meal reminders enabled (in-app alert mode).'
      : 'Meal reminders paused.';

    await persistConfig({ ...draft, enabled: nextEnabled }, notice);
  };

  const handleEnableBrowserPermission = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      await persistConfig(
        { ...draft, enabled: true },
        'Browser notifications granted and smart reminders activated.'
      );
    } else if (result === 'denied') {
      setStatusMessage('Notifications blocked in browser settings — in-app meal alerts remain active.');
    } else {
      setStatusMessage('Browser notifications unavailable — in-app meal alerts remain active.');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    // Clear sent flags for slots whose time might have been pushed forward for today
    clearReminderSlotSent(uid, todayKey);
    await persistConfig(draft, 'Meal reminder times saved to your profile.');
  };

  const handleSendTest = async () => {
    let currPerm = permission;
    if (currPerm === 'default') {
      currPerm = await requestBrowserNotificationPermission();
      setPermission(currPerm);
    }

    const todayCount = foodLogs.filter((l) => l.dateKey === todayKey).length;
    const payload = buildSmartReminderCopy('Test', remainingMacros, streakDays, todayCount);
    const channel = await onTriggerNotification(payload);
    setStatusMessage(
      channel === 'browser'
        ? 'Browser notification dispatched with your remaining macros.'
        : 'Smart reminder preview shown in-app (enable browser permission for OS alerts).'
    );
  };

  const mealRows: Array<{
    slot: MealSlot;
    timeKey: 'breakfastTime' | 'lunchTime' | 'snackTime' | 'dinnerTime';
    optional?: boolean;
  }> = [
    { slot: 'Breakfast', timeKey: 'breakfastTime' },
    { slot: 'Lunch', timeKey: 'lunchTime' },
    { slot: 'Snack', timeKey: 'snackTime', optional: true },
    { slot: 'Dinner', timeKey: 'dinnerTime' },
  ];

  return (
    <section
      aria-label="Smart meal push notification reminders"
      className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-5"
    >
      {/* Header & Permission Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#135D3B]/10 dark:border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 border-2 ${
              draft.enabled
                ? 'bg-[#135D3B] border-[#E5B84B] text-[#E5B84B]'
                : 'bg-[#F2E9D8] dark:bg-[#18251E] border-[#135D3B]/20 dark:border-white/10 text-[#587264] dark:text-slate-400'
            }`}
          >
            {draft.enabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              Consistent Logging Push Alerts
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
              Smart Meal Reminders
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 font-mono text-xs font-semibold ${
              permission === 'granted'
                ? 'bg-[#D8EADB] dark:bg-[#162C21] text-[#135D3B] dark:text-[#5EE39D]'
                : permission === 'denied'
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#385043] dark:text-slate-300'
            }`}
          >
            {permission === 'granted'
              ? 'Browser Push: Granted'
              : permission === 'denied'
              ? 'Browser Push: Blocked (In-App Active)'
              : permission === 'unsupported'
              ? 'Browser Push: Unavailable (In-App Active)'
              : 'Browser Push: Not Requested'}
          </span>

          {permission === 'default' && (
            <button
              type="button"
              onClick={handleEnableBrowserPermission}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full bg-[#D99B26] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Allow Browser Alerts
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleMaster}
            disabled={saving}
            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              draft.enabled
                ? 'bg-[#135D3B] text-[#E5B84B] hover:bg-[#0E482D]'
                : 'border border-[#135D3B]/20 dark:border-white/15 bg-[#FAF4EA] dark:bg-[#18251E] text-[#135D3B] dark:text-white hover:border-[#D99B26]'
            }`}
          >
            {draft.enabled ? 'Reminders On' : 'Turn Reminders On'}
          </button>
        </div>
      </div>

      {/* Smart Behaviour Toggle + Schedule Form */}
      <form onSubmit={handleSaveSchedule} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FAF4EA] dark:bg-[#18251E] border border-[#135D3B]/10 dark:border-white/5 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D99B26] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#112018] dark:text-white">
                Smart Skip Already-Logged Meals
              </p>
              <p className="text-[11px] text-[#587264] dark:text-slate-400">
                Automatically suppresses a meal reminder if you already logged food for that meal
                today, and includes remaining kcal/protein in alerts.
              </p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft.smartSkipLogged}
              onChange={(e) =>
                persistConfig(
                  { ...draft, smartSkipLogged: e.target.checked },
                  e.target.checked
                    ? 'Smart skip enabled for already-logged meals.'
                    : 'Smart skip disabled — all scheduled reminders will fire.'
                )
              }
              className="h-4 w-4 rounded border-[#135D3B]/30 accent-[#135D3B]"
            />
            <span className="text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B]">
              {draft.smartSkipLogged ? 'Smart Skip Active' : 'Remind Always'}
            </span>
          </label>
        </div>

        {/* Designated Meal Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {mealRows.map((row) => {
            const isSlotActive = !row.optional || draft.snackEnabled;
            const isLogged = loggedSlots.has(row.slot);
            const isSent = sentSlots.has(row.slot);

            return (
              <div
                key={row.slot}
                className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                  isSlotActive
                    ? 'border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E]'
                    : 'border-dashed border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA]/40 dark:bg-[#18251E]/50 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
                    {row.slot}
                  </span>

                  {row.optional ? (
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#385043] dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.snackEnabled}
                        onChange={(e) =>
                          setDraft((prev) => ({ ...prev, snackEnabled: e.target.checked }))
                        }
                        className="h-3.5 w-3.5 accent-[#135D3B]"
                      />
                      Active
                    </label>
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-[#D99B26]" />
                  )}
                </div>

                <input
                  type="time"
                  value={draft[row.timeKey]}
                  disabled={!isSlotActive}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      [row.timeKey]: e.target.value || prev[row.timeKey],
                    }))
                  }
                  aria-label={`${row.slot} reminder time`}
                  className="w-full min-h-[38px] rounded-lg border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] px-2.5 font-mono text-sm text-[#112018] dark:text-white disabled:opacity-50"
                />

                <div className="flex items-center justify-between text-[11px]">
                  {isLogged ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#135D3B] dark:text-[#5EE39D]">
                      <Check className="w-3 h-3" />
                      Logged Today
                    </span>
                  ) : isSent ? (
                    <span className="font-mono font-semibold text-[#B7791F] dark:text-[#E5B84B]">
                      Sent Today
                    </span>
                  ) : !isSlotActive ? (
                    <span className="text-[#587264] dark:text-slate-400">Disabled</span>
                  ) : draft.enabled ? (
                    <span className="font-mono text-[#587264] dark:text-slate-400">
                      Scheduled {draft[row.timeKey]}
                    </span>
                  ) : (
                    <span className="text-[#587264] dark:text-slate-400">Paused</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save + Instant Test Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#135D3B] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-60 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-[#E5B84B]" />
              {saving ? 'Saving...' : 'Save Meal Times'}
            </button>

            <button
              type="button"
              onClick={handleSendTest}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-[#FAF4EA] dark:bg-[#18251E] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-[#D99B26]" />
              Send Smart Test Alert
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs font-medium text-[#135D3B] dark:text-[#5EE39D]">
              {statusMessage}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
