import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { Response, SavedVacancy, Vacancy, SkillImprovementReport } from '@/lib/db/schema'
import { createSlidingWindowRateLimiter } from '@/lib/chat/rate-limit'
import { extractSkillsFromText, categorizeSkills, getSkillDisplayName } from '@/lib/skill-analysis'
import { getGeminiEnv } from '@/lib/gemini/env'

type VacancyLeanDoc = {
  _id: string | { toString(): string }
  title: string
  description?: string
  skillsRequired?: string | string[]
  requirements?: string | string[]
  responsibilities?: string | string[]
}

const VACANCY_PROJECTION = 'title description skillsRequired requirements responsibilities'
const MARKET_SAMPLE_LIMIT = 180

// Rate limiter: Max 5 report generations per minute per user
const generationLimiter = createSlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
})

function toStringSafe(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toSkillInputVacancy(doc: VacancyLeanDoc) {
  return {
    _id: doc._id,
    title: toStringSafe(doc.title),
    description: toStringSafe(doc.description),
    skillsRequired: doc.skillsRequired,
    requirements: doc.requirements,
    responsibilities: doc.responsibilities,
  }
}

function repairTruncatedJson(str: string): string {
  str = str.trim()
  if (!str) return '{}'

  let insideString = false
  let escaped = false
  const stack: string[] = []
  let lastValidCommaIndex = -1

  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '"' && !escaped) {
      insideString = !insideString
    } else if (char === '\\' && insideString) {
      escaped = !escaped
    } else {
      escaped = false
      if (!insideString) {
        if (char === '{') {
          stack.push('}')
        } else if (char === '[') {
          stack.push(']')
        } else if (char === '}') {
          if (stack[stack.length - 1] === '}') stack.pop()
        } else if (char === ']') {
          if (stack[stack.length - 1] === ']') stack.pop()
        } else if (char === ',') {
          lastValidCommaIndex = i
        }
      }
    }
  }

  if (insideString) {
    return str + '"' + stack.reverse().join('')
  }

  if (stack.length > 0) {
    const tryDirectClose = str + stack.slice().reverse().join('')
    try {
      JSON.parse(tryDirectClose)
      return tryDirectClose
    } catch {
      if (lastValidCommaIndex !== -1) {
        const truncated = str.substring(0, lastValidCommaIndex).trim()
        const subStack: string[] = []
        let subInsideString = false
        let subEscaped = false
        for (let i = 0; i < truncated.length; i++) {
          const c = truncated[i]
          if (c === '"' && !subEscaped) {
            subInsideString = !subInsideString
          } else if (c === '\\' && subInsideString) {
            subEscaped = !subEscaped
          } else {
            subEscaped = false
            if (!subInsideString) {
              if (c === '{') subStack.push('}')
              else if (c === '[') subStack.push(']')
              else if (c === '}') {
                if (subStack[subStack.length - 1] === '}') subStack.pop()
              } else if (c === ']') {
                if (subStack[subStack.length - 1] === ']') subStack.pop()
              }
            }
          }
        }
        return truncated + subStack.reverse().join('')
      }
    }
  }

  return str + stack.reverse().join('')
}

const extractJsonString = (str: string): string => {
  const jsonBlockMatch = str.match(/```json\s*([\s\S]*?)\s*```/i)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim()
  }
  const genericBlockMatch = str.match(/```\s*([\s\S]*?)\s*```/)
  if (genericBlockMatch && genericBlockMatch[1]) {
    return genericBlockMatch[1].trim()
  }
  const startIdx = str.indexOf('{')
  const endIdx = str.lastIndexOf('}')
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return str.substring(startIdx, endIdx + 1).trim()
  }
  return str.trim()
}

