import { useState, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

interface VoiceState {
  isRecording: boolean;
  transcript: string;
  error: string | null;
}

export function useVoice(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceState>({
    isRecording: false,
    transcript: '',
    error: null,
  });
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setState((s) => ({ ...s, error: 'Microphone permission denied' }));
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
      setState({ isRecording: true, transcript: '', error: null });
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
      setState((s) => ({ ...s, isRecording: false }));

      // Voice recorded — in production, send `uri` to a transcription service.
      // For now, notify the caller so they can show a "Transcribing..." UI state.
      if (uri) {
        onTranscript('[Voice message recorded — transcription service not configured]');
      }
    } catch (err: any) {
      setState((s) => ({ ...s, error: err.message, isRecording: false }));
    }
  }, [onTranscript]);

  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, startRecording, stopRecording, toggleRecording, clearError };
}
