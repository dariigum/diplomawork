"use client"

import Link from "next/link"
import { Briefcase, Heart, Bell, Menu, LogOut, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { getAuthSession, logoutAction } from "@/app/actions/auth"
import { getSavedVacanciesAction } from "@/app/actions/vacancy"

interface HeaderProps {
  savedJobsCount: number
}

export function Header({ savedJobsCount }: HeaderProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [savedJobsData, setSavedJobsData] = useState<any[]>([])

  useEffect(() => {
    getAuthSession().then(session => {
      if (session && session.user) {
        setUserRole(session.user.role)
        if (session.user.role === 'EMPLOYEE') {
          getSavedVacanciesAction().then(setSavedJobsData)
        }
      }
    })
  }, [savedJobsCount])

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
            {userRole && (
              <>
                {/* Saved Jobs Popover */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hidden sm:flex">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                      {savedJobsCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                          {savedJobsCount}
                        </Badge>
                      )}
                      <span className="sr-only">Saved jobs</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-2">
                    <div className="font-semibold px-2 py-1.5 mb-2 border-b text-foreground">Saved Vacancies</div>
                    {savedJobsData.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">No saved jobs yet.</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {savedJobsData.map(job => (
                          <DropdownMenuItem key={job.id} asChild>
                            <Link href={`/jobs/${job.id}`} className="flex flex-col items-start cursor-pointer px-3 py-2 border-b last:border-0 hover:bg-muted/50 rounded-md">
                              <span className="font-medium text-sm line-clamp-1">{job.title}</span>
                              <span className="text-xs text-muted-foreground line-clamp-1">{job.company} • {job.salary}</span>
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-4 text-center">
                    <p className="text-sm text-muted-foreground">No new notifications.</p>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {userRole ? (
                <>
                  <Link href={userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'}>
                    <Button variant="ghost" className="text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <form action={logoutAction}>
                    <Button variant="outline" className="text-muted-foreground hover:text-destructive flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </form>
                </>
              ) : (
                <>
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
                </>
              )}
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
                <DropdownMenuItem asChild>
                  <Link href="/" className="w-full">Find Jobs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/companies" className="w-full">Companies</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/salary" className="w-full">Salaries</Link>
                </DropdownMenuItem>
                
                {userRole ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/saved" className="w-full flex items-center justify-between">
                        Saved Jobs
                        {savedJobsCount > 0 && (
                          <Badge variant="secondary">{savedJobsCount}</Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'} className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <form action={logoutAction} className="w-full">
                        <button type="submit" className="w-full text-left text-destructive">Logout</button>
                      </form>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="text-primary">
                      <Link href="/login" className="w-full">Log In</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-primary font-medium">
                      <Link href="/signup" className="w-full">Sign Up</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}
