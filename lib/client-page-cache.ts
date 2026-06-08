const PREFIX = "jobflow:page:"
const MAX_AGE_MS = 30 * 60 * 1000

type CacheEnvelope<T> = {
  savedAt: number
  data: T
}

function storageKey(key: string) {
  return `${PREFIX}${key}`
}

export function readPageCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(storageKey(key))
    if (!raw) return null
    const envelope = JSON.parse(raw) as CacheEnvelope<T>
    if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(storageKey(key))
      return null
    }
    return envelope.data
  } catch {
    return null
  }
}

export function writePageCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data }
    sessionStorage.setItem(storageKey(key), JSON.stringify(envelope))
  } catch {
    // quota exceeded or private mode
  }
}

export function clearAllPageCache() {
  if (typeof window === "undefined") return
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(PREFIX)) keysToRemove.push(key)
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch {
    // ignore
  }
}
