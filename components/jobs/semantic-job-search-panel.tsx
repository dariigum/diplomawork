"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { BrainCircuit, Loader2, MapPin, RefreshCw, Search, Sparkles, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { semanticMatchStrengthLabel } from "@/lib/semantic-score-bands"
import {
  isSemanticSearchApiSuccessBody,
  type SemanticSearchApiErrorBody,
  type SemanticSearchApiResultItem,
  type SemanticSearchConceptItem,
  type SemanticSearchApiSuccessBody,
} from "@/lib/semantic-search-api-types"

const DEBOUNCE_MS = 380
const FETCH_LIMIT = 24

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

/** Readable badge text from normalized lowercase concepts (deterministic, no LLM). */
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

type PanelState =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | {
      kind: "ok"
      query: string
      results: SemanticSearchApiResultItem[]
      concepts: SemanticSearchConceptItem[]
      conceptExplanation: string
      stats: PanelStats
    }
  | { kind: "empty"; query: string; stats: PanelStats }
  | { kind: "unavailable"; query: string; message: string }
  | { kind: "error"; query: string; message: string }

function formatSemanticScore(score: number): string {
  return score.toFixed(2)
}

function SemanticConfidenceSummary({ stats }: { stats: PanelStats }) {
  const top = stats.topSemanticScore
  if (top === null || !Number.isFinite(top) || top <= 0) return null

  return (
    <div
      className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5 text-sm space-y-0.5"
      aria-label="Semantic retrieval summary"
    >
      <p className="text-foreground">
        <span className="text-muted-foreground">Top semantic similarity: </span>
        <span className="tabular-nums font-medium">{formatSemanticScore(top)}</span>
      </p>
      <p className="text-muted-foreground text-xs">
        Tier: <span className="text-foreground/90">{semanticMatchStrengthLabel(top)}</span>
      </p>
    </div>
  )
}

function SemanticEmptyState({ query, stats }: { query: string; stats: PanelStats }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-left max-w-lg mx-auto space-y-4">
      <div className="text-center sm:text-left">
        <p className="text-foreground font-medium">No strong semantic matches were found.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Query: <span className="text-foreground/90">&ldquo;{query}&rdquo;</span>
        </p>
      </div>
      <div className="text-sm space-y-2">
        <p className="font-medium text-foreground text-xs uppercase tracking-wide">Possible reasons</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1 leading-relaxed">
          <li>low embedding overlap between your wording and indexed vacancy vectors</li>
          <li>
            incompatible or missing vacancy embeddings ({stats.compatibleEmbeddings} of {stats.checkedEmbeddings}{" "}
            checked vectors were dimension-compatible)
          </li>
          <li>sparse skills or descriptions in indexed listings</li>
        </ul>
      </div>
      <div className="text-sm space-y-2">
        <p className="font-medium text-foreground text-xs uppercase tracking-wide">Suggestions</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1 leading-relaxed">
          <li>try broader role or skill wording</li>
          <li>use simpler job titles or technology names</li>
          <li>browse vacancies below while you refine the query</li>
        </ul>
      </div>
    </div>
  )
}

