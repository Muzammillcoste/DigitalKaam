import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export interface MessageTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * SummarizerAgent — a lightweight, tool-free Gemini call.
 * Compresses older conversation turns into a factual summary ≤ 200 words.
 * This keeps the context window flat regardless of conversation length.
 */
export async function summarizeConversation(messages: MessageTurn[]): Promise<string> {
  const transcript = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: transcript }] }],
    config: {
      systemInstruction: `You are a conversation summarizer for DigitalKaam, a service booking platform in Pakistan.
Given the following conversation transcript, produce a concise factual summary in maximum 200 words.

IMPORTANT: Detect the language used in the conversation (English, Urdu, or Roman Urdu) and write your summary in that SAME language.

Your summary MUST preserve ALL of the following (if present):
- The user's name or identity if mentioned
- What service was requested and in which area
- The specific problem/issue described
- Which providers were discussed and their names
- Prices or quotes that were mentioned
- Any booking decisions that were made (confirmed, cancelled, pending)
- The current stage of the conversation

CRITICAL — BOOKING INFORMATION:
If any booking was CONFIRMED in the conversation, you MUST include it in your summary using this exact format:
  BOOKING CONFIRMED: Booking ID [booking_id] | Provider: [provider_name] | Date: [date] | Time: [time] | Price: [price] PKR
If a booking ID (UUID format like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) appears anywhere in the conversation, you MUST include it verbatim in your summary.
Never omit confirmed booking IDs — they are the most critical piece of information.

Be factual and concise. Do NOT add commentary or preamble. Just the summary.`
    }
  })

  return response.text || ''
}
