"use client"

import { useEffect, useState } from "react"
import { readPageCache, writePageCache } from "@/lib/client-page-cache"

export function useStalePageData<T>(cacheKey: string, fetchUrl: string) {
  const [data, setData] = useState<T | null>(() => readPageCache<T>(cacheKey))
  const [isRefreshing, setIsRefreshing] = useState(() => readPageCache<T>(cacheKey) === null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      setIsRefreshing((prev) => prev || readPageCache<T>(cacheKey) === null)
      setError(false)
      try {
        const res = await fetch(fetchUrl, { credentials: "include" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as T
        if (cancelled) return
        setData(json)
        writePageCache(cacheKey, json)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    void refresh()
    return () => {
      cancelled = true
    }
  }, [cacheKey, fetchUrl])

  return { data, isRefreshing, error }
}
