"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, FileText, Loader2, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  semanticOverlapTierLabel,
  semanticScoreBand,
  weakSemanticTierLabel,
  type SemanticScoreBand,
} from "@/lib/semantic-score-bands"
import {
  isSemanticSearchApiSuccessBody,
  type SemanticSearchApiErrorBody,
  type SemanticSearchApiResultItem,
  type SemanticSearchConceptItem,
  type SemanticSearchApiFallbackItem,
  type SemanticSearchApiWeakSemanticItem,
  type SemanticSearchApiSuccessBody,
} from "@/lib/semantic-search-api-types"

const DEBOUNCE_MS = 380
const FETCH_LIMIT = 24
const FALLBACK_SECTION_ID = "semantic-keyword-fallback-section"
const WEAK_SEMANTIC_SECTION_ID = "semantic-weak-recovery-section"
const CARD_INTERACTION =
  "transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-sm focus-within:ring-2 focus-within:ring-ring/30 focus-within:ring-offset-1 focus-within:ring-offset-background"

const SCORE_SCALE_HINT = "Mapped cosine similarity (0–1), not a probability."

/** Mobile-first secondary copy (~12px); slightly denser from `sm`. */
const TEXT_SECONDARY = "text-xs sm:text-[11px] leading-relaxed text-muted-foreground"
const TEXT_SECONDARY_MUTED = "text-xs sm:text-[11px] leading-snug text-muted-foreground/90"

/** ~44px tap area on narrow screens; compact on desktop. */
const COLLAPSIBLE_TRIGGER =
  "flex w-full items-center justify-between gap-2 rounded-md text-left text-xs min-h-11 py-3 px-3 sm:min-h-9 sm:py-2 sm:px-2.5 touch-manipulation [&[data-state=open]>svg]:rotate-180"

const CARD_EXPLANATION_TRIGGER =
  "flex w-full items-center justify-between gap-2 rounded-md text-left text-xs min-h-10 py-2 px-1 sm:min-h-8 sm:py-1.5 touch-manipulation font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline [&[data-state=open]>svg]:rotate-180"

function tierShortLabel(score: number): string {
  const band = semanticScoreBand(score)
  if (band === "strong") return "Strong overlap"
  if (band === "solid") return "Solid overlap"
  if (band === "related") return "Related overlap"
  if (band === "loose") return "Loose overlap"
  return "Semantic overlap"
}

function SemanticScoreReadout({ score }: { score: number }) {
  const formatted = formatSemanticScore(score)
  return (
    <span
      className="tabular-nums text-xs sm:text-[11px] text-muted-foreground"
      title={SCORE_SCALE_HINT}
      aria-label={`Mapped cosine similarity ${formatted}`}
    >
      {formatted}
    </span>
  )
}

function buildSemanticResultMetaLine(params: {
  company: string
  location: string
  employmentType: string
  workMode: "REMOTE" | "ONSITE"
}): string {
  const modeLabel = params.workMode === "REMOTE" ? "Remote" : "On-site"
  const parts: string[] = []
  const company = params.company.trim()
  const location = params.location.trim()
  const employment = params.employmentType.trim()

  if (company) parts.push(company)
  if (location && location.toLowerCase() !== company.toLowerCase()) parts.push(location)
  if (employment && employment.toLowerCase() !== modeLabel.toLowerCase()) parts.push(employment)
  if (!parts.includes(modeLabel)) parts.push(modeLabel)

  return parts.join(" · ")
}

function tierTextClassName(band: SemanticScoreBand | null): string {
  switch (band) {
    case "strong":
      return "text-primary"
    case "solid":
      return "text-teal-800 dark:text-teal-300"
    case "related":
    case "loose":
      return "text-muted-foreground"
    default:
      return "text-muted-foreground"
  }
}

/** Display-only shortening for API recovery reasons — does not change activation logic. */
function compactRecoveryReason(reason: string): string {
  const r = reason.trim()
  const known: Record<string, string> = {
    "Sparse embedding overlap": "Sparse overlap",
    "No strong semantic matches": "No strong semantic overlap",
    "Low semantic overlap": "Low semantic overlap",
    "Only loose semantic overlap was found": "Weak overlap",
    "Semantic overlap is weak for this query": "Weak overlap",
  }
  if (known[r]) return known[r]
  if (r.length <= 44) return r
  return `${r.slice(0, 41).trimEnd()}…`
}

