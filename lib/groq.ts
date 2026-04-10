import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set. Add it to your .env.local file.')
  }
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'
