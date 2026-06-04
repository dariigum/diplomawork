'use client'

import { useCallback, useEffect, useState } from 'react'

const MOBILE_MQ = '(max-width: 767px)'

export function useIsMobileComposer() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

/** Extra space taken by the on-screen keyboard (Visual Viewport API). */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}

export function ensureComposerVisible(
  composerEl: HTMLElement | null,
  messagesScrollEl: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!composerEl) return

  requestAnimationFrame(() => {
    if (messagesScrollEl) {
      messagesScrollEl.scrollTop = messagesScrollEl.scrollHeight
    }

    const vv = window.visualViewport
    if (!vv) {
      composerEl.scrollIntoView({ block: 'end', behavior, inline: 'nearest' })
      return
    }

    const rect = composerEl.getBoundingClientRect()
    const visibleBottom = vv.offsetTop + vv.height
    const padding = 12
    const overflow = rect.bottom - (visibleBottom - padding)

    if (overflow > 0) {
      window.scrollBy({ top: overflow, behavior })
    } else {
      composerEl.scrollIntoView({ block: 'end', behavior, inline: 'nearest' })
    }
  })
}

export function scheduleComposerVisibility(
  composerEl: HTMLElement | null,
  messagesScrollEl: HTMLElement | null,
) {
  const run = () => ensureComposerVisible(composerEl, messagesScrollEl, 'smooth')
  run()
  window.setTimeout(run, 120)
  window.setTimeout(run, 350)
  window.setTimeout(run, 600)
}

/** Visible viewport height (shrinks when mobile keyboard is open). */
export function useViewportHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const update = () => {
      setHeight(window.visualViewport?.height ?? window.innerHeight)
    }
    update()
    window.addEventListener('resize', update)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [])

  return height
}
