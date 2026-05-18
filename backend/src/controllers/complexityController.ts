import { callGemini } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { IntentOutput } from './intentController'

export interface ComplexityOutput {
  complexity: 'basic' | 'intermediate' | 'complex'
  reason: string
  requiredCertifications: string[]
  estimatedDurationHours: number
  confidence: number
}

export async function processComplexity(intent: IntentOutput, sessionId: string): Promise<ComplexityOutput> {
  const prompt = `
You are a service complexity classifier for a home services platform in Pakistan.

Service Type: ${intent.service}
User Description: "${intent.rawInput}"
Severity: ${intent.severity}

Classify the job complexity and return ONLY a JSON object:
{
  "complexity": "<basic | intermediate | complex>",
  "reason": "<short explanation>",
  "requiredCertifications": ["<cert1>", "<cert2>"],
  "estimatedDurationHours": <number>,
  "confidence": <0.0 to 1.0>
}

Guidelines:
- basic: routine tasks, no special tools (e.g., AC filter cleaning, bulb replacement, pipe unclogging)
- intermediate: requires skill/tools (e.g., AC gas refill, wiring fault, pipe replacement)
- complex: specialized expertise/certifications (e.g., AC compressor, 3-phase electrical, PCB repair)

Respond with ONLY the JSON, no markdown.
`

  console.log(`\n[ComplexityController] ── Classifying complexity ──`)
  console.log(`  Service: "${intent.service}" | Severity: ${intent.severity}`)
  console.log(`  User description: "${intent.rawInput}"`)

  let output: ComplexityOutput
  try {
    const raw = await callGemini(prompt)
    const cleaned = raw.replace(/```json|```/g, '').trim()
    output = JSON.parse(cleaned)
    console.log(`[ComplexityController] Gemini result: complexity=${output.complexity}, estimatedHours=${output.estimatedDurationHours}, confidence=${output.confidence}`)
    console.log(`  Reason: ${output.reason}`)
    console.log(`  Required certs: [${(output.requiredCertifications || []).join(', ') || 'none'}]`)
  } catch {
    output = {
      complexity: 'intermediate',
      reason: 'Could not classify precisely; defaulting to intermediate',
      requiredCertifications: [],
      estimatedDurationHours: 2,
      confidence: 0.5,
    }
    console.log(`[ComplexityController] ⚠ Gemini parse failed — using fallback: intermediate, 2hrs`)
  }

  await supabase.from('traces').insert({
    session_id: sessionId,
    agent: 'ComplexityAgent',
    input: { service: intent.service, severity: intent.severity, rawInput: intent.rawInput },
    output,
    reasoning: `Classified as ${output.complexity}. ${output.reason}`,
    tool_calls: { tool: 'GeminiAPI', model: 'gemini-1.5-flash' },
    confidence_score: output.confidence,
  })

  return output
}
