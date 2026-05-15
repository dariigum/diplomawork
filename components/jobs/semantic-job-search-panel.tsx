"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, FileText, Loader2, MapPin, RefreshCw, Search, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { semanticMatchStrengthLabel, weakSemanticTierLabel } from "@/lib/semantic-score-bands"
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
const EXPLANATION_PREVIEW_LEN = 88

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
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

function SemanticConfidenceSummary({ stats }: { stats: PanelStats }) {
  const top = stats.topSemanticScore
  if (top === null || !Number.isFinite(top) || top <= 0) return null

  return (
    <p
      className="text-xs text-muted-foreground border-b border-border/50 pb-2"
      aria-label="Semantic retrieval summary"
    >
      Top similarity{" "}
      <span className="tabular-nums font-medium text-foreground">{formatSemanticScore(top)}</span>
      <span className="mx-1.5 text-border">·</span>
      <span className="text-foreground/90">{semanticMatchStrengthLabel(top)}</span>
    </p>
  )
}

function CardRankingExplanation({ explanation }: { explanation: string }) {
  const trimmed = explanation.trim()
  if (!trimmed) return null

  const needsExpand = trimmed.length > EXPLANATION_PREVIEW_LEN
  const preview = needsExpand ? `${trimmed.slice(0, EXPLANATION_PREVIEW_LEN).trimEnd()}…` : trimmed

  if (!needsExpand) {
    return <p className="text-[11px] text-muted-foreground leading-snug">{trimmed}</p>
  }

  return (
    <Collapsible>
      <p className="text-[11px] text-muted-foreground leading-snug">{preview}</p>
      <CollapsibleTrigger className="mt-1 text-[11px] font-medium text-foreground/80 hover:text-foreground hover:underline underline-offset-2">
        Show why
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug border-t border-border/40 pt-1.5">
          {trimmed}
        </p>
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
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs hover:bg-muted/25 rounded-md [&[data-state=open]>svg]:rotate-180">
        <span className="font-medium text-foreground">Concepts from matches ({chips.length})</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2.5 space-y-2">
        <div className="flex flex-wrap gap-1" role="list" aria-label="Semantic concepts from matched vacancies">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="outline"
              role="listitem"
              title={chip.titleAttr}
              className="max-w-[10rem] truncate text-[10px] font-normal px-1.5 py-0 border-border/60"
            >
              {chip.label}
            </Badge>
          ))}
        </div>
        {conceptExplanation ? (
          <p className="text-[10px] text-muted-foreground leading-snug">{conceptExplanation}</p>
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
    <div className="rounded-md border border-dashed border-border/70 bg-muted/15 px-3 py-3 space-y-2.5 text-sm">
      <p className="text-foreground font-medium text-sm">No strong semantic matches.</p>
      <p className="text-xs text-muted-foreground">
        &ldquo;{query}&rdquo; · {stats.compatibleEmbeddings}/{stats.checkedEmbeddings} compatible embeddings
      </p>
      <p className="text-xs text-muted-foreground leading-snug">
        Try broader role wording{hasFallback ? ", or review text-based matches below." : "."}
      </p>
      {hasFallback && onShowFallback ? (
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={onShowFallback}>
          <FileText className="h-3.5 w-3.5" />
          Text-based matches
        </Button>
      ) : null}
    </div>
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
          ? "rounded-md border border-border/60 bg-muted/10 px-2.5 py-2.5 space-y-2"
          : "rounded-md border border-dashed border-border/50 bg-muted/5 px-2.5 py-2.5 space-y-2"
      }
      aria-label="Keyword and text fallback matches"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="text-xs font-medium text-foreground">Text matches</h3>
        <Badge variant="outline" className="text-[9px] font-normal px-1 py-0 h-4 text-muted-foreground">
          Not embeddings
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">{reason}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2 list-none m-0 p-0">
        {results.map((r) => (
          <li key={r.vacancyId}>
            <div className="rounded-md border border-border/50 bg-background/90 px-2.5 py-2 space-y-1">
              <Link href={`/jobs/${r.vacancyId}`} className="text-xs font-medium hover:underline underline-offset-2">
                {r.title}
              </Link>
              <p className="text-[10px] text-muted-foreground">
                {r.company} · {r.location}
              </p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{r.explanation}</p>
            </div>
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
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs hover:bg-muted/20 rounded-md [&[data-state=open]>svg]:rotate-180">
        <span className="font-medium text-foreground">
          Loose semantic <span className="font-normal text-muted-foreground">({results.length})</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2.5 space-y-1.5">
        <p className="text-[10px] text-muted-foreground">{reason}</p>
        <ul className="grid gap-1.5 sm:grid-cols-2 list-none m-0 p-0">
          {results.map((r) => (
            <li key={r.vacancyId}>
              <div className="rounded-md border border-border/40 bg-background/85 px-2.5 py-2 space-y-1">
                <div className="flex items-start justify-between gap-1">
                  <Link href={`/jobs/${r.vacancyId}`} className="text-xs font-medium hover:underline underline-offset-2">
                    {r.title}
                  </Link>
                  <Badge variant="outline" className="shrink-0 text-[9px] font-normal h-4 px-1">
                    {weakSemanticTierLabel(r.semanticScore)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {r.company} · {r.semanticScore.toFixed(2)}
                </p>
              </div>
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
  const pct = scoreToPercent(r.semanticScore)
  return (
    <Card className="h-full border-border/60 bg-card shadow-none hover:border-border">
      <CardHeader className="p-2.5 pb-1.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug font-medium pr-1">
            <Link href={`/jobs/${r.vacancyId}`} className="hover:text-primary hover:underline underline-offset-2">
              {r.title}
            </Link>
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 text-[9px] uppercase tracking-wide font-medium px-1.5 py-0">
            {semanticMatchStrengthLabel(r.semanticScore)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Briefcase className="h-2.5 w-2.5" />
            {r.company}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {r.location}
          </span>
          <span>{r.employmentType}</span>
        </div>
      </CardHeader>
      <CardContent className="p-2.5 pt-0 space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-1 flex-1 bg-muted" aria-label={`Semantic match ${pct} percent`} />
          <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
        <CardRankingExplanation explanation={r.explanation} />
      </CardContent>
    </Card>
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
      <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={onRetry}>
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

  const subtitle = useMemo(() => {
    if (panel.kind !== "results") return null
    if (panel.results.length > 0) {
      return `${panel.results.length} match${panel.results.length === 1 ? "" : "es"} · embedding retrieval`
    }
    if (weakPayload) return "No strong matches · loose semantic recovery below"
    if (fallbackPayload) return "No embedding matches · text recovery below"
    return "No matches above threshold"
  }, [panel, weakPayload, fallbackPayload])

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
      className="rounded-lg border border-border/70 bg-card/30 p-3 sm:p-3.5 space-y-2.5"
      aria-label="Semantic job search"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-foreground tracking-tight">Search by meaning</h2>
          <span className="text-[10px] text-muted-foreground">Separate from recommendations</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-8 h-9 text-sm bg-background border-border/80"
              placeholder='e.g. remote backend with Python'
              aria-label="Semantic search query"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 px-3 shrink-0"
            disabled={!input.trim() || showLoading}
            onClick={() => void runSearch(input)}
          >
            {showLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            <span className="sr-only">Search</span>
          </Button>
        </div>

        {panel.kind === "idle" && input.trim() === "" ? (
          <p className="text-[10px] text-muted-foreground">Embedding-based retrieval on public listings · updates as you type</p>
        ) : null}

        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>

      {showLoading ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="border-border/50 p-2.5 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-1 w-full" />
            </Card>
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
        <div className="space-y-2.5">
          <SemanticConfidenceSummary stats={panel.stats} />
          <ul className="grid gap-2 sm:grid-cols-2 list-none m-0 p-0">
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
