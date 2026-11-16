import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  RotateCcw,
  Scale,
  Sparkles,
  Video,
} from 'lucide-react';
import {
  SPOKEN_LANGUAGES,
  type SpokenLanguageKey,
  useSpeechRecognition,
} from '../lib/speechRecognition';

export interface CameraScannedFoodItem {
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

export interface CameraScanResult {
  summary: string;
  items: CameraScannedFoodItem[];
  totalEstimatedWeightGrams: number;
  engineUsed: string;
}

interface CameraScanProps {
  analyzingExternal?: boolean;
  resetSignal?: number;
  onScanComplete: (result: CameraScanResult) => void;
  onError?: (message: string | null) => void;
}

export function CameraScan({
  analyzingExternal = false,
  resetSignal = 0,
  onScanComplete,
  onError,
}: CameraScanProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [plateSize, setPlateSize] = useState<'small' | 'standard' | 'large'>('standard');
  const [dishHint, setDishHint] = useState('');
  const [speechLang, setSpeechLang] = useState<SpokenLanguageKey>('en-ZW');
  const [scanning, setScanning] = useState(false);
  const [lastMeta, setLastMeta] = useState<{
    totalGrams: number;
    engineUsed: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    listening: speechListening,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    language: speechLang,
    continuous: true,
    onTranscriptChange: (combined) => setDishHint(combined),
  });

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (resetSignal > 0) {
      setCapturedPreview(null);
      setDishHint('');
      setLastMeta(null);
      resetTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const startCamera = async (preferredFacing: 'environment' | 'user' = facingMode) => {
    onError?.(null);
    stopCameraStream();
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Browser camera API unavailable.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: preferredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      onError?.('Camera permission denied or unavailable. Upload a plate photo or use the sample Southern African dish.');
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraActive) {
      void startCamera(nextFacing);
    }
  };

