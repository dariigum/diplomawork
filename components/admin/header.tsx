'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Menu, User as UserIcon, LogOut, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuthSession } from '@/app/actions/auth';
import { LogoutButton } from '@/components/auth/logout-button';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/provider';

export function AdminHeader() {
  const { locale, setLocale } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    getAuthSession().then(session => {
      if (session?.user) setUser(session.user);
      setIsLoading(false);
    });
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button could go here */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        {!mounted ? (
          <Button variant="ghost" size="icon" className="relative">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Change Language</span>
          </Button>
        ) : (
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
        )}

        <ThemeToggle />
        {isLoading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full border">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{user.name || 'Admin User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuItem asChild>
                <LogoutButton asMenuItem className="w-full flex items-center text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </LogoutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
