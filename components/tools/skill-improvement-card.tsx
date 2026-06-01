'use client'

import Link from 'next/link'
import { TrendingUp, Zap, Target, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Skill improvement card for tools hub.
 * Shows overview and link to full feature.
 */
export function SkillImprovementCard() {
  const { t } = useI18n()

  return (
    <Link href="/tools/skill-improvement" className="block h-full">
      <Card className="h-full border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{t.skillImprovement.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t.skillImprovement.subtitle}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {t.tools.open} <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
