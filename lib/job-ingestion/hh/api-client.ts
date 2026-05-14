import type { HhItFetchConfig } from './config'

/**
 * Single GET to api.hh.ru with JSON body. Never throws — returns structured failure instead.
 */
export async function hhApiGetJson<T>(
  path: string,
  searchParams: URLSearchParams,
  options: Pick<HhItFetchConfig, 'baseUrl' | 'userAgent'>
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`
    const relative = path.replace(/^\//, '')
    const url = new URL(relative, base)
    url.search = searchParams.toString()

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': options.userAgent,
    }
    const token = process.env.HH_API_TOKEN?.trim()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url.toString(), { method: 'GET', headers, cache: 'no-store' })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, status: response.status, message: text.slice(0, 500) || response.statusText }
    }
    const data = (await response.json()) as T
    return { ok: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error'
    return { ok: false, status: 0, message }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Small delay between HH calls to reduce accidental rate pressure. */
export async function hhThrottleMs(ms: number): Promise<void> {
  await sleep(ms)
}
