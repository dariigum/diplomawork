export type MlEmbedResponse = {
  embedding: number[]
}

const DEFAULT_TIMEOUT_MS = 8000

function getMlEmbedUrl(): string {
  const base = process.env.ML_SERVICE_URL?.trim().replace(/\/$/, '')
  if (!base) {
    return 'http://localhost:8000/embed'
  }
  return `${base}/embed`
}

export async function getEmbedding(text: string, opts?: { timeoutMs?: number }): Promise<number[]> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!text || !text.trim()) {
    throw new Error('ML embedding text is empty')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = `${getMlEmbedUrl()}?text=${encodeURIComponent(text)}`

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`ML service error: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`)
    }

    const data = (await res.json()) as Partial<MlEmbedResponse>
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('ML service returned invalid response shape')
    }

    return data.embedding
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`ML service timeout after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

