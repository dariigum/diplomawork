type GeminiEnvCheck =
  | { ok: true; apiKey: string }
  | { ok: false; error: 'missing_api_key'; expectedEnvVar: 'GEMINI_API_KEY'; message: string }

let warnedMissing = false

export function getGeminiEnv(): GeminiEnvCheck {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? ''
  if (apiKey) return { ok: true, apiKey }

  const message =
    'Google Gemini API Key is missing. Set GEMINI_API_KEY in the runtime environment (project root .env) and restart the server process.'

  if (!warnedMissing && process.env.NEXT_PHASE !== 'phase-production-build') {
    warnedMissing = true
    console.warn(`[Gemini] GEMINI_API_KEY is missing (cwd=${process.cwd()}).`)
  }

  return { ok: false, error: 'missing_api_key', expectedEnvVar: 'GEMINI_API_KEY', message }
}
