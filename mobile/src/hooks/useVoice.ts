import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { File } from 'expo-file-system';
import { chatApi } from '../../utils/api';
import { useSettingsStore } from '@/store/settingsStore';
import { translate, type TranslationKey } from '@/i18n';

interface VoiceState {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
}

// Map a recording file extension to a Gemini-supported mime type.
function mimeForUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'm4a':
      return 'audio/m4a';
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'ogg':
      return 'audio/ogg';
    case 'mp3':
      return 'audio/mpeg';
    case '3gp':
      return 'audio/3gpp';
    default:
      return 'audio/m4a';
  }
}

const tr = (key: TranslationKey) =>
  translate(useSettingsStore.getState().language, key);

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({ ...s, error: tr('chat.micDenied') }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setState({ isRecording: true, isTranscribing: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message, isRecording: false }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setState({ isRecording: false, isTranscribing: false, error: null });
        return;
      }

      // Read the recording and send it to the backend for transcription.
      setState({ isRecording: false, isTranscribing: true, error: null });
      const base64 = await new File(uri).base64();
      const { transcription } = await chatApi.transcribe(
        base64,
        mimeForUri(uri),
      );

      const text = transcription?.trim();
      setState({ isRecording: false, isTranscribing: false, error: null });
      if (text) {
        onTranscript(text);
      } else {
        setState((s) => ({ ...s, error: tr('chat.voiceError') }));
      }
    } catch {
      setState({
        isRecording: false,
        isTranscribing: false,
        error: tr('chat.voiceError'),
      });
    }
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (state.isTranscribing) return;
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, state.isTranscribing, startRecording, stopRecording]);

  const clearError = useCallback(
    () => setState((s) => ({ ...s, error: null })),
    [],
  );

  return { ...state, startRecording, stopRecording, toggleRecording, clearError };
}
