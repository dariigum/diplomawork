import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit'

type MessageItem = {
  role: 'user' | 'model'
  text: string
}

// In-memory rate limiter for Gemini AI chatbot: limit to 10 requests per minute per user
const chatLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
})

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Only employees/job seekers can use this feature' }, { status: 403 })
    }

    // Rate limiting check
    const userId = session.user.id
    if (!chatLimiter(userId)) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        details: 'Too many requests. Please wait a minute before sending more messages.'
      }, { status: 429 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({
        error: 'missing_api_key',
        text: 'Google Gemini API Key is missing. Please add GEMINI_API_KEY="your_api_key" to your .env file to enable the AI Chatbot. You can get a free key at https://aistudio.google.com/.'
      })
    }

    const body = await req.json()
    const messages = (body.messages || []) as MessageItem[]

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Truncate history to avoid large payloads (keep the last 15 messages)
    const trimmedMessages = messages.slice(-15)

    // Convert messages to Gemini payload format
    const contentsPayload = trimmedMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))

    const systemPrompt = `You are a strict, helpful Career Development Assistant for IT professionals.
Your ONLY purpose is to answer questions related to:
1. Career path guidance (e.g., how to become a frontend, backend, devops, data science, fullstack, or qa engineer).
2. Skill improvement recommendations, which technologies and frameworks to learn next, and why.
3. Learning resources, study tips, time estimation, and roadmap milestones for learning various IT tools and skills.

CRITICAL RULE: Under no circumstances are you allowed to discuss anything else.
- If the user asks general coding queries not related to career growth (e.g. debugging a specific code error, writing full scripts, algorithms, syntax errors, HTML layout design), explain that while you can suggest what languages to learn, you are not a coding assistant and they should focus on career planning.
- If the user asks about recipes, sports, history, jokes, general knowledge, math, translation of non-IT texts, or anything out of scope, politely refuse to answer and remind them that you are strictly programmed to assist with career growth and skill recommendations.
- Keep your answers structured, encouraging, and focused on helping the user build their IT career path.
- Always respond in the same language as the user's message (Russian, English, or Kazakh).`

    const MODELS = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-flash',
      'gemma-4-31b',
      'gemma-4-26b'
    ]

    let response: Response | null = null
    let lastError: any = null

    for (const model of MODELS) {
      try {
        console.log(`Attempting generateContent with model: ${model}`)
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: systemPrompt
                  }
                ]
              },
              contents: contentsPayload,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
              }
            }),
          }
        )

        if (response.ok) {
          console.log(`Gemini success with model: ${model}`)
          break
        }

        const errJson = await response.json().catch(() => ({}))
        console.warn(`Model ${model} failed with status ${response.status}:`, errJson)
        lastError = errJson
      } catch (err) {
        console.error(`Fetch error for model ${model}:`, err)
        lastError = err
      }
    }

    if (!response || !response.ok) {
      console.error('All Gemini models failed. Last error:', lastError)
      return NextResponse.json({
        error: 'Gemini API failure',
        details: lastError?.error?.message || lastError?.message || 'All models overloaded or unavailable'
      }, { status: 502 })
    }

    const responseData = await response.json()
    const modelResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return NextResponse.json({ text: modelResponse })
  } catch (error) {
    console.error('Chat AI route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
