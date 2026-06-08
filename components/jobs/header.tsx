"use client"

import Link from "next/link"
import { Briefcase, Heart, Bell, Menu, LogOut, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { LogoutButton } from "@/components/auth/logout-button"
import { getSavedVacanciesAction } from "@/app/actions/vacancy"
import { SAVED_VACANCIES_UPDATED_EVENT } from "@/lib/saved-vacancies-events"
import { CHAT_UNREAD_UPDATED_EVENT } from "@/lib/chat/chat-events"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

import { useChatSocket } from "@/hooks/use-chat-socket"
import { useI18n } from "@/lib/i18n/provider"

interface HeaderProps {
  savedJobsCount: number
}

export function Header({ savedJobsCount }: HeaderProps) {
  const { t } = useI18n();
  const { user, authReady } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [savedJobsData, setSavedJobsData] = useState<any[]>([])
  const [savedCount, setSavedCount] = useState(savedJobsCount)
  const [notifications, setNotifications] = useState<any[]>([])
  const { socket, connected } = useChatSocket()

  const userRole = user?.role ?? null
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
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) {
      setSavedJobsData([])
      setSavedCount(0)
      setNotifications([])
      return
    }

    fetchUnreadChats()

    if (user.role === 'EMPLOYEE') {
      refreshSavedVacancies().catch(() => {
        setSavedJobsData([])
        setSavedCount(0)
      })
    } else {
      setSavedJobsData([])
      setSavedCount(0)
    }
  }, [user?.id, user?.role])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleUpdate = () => {
      void fetchUnreadChats()
    }
    window.addEventListener(CHAT_UNREAD_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(CHAT_UNREAD_UPDATED_EVENT, handleUpdate)
  }, [])

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
    <header className="sticky top-0 z-50 w-full overflow-x-hidden border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto w-full max-w-[100vw] px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 min-w-0 items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/welcome" className="flex shrink-0 items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden text-xl font-bold text-foreground sm:inline max-lg:max-w-[5.5rem] max-lg:truncate lg:max-w-none">
              JobFlow
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
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
            <Link href="/tools">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t.header.tools}
              </Button>
            </Link>
            <Link href="/resources">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                {t.header.resources}
              </Button>
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex min-w-0 shrink items-center gap-1 lg:gap-2">
            {isEmployee && (
              <>
                {/* Saved Jobs Popover */}
                <DropdownMenu onOpenChange={handleSavedPopoverChange}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative hidden md:flex">
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
                  <Button variant="ghost" size="icon" className="relative flex shrink-0">
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
                            href={userRole === 'ADMIN' ? '/admin' : userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'} 
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

            <LocaleSwitcher />

            <ThemeToggle />

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-2 ml-1">
              {!authReady ? (
                <div className="h-9 w-36" aria-hidden />
              ) : userRole ? (
                <>
                  <Link href={userRole === 'ADMIN' ? '/admin' : userRole === 'EMPLOYER' ? '/dashboard/employer' : '/dashboard/employee'}>
                    <Button variant="ghost" className="text-muted-foreground flex items-center gap-2 px-2">
                      <UserIcon className="h-4 w-4" />
                      {t.header.profile}
                    </Button>
                  </Link>
                  <LogoutButton className="text-muted-foreground hover:text-destructive flex items-center gap-2 px-2">
                    <LogOut className="h-4 w-4" />
                    {t.header.logout}
                  </LogoutButton>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="text-muted-foreground px-2">
                      {t.header.login}
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-3">
                      {t.header.signup}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            {!mounted ? (
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="w-52 p-2 pt-3">
                  <DropdownMenuItem asChild className="mt-1 py-2.5">
                    <Link href="/" className="w-full">{t.header.findJobs}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="py-2.5">
                    <Link href="/companies" className="w-full">{t.header.companies}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="py-2.5">
                    <Link href="/tools" className="w-full">{t.header.tools}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="py-2.5">
                    <Link href="/resources" className="w-full">{t.header.resources}</Link>
                  </DropdownMenuItem>

                  {authReady && userRole ? (
                    <>
                      <DropdownMenuSeparator className="my-2" />
                      <DropdownMenuItem asChild className="py-2.5">
                        <Link
                          href={
                            userRole === 'ADMIN'
                             ? '/admin'
                             : userRole === 'EMPLOYER'
                             ? '/dashboard/employer'
                             : '/dashboard/employee'
                          }
                          className="w-full"
                        >
                          {t.header.profile}
                        </Link>
                      </DropdownMenuItem>
                      <div className="px-1 pb-1 pt-1">
                        <LogoutButton
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="h-4 w-4" />
                          {t.header.logout}
                        </LogoutButton>
                      </div>
                    </>
                  ) : authReady ? (
                    <>
                      <DropdownMenuItem asChild className="text-primary">
                        <Link href="/login" className="w-full">{t.header.login}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-primary font-medium">
                        <Link href="/signup" className="w-full">{t.header.signup}</Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
                    
          </div>
        </div>
      </div>
    </header>
  )
}