function weakSemanticTriggerLabel(count: number, reason: string): string {
  return `Loose semantic matches (${count}) · ${compactRecoveryReason(reason)}`
}

function formatConceptDisplay(raw: string, maxLen: number): string {
  const s = raw.trim()
  if (!s) return ""
  const words = s.split(/\s+/).filter(Boolean)
  const pretty = words
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
  if (pretty.length <= maxLen) return pretty
  return `${pretty.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`
}

type PanelStats = SemanticSearchApiSuccessBody["stats"]
type PanelFallback = SemanticSearchApiSuccessBody["fallback"]
type PanelWeakSemantic = SemanticSearchApiSuccessBody["weakSemantic"]

type PanelState =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | {
      kind: "results"
      query: string
      results: SemanticSearchApiResultItem[]
      concepts: SemanticSearchConceptItem[]
      conceptExplanation: string
      stats: PanelStats
      weakSemantic?: PanelWeakSemantic
      fallback?: PanelFallback
    }
  | { kind: "unavailable"; query: string; message: string }
  | { kind: "error"; query: string; message: string }

function formatSemanticScore(score: number): string {
  return score.toFixed(2)
}

function PanelRetrievalStatus({ line }: { line: string }) {
  return (
    <p className="text-xs sm:text-[11px] leading-snug text-muted-foreground/90" aria-live="polite">
      {line}
    </p>
  )
}

function buildRetrievalStatusLine(params: {
  resultsCount: number
  topSemanticScore: number | null
  hasWeak: boolean
  hasFallback: boolean
}): string | null {
  const { resultsCount, topSemanticScore, hasWeak, hasFallback } = params

  if (resultsCount > 0) {
    const matchLabel = resultsCount === 1 ? "1 match" : `${resultsCount} matches`
    if (topSemanticScore !== null && Number.isFinite(topSemanticScore) && topSemanticScore > 0) {
      return `${matchLabel} · top ${formatSemanticScore(topSemanticScore)} · ${semanticOverlapTierLabel(topSemanticScore)}`
    }
    return matchLabel
  }

  if (hasWeak) return "Loose semantic overlap · recovery below"
  if (hasFallback) return "No strong matches · text recovery below"
  return null
}

function CardRankingExplanation({ explanation }: { explanation: string }) {
  const trimmed = explanation.trim()
  if (!trimmed) return null

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className={CARD_EXPLANATION_TRIGGER}>
        <span>Why matched</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className={`mt-1.5 pb-0.5 ${TEXT_SECONDARY_MUTED}`}>{trimmed}</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

function SemanticConceptsCollapsible({
  chips,
  conceptExplanation,
}: {
  chips: { key: string; label: string; titleAttr: string }[]
  conceptExplanation: string
}) {
  if (chips.length === 0) return null

  return (
    <Collapsible defaultOpen={false} className="rounded-md border border-border/50 bg-muted/15">
      <CollapsibleTrigger className={`${COLLAPSIBLE_TRIGGER} hover:bg-muted/25`}>
        <span className="font-medium text-foreground">Concepts from matches ({chips.length})</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:h-3.5 sm:w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 sm:px-2.5 sm:pb-2.5 space-y-2.5 sm:space-y-2">
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Semantic concepts from matched vacancies">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              role="listitem"
              title={chip.titleAttr}
              className="max-w-full sm:max-w-[10rem] text-xs sm:text-[11px] font-normal px-2 py-0.5 sm:px-1.5 sm:py-0 border-border/60 break-words whitespace-normal h-auto min-h-[1.35rem]"
            >
              {chip.label}
            </Badge>
          ))}
        </div>
        {conceptExplanation ? (
          <p className={TEXT_SECONDARY_MUTED}>{conceptExplanation}</p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}

function SemanticEmptyState({
  hasFallback,
  onShowFallback,
}: {
  hasFallback: boolean
  onShowFallback?: () => void
}) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-3 py-2.5 sm:px-2.5 sm:py-2 space-y-2">
      <p className={`${TEXT_SECONDARY_MUTED} leading-snug`}>
        No strong semantic overlap found.
        {hasFallback ? " Try broader wording or browse text matches below." : " Try broader wording."}
      </p>
      {hasFallback && onShowFallback ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 h-9 sm:min-h-8 sm:h-8 text-xs gap-1.5"
          onClick={onShowFallback}
        >
          <FileText className="h-3.5 w-3.5" />
          Text matches
        </Button>
      ) : null}
    </div>
  )
}

