import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { translate, type TranslationKey } from '@/i18n';

/**
 * On-device speech-to-text via `expo-speech-recognition`
 * (iOS `SFSpeechRecognizer` / Android `SpeechRecognizer`).
 *
 * IMPORTANT: this is a native module. It is NOT available in Expo Go — there
 * `requireNativeModule` throws at import time. We therefore load it through a
 * guarded `require()` so the rest of the app keeps working in Expo Go; the mic
 * button simply reports that a development build is required.
 */
let ESR: typeof import('expo-speech-recognition') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ESR = require('expo-speech-recognition');
} catch {
  ESR = null;
}

const isVoiceAvailable = !!ESR;

interface VoiceState {
  /** True while the device is actively listening. */
  isRecording: boolean;
  /** Kept for API compatibility — on-device STT has no separate step. */
  isTranscribing: boolean;
  error: string | null;
}

const tr = (key: TranslationKey) =>
  translate(useSettingsStore.getState().language, key);

/** Map the app language to a platform speech-recognition locale. */
const localeFor = (lang: string) => (lang === 'ur' ? 'ur-PK' : 'en-US');

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
  });
  // Keep the latest callback without re-subscribing native listeners.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    if (!ESR) return;
    const mod = ESR.ExpoSpeechRecognitionModule;

    const subs = [
      mod.addListener('start', () =>
        setState({ isRecording: true, isTranscribing: false, error: null }),
      ),
      mod.addListener('end', () =>
        setState((s) => ({ ...s, isRecording: false, isTranscribing: false })),
      ),
      mod.addListener('result', (event: any) => {
        const text = event?.results?.[0]?.transcript?.trim();
        if (event?.isFinal && text) onTranscriptRef.current(text);
      }),
      mod.addListener('error', (event: any) => {
        const denied =
          event?.error === 'not-allowed' ||
          event?.error === 'service-not-allowed';
        console.warn(
          '[useVoice] recognition error:',
          event?.error,
          event?.message,
        );
        setState({
          isRecording: false,
          isTranscribing: false,
          error: denied ? tr('chat.micDenied') : tr('chat.voiceError'),
        });
      }),
    ];

    return () => subs.forEach((s) => s?.remove?.());
  }, []);

  const startRecording = useCallback(async () => {
    if (!ESR) {
      setState((s) => ({ ...s, error: tr('chat.voiceUnavailable') }));
      return;
    }
    try {
      const mod = ESR.ExpoSpeechRecognitionModule;
      const perms = await mod.requestPermissionsAsync();
      if (!perms.granted) {
        setState((s) => ({ ...s, error: tr('chat.micDenied') }));
        return;
      }
      const lang = useSettingsStore.getState().language;
      mod.start({
        lang: localeFor(lang),
        interimResults: false,
        continuous: false,
      });
    } catch (err: any) {
      console.warn('[useVoice] start failed:', err?.message ?? err);
      setState((s) => ({
        ...s,
        isRecording: false,
        error: tr('chat.voiceError'),
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    try {
      ESR?.ExpoSpeechRecognitionModule.stop();
    } catch {
      /* not recording / module unavailable — ignore */
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (state.isRecording) stopRecording();
    else startRecording();
  }, [state.isRecording, startRecording, stopRecording]);

  const clearError = useCallback(
    () => setState((s) => ({ ...s, error: null })),
    [],
  );

  return {
    ...state,
    isVoiceAvailable,
    startRecording,
    stopRecording,
    toggleRecording,
    clearError,
  };
}
