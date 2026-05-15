'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n/provider';

type Tab = 'profile' | 'chat';

export function ProfileChatDashboardShell({
  profileTitle,
  subtitle,
  profile,
  chat,
}: {
  profileTitle: string;
  subtitle?: string;
  profile: React.ReactNode;
  chat: React.ReactNode;
}) {
  const { t } = useI18n();
  const [tab, setTab] = React.useState<Tab>('profile');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          {subtitle ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{profileTitle}</h1>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full shrink-0 sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:w-[220px]">
            <TabsTrigger value="profile">{t.dashboard.myProfile}</TabsTrigger>
            <TabsTrigger value="chat">{t.chat.chat}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="min-w-0 rounded-xl border border-border/60 bg-card/30">
        {tab === 'profile' ? (
          <div className="p-4 md:p-6">{profile}</div>
        ) : (
          <div className="min-h-0 min-w-0 p-2 md:p-4">{chat}</div>
        )}
      </div>
    </div>
  );
}
