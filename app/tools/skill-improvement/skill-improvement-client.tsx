'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Loader2, Target, TrendingUp, Sparkles, Compass, Brain, Award, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/provider'

interface GeminiReportPayload {
  analysisTimestamp: string
  sourceStats: {
    savedVacancies: number
    appliedVacancies: number
    marketVacancies: number
  }
  currentSkills: {
    total: number
    byCategory: Record<string, string[]>
    displayNames: Record<string, string>
  }
  individualProgram: string
  topRecommendations: string
  careerDirections: string
  learningPath: string
  nextSteps: string
}

function GeminiMarkdownRenderer({ content }: { content: string }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: React.ReactNode[] = []
  let orderedItems: React.ReactNode[] = []
  let listKey = 0

  const flushLists = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${listKey++}`} className="list-disc pl-5 space-y-1.5 my-3 text-sm text-foreground/85">
          {listItems}
        </ul>
      )
      listItems = []
    }
    if (orderedItems.length > 0) {
      elements.push(
        <ol key={`ol-${listKey++}`} className="list-decimal pl-5 space-y-1.5 my-3 text-sm text-foreground/85">
          {orderedItems}
        </ol>
      )
      orderedItems = []
    }
  }

  const parseInlineStyles = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/)
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-foreground">{part}</strong>
      }
      return part
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) {
      flushLists()
      elements.push(<div key={`br-${i}`} className="h-2" />)
      continue
    }

    if (line.startsWith('### ')) {
      flushLists()
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-foreground mt-4 mb-2 tracking-tight">
          {parseInlineStyles(line.slice(4))}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      flushLists()
      elements.push(
        <h3 key={`h2-${i}`} className="text-md font-extrabold text-foreground mt-5 mb-2.5 tracking-tight border-b border-border/40 pb-1">
          {parseInlineStyles(line.slice(3))}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      flushLists()
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-black text-foreground mt-6 mb-3 tracking-tight">
          {parseInlineStyles(line.slice(2))}
        </h2>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (orderedItems.length > 0) flushLists()
      const contentText = line.slice(2)
      
      if (contentText.startsWith('[ ]') || contentText.startsWith('[x]')) {
        const checked = contentText.startsWith('[x]')
        const textOnly = contentText.slice(3).trim()
        listItems.push(
          <li key={`li-${i}`} className="list-none flex items-start gap-2 text-sm text-foreground/85">
            <span className={`inline-flex items-center justify-center h-4 w-4 rounded border mt-0.5 shrink-0 ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'}`}>
              {checked && (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className="flex-1 leading-relaxed">{parseInlineStyles(textOnly)}</span>
          </li>
        )
      } else {
        listItems.push(
          <li key={`li-${i}`} className="leading-relaxed pl-1">
            {parseInlineStyles(contentText)}
          </li>
        )
      }
    } else if (/^\d+\.\s/.test(line)) {
      if (listItems.length > 0) flushLists()
      const match = line.match(/^(\d+)\.\s(.*)/)
      const contentText = match ? match[2] : line
      orderedItems.push(
        <li key={`oli-${i}`} className="leading-relaxed pl-1">
          {parseInlineStyles(contentText)}
        </li>
      )
    } else {
      flushLists()
      elements.push(
        <p key={`p-${i}`} className="text-sm text-foreground/80 leading-relaxed mb-2.5">
          {parseInlineStyles(line)}
        </p>
      )
    }
  }

  flushLists()
  return <div className="space-y-1">{elements}</div>
}

export default function SkillImprovementClient() {
  const { t } = useI18n()
  const [report, setReport] = useState<GeminiReportPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/skill-improvement')

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || data.details || t.skillImprovement.error)
        }

        const data = (await res.json()) as GeminiReportPayload
        setReport(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : t.skillImprovement.error
        setError(message)
        console.error('Skill analysis error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [t])

  return (
    <div className="bg-background pb-12">
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t.skillImprovement.backToCareerHub}
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{t.skillImprovement.title}</h1>
            <p className="text-muted-foreground">{t.skillImprovement.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground">{t.skillImprovement.analyzing}</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-8">
            <Card className="border-border/60 bg-muted/5">
              <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceSaved}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.savedVacancies}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceApplied}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.appliedVacancies}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceMarket}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.marketVacancies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 1. ИНДИВИДУАЛЬНАЯ ПРОГРАММА РАЗВИТИЯ */}
            {report.individualProgram && (
              <Card className="border-border/60 bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Award className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-foreground">{(t.skillImprovement as any).individualProgram || 'Индивидуальная программа развития'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <GeminiMarkdownRenderer content={report.individualProgram} />
                </CardContent>
              </Card>
            )}

            {/* 2. ТОП РЕКОМЕНДАЦИИ */}
            {report.topRecommendations && (
              <Card className="border-border/60 bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                    <Target className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-foreground">{t.skillImprovement.topRecommendations}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <GeminiMarkdownRenderer content={report.topRecommendations} />
                </CardContent>
              </Card>
            )}

            {/* 3. НАПРАВЛЕНИЯ ДЛЯ РОСТА */}
            {report.careerDirections && (
              <Card className="border-border/60 bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                    <Compass className="h-4.5 w-4.5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-foreground">{t.skillImprovement.careerDirections}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <GeminiMarkdownRenderer content={report.careerDirections} />
                </CardContent>
              </Card>
            )}

            {/* 4. ПЛАН ОБУЧЕНИЯ */}
            {report.learningPath && (
              <Card className="border-border/60 bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                    <BookOpen className="h-4.5 w-4.5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-foreground">{t.skillImprovement.learningPath}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <GeminiMarkdownRenderer content={report.learningPath} />
                </CardContent>
              </Card>
            )}

            {/* 5. СЛЕДУЮЩИЕ ШАГИ */}
            {report.nextSteps && (
              <Card className="border-border/60 bg-card shadow-xs rounded-2xl overflow-hidden hover:shadow-sm transition-all duration-300">
                <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-md font-bold text-foreground">{t.skillImprovement.nextSteps}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-blue-500/5">
                  <GeminiMarkdownRenderer content={report.nextSteps} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!loading && !error && !report && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t.skillImprovement.noActiveResume}</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/employee">{t.skillImprovement.goToDashboard}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

