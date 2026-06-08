const DEFAULT_TIMEOUT_MS = 6_000
const USER_AGENT = 'JobFlowBot/1.0 (+vacancy-source-check)'

function isAcceptableStatus(status: number): boolean {
  return (status >= 200 && status < 400) || status === 403 || status === 405
}

async function fetchWithTimeout(
  href: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(href, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Best-effort reachability check for http(s) links shown to users. */
export async function isExternalUrlReachable(
  href: string,
  options?: { timeoutMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS

  try {
    const headResponse = await fetchWithTimeout(
      href,
      {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      },
      timeoutMs,
    )

    if (headResponse.status === 405) {
      const getResponse = await fetchWithTimeout(
        href,
        {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': USER_AGENT,
            Range: 'bytes=0-0',
          },
        },
        timeoutMs,
      )
      return isAcceptableStatus(getResponse.status)
    }

    return isAcceptableStatus(headResponse.status)
  } catch {
    return false
  }
}
