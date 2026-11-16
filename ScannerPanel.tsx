import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Barcode,
  Camera,
  Check,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { COMMERCIAL_BARCODES, scaleNutrition } from '../data/zimbabweFoodDb';
import { addFoodLogsBatch, type FoodLogEntry } from '../lib/firebase';
import {
  SPOKEN_LANGUAGES,
  type SpokenLanguageKey,
  useSpeechRecognition,
} from '../lib/speechRecognition';
import { localParseMealDescription } from '../lib/localMealFallback';
import { CameraScan, type CameraScanResult } from './CameraScan';

export interface DetectedFoodItem {
  foodId: number;
  foodName: string;
  matchedFromDb: boolean;
  unit: 'g' | 'ml';
  portionAmount: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  vitamins: string;
  confidence: number;
  weightCue?: string;
}

interface ScannerPanelProps {
  uid: string;
  dateKey: string;
  onLogged: () => void;
}

export function ScannerPanel({ uid, dateKey, onLogged }: ScannerPanelProps) {
  const [scanMode, setScanMode] = useState<'plate' | 'voice' | 'barcode'>('plate');
  const [cameraResetSignal, setCameraResetSignal] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedFoodItem[]>([]);
  const [mealGroup, setMealGroup] = useState<FoodLogEntry['mealGroup']>('Lunch');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voice meal logging states (Browser SpeechRecognition API)
  const [speechLang, setSpeechLang] = useState<SpokenLanguageKey>('en-ZW');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [autoParseVoice, setAutoParseVoice] = useState(true);

  // Barcode states
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeCamActive, setBarcodeCamActive] = useState(false);

  const barcodeVideoRef = useRef<HTMLVideoElement>(null);
  const barcodeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const barcodeControlsRef = useRef<{ stop: () => void } | null>(null);
  const wasListeningRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  voiceTranscriptRef.current = voiceTranscript;

  const {
    supported: speechSupported,
    listening: speechListening,
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
      setVoiceTranscript(combined);
    },
  });

  const stopBarcodeScanner = () => {
    barcodeControlsRef.current?.stop();
    barcodeControlsRef.current = null;
    setBarcodeCamActive(false);
  };

  useEffect(() => {
    return () => {
      stopBarcodeScanner();
    };
  }, []);

  const handleCameraScanComplete = (result: CameraScanResult) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSummary(result.summary);
    setItems(result.items);
  };

  const analyzePayload = async (
    imageBase64?: string,
    description?: string,
    opts?: { source?: 'camera' | 'voice'; languageHint?: string; skipImage?: boolean }
  ) => {
    setAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const resp = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: opts?.skipImage ? undefined : imageBase64 ?? undefined,
          description: description ?? undefined,
          languageHint: opts?.languageHint,
          source: opts?.source,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Analysis failed.');
      setSummary(data.summary);
      setItems(data.items || []);
    } catch {
      const parsed = localParseMealDescription(description || '');
      setSummary(
        `Matched ${parsed.length} item(s) locally against the NutriZim 100g/100ml database.`
      );
      setItems(parsed);
    } finally {
      setAnalyzing(false);
    }
  };

  // Automatically parse spoken transcription with AI parser once user stops speaking in Voice Log mode
  useEffect(() => {
    const justStopped = wasListeningRef.current && !speechListening;
    wasListeningRef.current = speechListening;
    if (justStopped && scanMode === 'voice' && autoParseVoice) {
      const clean = voiceTranscriptRef.current.trim();
      if (clean.length >= 2) {
        analyzePayload(undefined, clean, {
          source: 'voice',
          languageHint: SPOKEN_LANGUAGES[speechLang].label,
          skipImage: true,
        });
      }
    }
  }, [speechListening, scanMode, autoParseVoice, speechLang]);

  const startBarcodeScanner = async () => {
    setErrorMsg(null);
    try {
      const reader = new BrowserMultiFormatReader();
      barcodeReaderRef.current = reader;
      setBarcodeCamActive(true);
      setTimeout(async () => {
        if (!barcodeVideoRef.current) return;
        try {
          const controls = await reader.decodeFromVideoDevice(
            undefined,
            barcodeVideoRef.current,
            (result) => {
              if (result) {
                const code = result.getText();
                setBarcodeInput(code);
                stopBarcodeScanner();
                lookupBarcode(code);
              }
            }
          );
          barcodeControlsRef.current = controls;
        } catch {
          setErrorMsg('Live barcode camera unavailable. Enter barcode digits manually below.');
          setBarcodeCamActive(false);
        }
      }, 80);
    } catch {
      setErrorMsg('Barcode reader initialization failed.');
    }
  };

  const lookupBarcode = async (codeToFetch?: string) => {
    const code = (codeToFetch ?? barcodeInput).trim();
    if (!code) return;
    setAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const resp = await fetch(`/api/barcode/${encodeURIComponent(code)}`);
      const data = await resp.json();
      if (!resp.ok || !data.found) {
        throw new Error(data.error || 'Barcode not found.');
      }
      setSummary(`Commercial product verified (${data.source}): ${data.brand}`);
      setItems([data.item]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Barcode lookup failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItemPortion = (idx: number, nextAmount: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, portionAmount: Math.max(1, Math.min(2000, Math.round(nextAmount))) } : item
      )
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmLog = async () => {
    if (items.length === 0) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const entrySource: FoodLogEntry['source'] =
        scanMode === 'barcode' ? 'barcode' : scanMode === 'voice' ? 'voice' : 'camera';

      await addFoodLogsBatch(
        uid,
        items.map((item) => ({
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
          source: entrySource,
        }))
      );
      setSuccessMsg(`Logged ${items.length} standardized item(s) to ${mealGroup} (${dateKey}).`);
      setItems([]);
      setCameraResetSignal((v) => v + 1);
      setVoiceTranscript('');
      resetTranscript();
      onLogged();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save logs.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVoiceMic = (seed: string) => {
    if (speechListening) {
      stopListening();
    } else {
      startListening(seed);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Plate Photo, Trilingual Speech Recognition, & Barcode Controls */}
      <div className="lg:col-span-5 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
            AI Meal Logger
          </h2>
          <div className="flex items-center gap-1 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
            <button
              type="button"
              onClick={() => {
                stopBarcodeScanner();
                stopListening();
                setScanMode('plate');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                scanMode === 'plate'
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'text-[#385043] dark:text-slate-300'
              }`}
            >
              Plate Photo
            </button>
            <button
              type="button"
              onClick={() => {
                stopBarcodeScanner();
                setScanMode('voice');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                scanMode === 'voice'
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'text-[#385043] dark:text-slate-300'
              }`}
            >
              Voice Log
            </button>
            <button
              type="button"
              onClick={() => {
                stopListening();
                setScanMode('barcode');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                scanMode === 'barcode'
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'text-[#385043] dark:text-slate-300'
              }`}
            >
              Barcode
            </button>
          </div>
        </div>

        {scanMode === 'plate' && (
          <CameraScan
            analyzingExternal={analyzing}
            resetSignal={cameraResetSignal}
            onScanComplete={handleCameraScanComplete}
            onError={setErrorMsg}
          />
        )}

        {scanMode === 'voice' && (
          <div className="space-y-4">
            {/* Trilingual Selector */}
            <div>
              <p className="text-xs font-medium text-[#385043] dark:text-slate-300 mb-2">
                Spoken Language (Browser SpeechRecognition API)
              </p>
              <div className="grid grid-cols-3 gap-1.5 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
                {(['en-ZW', 'sn-ZW', 'nd-ZW'] as SpokenLanguageKey[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      if (speechListening) stopListening();
                      setSpeechLang(code);
                    }}
                    className={`py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                      speechLang === code
                        ? 'bg-[#135D3B] text-[#E5B84B]'
                        : 'text-[#385043] dark:text-slate-300 hover:text-[#135D3B] dark:hover:text-white'
                    }`}
                  >
                    {SPOKEN_LANGUAGES[code].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Microphone Capture Panel */}
            <div className="rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-4 flex flex-col items-center text-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleVoiceMic(voiceTranscript)}
                disabled={!speechSupported || analyzing}
                className={`h-16 w-16 rounded-full inline-flex items-center justify-center transition-all shadow-sm ${
                  speechListening
                    ? 'bg-[#D99B26] text-[#112018] ring-4 ring-[#D99B26]/35'
                    : 'bg-[#135D3B] text-[#E5B84B] hover:bg-[#0E482D] disabled:opacity-50'
                }`}
                aria-label={speechListening ? 'Stop voice recognition' : 'Start speaking meal'}
              >
                {speechListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B]">
                  {speechListening
                    ? `Listening (${SPOKEN_LANGUAGES[speechLang].nativeLabel} · ${activeLocale})...`
                    : speechSupported
                    ? `Tap Mic & Speak in ${SPOKEN_LANGUAGES[speechLang].label}`
                    : 'SpeechRecognition Unsupported in This Browser'}
                </p>
                <p className="text-[11px] text-[#587264] dark:text-slate-400 mt-1">
                  {speechListening
                    ? 'Tap Stop when done to isolate dishes and standardize macros per 100g/100ml.'
                    : `Example: "${SPOKEN_LANGUAGES[speechLang].samplePhrase}"`}
                </p>
              </div>
            </div>

            {/* Live Transcription Box */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-medium text-[#385043] dark:text-slate-300">
                  Live Spoken Transcription
                </label>
                {voiceTranscript && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceTranscript('');
                      resetTranscript();
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#587264] hover:text-[#135D3B] dark:text-slate-400 dark:hover:text-[#E5B84B]"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={voiceTranscript}
                onChange={(e) => setVoiceTranscript(e.target.value)}
                placeholder={SPOKEN_LANGUAGES[speechLang].samplePhrase}
                className="w-full rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 py-2.5 text-sm text-[#112018] dark:text-white focus:outline-none focus:border-[#D99B26]"
              />
              {interimTranscript && (
                <p className="mt-1 text-[11px] italic text-[#8F6008] dark:text-[#E5B84B]">
                  Hearing: &ldquo;{interimTranscript}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="inline-flex items-center gap-2 text-[#385043] dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoParseVoice}
                  onChange={(e) => setAutoParseVoice(e.target.checked)}
                  className="rounded accent-[#135D3B]"
                />
                Auto-parse when microphone stops
              </label>
            </div>

            <button
              type="button"
              onClick={() =>
                analyzePayload(undefined, voiceTranscript, {
                  source: 'voice',
                  languageHint: SPOKEN_LANGUAGES[speechLang].label,
                  skipImage: true,
                })
              }
              disabled={analyzing || !voiceTranscript.trim()}
              className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full bg-[#D99B26] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] disabled:opacity-50 transition-colors"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? 'Parsing Spoken Meal...' : 'Parse Transcription (AI)'}
            </button>

            {/* Quick Trilingual Test Phrases */}
            <div className="border-t border-[#135D3B]/10 dark:border-white/10 pt-3">
              <p className="text-[11px] font-medium text-[#587264] dark:text-slate-400 mb-2">
                Try Spoken Meal Examples:
              </p>
              <div className="space-y-1.5">
                {(['en-ZW', 'sn-ZW', 'nd-ZW'] as SpokenLanguageKey[]).map((code) => {
                  const lang = SPOKEN_LANGUAGES[code];
                  return (
                    <button
                      key={code}
                      type="button"
                      disabled={analyzing}
                      onClick={() => {
                        setSpeechLang(code);
                        setVoiceTranscript(lang.samplePhrase);
                        analyzePayload(undefined, lang.samplePhrase, {
                          source: 'voice',
                          languageHint: lang.label,
                          skipImage: true,
                        });
                      }}
                      className="w-full text-left rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] px-3 py-2 text-[11px] text-[#112018] dark:text-slate-200 hover:border-[#D99B26] transition-colors"
                    >
                      <strong className="text-[#135D3B] dark:text-[#E5B84B] uppercase mr-1.5">
                        {lang.label}:
                      </strong>
                      {lang.samplePhrase}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {scanMode === 'barcode' && (
          <div className="space-y-4">
            <div className="relative h-48 rounded-xl border border-dashed border-[#135D3B]/25 dark:border-white/15 bg-[#0B110E] overflow-hidden flex items-center justify-center">
              {barcodeCamActive ? (
                <video ref={barcodeVideoRef} className="w-full h-full object-cover" playsInline muted />
              ) : (
                <div className="text-center px-6 text-slate-300">
                  <Barcode className="w-8 h-8 mx-auto mb-2 text-[#5EE39D]" />
                  <p className="text-xs">
                    Scan packaged EAN/UPC barcodes or test local Zimbabwean commercial items below.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!barcodeCamActive ? (
                <button
                  type="button"
                  onClick={startBarcodeScanner}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#135D3B] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D]"
                >
                  <Camera className="w-4 h-4 text-[#E5B84B]" />
                  Scan Barcode with Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopBarcodeScanner}
                  className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#D99B26] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#112018]"
                >
                  Stop Scanner
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Enter barcode digits (e.g. 6001087374212)"
                className="flex-1 min-h-[42px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 font-mono text-xs text-[#112018] dark:text-white focus:outline-none focus:border-[#135D3B]"
              />
              <button
                type="button"
                onClick={() => lookupBarcode()}
                disabled={analyzing || !barcodeInput.trim()}
                className="min-h-[42px] rounded-full bg-[#D99B26] px-5 text-xs font-bold uppercase tracking-wider text-[#112018] disabled:opacity-50"
              >
                Lookup
              </button>
            </div>

            <div>
              <p className="text-xs text-[#587264] dark:text-slate-400 mb-2">
                Quick Southern African Packaged Presets:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(COMMERCIAL_BARCODES).map((b) => (
                  <button
                    key={b.barcode}
                    type="button"
                    onClick={() => {
                      setBarcodeInput(b.barcode);
                      lookupBarcode(b.barcode);
                    }}
                    className="rounded-full border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] px-3 py-1 text-[11px] font-semibold text-[#135D3B] dark:text-slate-200 hover:border-[#D99B26]"
                  >
                    {b.brand}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(errorMsg || speechError) && (
          <p className="text-xs font-medium text-rose-500">{errorMsg || speechError}</p>
        )}
        {successMsg && (
          <p className="text-xs font-medium text-[#135D3B] dark:text-[#34D399]">{successMsg}</p>
        )}
      </div>

      {/* Right: Isolated Items + 100g/100ml Breakdown + Interactive Sliders */}
      <div className="lg:col-span-7 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#135D3B]/10 dark:border-white/10 pb-4">
            <div>
              <h3 className="font-display text-xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
                Isolated Portions &amp; 100g/100ml Standardization
              </h3>
              <p className="text-xs text-[#587264] dark:text-slate-400">
                {summary || 'Analyze a plate, speak a meal, or scan a barcode to review isolated items.'}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-[#F2E9D8] dark:bg-[#18251E] p-1">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setMealGroup(grp)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
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

          {items.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#587264] dark:text-slate-400">
              No staged items yet. Capture a plate photo, switch to{' '}
              <strong className="text-[#135D3B] dark:text-[#E5B84B]">Voice Log</strong> to speak in
              English, Shona, or Ndebele, or click{' '}
              <strong className="text-[#135D3B] dark:text-[#E5B84B]">Test Sample Plate</strong>.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {items.map((item, idx) => {
                const scaled = scaleNutrition(
                  {
                    kcal: item.kcalPer100,
                    protein: item.proteinPer100,
                    carbs: item.carbsPer100,
                    fat: item.fatPer100,
                    fibre: item.fibrePer100,
                  },
                  item.portionAmount
                );

                return (
                  <div
                    key={`${item.foodName}-${idx}`}
                    className="rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-extrabold uppercase text-[#135D3B] dark:text-white">
                          {item.foodName}
                        </p>
                        <p className="text-xs text-[#587264] dark:text-slate-400">
                          {item.matchedFromDb ? 'Matched Zimbabwean DB' : 'AI Standardized Estimate'} ·{' '}
                          {Math.round((item.confidence || 0.75) * 100)}% conf
                          {item.weightCue ? ` · ${item.weightCue}` : ''} · Vitamins: {item.vitamins}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        aria-label={`Remove ${item.foodName}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Weight Slider + Numeric Input */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={10}
                        max={700}
                        step={5}
                        value={item.portionAmount}
                        onChange={(e) => updateItemPortion(idx, Number(e.target.value))}
                        className="flex-1 accent-[#D99B26] cursor-pointer"
                        aria-label={`Portion weight for ${item.foodName}`}
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={2000}
                          value={item.portionAmount}
                          onChange={(e) => updateItemPortion(idx, Number(e.target.value))}
                          className="w-20 min-h-[36px] rounded-lg border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#0B110E] px-2 text-right font-mono text-sm font-semibold text-[#112018] dark:text-white tabular-nums"
                        />
                        <span className="font-mono text-xs text-[#587264]">{item.unit}</span>
                      </div>
                    </div>

                    {/* Dual Row: Strict 100g/100ml Baseline vs. Scaled Portion */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[#135D3B]/10 dark:border-white/10 pt-3 font-mono text-xs tabular-nums">
                      <div className="text-[#587264] dark:text-slate-400">
                        <span className="block text-[11px] font-sans font-medium mb-1">
                          Per 100{item.unit} Baseline
                        </span>
                        {item.kcalPer100} kcal · {item.proteinPer100}g P · {item.carbsPer100}g C ·{' '}
                        {item.fatPer100}g F · {item.fibrePer100}g Fib
                      </div>
                      <div className="text-[#112018] dark:text-white">
                        <span className="block text-[11px] font-sans font-semibold text-[#135D3B] dark:text-[#E5B84B] mb-1">
                          Actual Portion ({item.portionAmount}
                          {item.unit})
                        </span>
                        <span className="font-semibold">{scaled.kcal} kcal</span> · {scaled.protein}g P ·{' '}
                        {scaled.carbs}g C · {scaled.fat}g F · {scaled.fibre}g Fib
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-6 border-t border-[#135D3B]/10 dark:border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono text-sm tabular-nums">
              <span className="text-[#587264] dark:text-slate-400">Staged Total: </span>
              <span className="font-bold text-[#135D3B] dark:text-[#E5B84B]">
                {items.reduce(
                  (acc, it) =>
                    acc +
                    scaleNutrition(
                      {
                        kcal: it.kcalPer100,
                        protein: it.proteinPer100,
                        carbs: it.carbsPer100,
                        fat: it.fatPer100,
                        fibre: it.fibrePer100,
                      },
                      it.portionAmount
                    ).kcal,
                  0
                )}{' '}
                kcal
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmLog}
              disabled={saving}
              className="min-h-[46px] inline-flex items-center gap-2 rounded-full bg-[#135D3B] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-60 transition-colors"
            >
              <Check className="w-4 h-4 text-[#E5B84B]" />
              {saving ? 'Logging Meal...' : `Log ${items.length} Item(s) to ${mealGroup}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