function WeakSemanticMatchCard({ item }: { item: SemanticSearchApiWeakSemanticItem }) {
  return (
    <article
      className={`rounded-md border border-dashed border-border/50 bg-muted/15 px-2.5 py-2 sm:px-2 sm:py-1.5 space-y-1 ${CARD_INTERACTION}`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <Link
          href={`/jobs/${item.vacancyId}`}
          className="text-xs font-medium text-foreground/90 hover:underline underline-offset-2 min-w-0 leading-snug line-clamp-2"
        >
          {item.title}
        </Link>
        <SemanticScoreReadout score={item.semanticScore} />
      </div>
      <p className={`${TEXT_SECONDARY} line-clamp-1 break-words`} title={weakSemanticTierLabel(item.semanticScore)}>
        {item.company} · {item.location} · {weakSemanticTierLabel(item.semanticScore)}
      </p>
    </article>
  )
}

function TextFallbackMatchCard({ item }: { item: SemanticSearchApiFallbackItem }) {
  const explanation = item.explanation.trim()

  return (
    <article
      className={`rounded-md border border-dashed border-border/40 bg-muted/10 px-2.5 py-2 sm:px-2 sm:py-1.5 space-y-1 ${CARD_INTERACTION}`}
    >
      <Link
        href={`/jobs/${item.vacancyId}`}
        className="text-xs font-medium text-foreground/90 hover:underline underline-offset-2 line-clamp-2 leading-snug"
      >
        {item.title}
      </Link>
      <p className={`${TEXT_SECONDARY} line-clamp-1 break-words`}>
        {item.company} · {item.location}
        <span className="text-muted-foreground/75 tabular-nums"> · text overlap {item.textScore}</span>
      </p>
      {explanation ? (
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className={CARD_EXPLANATION_TRIGGER}>
            <span>Why matched</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className={`mt-1 pb-0.5 ${TEXT_SECONDARY_MUTED}`}>{explanation}</p>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </article>
  )
}

function KeywordFallbackSection({
  results,
  reason,
  primary,
}: {
  results: SemanticSearchApiFallbackItem[]
  reason: string
  primary: boolean
}) {
  if (results.length === 0) return null

  const reasonLine = compactRecoveryReason(reason)

  return (
    <section
      id={FALLBACK_SECTION_ID}
      className={
        primary
          ? "rounded-md border border-dashed border-border/55 bg-muted/8 px-2.5 py-2 sm:px-2 sm:py-1.5 space-y-1.5 sm:space-y-1"
          : "rounded-md border border-dashed border-border/45 bg-muted/5 px-2.5 py-2 sm:px-2 sm:py-1.5 space-y-1.5 sm:space-y-1"
      }
      aria-label="Keyword and text fallback matches"
    >
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground leading-snug">
          Text matches <span className="font-normal text-muted-foreground">· Not embeddings</span>
        </p>
        {reasonLine ? <p className={TEXT_SECONDARY_MUTED}>{reasonLine}</p> : null}
      </div>
      <ul className="grid gap-1.5 sm:gap-1 sm:grid-cols-2 list-none m-0 p-0">
        {results.map((r) => (
          <li key={r.vacancyId}>
            <TextFallbackMatchCard item={r} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function WeakSemanticRecoverySection({
  results,
  reason,
}: {
  results: SemanticSearchApiWeakSemanticItem[]
  reason: string
}) {
  if (results.length === 0) return null

  return (
    <Collapsible id={WEAK_SEMANTIC_SECTION_ID} defaultOpen={false} className="rounded-md border border-dashed border-border/50 bg-muted/8">
      <CollapsibleTrigger className={`${COLLAPSIBLE_TRIGGER} hover:bg-muted/15`}>
        <span className="font-medium text-foreground text-xs leading-snug min-w-0 pr-2">
          {weakSemanticTriggerLabel(results.length, reason)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:h-3.5 sm:w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2.5 sm:px-2 sm:pb-2">
        <ul className="grid gap-1.5 sm:gap-1 sm:grid-cols-2 list-none m-0 p-0">
          {results.map((r) => (
            <li key={r.vacancyId}>
              <WeakSemanticMatchCard item={r} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as SemanticSearchApiErrorBody | null
  if (body && typeof body.error === "string") return body.error
  return `Something went wrong (${res.status}).`
}

function SemanticResultCard({ r }: { r: SemanticSearchApiResultItem }) {
  const band = semanticScoreBand(r.semanticScore)
  const scoreFormatted = formatSemanticScore(r.semanticScore)
  const metaLine = buildSemanticResultMetaLine({
    company: r.company,
    location: r.location,
    employmentType: r.employmentType,
    workMode: r.workMode,
  })

  return (
    <article
      className={`h-full flex flex-col rounded-lg border border-border/70 bg-card/95 shadow-none ${CARD_INTERACTION}`}
    >
      <div className="p-2.5 sm:p-2 space-y-1.5 sm:space-y-1 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-foreground min-w-0 flex-1">
            <Link
              href={`/jobs/${r.vacancyId}`}
              className="hover:text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
            >
              {r.title}
            </Link>
          </h3>
          <span
            className="tabular-nums text-sm font-semibold leading-none text-foreground shrink-0"
            title={SCORE_SCALE_HINT}
            aria-label={`Mapped cosine similarity ${scoreFormatted}`}
          >
            {scoreFormatted}
          </span>
        </div>

        <p
          className={`text-xs sm:text-[11px] leading-snug ${tierTextClassName(band)}`}
          title={semanticOverlapTierLabel(r.semanticScore)}
        >
          {tierShortLabel(r.semanticScore)}
        </p>

        {metaLine ? (
          <p className={`${TEXT_SECONDARY} line-clamp-2 break-words`}>{metaLine}</p>
        ) : null}

        <CardRankingExplanation explanation={r.explanation} />
      </div>
    </article>
  )
}

function StatusBanner({
  tone,
  title,
  message,
  onRetry,
}: {
  tone: "warning" | "error"
  title: string
  message: string
  onRetry: () => void
}) {
  const styles =
    tone === "warning"
      ? "border-amber-500/20 bg-amber-500/[0.04]"
      : "border-destructive/20 bg-destructive/[0.04]"
  return (
    <div className={`rounded-md border px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${styles}`}>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="min-h-11 h-10 sm:min-h-8 sm:h-8 shrink-0 gap-1.5 text-xs" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  )
}

export function SemanticJobSearchPanel() {
  const [input, setInput] = useState("")
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      abortRef.current?.abort()
      setPanel({ kind: "idle" })
      return
    }

    const myId = ++requestIdRef.current
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setPanel({ kind: "loading", query: trimmed })

    try {
      const url = `/api/jobs/semantic-search?q=${encodeURIComponent(trimmed)}&limit=${FETCH_LIMIT}`
      const res = await fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } })

      if (myId !== requestIdRef.current) return

      if (res.status === 503) {
        const msg = await readErrorMessage(res)
        setPanel({ kind: "unavailable", query: trimmed, message: msg })
        return
      }
      if (res.status === 400) {
        setPanel({ kind: "idle" })
        return
      }
      if (!res.ok) {
        const msg = await readErrorMessage(res)
        setPanel({ kind: "error", query: trimmed, message: msg })
        return
      }

      const json: unknown = await res.json()
      if (!isSemanticSearchApiSuccessBody(json)) {
        setPanel({ kind: "error", query: trimmed, message: "Unexpected response from semantic search." })
        return
      }

      const body = json

      setPanel({
        kind: "results",
        query: trimmed,
        results: body.results,
        concepts: body.concepts ?? [],
        conceptExplanation: body.conceptExplanation ?? "",
        stats: body.stats,
        weakSemantic: body.weakSemantic,
        fallback: body.fallback,
      })
    } catch (e: unknown) {
      if (myId !== requestIdRef.current) return
      if (e instanceof DOMException && e.name === "AbortError") return
      setPanel({
        kind: "error",
        query: trimmed,
        message: "Network error. Check your connection and try again.",
      })
    }
  }, [])

  useEffect(() => {
    const trimmed = input.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!trimmed) {
      abortRef.current?.abort()
      setPanel({ kind: "idle" })
      return
    }

    debounceRef.current = setTimeout(() => {
      void runSearch(input)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [input, runSearch])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const scrollToFallback = useCallback(() => {
    document.getElementById(FALLBACK_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [])

  const weakPayload =
    panel.kind === "results" && panel.weakSemantic?.enabled && panel.weakSemantic.results.length > 0
      ? panel.weakSemantic
      : null

  const fallbackPayload =
    panel.kind === "results" && panel.fallback?.enabled && panel.fallback.results.length > 0
      ? panel.fallback
      : null

  const showSemanticResults = panel.kind === "results" && panel.results.length > 0
  const showLoading = panel.kind === "loading"
  const showEmptySemantic =
    panel.kind === "results" && panel.results.length === 0 && !weakPayload && !fallbackPayload
  const showUnavailable = panel.kind === "unavailable"
  const showError = panel.kind === "error"

  const retrievalStatusLine = useMemo(() => {
    if (panel.kind === "loading") return "Searching…"
    if (panel.kind !== "results") return null
    if (showEmptySemantic) return null
    return buildRetrievalStatusLine({
      resultsCount: panel.results.length,
      topSemanticScore: panel.stats.topSemanticScore,
      hasWeak: Boolean(weakPayload),
      hasFallback: Boolean(fallbackPayload),
    })
  }, [panel, weakPayload, fallbackPayload, showEmptySemantic])

  const conceptChips = useMemo(() => {
    if (panel.kind !== "results" || panel.results.length === 0) {
      return [] as { key: string; label: string; titleAttr: string }[]
    }
    return panel.concepts.map((c) => ({
      key: c.concept,
      label: formatConceptDisplay(c.concept, 28),
      titleAttr: `${c.concept} (weight ${c.weight})`,
    }))
  }, [panel])

  return (
    <section
      className="rounded-lg border border-border/70 bg-card/30 p-3.5 sm:p-3.5 space-y-3 sm:space-y-2.5 min-w-0 overflow-x-hidden"
      aria-label="Semantic job search"
      title={SCORE_SCALE_HINT}
    >
      <span className="sr-only">{SCORE_SCALE_HINT}</span>
      <div className="space-y-2 sm:space-y-1.5">
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Search by meaning</h2>
          <p className={TEXT_SECONDARY_MUTED}>Independent from catalog · Not recommendations</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-9 h-10 sm:h-9 text-sm bg-background border-border/80"
              placeholder='e.g. remote backend with Python'
              aria-label="Semantic search query"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 w-10 sm:h-9 sm:w-auto sm:px-3 shrink-0"
            disabled={!input.trim() || showLoading}
            onClick={() => void runSearch(input)}
          >
            {showLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            <span className="sr-only">Search</span>
          </Button>
        </div>

        {retrievalStatusLine ? <PanelRetrievalStatus line={retrievalStatusLine} /> : null}
      </div>

      {showLoading ? (
        <div className="grid gap-2.5 sm:gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg border border-border/60 bg-card/50 p-2.5 sm:p-2 space-y-1.5 sm:space-y-1">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full max-w-[12rem]" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : null}

      {showEmptySemantic && panel.kind === "results" ? (
        <SemanticEmptyState
          hasFallback={Boolean(fallbackPayload)}
          onShowFallback={fallbackPayload ? scrollToFallback : undefined}
        />
      ) : null}

      {showUnavailable && panel.kind === "unavailable" ? (
        <StatusBanner
          tone="warning"
          title="Semantic search unavailable"
          message={panel.message}
          onRetry={() => void runSearch(panel.query)}
        />
      ) : null}

      {showError && panel.kind === "error" ? (
        <StatusBanner
          tone="error"
          title="Could not load results"
          message={panel.message}
          onRetry={() => void runSearch(panel.query)}
        />
      ) : null}

      {showSemanticResults && panel.kind === "results" ? (
        <div className="space-y-3 sm:space-y-2.5">
          <ul className="grid gap-2.5 sm:gap-2 sm:grid-cols-2 list-none m-0 p-0">
            {panel.results.map((r) => (
              <li key={r.vacancyId}>
                <SemanticResultCard r={r} />
              </li>
            ))}
          </ul>
          {conceptChips.length > 0 ? (
            <SemanticConceptsCollapsible chips={conceptChips} conceptExplanation={panel.conceptExplanation} />
          ) : null}
        </div>
      ) : null}

      {weakPayload && panel.kind === "results" ? (
        <WeakSemanticRecoverySection results={weakPayload.results} reason={weakPayload.reason} />
      ) : null}

      {fallbackPayload && panel.kind === "results" ? (
        <KeywordFallbackSection
          results={fallbackPayload.results}
          reason={fallbackPayload.reason}
          primary={panel.results.length === 0 && !weakPayload}
        />
      ) : null}
    </section>
  )
}
