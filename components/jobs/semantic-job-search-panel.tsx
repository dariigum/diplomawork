"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, FileText, Loader2, MapPin, RefreshCw, Search, Briefcase } from "lucide-react"
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
const EXPLANATION_PREVIEW_LEN = 72

const CARD_INTERACTION =
  "transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-sm focus-within:ring-2 focus-within:ring-ring/30 focus-within:ring-offset-1 focus-within:ring-offset-background"

const SCORE_SCALE_HINT = "Mapped cosine similarity (0–1), not a probability."

/** Mobile-first secondary copy (~12px); slightly denser from `sm`. */
const TEXT_SECONDARY = "text-xs sm:text-[11px] leading-relaxed text-muted-foreground"
const TEXT_SECONDARY_MUTED = "text-xs sm:text-[11px] leading-snug text-muted-foreground/90"

/** ~44px tap area on narrow screens; compact on desktop. */
const COLLAPSIBLE_TRIGGER =
  "flex w-full items-center justify-between gap-2 rounded-md text-left text-xs min-h-11 py-3 px-3 sm:min-h-9 sm:py-2 sm:px-2.5 touch-manipulation [&[data-state=open]>svg]:rotate-180"

/** Bar fill 0–100 from mapped cosine score — visual only, not shown as a percent. */
function scoreToBarFill(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

function tierShortLabel(score: number): string {
  const band = semanticScoreBand(score)
  if (band === "strong") return "Strong overlap"
  if (band === "solid") return "Solid overlap"
  if (band === "related") return "Related overlap"
  if (band === "loose") return "Loose overlap"
  return "Semantic overlap"
}

function tierBadgeClassName(band: SemanticScoreBand | null): string {
  const base =
    "shrink-0 text-[10px] sm:text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 sm:py-0 min-h-[1.35rem] sm:min-h-[1.125rem] border"
  switch (band) {
    case "strong":
      return `${base} border-primary/40 bg-primary/12 text-primary`
    case "solid":
      return `${base} border-teal-500/35 bg-teal-500/10 text-teal-800 dark:text-teal-300`
    case "related":
      return `${base} border-border/90 bg-muted/50 text-muted-foreground`
    case "loose":
      return `${base} border-border/70 bg-muted/30 text-muted-foreground/90`
    default:
      return `${base} border-border bg-muted text-muted-foreground`
  }
}

/** Decorative overlap cue — muted retrieval hint, not a loading indicator. */
function RetrievalOverlapHint({ score }: { score: number }) {
  const fill = scoreToBarFill(score)
  return (
    <div
      className="hidden sm:flex flex-1 min-w-[2rem] max-w-[4.5rem] items-center self-center"
      aria-hidden
      title="Retrieval overlap hint (mapped cosine scale)"
    >
      <span className="relative block h-px w-full overflow-hidden rounded-full bg-border/50">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/30"
          style={{ width: `${fill}%` }}
        />
      </span>
    </div>
  )
}

function VacancyMetaLines({
  company,
  location,
  employmentType,
  workMode,
}: {
  company: string
  location: string
  employmentType: string
  workMode: "REMOTE" | "ONSITE"
}) {
  const modeLabel = workMode === "REMOTE" ? "Remote" : "On-site"
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-2 sm:gap-y-1 sm:items-center min-w-0">
      <span className={`inline-flex items-start gap-1.5 min-w-0 max-w-full ${TEXT_SECONDARY}`}>
        <Briefcase className="h-3 w-3 shrink-0 mt-0.5 opacity-70" aria-hidden />
        <span className="break-words">{company}</span>
      </span>
      <span className={`inline-flex items-start gap-1.5 min-w-0 max-w-full ${TEXT_SECONDARY}`}>
        <MapPin className="h-3 w-3 shrink-0 mt-0.5 opacity-70" aria-hidden />
        <span className="break-words">{location}</span>
      </span>
      <span className={`${TEXT_SECONDARY} break-words`}>{employmentType}</span>
      <span className={`${TEXT_SECONDARY} break-words`}>{modeLabel}</span>
    </div>
  )
}

