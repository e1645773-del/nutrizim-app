import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, MicOff, Send, SlidersHorizontal } from 'lucide-react';
import { scaleNutrition } from '../data/zimbabweFoodDb';
import {
  addFoodLogsBatch,
  saveCoachMessage,
  updateUserTargets,
  type CoachMessageEntry,
  type FoodLogEntry,
  type UserProfile,
} from '../lib/firebase';
import {
  SPOKEN_LANGUAGES,
  type SpokenLanguageKey,
  useSpeechRecognition,
} from '../lib/speechRecognition';
import { localParseMealDescription } from '../lib/localMealFallback';
import type { DetectedFoodItem } from './ScannerPanel';

interface CoachPanelProps {
  profile: UserProfile;
  dateKey: string;
  totals: { kcal: number; protein: number; carbs: number; fat: number; fibre: number };
  latestWeightKg: number | null;
  messages: CoachMessageEntry[];
}

interface PendingCoachAction {
  items: DetectedFoodItem[];
  targetAdjustment: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
    reason: string;
  } | null;
}

const STARTER_PROMPTS = [
  'Ndodya 250g sadza rezviyo nechicken dovi nemuriwo',
  'Ngidle 250g isitshwala lenyama yenkomo lombhida',
  'Small bowl of porridge with two tablespoons of peanut butter',
  'How can I hit my protein target today using local ingredients?',
  'Adjust my targets because my energy is low today',
];

