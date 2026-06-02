import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function EmployerResumeLoading() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">

      {/* Back link */}
      <Skeleton className="mb-6 h-4 w-32" />

      {/* Resume title (h1) */}
      <Skeleton className="mb-2 h-9 w-64" />

      {/* Candidate name (p.mt-1) */}
      <Skeleton className="mb-1 h-5 w-48" />

      {/* Meta / subtitle line */}
      <Skeleton className="mb-8 h-4 w-36" />

      <Card>

        {/* ── Skills ── */}
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>

        {/* ── Experience ── */}
        <CardHeader className="pt-6">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>

        {/* ── Education ── */}
        <CardHeader className="pt-6">
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>

        {/* ── Contact ── */}
        <CardHeader className="pt-6">
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>

      </Card>
    </div>
  )
}
