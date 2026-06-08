"use client"

import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/provider"
import { cn } from "@/lib/utils"

const SHARE_TOAST_DURATION_MS = 15_000

function buildJobShareUrl(jobId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")
  return `${base}/jobs/${jobId}`
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy copy
    }
  }

  if (typeof document === "undefined") return false

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  document.body.appendChild(textarea)
  textarea.select()

  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

interface JobShareButtonProps {
  jobId: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  showLabel?: boolean
  className?: string
}

export function JobShareButton({
  jobId,
  variant = "outline",
  size = "lg",
  showLabel = true,
  className,
}: JobShareButtonProps) {
  const { t } = useI18n()

  const handleShare = async () => {
    const url = buildJobShareUrl(jobId)
    const copied = await copyTextToClipboard(url)

    if (copied) {
      toast.success(t.jobs.shareLinkCopied, { duration: SHARE_TOAST_DURATION_MS })
      return
    }

    toast.error(t.jobs.shareLinkCopyFailed)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(showLabel && size !== "icon" ? "h-12 text-base" : undefined, className)}
      onClick={handleShare}
      aria-label={t.jobs.share}
    >
      <Share2 className={cn("h-5 w-5", showLabel && size !== "icon" && "mr-2")} />
      {showLabel && size !== "icon" ? t.jobs.share : null}
    </Button>
  )
}