export function CoachPanel({
  profile,
  dateKey,
  totals,
  latestWeightKg,
  messages,
}: CoachPanelProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mealGroup, setMealGroup] = useState<FoodLogEntry['mealGroup']>('Lunch');
  const [pendingAction, setPendingAction] = useState<PendingCoachAction | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<SpokenLanguageKey>('en-ZW');
  const [autoSendVoice, setAutoSendVoice] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const wasListeningRef = useRef(false);
  const inputRef = useRef('');
  inputRef.current = input;

  const {
    supported: speechSupported,
    listening,
    interimTranscript,
    activeLocale,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: speechLang,
    continuous: true,
    onTranscriptChange: (combined) => {
      setInput(combined);
    },
  });

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, pendingAction]);

  const toggleVoiceInput = () => {
    if (listening) {
      stopListening();
    } else {
      setActionStatus(null);
      startListening(input);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || sending) return;

    if (listening) stopListening();
    setInput('');
    resetTranscript();
    setSending(true);
    setActionStatus(null);
    setPendingAction(null);

    try {
      await saveCoachMessage(profile.uid, 'user', content);

      const resp = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          dailyContext: {
            totals,
            targets: {
              kcal: profile.targetKcal,
              protein: profile.targetProtein,
              carbs: profile.targetCarbs,
              fat: profile.targetFat,
              fibre: profile.targetFibre,
            },
            latestWeightKg,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Coach error');

      await saveCoachMessage(profile.uid, 'assistant', data.reply);

      if ((data.loggedItems && data.loggedItems.length > 0) || data.targetAdjustment) {
        setPendingAction({
          items: data.loggedItems || [],
          targetAdjustment: data.targetAdjustment || null,
        });
      }
    } catch {
      const localItems = localParseMealDescription(content);
      const reply =
        localItems.length > 0
          ? `Offline Local Coach: Matched ${localItems.length} dish(es) against the 100g/100ml database. Confirm below to save to localStorage.`
          : `Offline Local Coach: Today you are at ${totals.kcal}/${profile.targetKcal} kcal and ${totals.protein}/${profile.targetProtein}g protein. Name a Zimbabwean dish (e.g. sadza, covo, beef stew, dovi) to log it.`;
      await saveCoachMessage(profile.uid, 'assistant', reply);
      if (localItems.length > 0) {
        setPendingAction({ items: localItems, targetAdjustment: null });
      }
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const justStopped = wasListeningRef.current && !listening;
    wasListeningRef.current = listening;
    if (justStopped && autoSendVoice && inputRef.current.trim().length >= 2) {
      sendMessage(inputRef.current);
    }
  }, [listening, autoSendVoice]);

  const handleLogParsedItems = async () => {
    if (!pendingAction || pendingAction.items.length === 0) return;
    await addFoodLogsBatch(
      profile.uid,
      pendingAction.items.map((item) => ({
        dateKey,
        mealGroup,
        foodId: item.foodId,
        foodName: item.foodName,
        unit: item.unit,
        portionAmount: item.portionAmount,
        kcalPer100: item.kcalPer100,
        proteinPer100: item.proteinPer100,
        carbsPer100: item.carbsPer100,
        fatPer100: item.fatPer100,
        fibrePer100: item.fibrePer100,
        vitamins: item.vitamins,
        source: 'chat',
      }))
    );
    setActionStatus(
      `Added ${pendingAction.items.length} conversational item(s) to ${mealGroup} (${dateKey}).`
    );
    setPendingAction((prev) => (prev ? { ...prev, items: [] } : null));
  };

  const handleApplyTargets = async () => {
    if (!pendingAction?.targetAdjustment) return;
    const t = pendingAction.targetAdjustment;
    await updateUserTargets(profile.uid, {
      targetKcal: t.kcal,
      targetProtein: t.protein,
      targetCarbs: t.carbs,
      targetFat: t.fat,
      targetFibre: t.fibre,
    });
    setActionStatus(`Updated daily targets to ${t.kcal} kcal.`);
    setPendingAction((prev) => (prev ? { ...prev, targetAdjustment: null } : null));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Coaching Context & Language Controls */}
      <div className="lg:col-span-4 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
            Trilingual AI Coach (gpt-4o-mini)
          </p>
          <h2 className="mt-1 font-display text-2xl font-black uppercase text-[#135D3B] dark:text-white">
            Log meals in English, Shona, or Ndebele
          </h2>
          <p className="mt-2 text-xs text-[#385043] dark:text-slate-400">
            Speak or type natural meal descriptions using browser SpeechRecognition. Every dish is
            matched to our 100g/100ml Zimbabwean database with zero-judgment macro feedback.
          </p>
        </div>

        <div className="border-t border-[#135D3B]/10 dark:border-white/10 pt-4 space-y-3">
          <p className="text-xs font-medium text-[#587264] dark:text-slate-400">
            Voice Dictation Language
          </p>
          <div className="grid grid-cols-3 gap-1.5 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
            {(['en-ZW', 'sn-ZW', 'nd-ZW'] as SpokenLanguageKey[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (listening) stopListening();
                  setSpeechLang(code);
                }}
                className={`py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  speechLang === code
                    ? 'bg-[#135D3B] text-[#E5B84B]'
                    : 'text-[#385043] dark:text-slate-400'
                }`}
              >
                {SPOKEN_LANGUAGES[code].label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-[#385043] dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSendVoice}
              onChange={(e) => setAutoSendVoice(e.target.checked)}
              className="rounded accent-[#135D3B]"
            />
            Auto-send voice transcript when mic stops
          </label>
        </div>

        <div className="border-t border-[#135D3B]/10 dark:border-white/10 pt-4">
          <p className="text-xs font-medium text-[#587264] dark:text-slate-400 mb-2">
            Quick Meal &amp; Coaching Prompts
          </p>
          <div className="space-y-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={sending}
                className="w-full text-left rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] px-3 py-2.5 text-xs text-[#112018] dark:text-slate-200 hover:border-[#D99B26] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Conversational Thread & Parsed Meal Confirmations */}
      <div className="lg:col-span-8 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] flex flex-col h-[600px]">
        <div className="border-b border-[#135D3B]/10 dark:border-white/10 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-[#587264] dark:text-slate-400 tabular-nums">
            Today: <strong className="text-[#135D3B] dark:text-[#E5B84B]">{totals.kcal}</strong> /{' '}
            {profile.targetKcal} kcal · P {totals.protein}g / {profile.targetProtein}g
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((grp) => (
              <button
                key={grp}
                type="button"
                onClick={() => setMealGroup(grp)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  mealGroup === grp
                    ? 'bg-[#135D3B] text-[#E5B84B]'
                    : 'text-[#385043] dark:text-slate-400'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-4 text-sm text-[#385043] dark:text-slate-300">
              Mhoro / Sawubona / Hello {profile.displayName}. Tap the microphone or type what you
              ate—for example, &ldquo;Ndodya 250g sadza rezviyo nechicken dovi&rdquo; or
              &ldquo;Ngidle isitshwala lenyama yenkomo&rdquo;.
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#135D3B] text-white'
                    : 'border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] text-[#112018] dark:text-[#EDF4EF]'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Pending Parsed Meal / Target Adjustment Confirmation */}
          {pendingAction && (pendingAction.items.length > 0 || pendingAction.targetAdjustment) && (
            <div className="rounded-xl border border-[#135D3B]/30 bg-[#D8EADB] dark:bg-[#162C21] p-4 space-y-3">
              {pendingAction.items.length > 0 && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B]">
                      Standardized 100g/100ml Breakdown Ready to Log
                    </p>
                    <button
                      type="button"
                      onClick={handleLogParsedItems}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#135D3B] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0E482D]"
                    >
                      <Check className="w-3.5 h-3.5 text-[#E5B84B]" />
                      Log to {mealGroup}
                    </button>
                  </div>
                  <div className="space-y-2 font-mono text-xs tabular-nums">
                    {pendingAction.items.map((it, idx) => {
                      const scaled = scaleNutrition(
                        {
                          kcal: it.kcalPer100,
                          protein: it.proteinPer100,
                          carbs: it.carbsPer100,
                          fat: it.fatPer100,
                          fibre: it.fibrePer100,
                        },
                        it.portionAmount
                      );
                      return (
                        <div
                          key={`${it.foodName}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 border-t border-[#135D3B]/15 pt-2"
                        >
                          <span className="font-sans font-medium text-[#112018] dark:text-white">
                            {it.foodName} ({it.portionAmount}
                            {it.unit}) ·{' '}
                            <span className="text-[#587264] dark:text-slate-400">
                              [{it.kcalPer100} kcal/100{it.unit}]
                            </span>
                          </span>
                          <span className="text-[#112018] dark:text-white">
                            {scaled.kcal} kcal · {scaled.protein}g P · {scaled.carbs}g C · {scaled.fat}g F
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {pendingAction.targetAdjustment && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#135D3B]/20 pt-3">
                  <div className="text-xs">
                    <p className="font-semibold text-[#112018] dark:text-white">
                      Recommended Target Update: {pendingAction.targetAdjustment.kcal} kcal
                    </p>
                    <p className="text-[#385043] dark:text-slate-300">
                      {pendingAction.targetAdjustment.reason}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyTargets}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#D99B26] px-3.5 py-1.5 text-xs font-bold text-[#112018]"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Apply New Targets
                  </button>
                </div>
              )}
            </div>
          )}

          {(actionStatus || speechError) && (
            <p
              className={`text-xs font-medium ${
                speechError ? 'text-rose-500' : 'text-[#135D3B] dark:text-[#34D399]'
              }`}
            >
              {speechError || actionStatus}
            </p>
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Input Composer */}
        <div className="border-t border-[#135D3B]/10 dark:border-white/10 p-3 space-y-2">
          {(listening || interimTranscript) && (
            <div className="px-2 flex items-center justify-between text-[11px] text-[#8F6008] dark:text-[#E5B84B]">
              <span>
                Listening in {SPOKEN_LANGUAGES[speechLang].label} ({activeLocale})
                {interimTranscript ? ` · "${interimTranscript}"` : '...'}
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="font-bold uppercase hover:underline"
              >
                Stop
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={!speechSupported}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full border transition-colors ${
                listening
                  ? 'border-[#D99B26] bg-[#D99B26] text-[#112018]'
                  : 'border-[#135D3B]/20 dark:border-white/15 text-[#135D3B] dark:text-slate-300 hover:border-[#D99B26] disabled:opacity-40'
              }`}
              aria-label={listening ? 'Stop voice recording' : 'Start voice dictation'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                listening
                  ? `Listening (${SPOKEN_LANGUAGES[speechLang].label})...`
                  : 'Log a meal or ask your coach...'
              }
              className="flex-1 min-h-[44px] rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-4 text-sm text-[#112018] dark:text-white focus:outline-none focus:border-[#D99B26]"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full bg-[#135D3B] px-4 text-sm font-semibold text-[#E5B84B] hover:bg-[#0E482D] disabled:opacity-50 transition-colors"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
