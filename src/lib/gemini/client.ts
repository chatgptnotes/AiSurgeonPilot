import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export async function generateMeetingSummary(transcript: string): Promise<{
  summary: string
  diagnosis: string
  prescription: string
}> {
  const prompt = `You are a medical AI assistant helping doctors summarize patient consultations.

Analyze the following medical consultation transcript and provide:
1. A concise summary of the consultation (2-3 paragraphs)
2. Key diagnosis notes or observations
3. Recommended prescription or treatment plan

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "diagnosis": "...",
  "prescription": "..."
}

Transcript:
${transcript}

Important:
- Be professional and accurate
- If the transcript is unclear, note that in the summary
- Do not make up medical information not present in the transcript
- Include follow-up recommendations if relevant`

  const result = await geminiModel.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Try to parse as JSON
  try {
    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(cleanedText)
  } catch {
    // If parsing fails, return as summary only
    return {
      summary: text,
      diagnosis: 'Unable to extract specific diagnosis from transcript.',
      prescription: 'Please review transcript for prescription details.',
    }
  }
}
