"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton({ label }: { label: string }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-2 mb-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => router.back()}
        aria-label={label}
      >
        <ChevronLeft className="size-6" />
      </Button>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
