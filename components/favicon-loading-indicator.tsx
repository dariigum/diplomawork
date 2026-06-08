'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { resetFaviconLoading, startFaviconLoading, stopFaviconLoading } from '@/lib/favicon-loading'

function isInternalNavigationLink(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false
  const href = anchor.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false
  }
  try {
    const url = new URL(href, window.location.origin)
    return url.origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * Spins the tab favicon while navigation or form/server-action requests are in flight.
 */
export function FaviconLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const onSubmit = () => startFaviconLoading()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const submitBtn = target.closest('button[type="submit"], input[type="submit"]')
      if (submitBtn) {
        startFaviconLoading()
        return
      }

      const anchor = target.closest('a')
      if (anchor instanceof HTMLAnchorElement && isInternalNavigationLink(anchor)) {
        startFaviconLoading()
      }
    }

    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('pointerdown', onPointerDown, true)

    return () => {
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [])

  useEffect(() => {
    stopFaviconLoading()
  }, [pathname, searchParams])

  useEffect(() => {
    const onPageHide = () => resetFaviconLoading()
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  return null
}
