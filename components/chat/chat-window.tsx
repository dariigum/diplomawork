'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function ChatWindow({
  header,
  footer,
  className,
  children,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col rounded-xl border border-border/60 bg-card/40', className)}>
      {header ? <div className="shrink-0 border-b border-border/60">{header}</div> : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
