/**
 * voice.ts — Voice input/output utility for DigitalKaam mobile
 *
 * Flow:
 *   1. User holds mic button → startRecording()
 *   2. User releases           → stopAndSendVoice(sessionId)
 *   3. Backend transcribes audio → runs AI → returns text response
 *   4. Device speaks the response via expo-speech (free, built-in TTS)
 *
 * Usage:
 *   const { startRecording, stopAndSendVoice, speaking, cancelSpeech } = useVoiceChat()
 */

import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import * as Speech from 'expo-speech'
import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

// ── Types ────────────────────────────────────────────────────────────────────

export interface VoiceResult {
  /** What Gemini heard — display as the user's chat bubble */
  transcription: string
  /** AI's text reply — display as the AI chat bubble, also spoken aloud */
  response: string
}

// ── Audio recording state (module-level singleton) ────────────────────────────

let activeRecording: Audio.Recording | null = null

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Start recording microphone audio.
 * Call this when the user presses the mic button.
 * Requests mic permission automatically on first call.
 */
export async function startRecording(): Promise<void> {
  if (activeRecording) {
    // Safety: stop any existing recording first
    await activeRecording.stopAndUnloadAsync().catch(() => {})
    activeRecording = null
  }

  const { granted } = await Audio.requestPermissionsAsync()
  if (!granted) throw new Error('Microphone permission denied')

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  })

  const recording = new Audio.Recording()
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
  await recording.startAsync()
  activeRecording = recording
}

/**
 * Stop recording, send audio to backend, speak the AI response.
 * Call this when the user releases the mic button.
 *
 * @param sessionId - The current chat session ID
 * @returns { transcription, response } — show both in the chat UI
 */
export async function stopAndSendVoice(sessionId: string): Promise<VoiceResult> {
  if (!activeRecording) throw new Error('No active recording')

  // 1. Stop recording and get the file URI
  await activeRecording.stopAndUnloadAsync()
  const uri = activeRecording.getURI()
  activeRecording = null

  if (!uri) throw new Error('Recording URI is empty')

  // Reset audio mode so playback works normally after recording
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false })

  // 2. Read the audio file as base64
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  // 3. Get the current user's JWT token from Supabase session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not logged in')

  // 4. Send audio to backend — backend transcribes + runs AI → returns text
  const res = await fetch(`${API_URL}/api/chat/voice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      audio: base64,
      mimeType: 'audio/m4a',   // expo HIGH_QUALITY records m4a on iOS, mp4 on Android — both work
      sessionId,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voice API error ${res.status}: ${err}`)
  }

  const data = await res.json() as VoiceResult

  // 5. Speak the AI response using the device's built-in TTS (no extra cost)
  //    Detects language from text automatically; override language if needed.
  speakResponse(data.response)

  // Clean up temp recording file
  await FileSystem.deleteAsync(uri, { idempotent: true })

  return data
}

/**
 * Speak a text string using the device's built-in TTS.
 * Detects Urdu text automatically and uses ur-PK voice if available.
 * Falls back to en-US for Roman Urdu / English.
 *
 * @param text - The text to speak
 */
export function speakResponse(text: string): void {
  // Rough Urdu script detection — if text has Urdu/Arabic chars use ur-PK
  const hasUrduScript = /[\u0600-\u06FF]/.test(text)
  Speech.speak(text, {
    language: hasUrduScript ? 'ur-PK' : 'en-US',
    pitch: 1.0,
    rate: 0.9,
  })
}

/**
 * Stop speech playback immediately.
 * Call this if the user wants to skip the spoken response.
 */
export function cancelSpeech(): void {
  Speech.stop()
}

/**
 * Check if TTS is currently speaking.
 */
export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync()
}
