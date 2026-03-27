"use client"

import Link from "next/link"
import { Briefcase, Heart, Bell, Menu, Plus, Send, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { getAuthSession } from "@/app/actions/auth"
import { getSavedVacanciesAction } from "@/app/actions/vacancy"
import { getUnreadChatNotificationsAction } from "@/app/actions/chat"
import { NOTIFICATIONS_UPDATED_EVENT } from "@/lib/notifications-events"
import { SAVED_VACANCIES_UPDATED_EVENT } from "@/lib/saved-vacancies-events"

interface HeaderProps {
  savedJobsCount: number
}

export function Header({ savedJobsCount }: HeaderProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [savedJobsData, setSavedJobsData] = useState<any[]>([])
  const [savedCount, setSavedCount] = useState(savedJobsCount)
  const [notifications, setNotifications] = useState<any[]>([])
  const isEmployee = userRole === 'EMPLOYEE'
  const unreadNotificationsCount = notifications.reduce(
    (total, notification) => total + notification.unreadCount,
    0
  )

  const profileHref =
    userRole === 'ADMIN'
      ? '/dashboard/admin'
      : userRole === 'EMPLOYER'
        ? '/dashboard/employer'
        : '/dashboard/employee'
  const chatHref =
    userRole === 'EMPLOYER'
      ? '/dashboard/employer?tab=chat'
      : '/dashboard/employee?tab=chat'
  const createHref =
    userRole === 'EMPLOYER'
      ? '/dashboard/employer/vacancy/new'
      : '/dashboard/employee/resume/new'
  const createLabel = userRole === 'EMPLOYER' ? 'Create a vacancy' : 'Create a resume'

  useEffect(() => {
    if (isEmployee) {
      setSavedCount(savedJobsCount)
    }
  }, [isEmployee, savedJobsCount])

  const refreshSavedVacancies = async () => {
    const jobs = await getSavedVacanciesAction()
    setSavedJobsData(jobs)
    setSavedCount(jobs.length)
  }

  const refreshNotifications = async () => {
    const nextNotifications = await getUnreadChatNotificationsAction()
    setNotifications(nextNotifications)
  }

  useEffect(() => {
    getAuthSession().then(session => {
      if (!session?.user) {
        setUserRole(null)
        setSavedJobsData([])
        setSavedCount(0)
        setNotifications([])
        return
      }

      setUserRole(session.user.role)

      if (session.user.role === 'EMPLOYEE') {
        refreshSavedVacancies().catch(() => {
          setSavedJobsData([])
          setSavedCount(0)
        })
      } else {
        setSavedJobsData([])
        setSavedCount(0)
      }

      refreshNotifications().catch(() => {
        setNotifications([])
      })
    })
  }, [])

  const handleSavedPopoverChange = (open: boolean) => {
    if (open) {
      refreshSavedVacancies()
    }
  }

  const handleNotificationsPopoverChange = (open: boolean) => {
    if (open) {
      refreshNotifications().catch(() => {
        setNotifications([])
      })
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      if (!isEmployee) return
      refreshSavedVacancies().catch(() => undefined)
    }

    window.addEventListener(SAVED_VACANCIES_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(SAVED_VACANCIES_UPDATED_EVENT, handleUpdate)
  }, [isEmployee])

  useEffect(() => {
    if (!userRole) return

    const intervalId = window.setInterval(() => {
      refreshNotifications().catch(() => undefined)
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [userRole])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdate = () => {
      refreshNotifications().catch(() => undefined)
    }

    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleUpdate)
  }, [])

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
            {isEmployee && (
              <>
                {/* Saved Jobs Popover */}
                <DropdownMenu onOpenChange={handleSavedPopoverChange}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hidden sm:flex">
                      <Heart className="h-5 w-5 text-muted-foreground" />
                      {savedCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                          {savedCount}
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

              </>
            )}

            {userRole !== null && userRole !== 'ADMIN' && (
              <Link href={chatHref}>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Send className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Chat</span>
                </Button>
              </Link>
            )}

            {userRole && (
              <DropdownMenu onOpenChange={handleNotificationsPopoverChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive" />
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2">
                  <div className="mb-2 border-b px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">Notifications</span>
                      {unreadNotificationsCount > 0 && (
                        <Badge className="rounded-full px-2">{unreadNotificationsCount}</Badge>
                      )}
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No new notifications.
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem key={notification.responseId} asChild>
                          <Link
                            href={notification.dashboardHref}
                            className="flex cursor-pointer flex-col items-start gap-2 rounded-md border-b px-3 py-3 last:border-0 hover:bg-muted/50"
                          >
                            <div className="flex w-full items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">New message</p>
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {notification.counterpartyName} · {notification.vacancyTitle}
                                </p>
                              </div>
                              <Badge variant="secondary">{notification.unreadCount}</Badge>
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {notification.latestMessagePreview}
                            </p>
                            <div className="flex w-full items-center justify-between gap-3">
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(notification.latestMessageAt).toLocaleString()}
                              </span>
                              <span className="text-xs font-medium text-primary">Open chat</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {userRole ? (
                <>
                  <Link href={profileHref}>
                    <Button variant="ghost" className="text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  {userRole !== 'ADMIN' && (
                    <Link href={createHref}>
                      <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {createLabel}
                      </Button>
                    </Link>
                  )}
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
                    {isEmployee && (
                      <DropdownMenuItem asChild>
                        <Link href="/saved" className="w-full flex items-center justify-between">
                          Saved Jobs
                          {savedCount > 0 && (
                            <Badge variant="secondary">{savedCount}</Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={profileHref} className="w-full">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {userRole !== 'ADMIN' && (
                      <DropdownMenuItem asChild>
                        <Link href={chatHref} className="w-full">
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {userRole !== 'ADMIN' && (
                      <DropdownMenuItem asChild>
                        <Link href={createHref} className="w-full">
                          {createLabel}
                        </Link>
                      </DropdownMenuItem>
                    )}
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