async function readErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as SemanticSearchApiErrorBody | null
  if (body && typeof body.error === "string") return body.error
  return `Something went wrong (${res.status}).`
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

      if (body.count === 0) {
        setPanel({ kind: "empty", query: trimmed, stats: body.stats })
      } else {
        setPanel({
          kind: "ok",
          query: trimmed,
          results: body.results,
          concepts: body.concepts ?? [],
          conceptExplanation: body.conceptExplanation ?? "",
          stats: body.stats,
        })
      }
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

  const showResults = panel.kind === "ok"
  const showLoading = panel.kind === "loading"
  const showEmpty = panel.kind === "empty"
  const showUnavailable = panel.kind === "unavailable"
  const showError = panel.kind === "error"

  const subtitle = useMemo(() => {
    if (panel.kind === "ok") {
      return `${panel.results.length} role${panel.results.length === 1 ? "" : "s"} ranked by meaning for "${panel.query}".`
    }
    if (panel.kind === "empty") {
      return `No semantic matches above the retrieval threshold for "${panel.query}".`
    }
    return null
  }, [panel])

  const conceptChips = useMemo(() => {
    if (panel.kind !== "ok") return [] as { key: string; label: string; titleAttr: string }[]
    return panel.concepts.map((c) => ({
      key: c.concept,
      label: formatConceptDisplay(c.concept, 34),
      titleAttr: `${c.concept} — derived from matched vacancy titles, skills, and descriptions (weight ${c.weight})`,
    }))
  }, [panel])

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-600/[0.08] via-background to-cyan-500/[0.06] p-5 sm:p-6 shadow-sm ring-1 ring-primary/[0.05]"
      aria-label="Semantic job search"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="gap-1.5 rounded-full border-primary/25 bg-primary/12 px-3 py-1 text-primary">
            <BrainCircuit className="h-3.5 w-3.5" />
            Semantic search
          </Badge>
          <Badge variant="outline" className="rounded-full border-border/80 text-muted-foreground text-xs font-normal">
            Meaning-first · separate from recommendations
          </Badge>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Search IT roles by meaning</h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Describe the role in your own words. Results use embedding-based retrieval against listing vectors; related
            semantic overlap can appear without exact keywords. Concept tags below (when shown) use deterministic extraction
            from matched vacancy text — not autonomous AI.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="pl-10 h-11 bg-background/80 border-border/80 shadow-sm"
              placeholder='Search by meaning, not exact keywords — e.g. "remote AI internship with NLP"'
              aria-label="Semantic search query"
              autoComplete="off"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="shrink-0 h-11 gap-2"
            disabled={!input.trim() || showLoading}
            onClick={() => void runSearch(input)}
          >
            {showLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}

        {showLoading && (
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="border-border/60 bg-card/60">
                <CardHeader className="pb-2 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showEmpty && panel.kind === "empty" && <SemanticEmptyState query={panel.query} stats={panel.stats} />}

        {showUnavailable && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Semantic search is temporarily unavailable.</p>
              <p className="text-sm text-muted-foreground mt-1">{panel.message}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => void runSearch(panel.query)}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {showError && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Could not load semantic results.</p>
              <p className="text-sm text-muted-foreground mt-1">{panel.message}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => void runSearch(panel.query)}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {showResults && panel.kind === "ok" && (
          <SemanticConfidenceSummary stats={panel.stats} />
        )}

        {showResults && (
          <ul className="grid gap-3 sm:grid-cols-2 pt-1 list-none m-0 p-0">
            {panel.results.map((r) => {
              const pct = scoreToPercent(r.semanticScore)
              return (
                <li key={r.vacancyId}>
                  <Card className="h-full border-border/70 bg-card/80 shadow-sm transition-shadow hover:shadow-md hover:border-primary/20">
                    <CardHeader className="pb-2 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug font-semibold pr-2">
                          <Link href={`/jobs/${r.vacancyId}`} className="hover:text-primary hover:underline underline-offset-2">
                            {r.title}
                          </Link>
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide font-semibold">
                          {semanticMatchStrengthLabel(r.semanticScore)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          {r.company}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {r.location}
                        </span>
                        <span>{r.employmentType}</span>
                        <span className="text-muted-foreground/80">{r.workMode === "REMOTE" ? "Remote" : "On-site"}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Semantic match strength</span>
                          <span className="tabular-nums font-medium text-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2 bg-primary/10" />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                        <span className="font-medium text-foreground/90">How this ranked: </span>
                        {r.explanation}
                      </p>
                      <p className="text-[11px] text-muted-foreground/85 leading-relaxed">
                        Footnote: semantic overlap follows embedding-based retrieval; each card still reflects that vacancy’s
                        own listing text.
                      </p>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}

        {showResults && panel.kind === "ok" && panel.concepts.length > 0 && conceptChips.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-4 space-y-3 mt-2">
            <h3 className="text-sm font-medium text-foreground tracking-tight">Related semantic concepts</h3>
            <div className="flex flex-wrap gap-1.5" role="list" aria-label="Semantic concepts derived from matched vacancies">
              {conceptChips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="outline"
                  role="listitem"
                  title={chip.titleAttr}
                  className="max-w-[11rem] truncate text-xs font-normal border-border/70 bg-background/80 text-foreground/90 px-2.5 py-0.5"
                >
                  {chip.label}
                </Badge>
              ))}
            </div>
            {panel.conceptExplanation ? (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                {panel.conceptExplanation}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                Derived from matched vacancy titles, skills, and descriptions. Deterministic semantic extraction — not
                AI-generated summaries. Semantic overlap in rankings comes from embeddings plus the same listing text.
              </p>
            )}
          </div>
        )}

        {panel.kind === "idle" && input.trim() === "" && (
          <p className="text-xs text-muted-foreground flex items-start gap-2 pt-1">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
            <span>
              Results refresh shortly after you stop typing. This path does not read your recommendation profile or behaviour
              — only your query text, embedding-based retrieval, and public vacancy listings.
            </span>
          </p>
        )}
      </div>
    </section>
  )
}
