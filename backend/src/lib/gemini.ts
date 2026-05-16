import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config()

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function callGemini(prompt: string): Promise<string> {
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}
