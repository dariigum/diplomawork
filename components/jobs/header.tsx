"use client"

import Link from "next/link"
import { Briefcase, User, Heart, Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  savedJobsCount: number
}

export function Header({ savedJobsCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">JobFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Find Jobs
              </Button>
            </Link>
            <Link href="/companies">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Companies
              </Button>
            </Link>
            <Link href="/salary">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Salaries
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Resources
              </Button>
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Saved Jobs */}
            <Button variant="ghost" size="icon" className="relative hidden sm:flex">
              <Heart className="h-5 w-5 text-muted-foreground" />
              {savedJobsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                  {savedJobsCount}
                </Badge>
              )}
              <span className="sr-only">Saved jobs</span>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <Link href="/login">
                <Button variant="ghost" className="text-muted-foreground">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Link href="/" className="w-full">Find Jobs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/companies" className="w-full">Companies</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/salary" className="w-full">Salaries</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/saved" className="w-full flex items-center justify-between">
                    Saved Jobs
                    {savedJobsCount > 0 && (
                      <Badge variant="secondary">{savedJobsCount}</Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-primary">
                  <Link href="/login">Log In</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-primary font-medium">
                  <Link href="/signup">Sign Up</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
