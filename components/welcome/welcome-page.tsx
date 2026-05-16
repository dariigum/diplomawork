"use client"

import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Building2,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/provider"

const CLICKABLE_CARD_CLASS =
  "h-full border-border/70 bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-within:border-primary/40 focus-within:shadow-md cursor-pointer"

interface WelcomePageProps {
  isLoggedIn: boolean
}

function WelcomeLinkCard({
  href,
  children,
  className,
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link href={href} className={cn("block h-full rounded-xl outline-none", className)}>
      <Card className={CLICKABLE_CARD_CLASS}>{children}</Card>
    </Link>
  )
}

export function WelcomePage({ isLoggedIn }: WelcomePageProps) {
  const { t } = useI18n()
  const employeeAreaHref = isLoggedIn ? "/dashboard/employee" : "/login"
  const employerAreaHref = isLoggedIn ? "/dashboard/employer" : "/login"

  return (
    <main className="container mx-auto px-4 py-8 lg:px-6 lg:py-10">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] p-6 shadow-sm md:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-10">
          <div className="space-y-6">
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" aria-hidden />
              {t.welcome.badge}
            </Badge>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground text-balance sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
                {t.welcome.title}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t.welcome.subtitle}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-11 rounded-lg px-6 shadow-sm">
                <Link href="/">
                  {t.welcome.exploreVacancies}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 rounded-lg border-border bg-background/80 px-6"
              >
                <Link href="/companies">{t.welcome.browseCompanies}</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <WelcomeLinkCard href="/">
              <CardContent className="flex gap-4 bg-card/90 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Briefcase className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h2 className="font-semibold text-foreground">{t.welcome.smartVacancyFlow}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.welcome.smartVacancyFlowDesc}
                  </p>
                </div>
              </CardContent>
            </WelcomeLinkCard>

            <WelcomeLinkCard href={employeeAreaHref}>
              <CardContent className="flex gap-4 bg-card/90 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h2 className="font-semibold text-foreground">{t.welcome.directRecruiterChat}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.welcome.directRecruiterChatDesc}
                  </p>
                </div>
              </CardContent>
            </WelcomeLinkCard>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3 md:gap-5 lg:mt-8">
        <WelcomeLinkCard href={employeeAreaHref}>
          <CardContent className="space-y-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.welcome.forJobSeekers}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.welcome.forJobSeekersDesc}</p>
          </CardContent>
        </WelcomeLinkCard>

        <WelcomeLinkCard href={employerAreaHref}>
          <CardContent className="space-y-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.welcome.forEmployers}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.welcome.forEmployersDesc}</p>
          </CardContent>
        </WelcomeLinkCard>

        <WelcomeLinkCard href="/companies">
          <CardContent className="space-y-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t.welcome.forTransparentHiring}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.welcome.forTransparentHiringDesc}
            </p>
          </CardContent>
        </WelcomeLinkCard>
      </section>
    </main>
  )
}
