import { useCallback, useEffect, useRef, useState } from 'react';

export type SpokenLanguageKey = 'en-ZW' | 'sn-ZW' | 'nd-ZW';

export interface SpokenLanguageConfig {
  key: SpokenLanguageKey;
  label: string;
  nativeLabel: string;
  bcp47Fallbacks: string[];
  samplePhrase: string;
}

export const SPOKEN_LANGUAGES: Record<SpokenLanguageKey, SpokenLanguageConfig> = {
  'en-ZW': {
    key: 'en-ZW',
    label: 'English',
    nativeLabel: 'English (ZW)',
    bcp47Fallbacks: ['en-ZW', 'en-ZA', 'en-GB', 'en-US'],
    samplePhrase: 'I had 250g sadza with beef stew and sautéed covo',
  },
  'sn-ZW': {
    key: 'sn-ZW',
    label: 'Shona',
    nativeLabel: 'ChiShona',
    bcp47Fallbacks: ['sn-ZW', 'sn', 'en-ZW', 'en-US'],
    samplePhrase: 'Ndodya 250g sadza rezviyo nechicken dovi nemuriwo',
  },
  'nd-ZW': {
    key: 'nd-ZW',
    label: 'Ndebele',
    nativeLabel: 'isiNdebele',
    bcp47Fallbacks: ['nr-ZA', 'nd-ZW', 'zu-ZA', 'en-ZW'],
    samplePhrase: 'Ngidle 250g isitshwala lenyama yenkomo lombhida',
  },
};

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseSpeechRecognitionOptions {
  language: SpokenLanguageKey;
  continuous?: boolean;
  onTranscriptChange?: (combinedTranscript: string) => void;
  onFinalTranscript?: (finalText: string) => void;
}

export function useSpeechRecognition({
  language,
  continuous = true,
  onTranscriptChange,
  onFinalTranscript,
}: UseSpeechRecognitionOptions) {
  const [supported] = useState<boolean>(() => getSpeechRecognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [activeLocale, setActiveLocale] = useState<string>(SPOKEN_LANGUAGES[language].bcp47Fallbacks[0]);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const finalBufferRef = useRef('');
  const fallbackIndexRef = useRef(0);
  const manualStopRef = useRef(false);
  const languageRef = useRef(language);
  languageRef.current = language;

  const onTranscriptChangeRef = useRef(onTranscriptChange);
  onTranscriptChangeRef.current = onTranscriptChange;
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  const stopSession = useCallback(() => {
    manualStopRef.current = true;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore stop errors when already inactive
      }
    }
    setListening(false);
  }, []);

  const startWithFallbackIndex = useCallback(
    (fallbackIdx: number, preserveExisting: boolean) => {
      const Ctor = getSpeechRecognitionConstructor();
      if (!Ctor) {
        setError(
          'Browser SpeechRecognition is unavailable here. Use Chrome, Edge, or Safari, or enter your meal below.'
        );
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup
        }
      }

      if (!preserveExisting) {
        finalBufferRef.current = '';
        setFinalTranscript('');
        setInterimTranscript('');
      }

      const fallbacks = SPOKEN_LANGUAGES[languageRef.current].bcp47Fallbacks;
      const chosenLocale = fallbacks[Math.min(fallbackIdx, fallbacks.length - 1)];
      fallbackIndexRef.current = fallbackIdx;
      manualStopRef.current = false;

      const rec = new Ctor();
      rec.lang = chosenLocale;
      rec.continuous = continuous;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setListening(true);
        setActiveLocale(chosenLocale);
        setError(null);
      };

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let newlyFinalized = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript?.trim() ?? '';
          if (!text) continue;
          if (res.isFinal) {
            newlyFinalized = newlyFinalized ? `${newlyFinalized} ${text}` : text;
          } else {
            interim = interim ? `${interim} ${text}` : text;
          }
        }

        if (newlyFinalized) {
          finalBufferRef.current = finalBufferRef.current
            ? `${finalBufferRef.current} ${newlyFinalized}`.trim()
            : newlyFinalized;
          setFinalTranscript(finalBufferRef.current);
          onFinalTranscriptRef.current?.(finalBufferRef.current);
        }

        setInterimTranscript(interim);
        const combined = [finalBufferRef.current, interim].filter(Boolean).join(' ').trim();
        onTranscriptChangeRef.current?.(combined);
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === 'language-not-supported') {
          const nextIdx = fallbackIndexRef.current + 1;
          if (nextIdx < fallbacks.length) {
            startWithFallbackIndex(nextIdx, true);
            return;
          }
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone permission was denied. Allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Tap the microphone again and speak clearly.');
        } else if (event.error === 'audio-capture') {
          setError('No active microphone detected on this device.');
        } else if (event.error !== 'aborted') {
          setError(`Voice capture issue (${event.error}). You can edit or type your meal directly.`);
        }
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
        setInterimTranscript('');
        if (!manualStopRef.current && finalBufferRef.current) {
          onTranscriptChangeRef.current?.(finalBufferRef.current);
        }
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch (err) {
        setListening(false);
        setError(err instanceof Error ? err.message : 'Unable to start voice recognition.');
      }
    },
    [continuous]
  );

  const startListening = useCallback(
    (seedText = '') => {
      finalBufferRef.current = seedText.trim();
      setFinalTranscript(finalBufferRef.current);
      setInterimTranscript('');
      setError(null);
      startWithFallbackIndex(0, true);
    },
    [startWithFallbackIndex]
  );

  const resetTranscript = useCallback(() => {
    finalBufferRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup
        }
      }
    };
  }, []);

  return {
    supported,
    listening,
    interimTranscript,
    finalTranscript,
    activeLocale,
    error,
    startListening,
    stopListening: stopSession,
    resetTranscript,
  };
}
