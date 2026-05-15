'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function ChatLayout({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex h-full min-h-0 gap-2 md:gap-3', className)}>{children}</div>;
}
