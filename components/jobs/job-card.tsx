"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Clock, Briefcase, Heart, ExternalLink, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/job-data"
import { useI18n } from "@/lib/i18n/provider"

interface JobCardProps {
  job: Job
  onApply: (job: Job) => void
  onSave: (jobId: string) => void
  isSaved: boolean
  canApply: boolean
}

export function JobCard({ job, onApply, onSave, isSaved, canApply }: JobCardProps) {
  const { t } = useI18n()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={cn(
        "group transition-all duration-300 border-border hover:border-primary/30 hover:shadow-lg relative overflow-hidden",
        job.isFeatured && "border-primary/20 bg-primary/[0.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {job.isFeatured && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
            {t.common.featured}
          </div>
        </div>
      )}
      
      <CardContent className="p-5">
        <div className="flex gap-4">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
              {job.companyLogo}
            </div>
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-muted-foreground text-sm mt-0.5">{job.company}</p>
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span>{job.employmentType}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{job.experience}</span>
              </div>
              {job.isRemote && (
                <div className="flex items-center gap-1.5 text-accent">
                  <Wifi className="h-4 w-4" />
                  <span className="font-medium">{t.filters.remote}</span>
                </div>
              )}
            </div>

            {/* Salary */}
            <p className="text-foreground font-semibold mt-3">{job.salary}</p>

            {/* Skills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs font-normal bg-muted text-muted-foreground hover:bg-muted"
                >
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="secondary" className="text-xs font-normal bg-muted text-muted-foreground">
                  +{job.skills.length - 4}
                </Badge>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {job.description}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">{job.postedAt}</span>
              
              <div className="flex items-center gap-2">
                <Link href={`/jobs/${job.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t.common.details}
                  </Button>
                </Link>
                {canApply && (
                  <Button
                    size="sm"
                    className="h-9 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
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