function SemanticScoreReadout({ score, compact }: { score: number; compact?: boolean }) {
  const formatted = formatSemanticScore(score)
  if (compact) {
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
  return (
    <div
      className="flex flex-col items-end gap-0.5 shrink-0 text-right"
      title={SCORE_SCALE_HINT}
      aria-label={`Mapped cosine similarity ${formatted}`}
    >
      <span className="tabular-nums text-base font-semibold leading-none text-foreground">{formatted}</span>
      <span className="text-xs sm:text-[11px] text-muted-foreground leading-tight">mapped cosine</span>
    </div>
  )
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

  const needsExpand = trimmed.length > EXPLANATION_PREVIEW_LEN
  const preview = needsExpand ? `${trimmed.slice(0, EXPLANATION_PREVIEW_LEN).trimEnd()}…` : trimmed

  if (!needsExpand) {
    return <p className={TEXT_SECONDARY_MUTED}>{trimmed}</p>
  }

  return (
    <Collapsible>
      <p className={`${TEXT_SECONDARY_MUTED} line-clamp-2`}>{preview}</p>
      <CollapsibleTrigger
        className={`${COLLAPSIBLE_TRIGGER} mt-1 -mx-1 w-[calc(100%+0.5rem)] font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground underline-offset-2 hover:underline sm:min-h-10 sm:py-2`}
      >
        <span>Why this matched</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className={`mt-2 ${TEXT_SECONDARY_MUTED}`}>{trimmed}</p>
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
  query,
  stats,
  hasFallback,
  onShowFallback,
}: {
  query: string
  stats: PanelStats
  hasFallback: boolean
  onShowFallback?: () => void
}) {
  return (
    <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-3.5 py-3.5 sm:px-3 sm:py-3 space-y-3 sm:space-y-2.5 text-sm">
      <p className="text-foreground font-medium text-sm">No strong semantic matches.</p>
      <p className="text-xs text-muted-foreground">
        &ldquo;{query}&rdquo; · {stats.compatibleEmbeddings}/{stats.checkedEmbeddings} compatible embeddings
      </p>
      <p className="text-xs text-muted-foreground leading-snug">
        Try broader role wording{hasFallback ? ", or review text-based matches below." : "."}
      </p>
      {hasFallback && onShowFallback ? (
        <Button type="button" variant="outline" size="sm" className="min-h-11 h-10 sm:min-h-8 sm:h-8 text-xs gap-1.5" onClick={onShowFallback}>
          <FileText className="h-3.5 w-3.5" />
          Text-based matches
        </Button>
      ) : null}
    </div>
  )
}

function WeakSemanticMatchCard({ item }: { item: SemanticSearchApiWeakSemanticItem }) {
  const band = semanticScoreBand(item.semanticScore)
  return (
    <article
      className={`rounded-md border border-dashed border-border/55 bg-muted/20 px-3 py-2.5 sm:px-2.5 sm:py-2 space-y-2 sm:space-y-1.5 ${CARD_INTERACTION}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/jobs/${item.vacancyId}`}
          className="text-sm sm:text-xs font-medium text-foreground/90 hover:underline underline-offset-2 min-w-0 leading-snug"
        >
          {item.title}
        </Link>
        <SemanticScoreReadout score={item.semanticScore} compact />
      </div>
      <Badge variant="outline" className={tierBadgeClassName(band)} title={weakSemanticTierLabel(item.semanticScore)}>
        {weakSemanticTierLabel(item.semanticScore)}
      </Badge>
      <p className={`${TEXT_SECONDARY} break-words`}>
        {item.company} · {item.location}
      </p>
    </article>
  )
}

function TextFallbackMatchCard({ item }: { item: SemanticSearchApiFallbackItem }) {
  return (
    <article
      className={`rounded-md border border-border/45 border-l-2 border-l-muted-foreground/25 bg-background/80 px-3 py-2.5 sm:px-2.5 sm:py-2 space-y-1.5 sm:space-y-1 ${CARD_INTERACTION}`}
    >
      <Link
        href={`/jobs/${item.vacancyId}`}
        className="text-sm sm:text-xs font-medium hover:underline underline-offset-2 line-clamp-2 leading-snug"
      >
        {item.title}
      </Link>
      <p className={`${TEXT_SECONDARY} break-words`}>
        {item.company} · {item.location}
      </p>
      <p className={`${TEXT_SECONDARY_MUTED} line-clamp-3 sm:line-clamp-2`}>{item.explanation}</p>
      <p className="text-xs sm:text-[11px] tabular-nums text-muted-foreground/80">Text overlap · {item.textScore}</p>
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

  return (
    <section
      id={FALLBACK_SECTION_ID}
      className={
        primary
          ? "rounded-md border border-border/60 bg-muted/10 px-3 py-3 sm:px-2.5 sm:py-2.5 space-y-2.5 sm:space-y-2"
          : "rounded-md border border-dashed border-border/50 bg-muted/5 px-3 py-3 sm:px-2.5 sm:py-2.5 space-y-2.5 sm:space-y-2"
      }
      aria-label="Keyword and text fallback matches"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="text-xs font-medium text-foreground">Text matches</h3>
        <Badge variant="outline" className="text-[10px] sm:text-[9px] font-normal px-1.5 py-0.5 sm:px-1 sm:py-0 min-h-[1.35rem] sm:min-h-4 text-muted-foreground">
          Not embeddings
        </Badge>
      </div>
      <p className={TEXT_SECONDARY_MUTED}>{reason}</p>
      <ul className="grid gap-2 sm:gap-1.5 sm:grid-cols-2 list-none m-0 p-0">
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
    <Collapsible id={WEAK_SEMANTIC_SECTION_ID} defaultOpen={false} className="rounded-md border border-border/50 bg-muted/10">
      <CollapsibleTrigger className={`${COLLAPSIBLE_TRIGGER} hover:bg-muted/20`}>
        <span className="font-medium text-foreground">
          Loose semantic <span className="font-normal text-muted-foreground">({results.length})</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:h-3.5 sm:w-3.5" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 sm:px-2.5 sm:pb-2.5 space-y-2 sm:space-y-1.5">
        <p className={TEXT_SECONDARY}>{reason}</p>
        <ul className="grid gap-2 sm:gap-1.5 sm:grid-cols-2 list-none m-0 p-0">
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

  return (
    <article
      className={`h-full flex flex-col rounded-lg border border-border/70 bg-card/95 shadow-none ${CARD_INTERACTION}`}
    >
      <div className="p-3 pb-2.5 sm:p-2.5 sm:pb-2 space-y-2.5 sm:space-y-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug text-foreground min-w-0 flex-1">
            <Link
              href={`/jobs/${r.vacancyId}`}
              className="hover:text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
            >
              {r.title}
            </Link>
          </h3>
          <SemanticScoreReadout score={r.semanticScore} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={tierBadgeClassName(band)} title={semanticOverlapTierLabel(r.semanticScore)}>
            {tierShortLabel(r.semanticScore)}
          </Badge>
          <RetrievalOverlapHint score={r.semanticScore} />
        </div>

        <VacancyMetaLines
          company={r.company}
          location={r.location}
          employmentType={r.employmentType}
          workMode={r.workMode}
        />

        <div className="pt-1 sm:pt-0.5 border-t border-border/30">
          <CardRankingExplanation explanation={r.explanation} />
        </div>
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
            <div key={i} className="rounded-lg border border-border/60 bg-card/50 p-3 sm:p-2.5 space-y-2.5 sm:space-y-2">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-10" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden sm:block h-px w-16 max-w-[4.5rem] opacity-50" />
            </div>
          ))}
        </div>
      ) : null}

      {showEmptySemantic && panel.kind === "results" ? (
        <SemanticEmptyState
          query={panel.query}
          stats={panel.stats}
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
