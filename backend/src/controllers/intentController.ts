import { callGemini } from '../lib/gemini'
import { supabase } from '../lib/supabase'

export interface IntentOutput {
  service: string
  severity: 'low' | 'medium' | 'high'
  location: string
  time: string
  budgetSensitivity: 'low' | 'medium' | 'high'
  language: string
  confidence: number
  clarificationNeeded: boolean
  clarificationQuestion?: string
  rawInput: string
}

export async function processIntent(userInput: string, sessionId: string): Promise<IntentOutput> {
  const prompt = `
You are an AI assistant for a service booking platform in Pakistan.
Analyze the following user request and extract structured information.
The input may be in English, Urdu, Roman Urdu, or a mix (code-switched).

User Request: "${userInput}"

Return ONLY a valid JSON object with these fields:
{
  "service": "<EXACTLY one of: AC Technician | Electrician | Plumber | Mechanic | Tutor | Beautician | Driver | Other>",
  "severity": "<low | medium | high>",
  "location": "<area name or 'unknown'>",
  "time": "<when they want service, e.g. 'Tomorrow Morning', 'Today Evening', 'ASAP', 'unknown'>",
  "budgetSensitivity": "<low | medium | high>",
  "language": "<English | Urdu | Roman Urdu | Mixed>",
  "confidence": <0.0 to 1.0>,
  "clarificationNeeded": <true if confidence < 0.7>,
  "clarificationQuestion": "<ask user to confirm if clarificationNeeded, else null>"
}

IMPORTANT service type rules — return the exact string, nothing else:
- Any AC / air conditioner / cooling / inverter / HVAC query → "AC Technician"
- Any electrical / bijli / wiring / fan repair query → "Electrician"
- Any plumbing / pipe / pani / drain / leak query → "Plumber"
- Any car / gaari / vehicle / motorcycle repair query → "Mechanic"  (NOTE: "Mechanic" means car mechanic, NOT AC technician)
- Any teaching / tuition / ustaad query → "Tutor"
- Any makeup / beauty / parlour / salon query → "Beautician"
- Any driving / chauffeur query → "Driver"

Examples of Roman Urdu inputs and their mappings:
- "AC bilkul kaam nahi kar raha" → service: "AC Technician", severity: high
- "AC wala chahiye" → service: "AC Technician"
- "bijli ka masla hai" → service: "Electrician"
- "nal se pani leak ho raha" → service: "Plumber"
- "gaari theek karwani hai" → service: "Mechanic"
- "kal subah" → time: "Tomorrow Morning"
- "budget zyada nahi" → budgetSensitivity: "high"
- "Gulshan mein" → location: "Gulshan"
- "abhi chahiye" → time: "ASAP", severity: high

Respond with ONLY the JSON object, no markdown, no explanation.
`

  let output: IntentOutput
  try {
    const raw = await callGemini(prompt)
    // Strip any markdown code fences if present
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    output = { ...parsed, rawInput: userInput }
  } catch {
    output = {
      service: 'Unknown',
      severity: 'medium',
      location: 'unknown',
      time: 'unknown',
      budgetSensitivity: 'medium',
      language: 'Mixed',
      confidence: 0.3,
      clarificationNeeded: true,
      clarificationQuestion: 'Could you please clarify what service you need, your location, and preferred time?',
      rawInput: userInput,
    }
  }

  // Save trace
  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'IntentAgent',
    input: { userInput },
    output,
    reasoning: `Parsed multilingual input. Language detected: ${output.language}. Confidence: ${output.confidence}`,
    tool_calls: { tool: 'GeminiAPI', model: 'gemini-1.5-flash' },
    confidence_score: output.confidence,
  })

  return output
}
