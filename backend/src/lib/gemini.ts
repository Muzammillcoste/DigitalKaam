import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleGenAI } from '@google/genai'
import dotenv from 'dotenv'
dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const genAI2 = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function callGemini(prompt: string): Promise<string> {
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

/**
 * Transcribes audio using Gemini's multimodal input.
 * Supports English, Urdu (script), and Roman Urdu — no extra API key needed.
 *
 * @param base64Audio  - Base64-encoded audio data (no data URL prefix)
 * @param mimeType     - MIME type: 'audio/m4a' | 'audio/mp4' | 'audio/wav' | 'audio/webm' | 'audio/ogg'
 * @returns Transcribed text exactly as spoken (preserves language: Urdu / Roman Urdu / English)
 */
export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  const response = await genAI2.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Transcribe this audio exactly as spoken. 
The speaker may be using English, Urdu (اردو), or Roman Urdu (e.g. "mujhe electrician chahiye").
Return ONLY the transcription — no labels, no explanation, no quotes.
Preserve the exact language and script used by the speaker.`,
          },
          {
            inlineData: { mimeType, data: base64Audio },
          },
        ],
      },
    ],
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text.trim()
}

/**
 * Converts text to speech using Gemini TTS and returns a base64-encoded WAV string.
 * Mirrors the Python flow: Gemini returns raw PCM → we wrap it in a WAV header.
 *
 * @param text      - The AI response text to speak
 * @param voiceName - Gemini prebuilt voice (default: 'Kore'). Others: 'Puck', 'Charon', 'Fenrir', 'Aoede'
 * @returns base64-encoded WAV audio (audio/wav, 24000 Hz, mono, 16-bit PCM)
 */
export async function generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string> {
  const response = await genAI2.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    } as any,
  })

  const part = response.candidates?.[0]?.content?.parts?.[0]
  if (!part?.inlineData?.data) throw new Error('Gemini TTS returned no audio data')

  // Gemini returns raw PCM; wrap it in a WAV container so any player can decode it
  const pcm = Buffer.from(part.inlineData.data, 'base64')
  const wav = pcmToWav(pcm)
  return wav.toString('base64')
}

/**
 * Wraps raw 16-bit PCM audio into a standard WAV container.
 * Parameters match Gemini TTS output: mono, 16-bit, 24000 Hz.
 */
function pcmToWav(
  pcm: Buffer,
  sampleRate: number = 24000,
  channels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const dataSize   = pcm.length
  const byteRate   = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const wav        = Buffer.alloc(44 + dataSize)

  wav.write('RIFF',                    0, 'ascii')
  wav.writeUInt32LE(36 + dataSize,     4)           // overall file size - 8
  wav.write('WAVE',                    8, 'ascii')
  wav.write('fmt ',                   12, 'ascii')
  wav.writeUInt32LE(16,               16)           // PCM fmt chunk size
  wav.writeUInt16LE(1,                20)           // format: PCM
  wav.writeUInt16LE(channels,         22)
  wav.writeUInt32LE(sampleRate,       24)
  wav.writeUInt32LE(byteRate,         28)
  wav.writeUInt16LE(blockAlign,       32)
  wav.writeUInt16LE(bitsPerSample,    34)
  wav.write('data',                   36, 'ascii')
  wav.writeUInt32LE(dataSize,         40)
  pcm.copy(wav, 44)

  return wav
}
