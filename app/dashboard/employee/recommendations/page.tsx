import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Sparkles, BrainCircuit } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { EmployeeAiRecommendations } from '@/components/recommendations/employee-ai-recommendations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function EmployeeRecommendationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'EMPLOYEE') {
    redirect('/login')
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-600/[0.14] via-background to-cyan-500/[0.1] p-6 sm:p-8 md:p-10 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 rounded-full border-primary/30 bg-primary/15 px-3 py-1 text-primary hover:bg-primary/20">
                <BrainCircuit className="h-3.5 w-3.5" />
                ML-powered matching
              </Badge>
              <Badge variant="outline" className="rounded-full border-violet-500/40 text-violet-700 dark:text-violet-300">
                SBERT embeddings
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.25rem] leading-tight">
              AI Career Assistant
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed md:text-lg">
              Semantic recommendations powered by your resume embedding and cosine similarity against vacancy vectors.
              Your matches are computed server-side — not keyword search alone.
            </p>
            <p className="text-sm text-muted-foreground/90 flex items-start gap-2">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Personalized AI job discovery: same pipeline as your diploma stack (FastAPI embedder → MongoDB → ranking).
              </span>
            </p>
          </div>
          <Button variant="outline" className="shrink-0 border-border/80 bg-background/60 backdrop-blur-sm" asChild>
            <Link href="/dashboard/employee">← Dashboard</Link>
          </Button>
        </div>
      </section>

      <EmployeeAiRecommendations />
    </div>
  )
}
