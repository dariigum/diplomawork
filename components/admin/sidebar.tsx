'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldAlert
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navigation = [
    { name: t.admin.sidebar.overview, href: '/admin', icon: LayoutDashboard },
    { name: t.admin.sidebar.users, href: '/admin/users', icon: Users },
    { name: t.admin.sidebar.employers, href: '/admin/employers', icon: Building2 },
    { name: t.admin.sidebar.vacancies, href: '/admin/vacancies', icon: Briefcase },
    { name: t.admin.sidebar.systemLogs, href: '/admin/logs', icon: ShieldAlert },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card px-3 py-4">
      <div className="mb-6 px-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {t.admin.sidebar.title}
        </h2>
      </div>
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
