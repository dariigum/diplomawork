'use client';

import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function ChatSidebar({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col rounded-xl border border-border/60 bg-card/40', className)}>
      <div className="shrink-0 border-b border-border/60 px-3 py-2 text-sm font-medium">{title}</div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">{children}</div>
      </ScrollArea>
    </div>
  );
}