  const capturePhotoFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    const srcW = video.videoWidth || 960;
    const srcH = video.videoHeight || 720;
    const maxWidth = 1280;
    const scale = srcW > maxWidth ? maxWidth / srcW : 1;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPreview(dataUrl);
    setLastMeta(null);
    stopCameraStream();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onError?.(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedPreview(reader.result);
        setLastMeta(null);
        stopCameraStream();
      }
    };
    reader.readAsDataURL(file);
  };

  const runOpenAiVisionScan = async (overrideImage?: string, overrideHint?: string) => {
    const imageToSend = overrideImage ?? capturedPreview ?? undefined;
    const hintToSend = overrideHint ?? (dishHint.trim() || undefined);
    if (!imageToSend && !hintToSend) return;

    setScanning(true);
    onError?.(null);
    try {
      const resp = await fetch('/api/camera-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageToSend,
          dishHint: hintToSend,
          languageHint: SPOKEN_LANGUAGES[speechLang].label,
          plateSize,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'OpenAI Vision plate scan failed.');
      }

      const result: CameraScanResult = {
        summary: data.summary,
        items: data.items || [],
        totalEstimatedWeightGrams: Number(data.totalEstimatedWeightGrams ?? 0),
        engineUsed: data.engineUsed || 'openai-gpt-4o-vision',
      };

      setLastMeta({
        totalGrams: result.totalEstimatedWeightGrams,
        engineUsed: result.engineUsed,
      });
      onScanComplete(result);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Unable to scan captured plate.');
    } finally {
      setScanning(false);
    }
  };

  const runSampleSouthernAfricanPlate = async () => {
    onError?.(null);
    setScanning(true);
    try {
      const resp = await fetch('/assets/aistudio/IMG_9207_f517fc44.jpeg');
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = typeof reader.result === 'string' ? reader.result : undefined;
        setCapturedPreview(base64 || '/assets/aistudio/IMG_9207_f517fc44.jpeg');
        await runOpenAiVisionScan(
          base64,
          '260g white maize sadza, 210g braised beef stew, 150g sautéed covo greens'
        );
      };
      reader.readAsDataURL(blob);
    } catch {
      await runOpenAiVisionScan(
        undefined,
        '260g white maize sadza, 210g beef stew, 150g sautéed covo greens'
      );
    }
  };

  const isBusy = scanning || analyzingExternal;

  return (
    <div className="space-y-4">
      {/* Live Camera Stream / Captured Photo Viewfinder */}
      <div className="relative h-64 rounded-xl border border-dashed border-[#135D3B]/25 dark:border-white/15 bg-[#0B110E] overflow-hidden flex items-center justify-center">
        {cameraActive ? (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* Optical Plate Guide Reticle */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 border border-[#E5B84B]/45 rounded-xl flex items-center justify-center"
            >
              <div className="h-36 w-36 rounded-full border-2 border-dashed border-[#E5B84B]/70" />
            </div>
            <button
              type="button"
              onClick={handleFlipCamera}
              title="Switch front/rear camera"
              className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black/85"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#E5B84B]" />
              Flip
            </button>
          </>
        ) : capturedPreview ? (
          <>
            <img
              src={capturedPreview}
              alt="Captured Southern African meal plate"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setCapturedPreview(null);
                setLastMeta(null);
              }}
              className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black/90"
            >
              <RotateCcw className="w-3 h-3 text-[#E5B84B]" />
              Retake
            </button>
          </>
        ) : (
          <div className="text-center px-6 text-slate-300">
            <Camera className="w-9 h-9 mx-auto mb-2 text-[#E5B84B]" />
            <p className="text-xs font-medium text-white">
              CameraScan · Southern African Dish Vision
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Capture Sadza, Beef Stew, Covo, Dovi, Matemba, or Mopane Worms to estimate weight (g)
              and macros via OpenAI Vision.
            </p>
          </div>
        )}
      </div>

      {/* Camera / Upload Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {!cameraActive ? (
          <button
            type="button"
            onClick={() => startCamera()}
            disabled={isBusy}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#135D3B] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-50 transition-colors"
          >
            <Video className="w-4 h-4 text-[#E5B84B]" />
            {capturedPreview ? 'Reopen Camera' : 'Open Camera'}
          </button>
        ) : (
          <button
            type="button"
            onClick={capturePhotoFromVideo}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#D99B26] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] transition-colors"
          >
            <Camera className="w-4 h-4" />
            Capture Frame
          </button>
        )}

        <label className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full border border-[#135D3B]/20 dark:border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26] cursor-pointer transition-colors">
          <ImagePlus className="w-4 h-4 text-[#D99B26]" />
          Upload Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Plate Size Weight Calibration */}
      <div className="rounded-xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B]">
          <Scale className="w-3.5 h-3.5 text-[#D99B26]" />
          Plate Scale Calibration
        </span>
        <div className="flex items-center gap-1 rounded-full bg-white dark:bg-[#121C17] p-1 border border-[#135D3B]/15 dark:border-white/10">
          {(
            [
              { id: 'small', label: 'Small' },
              { id: 'standard', label: 'Standard' },
              { id: 'large', label: 'Large' },
            ] as const
          ).map((sz) => (
            <button
              key={sz.id}
              type="button"
              onClick={() => setPlateSize(sz.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase transition-colors ${
                plateSize === sz.id
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'text-[#587264] dark:text-slate-400 hover:text-[#135D3B]'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional Spoken/Typed Dish Context */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="block text-xs font-medium text-[#385043] dark:text-slate-300">
            Optional Dish Note (English / Shona / Ndebele)
          </label>
          <div className="flex items-center gap-1">
            {(['en-ZW', 'sn-ZW', 'nd-ZW'] as SpokenLanguageKey[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setSpeechLang(code)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                  speechLang === code
                    ? 'bg-[#135D3B] text-[#E5B84B]'
                    : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#587264] dark:text-slate-400'
                }`}
              >
                {SPOKEN_LANGUAGES[code].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={dishHint}
            onChange={(e) => setDishHint(e.target.value)}
            placeholder="e.g. Sadza rezviyo, beef stew & covo with peanut butter"
            className="flex-1 min-h-[42px] rounded-xl border border-[#135D3B]/20 dark:border-white/15 bg-transparent px-3 text-sm text-[#112018] dark:text-white focus:outline-none focus:border-[#D99B26]"
          />
          <button
            type="button"
            onClick={() => (speechListening ? stopListening() : startListening(dishHint))}
            title={`Dictate dish note in ${SPOKEN_LANGUAGES[speechLang].label}`}
            className={`min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border transition-colors ${
              speechListening
                ? 'border-[#D99B26] bg-[#D99B26] text-[#112018]'
                : 'border-[#135D3B]/20 dark:border-white/15 text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26]'
            }`}
            aria-label={speechListening ? 'Stop dictating note' : 'Dictate note with microphone'}
          >
            {speechListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Vision Analysis & Sample Triggers */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runOpenAiVisionScan()}
          disabled={isBusy || (!capturedPreview && !dishHint.trim())}
          className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full bg-[#D99B26] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#112018] hover:bg-[#E5B84B] disabled:opacity-50 transition-colors"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isBusy ? 'Estimating Weights...' : 'Estimate Weight & Macros (OpenAI Vision)'}
        </button>

        <button
          type="button"
          onClick={runSampleSouthernAfricanPlate}
          disabled={isBusy}
          className="min-h-[46px] rounded-full border border-[#135D3B]/20 dark:border-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#135D3B] dark:text-slate-200 hover:border-[#135D3B] transition-colors whitespace-nowrap"
        >
          Test Sample Plate
        </button>
      </div>

      {lastMeta && (
        <div className="rounded-xl bg-[#D8EADB]/70 dark:bg-[#162C21] border border-[#135D3B]/15 dark:border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono font-bold text-[#135D3B] dark:text-[#5EE39D] tabular-nums">
            Total Est. Weight: {lastMeta.totalGrams} g/ml
          </span>
          <span className="font-mono text-[11px] text-[#385043] dark:text-slate-300">
            Engine: {lastMeta.engineUsed}
          </span>
        </div>
      )}
    </div>
  );
}