async function translateReport(
  fields: {
    individualProgram: string;
    topRecommendations: string;
    careerDirections: string;
    learningPath: string;
    nextSteps: string;
  },
  targetLangName: string,
  apiKey: string
): Promise<any> {
  const systemPrompt = `You are a professional IT translation assistant. Translate the following structured JSON career report from Russian to ${targetLangName}.
You must preserve all Markdown formatting (bold text, lists, headers, checkboxes like [ ] and [x]).
Return a valid JSON object matching the exact input structure:
{
  "individualProgram": "translated string",
  "topRecommendations": "translated string",
  "careerDirections": "translated string",
  "learningPath": "translated string",
  "nextSteps": "translated string"
}
Do not include any wrapping markdown blocks like \`\`\`json or text outside the JSON. Return only the JSON object.`

  const userPrompt = JSON.stringify(fields)
  const MODELS = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-3-flash'
  ]

  let response: any = null
  let lastError: any = null

  for (const model of MODELS) {
    try {
      console.log(`[TranslateReport] Translating to ${targetLangName} using ${model}`)
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json'
            }
          }),
        }
      )

      if (response.ok) {
        break
      }
      lastError = await response.json().catch(() => ({}))
    } catch (err) {
      lastError = err
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Translation API call failed: ${JSON.stringify(lastError)}`)
  }

  const responseData = await response.json()
  const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const extracted = extractJsonString(text)
  const repaired = repairTruncatedJson(extracted)
  return JSON.parse(repaired)
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en'

    if (session.user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Only employees can use this feature' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    await dbConnect()

    const resume = await getActiveResumeLeanForUser(session.user.id)
    if (!resume) {
      return NextResponse.json(
        { error: 'No active resume found. Please create or activate a resume first.' },
        { status: 400 },
      )
    }

    // 1. Check if a report for this active resume already exists in the database
    const cachedReport = await SkillImprovementReport.findOne({ resumeId: resume._id }).lean()
    
    // We also fetch user's saved/applied vacancies to compute basic counts and stats
    const userObjectId = new mongoose.Types.ObjectId(session.user.id)
    const [savedLinks, responses] = await Promise.all([
      SavedVacancy.find({ userId: userObjectId }).select('vacancyId').lean(),
      Response.find({ userId: userObjectId }).select('vacancyId').sort({ createdAt: -1 }).lean(),
    ])

    const savedIds = savedLinks
      .map((doc) => String(doc.vacancyId ?? ''))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))

    const appliedIds = responses
      .map((doc) => String(doc.vacancyId ?? ''))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))

    const focusIds = Array.from(new Set([...savedIds, ...appliedIds]))
    const focusObjectIds = focusIds.map((id) => new mongoose.Types.ObjectId(id))

    const focusVacanciesDocs = focusObjectIds.length
      ? await Vacancy.find({ _id: { $in: focusObjectIds } })
          .select(VACANCY_PROJECTION)
          .lean<VacancyLeanDoc[]>()
      : []

    const focusVacanciesById = new Map(focusVacanciesDocs.map((doc) => [String(doc._id), doc]))

    const savedVacancies = savedIds
      .map((id) => focusVacanciesById.get(id))
      .filter((doc): doc is VacancyLeanDoc => Boolean(doc))
      .map(toSkillInputVacancy)

    const appliedVacancies = appliedIds
      .map((id) => focusVacanciesById.get(id))
      .filter((doc): doc is VacancyLeanDoc => Boolean(doc))
      .map(toSkillInputVacancy)

    const marketQuery = focusObjectIds.length > 0 ? { _id: { $nin: focusObjectIds } } : {}
    const marketVacanciesDocs = await Vacancy.find(marketQuery)
      .select(VACANCY_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(MARKET_SAMPLE_LIMIT)
      .lean<VacancyLeanDoc[]>()

    const userSkills = extractSkillsFromText(resume.skills || '')

    // Prepare response structure template
    const responsePayload = {
      analysisTimestamp: new Date(),
      sourceStats: {
        savedVacancies: savedVacancies.length,
        appliedVacancies: appliedVacancies.length,
        marketVacancies: marketVacanciesDocs.length,
      },
      currentSkills: {
        total: userSkills.length,
        byCategory: categorizeSkills(userSkills),
        displayNames: userSkills.reduce<Record<string, string>>((acc, skill) => {
          acc[skill] = getSkillDisplayName(skill)
          return acc
        }, {}),
      },
      individualProgram: '',
      topRecommendations: '',
      careerDirections: '',
      learningPath: '',
      nextSteps: '',
    }

    if (cachedReport) {
      console.log(`[SkillImprovement] Returning cached report for resumeId: ${resume._id}`)
      let individualProgram = cachedReport.individualProgram
      let topRecommendations = cachedReport.topRecommendations
      let careerDirections = cachedReport.careerDirections
      let learningPath = cachedReport.learningPath
      let nextSteps = cachedReport.nextSteps

      if (locale !== 'ru') {
        const cachedTrans = (cachedReport as any).translations?.[locale]
        if (cachedTrans) {
          individualProgram = cachedTrans.individualProgram || individualProgram
          topRecommendations = cachedTrans.topRecommendations || topRecommendations
          careerDirections = cachedTrans.careerDirections || careerDirections
          learningPath = cachedTrans.learningPath || learningPath
          nextSteps = cachedTrans.nextSteps || nextSteps
        } else {
          const gemini = getGeminiEnv()
          if (gemini.ok) {
            const targetLangName = locale === 'kk' ? 'Kazakh' : 'English'
            try {
              const translated = await translateReport(
                { individualProgram, topRecommendations, careerDirections, learningPath, nextSteps },
                targetLangName,
                gemini.apiKey
              )
              if (translated) {
                await SkillImprovementReport.updateOne(
                  { _id: cachedReport._id },
                  { $set: { [`translations.${locale}`]: translated } }
                )
                individualProgram = translated.individualProgram || individualProgram
                topRecommendations = translated.topRecommendations || topRecommendations
                careerDirections = translated.careerDirections || careerDirections
                learningPath = translated.learningPath || learningPath
                nextSteps = translated.nextSteps || nextSteps
              }
            } catch (transErr) {
              console.error(`[SkillImprovement] Translation to ${targetLangName} failed:`, transErr)
            }
          }
        }
      }

      responsePayload.individualProgram = individualProgram
      responsePayload.topRecommendations = topRecommendations
      responsePayload.careerDirections = careerDirections
      responsePayload.learningPath = learningPath
      responsePayload.nextSteps = nextSteps
      
      return NextResponse.json(responsePayload)
    }

    // 2. Check rate limit before calling Gemini
    const userId = session.user.id
    if (!generationLimiter(userId)) {
      return NextResponse.json(
        { error: 'Превышен лимит запросов. Пожалуйста, подождите минуту перед повторной генерацией отчета.' },
        { status: 429 }
      )
    }

    // 3. Check Gemini API Key
    const gemini = getGeminiEnv()
    if (!gemini.ok) {
      return NextResponse.json(
        {
          error: gemini.error,
          expectedEnvVar: gemini.expectedEnvVar,
          text: `${gemini.message} You can get a free key at https://aistudio.google.com/.`,
        },
        { status: 503 },
      )
    }

    // 4. Construct prompt for Gemini
    const resumeText = [
      `Заголовок резюме: ${resume.title}`,
      `Навыки: ${resume.skills}`,
      `Опыт работы: ${resume.experience}`,
      `Образование: ${resume.education}`,
    ].join('\n')

    const savedVacanciesInfo = savedVacancies.map(v => 
      `- Название: ${v.title}\n  Требуемые навыки: ${Array.isArray(v.skillsRequired) ? v.skillsRequired.join(', ') : v.skillsRequired}\n  Описание: ${v.description}`
    ).join('\n\n')

    const appliedVacanciesInfo = appliedVacancies.map(v => 
      `- Название: ${v.title}\n  Требуемые навыки: ${Array.isArray(v.skillsRequired) ? v.skillsRequired.join(', ') : v.skillsRequired}\n  Описание: ${v.description}`
    ).join('\n\n')

    const systemPrompt = `You are a professional IT career consulting assistant. Your task is to analyze the user's resume, saved vacancies, and applied vacancies, and produce a highly personalized, structured career development report.
You must return a valid JSON object matching the following structure:
{
  "individualProgram": "string (Markdown)",
  "topRecommendations": "string (Markdown)",
  "careerDirections": "string (Markdown)",
  "learningPath": "string (Markdown)",
  "nextSteps": "string (Markdown)"
}

Do not include any wrapping markdown blocks like \`\`\`json or text outside the JSON. Return only the JSON object.
Use Russian language. Format all text fields using rich Markdown (bold headers, bullet points, checklists).

Here is what you need to write in each section:
1. "individualProgram": A comprehensive assessment of the user's current profile. Highlight key strengths, overall market position, and custom advice depending on their level (Junior/Middle/Senior) and active signals.
2. "topRecommendations": A detailed skill gap analysis. Specify which crucial technologies, tools, and methodologies are missing from the resume but highly demanded in the user's saved/applied vacancies. Focus on why they are needed.
3. "careerDirections": Detailed advice on career paths (e.g. Frontend, Backend, DevOps, Data Science, QA). Compare the user's fit score for their target directions and show how learning new skills will unlock opportunities.
4. "learningPath": A step-by-step roadmap. Map out what to learn first, second, third, etc., with estimated study hours, libraries, and best methodologies.
5. "nextSteps": A practical, direct checklist of immediate actions for the next 7-30 days (e.g., updating pet projects, learning a specific library, practicing test assignments, optimizing CV sections).`

    const userPrompt = `
Вот данные пользователя для анализа:

=== РЕЗЮМЕ ПОЛЬЗОВАТЕЛЯ ===
${resumeText}

=== СОХРАНЕННЫЕ ВАКАНСИИ ===
${savedVacanciesInfo || 'Нет сохраненных вакансий'}

=== ОТКЛИКИ НА ВАКАНСИИ ===
${appliedVacanciesInfo || 'Нет откликов'}
`

    const MODELS = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-flash',
      'gemma-4-31b',
      'gemma-4-26b'
    ]

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        individualProgram: { type: 'STRING' },
        topRecommendations: { type: 'STRING' },
        careerDirections: { type: 'STRING' },
        learningPath: { type: 'STRING' },
        nextSteps: { type: 'STRING' }
      },
      required: ['individualProgram', 'topRecommendations', 'careerDirections', 'learningPath', 'nextSteps']
    }

    let response: Response | null = null
    let lastError: any = null

    for (const model of MODELS) {
      // Step A: Attempt with responseSchema if model is Gemini
      const isGemini = model.toLowerCase().includes('gemini')
      try {
        console.log(`[SkillImprovement] Attempting generateContent with model: ${model} (schema=${isGemini})`)
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                responseMimeType: 'application/json',
                ...(isGemini ? { responseSchema } : {})
              }
            }),
          }
        )

        if (response.ok) {
          console.log(`[SkillImprovement] Gemini success with model: ${model}`)
          break
        }

        const errJson = await response.json().catch(() => ({}))
        console.warn(`[SkillImprovement] Model ${model} failed with status ${response.status}:`, errJson)
        lastError = errJson

        // Step B: Fallback to without schema on same model if schema call failed with 400
        if (response.status === 400 && isGemini) {
          console.log(`[SkillImprovement] Retrying model: ${model} without responseSchema`)
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${gemini.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: systemPrompt }]
                },
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 8192,
                  responseMimeType: 'application/json'
                }
              }),
            }
          )
          if (response.ok) {
            console.log(`[SkillImprovement] Gemini success without schema with model: ${model}`)
            break
          }
          const retryErrJson = await response.json().catch(() => ({}))
          console.warn(`[SkillImprovement] Model retry ${model} failed with status ${response.status}:`, retryErrJson)
          lastError = retryErrJson
        }
      } catch (err) {
        console.error(`[SkillImprovement] Fetch error for model ${model}:`, err)
        lastError = err
      }
    }

    if (!response || !response.ok) {
      console.error('[SkillImprovement] All Gemini models failed. Last error:', lastError)
      return NextResponse.json({
        error: 'Gemini API failure',
        details: lastError?.error?.message || lastError?.message || 'All models overloaded or unavailable'
      }, { status: 502 })
    }

    const responseData = await response.json()
    const modelResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let parsedJson: any = null
    const cleanedJsonText = extractJsonString(modelResponse)

    try {
      parsedJson = JSON.parse(cleanedJsonText)
    } catch (e) {
      console.warn('[SkillImprovement] Direct JSON parse failed, attempting repair and sanitization:', e)
      try {
        const repairedText = repairTruncatedJson(cleanedJsonText)
        let insideString = false
        let escaped = false
        let sanitized = ''
        for (let i = 0; i < repairedText.length; i++) {
          const char = repairedText[i]
          if (char === '"' && !escaped) {
            insideString = !insideString
            sanitized += char
          } else if (char === '\\' && insideString) {
            escaped = !escaped
            sanitized += char
          } else {
            escaped = false
            if (insideString) {
              const code = char.charCodeAt(0)
              if (code <= 0x1F) {
                if (char === '\n') sanitized += '\\n'
                else if (char === '\r') sanitized += '\\r'
                else if (char === '\t') sanitized += '\\t'
              } else {
                sanitized += char
              }
            } else {
              sanitized += char
            }
          }
        }
        parsedJson = JSON.parse(sanitized)
      } catch (fallbackError) {
        console.error('[SkillImprovement] Failed to parse Gemini response as JSON:', modelResponse, fallbackError)
        return NextResponse.json({
          error: 'Invalid AI response format',
          details: 'Модель искусственного интеллекта вернула некорректный формат данных. Попробуйте еще раз.'
        }, { status: 502 })
      }
    }

    const individualProgram = parsedJson.individualProgram || ''
    const topRecommendations = parsedJson.topRecommendations || ''
    const careerDirections = parsedJson.careerDirections || ''
    const learningPath = parsedJson.learningPath || ''
    const nextSteps = parsedJson.nextSteps || ''

    if (!individualProgram && !topRecommendations) {
      return NextResponse.json({
        error: 'Empty AI response',
        details: 'Не удалось получить содержательный ответ от ИИ. Попробуйте обновить страницу.'
      }, { status: 502 })
    }

    // 5. If locale is not Russian, translate the newly generated report
    let returnIndividualProgram = individualProgram
    let returnTopRecommendations = topRecommendations
    let returnCareerDirections = careerDirections
    let returnLearningPath = learningPath
    let returnNextSteps = nextSteps
    const translationsObj: Record<string, any> = {}

    if (locale !== 'ru') {
      const targetLangName = locale === 'kk' ? 'Kazakh' : 'English'
      try {
        const translated = await translateReport(
          { individualProgram, topRecommendations, careerDirections, learningPath, nextSteps },
          targetLangName,
          apiKey
        )
        if (translated) {
          translationsObj[locale] = translated
          returnIndividualProgram = translated.individualProgram || returnIndividualProgram
          returnTopRecommendations = translated.topRecommendations || returnTopRecommendations
          returnCareerDirections = translated.careerDirections || returnCareerDirections
          returnLearningPath = translated.learningPath || returnLearningPath
          returnNextSteps = translated.nextSteps || returnNextSteps
        }
      } catch (transErr) {
        console.error(`[SkillImprovement] Initial translation to ${targetLangName} failed:`, transErr)
      }
    }

    // 6. Save report to the database
    await SkillImprovementReport.create({
      resumeId: resume._id,
      userId: userObjectId,
      individualProgram,
      topRecommendations,
      careerDirections,
      learningPath,
      nextSteps,
      translations: translationsObj,
    })

    responsePayload.individualProgram = returnIndividualProgram
    responsePayload.topRecommendations = returnTopRecommendations
    responsePayload.careerDirections = returnCareerDirections
    responsePayload.learningPath = returnLearningPath
    responsePayload.nextSteps = returnNextSteps

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Skill improvement analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze skills' },
      { status: 500 },
    )
  }
}

