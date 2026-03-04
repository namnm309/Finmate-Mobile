import { useCallback, useRef, useState } from 'react';

let ExpoSpeechRecognitionModule: {
  start: (opts: { lang: string; interimResults: boolean; continuous: boolean }) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
  addListener: (event: string, fn: (e: unknown) => void) => { remove: () => void };
} | null = null;
let useSpeechRecognitionEvent: (event: string, fn: (e: unknown) => void) => void = () => {};

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Không khả dụng trên web hoặc chưa cài
}

const LANG = 'vi-VN';

export function useVoiceInput(onResult?: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useSpeechRecognitionEvent('result', (event: unknown) => {
    const e = event as { results?: Array<{ transcript?: string }> };
    const transcript = e?.results?.[0]?.transcript;
    if (transcript) onResultRef.current?.(transcript);
  });
  useSpeechRecognitionEvent('error', (event: unknown) => {
    const e = event as { message?: string; error?: string };
    setError(e?.message || e?.error || 'Lỗi nhận diện giọng nói');
    setIsListening(false);
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('start', () => setIsListening(true));

  const startListening = useCallback(async () => {
    setError(null);
    if (!ExpoSpeechRecognitionModule) {
      setError('Nhận diện giọng nói chưa khả dụng. Cần build native (npx expo run:ios/android).');
      return false;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError('Cần quyền micro để ghi âm.');
        return false;
      }
      ExpoSpeechRecognitionModule!.start({ lang: LANG, interimResults: true, continuous: false });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể bắt đầu ghi âm');
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule?.stop();
  }, []);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  const isAvailable = !!ExpoSpeechRecognitionModule?.isRecognitionAvailable?.();

  return { isListening, error, startListening, stopListening, toggleListening, isAvailable };
}
