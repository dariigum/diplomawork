"use client"

import Link from "next/link"
import { MapPin, Clock, Briefcase, Heart, ExternalLink, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SALARY_NOT_SPECIFIED_LABEL } from "@/lib/format-vacancy-salary"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/job-data"
import { useI18n } from "@/lib/i18n/provider"

const SKILL_BADGE_CLASS =
  "max-w-full min-w-0 shrink overflow-hidden text-xs font-normal bg-muted text-muted-foreground hover:bg-muted"

interface JobCardProps {
  job: Job
  onApply: (job: Job) => void
  onSave: (jobId: string) => void
  isSaved: boolean
  canApply: boolean
}

export function JobCard({ job, onApply, onSave, isSaved, canApply }: JobCardProps) {
  const { t } = useI18n()

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/80 transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-sm",
        job.isFeatured && "border-primary/20 bg-primary/[0.02]"
      )}
    >
      {job.isFeatured && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
            {t.common.featured}
          </div>
        </div>
      )}

      <CardContent className="p-5">
        <div className="flex min-w-0 gap-4">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
              {job.companyLogo}
            </div>
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 pr-1">
                <h3
                  className="line-clamp-1 font-semibold text-lg text-foreground transition-colors"
                  title={job.title}
                >
                  {job.title}
                </h3>
                <p className="mt-0.5 truncate text-sm text-muted-foreground" title={job.company}>
                  {job.company}
                </p>
              </div>

              {/* Save Button */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 flex-shrink-0 transition-all",
                  isSaved ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onSave(job.id)
                }}
              >
                <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
                <span className="sr-only">{isSaved ? t.common.saved : t.common.save}</span>
              </Button>
            </div>

            {/* Job Meta */}
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate" title={job.location}>
                  {job.location}
                </span>
              </div>
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <Briefcase className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate" title={job.employmentType}>
                  {job.employmentType}
                </span>
              </div>
              <div className="flex min-w-0 max-w-full items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate" title={job.experience}>
                  {job.experience}
                </span>
              </div>
              {job.isRemote && (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  {t.filters.remote}
                </span>
              )}
            </div>

            {/* Salary */}
            <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              {job.salary !== SALARY_NOT_SPECIFIED_LABEL ? (
                <span className="text-xs text-muted-foreground sm:text-sm">Salary</span>
              ) : null}
              <span
                className={cn(
                  "min-w-0 max-w-full truncate text-sm leading-snug",
                  job.salary === SALARY_NOT_SPECIFIED_LABEL
                    ? "font-medium text-muted-foreground"
                    : "font-semibold text-foreground tabular-nums",
                )}
                title={job.salary}
              >
                {job.salary}
              </span>
            </div>

            {/* Skills */}
            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className={SKILL_BADGE_CLASS}
                  title={skill}
                >
                  <span className="min-w-0 truncate">{skill}</span>
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="secondary" className={cn(SKILL_BADGE_CLASS, "shrink-0")}>
                  +{job.skills.length - 4}
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="mt-3 text-sm leading-snug text-muted-foreground line-clamp-2 sm:line-clamp-1">
              {job.description}
            </p>

            {/* Footer */}
            <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
              <span className="shrink-0 text-xs text-muted-foreground">{job.postedAt}</span>

              <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
                <Link href={`/jobs/${job.id}`} className="min-w-0 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full min-w-0 max-w-full gap-1.5 whitespace-normal text-muted-foreground hover:text-foreground md:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {t.common.details}
                  </Button>
                </Link>
                {canApply && (
                  <Button
                    size="sm"
                    className="h-9 w-full min-w-0 max-w-full whitespace-normal bg-primary px-5 text-primary-foreground hover:bg-primary/90 md:w-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApply(job)
                    }}
                  >
                    {t.common.applyNow}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
