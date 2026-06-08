"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { startFaviconLoading, stopFaviconLoading } from "@/lib/favicon-loading"
import { clearAllPageCache } from "@/lib/client-page-cache"

type LogoutButtonProps = {
  children: ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asMenuItem?: boolean
}

export function LogoutButton({
  children,
  className,
  variant = "outline",
  size = "default",
  asMenuItem = false,
}: LogoutButtonProps) {
  const router = useRouter()
  const { clearUser } = useAuth()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    if (pending) return
    setPending(true)
    startFaviconLoading()
    try {
      clearUser()
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      clearAllPageCache()
      router.replace("/login")
      router.refresh()
    } finally {
      stopFaviconLoading()
      setPending(false)
    }
  }

  if (asMenuItem) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className={className ?? "w-full text-left text-destructive"}
      >
        {children}
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={pending}
    >
      {children}
    </Button>
  )
}
