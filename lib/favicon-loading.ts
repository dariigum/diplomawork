const FAVICON_SELECTOR = 'link[rel*="icon"], link[rel="shortcut icon"]'
const MIN_VISIBLE_MS = 450

type SavedIcon = {
  el: HTMLLinkElement
  href: string
  type: string | null
  media: string | null
}

let savedIcons: SavedIcon[] = []
let frameId: number | null = null
let angle = 0
let loadingCount = 0
let loadingStartedAt = 0
let stopTimer: ReturnType<typeof setTimeout> | null = null

function snapshotIcons() {
  if (savedIcons.length > 0) return
  savedIcons = Array.from(document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR)).map(
    (el) => ({
      el,
      href: el.href,
      type: el.getAttribute('type'),
      media: el.getAttribute('media'),
    }),
  )
}

function buildSpinnerDataUrl(): string {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = isDark ? '#0f172a' : '#f8fafc'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, 10, angle, angle + Math.PI * 1.35)
  ctx.stroke()

  return canvas.toDataURL('image/png')
}

function applySpinnerToAllIcons(dataUrl: string) {
  const links = document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR)
  if (links.length === 0) {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    document.head.appendChild(link)
    savedIcons.push({ el: link, href: '', type: 'image/png', media: null })
  }

  document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR).forEach((link) => {
    link.type = 'image/png'
    link.href = dataUrl
    link.removeAttribute('media')
  })
}

function drawSpinnerFrame() {
  const dataUrl = buildSpinnerDataUrl()
  if (!dataUrl) return
  applySpinnerToAllIcons(dataUrl)
  angle += 0.62
  frameId = window.requestAnimationFrame(drawSpinnerFrame)
}

function restoreFaviconNow() {
  if (frameId != null) {
    window.cancelAnimationFrame(frameId)
    frameId = null
  }
  angle = 0

  for (const saved of savedIcons) {
    if (!document.head.contains(saved.el)) {
      document.head.appendChild(saved.el)
    }
    saved.el.href = saved.href
    if (saved.type) saved.el.setAttribute('type', saved.type)
    else saved.el.removeAttribute('type')
    if (saved.media) saved.el.setAttribute('media', saved.media)
    else saved.el.removeAttribute('media')
  }
  savedIcons = []
}

function scheduleRestore() {
  if (stopTimer) clearTimeout(stopTimer)
  const elapsed = Date.now() - loadingStartedAt
  const delay = Math.max(0, MIN_VISIBLE_MS - elapsed)
  stopTimer = setTimeout(() => {
    stopTimer = null
    if (loadingCount === 0) restoreFaviconNow()
  }, delay)
}

export function startFaviconLoading() {
  loadingCount += 1
  if (loadingCount === 1) {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    loadingStartedAt = Date.now()
    snapshotIcons()
    drawSpinnerFrame()
  }
}

export function stopFaviconLoading() {
  loadingCount = Math.max(0, loadingCount - 1)
  if (loadingCount > 0) return
  scheduleRestore()
}

export function resetFaviconLoading() {
  loadingCount = 0
  if (stopTimer) {
    clearTimeout(stopTimer)
    stopTimer = null
  }
  restoreFaviconNow()
}
