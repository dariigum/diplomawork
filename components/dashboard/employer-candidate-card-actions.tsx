'use client'

import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmployerCandidateCardActionsProps = {
  resumeId: string
  viewResumeLabel: string
  returnTo?: string
  className?: string
}

const actionClass = 'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs'

export function EmployerCandidateCardActions({
  resumeId,
  viewResumeLabel,
  returnTo,
  className,
}: EmployerCandidateCardActionsProps) {
  const router = useRouter()

  if (!resumeId) return null

  const handleClick = () => {
    const base = `/dashboard/employer/resume/${resumeId}`
    const url = returnTo ? `${base}?from=${encodeURIComponent(returnTo)}` : base
    router.push(url)
  }

  return (
    <div
      className={cn('mt-2 flex flex-wrap items-center gap-2', className)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }), actionClass)}
        onClick={handleClick}
      >
        <FileText className="size-3.5 shrink-0" aria-hidden />
        {viewResumeLabel}
      </button>
    </div>
  )
}
