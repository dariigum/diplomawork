"use client"

import Link from "next/link"
import { MapPin, Clock, Briefcase, Heart, ExternalLink, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/job-data"

interface JobCardProps {
  job: Job
  onApply: (job: Job) => void
  onSave: (jobId: string) => void
  isSaved: boolean
  canApply: boolean
}

export function JobCard({ job, onApply, onSave, isSaved, canApply }: JobCardProps) {
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
            Featured
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
                <h3 className="font-semibold text-lg text-foreground transition-colors line-clamp-1">
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
                <span className="sr-only">{isSaved ? "Remove from saved" : "Save job"}</span>
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
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  Remote
                </span>
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
            <p className="mt-3 text-sm leading-snug text-muted-foreground line-clamp-2 sm:line-clamp-1">
              {job.description}
            </p>

            {/* Footer */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="shrink-0 text-xs text-muted-foreground">{job.postedAt}</span>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <Link href={`/jobs/${job.id}`} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full gap-1.5 text-muted-foreground hover:text-foreground sm:w-auto"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Details
                  </Button>
                </Link>
                {canApply && (
                  <Button
                    size="sm"
                    className="h-9 w-full bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:w-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApply(job)
                    }}
                  >
                    Apply Now
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
