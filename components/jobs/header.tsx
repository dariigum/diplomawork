"use client"

import Link from "next/link"
import { Briefcase, Heart, Bell, Menu, LogOut, User as UserIcon, Globe } from "lucide-react"
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
import { SAVED_VACANCIES_UPDATED_EVENT } from "@/lib/saved-vacancies-events"
import { ThemeToggle } from "@/components/theme-toggle"

import { useChatSocket } from "@/hooks/use-chat-socket"
import { useI18n } from "@/lib/i18n/provider"
import { Locale } from "@/lib/i18n/dictionaries"

interface HeaderProps {
  savedJobsCount: number
}

export function Header({ savedJobsCount }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [savedJobsData, setSavedJobsData] = useState<any[]>([])
  const [savedCount, setSavedCount] = useState(savedJobsCount)
  const [notifications, setNotifications] = useState<any[]>([])
  const { socket, connected } = useChatSocket()
  
  const isEmployee = userRole === 'EMPLOYEE'

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

  const fetchUnreadChats = async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.chats)) {
          const unread = data.chats.filter((c: any) => c.unreadCount > 0)
          setNotifications(unread)
        }
      }
    } catch {}
  }

  useEffect(() => {
    getAuthSession().then(session => {
      if (!session?.user) {
        setUserRole(null)
        setUserId(null)
        setSavedJobsData([])
        setSavedCount(0)
        setNotifications([])
        return
      }

      setUserRole(session.user.role)
      setUserId(session.user.id)
      fetchUnreadChats()

      if (session.user.role === 'EMPLOYEE') {
        refreshSavedVacancies().catch(() => {
          setSavedJobsData([])
          setSavedCount(0)
        })
      } else {
        setSavedJobsData([])
        setSavedCount(0)
      }
    })
  }, [])

  useEffect(() => {
    if (!socket || !connected) return
    const handleUpdate = () => {
      fetchUnreadChats()
    }
    socket.on('chat:new_message', handleUpdate)
    socket.on('chat:read', handleUpdate)
    return () => {
      socket.off('chat:new_message', handleUpdate)
      socket.off('chat:read', handleUpdate)
    }
  }, [socket, connected])

  const handleSavedPopoverChange = (open: boolean) => {
    if (open) {
      refreshSavedVacancies()
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
                {t.header.findJobs}
              </Button>
            </Link>
            <Link href="/companies">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t.header.companies}
              </Button>
            </Link>
            <Link href="/salary">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t.header.salaries}
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t.header.resources}
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
                      <span className="sr-only">{t.header.savedJobs}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-2">
                    <div className="font-semibold px-2 py-1.5 mb-2 border-b text-foreground">{t.header.savedVacancies}</div>
                    {savedJobsData.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">{t.header.noSavedJobs}</div>
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

            {/* Notifications */}
            {userRole && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {notifications.length > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                        {notifications.length}
                      </Badge>
                    )}
                    <span className="sr-only">{t.header.notifications}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2">
                  <div className="font-semibold px-2 py-1.5 mb-2 border-b text-foreground">{t.header.notifications}</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">{t.header.noNewNotifications}</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {notifications.map((n) => (
                        <DropdownMenuItem key={n.id} asChild>
                          <Link 
                            href={userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'} 
                            className="flex flex-col items-start cursor-pointer px-3 py-2 border-b last:border-0 hover:bg-muted/50 rounded-md"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-medium text-sm line-clamp-1">
                                {t.header.newMessageFrom} {n.otherUser?.name || 'User'}
                              </span>
                              <Badge variant="secondary" className="text-[10px] ml-2">
                                {n.unreadCount}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {n.lastMessagePreview || t.header.newAttachment}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Change Language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale('en')} className={locale === 'en' ? 'font-bold' : ''}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('ru')} className={locale === 'ru' ? 'font-bold' : ''}>
                  Русский
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale('kk')} className={locale === 'kk' ? 'font-bold' : ''}>
                  Қазақша
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            {/* Auth Buttons */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              {userRole ? (
                <>
                  <Link href={userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'}>
                    <Button variant="ghost" className="text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      {t.header.profile}
                    </Button>
                  </Link>
                  <form action={logoutAction}>
                    <Button variant="outline" className="text-muted-foreground hover:text-destructive flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      {t.header.logout}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-muted-foreground">
                      {t.header.login}
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      {t.header.signup}
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
                  <Link href="/" className="w-full">{t.header.findJobs}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/companies" className="w-full">{t.header.companies}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/salary" className="w-full">{t.header.salaries}</Link>
                </DropdownMenuItem>

                {userRole ? (
                  <>
                    {isEmployee && (
                      <DropdownMenuItem asChild>
                        <Link href="/saved" className="w-full flex items-center justify-between">
                          {t.header.savedJobs}
                          {savedCount > 0 && (
                            <Badge variant="secondary">{savedCount}</Badge>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'} className="w-full">
                        {t.header.profile}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <form action={logoutAction} className="w-full">
                        <button type="submit" className="w-full text-left text-destructive">{t.header.logout}</button>
                      </form>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="text-primary">
                      <Link href="/login" className="w-full">{t.header.login}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-primary font-medium">
                      <Link href="/signup" className="w-full">{t.header.signup}</Link>
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
