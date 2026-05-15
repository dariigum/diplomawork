"use client"

import Link from "next/link"
import { Briefcase } from "lucide-react"
import { useI18n } from "@/lib/i18n/provider"

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">JobFlow</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
              {t.footer.helpCenter}
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} JobFlow. {t.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  )
}
