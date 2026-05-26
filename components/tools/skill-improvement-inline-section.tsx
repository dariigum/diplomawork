'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

export function SkillImprovementInlineSection() {
  const { t } = useI18n()

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="text-lg inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t.skillImprovement.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t.skillImprovement.subtitle}
        </p>
        <Button asChild size="sm">
          <Link href="/tools/skill-improvement" className="inline-flex items-center gap-1">
            {t.tools.open}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

